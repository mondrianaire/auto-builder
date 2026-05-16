/**
 * build_shape.mjs — v0.15
 *
 * Per-build shape extractor for the live-build-visualization renderer.
 * Aggregates already-loaded substrate into a clean `build_shape` object
 * suitable for the dashboard's dynamic SVG topology renderer.
 *
 * Spec: codex/docs/live-build-visualization-proposal.md
 */

const BAND_KEYS = [
  'kickoff', 'planning', 'build', 'verification',
  'delivery', 'ratification', 'promoted'
];

function bandStateInitial() {
  const o = {};
  for (const k of BAND_KEYS) o[k] = 'pending';
  return o;
}

function extractWaves(dispatches) {
  if (!Array.isArray(dispatches) || dispatches.length === 0) return [];
  const wavesByNum = new Map();
  for (const d of dispatches) {
    if (!d || !d.event) continue;
    if (d.event === 'wave_start' && typeof d.wave === 'number') {
      if (!wavesByNum.has(d.wave)) {
        wavesByNum.set(d.wave, {
          number: d.wave,
          sections: Array.isArray(d.sections) ? d.sections.slice() : [],
          started_at: d.ts || null,
          ended_at: null,
          builders: []
        });
      } else {
        const w = wavesByNum.get(d.wave);
        if (!w.started_at && d.ts) w.started_at = d.ts;
        if (Array.isArray(d.sections) && w.sections.length === 0) {
          w.sections = d.sections.slice();
        }
      }
    } else if (d.event === 'wave_complete' && typeof d.wave === 'number') {
      if (!wavesByNum.has(d.wave)) {
        wavesByNum.set(d.wave, {
          number: d.wave,
          sections: [],
          started_at: null,
          ended_at: d.ts || null,
          builders: []
        });
      } else {
        wavesByNum.get(d.wave).ended_at = d.ts || null;
      }
    } else if (d.event === 'builder_dispatch' && d.section) {
      const sorted = [...wavesByNum.values()]
        .filter(w => w.started_at)
        .sort((a, b) => (a.started_at || '').localeCompare(b.started_at || ''));
      let target = null;
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].sections.includes(d.section)) { target = sorted[i]; break; }
      }
      if (!target && sorted.length > 0) target = sorted[sorted.length - 1];
      if (target) {
        target.builders.push({
          builder_id: d.builder || null,
          section_id: d.section,
          ts: d.ts || null
        });
      }
    }
  }
  return [...wavesByNum.values()].sort((a, b) => a.number - b.number);
}

function extractContracts(sections, contractFileNames) {
  const edges = [];
  if (Array.isArray(sections)) {
    for (const s of sections) {
      const deps = Array.isArray(s.depends_on) ? s.depends_on : [];
      for (const dep of deps) {
        edges.push({ from: dep, to: s.id });
      }
    }
  }
  if (edges.length === 0 && Array.isArray(contractFileNames)) {
    for (const fname of contractFileNames) {
      const base = fname.replace(/\.json$/, '');
      const parts = base.split('--');
      if (parts.length === 2) edges.push({ from: parts[0], to: parts[1] });
    }
  }
  const seen = new Set();
  const out = [];
  for (const e of edges) {
    const k = `${e.from}->${e.to}`;
    if (!seen.has(k)) { seen.add(k); out.push(e); }
  }
  return out;
}

function deriveLifecyclePhase({
  verdict, verification_passed, completion_ratified_at, promoted_to, promoted_at
}) {
  if (promoted_at || promoted_to) return 'promoted';
  if (completion_ratified_at) return 'ratified_awaiting_fork';
  if (verdict === 'fail') return 'failed';
  if (verdict === 'failed_recovered') return 'in_limbo';
  if (verification_passed === true) return 'ready_to_ratify';
  if (verdict === 'pass' || verdict === 'pass_with_concerns'
      || verdict === 'pass_with_recommendations') {
    return 'delivered';
  }
  return 'in_build';
}

function derivePhaseBandStates(lifecyclePhase, hasSections, hasVerification) {
  const s = bandStateInitial();
  if (hasSections) {
    s.kickoff = 'done';
    s.planning = 'done';
  } else {
    s.kickoff = 'active';
  }
  switch (lifecyclePhase) {
    case 'in_build':
      s.build = hasSections ? 'active' : 'pending';
      break;
    case 'in_limbo':
    case 'failed':
      s.build = 'done';
      s.verification = 'done';
      s.delivery = 'pending';
      break;
    case 'delivered':
      s.build = 'done';
      s.verification = hasVerification ? 'done' : 'active';
      s.delivery = 'active';
      break;
    case 'ready_to_ratify':
      s.build = 'done';
      s.verification = 'done';
      s.delivery = 'done';
      s.ratification = 'active';
      break;
    case 'ratified_awaiting_fork':
      s.build = 'done';
      s.verification = 'done';
      s.delivery = 'done';
      s.ratification = 'done';
      s.promoted = 'active';
      break;
    case 'promoted':
      s.build = 'done';
      s.verification = 'done';
      s.delivery = 'done';
      s.ratification = 'done';
      s.promoted = 'done';
      break;
  }
  return s;
}

export function extractBuildShape({
  slug,
  ledger,
  sections,
  contractFileNames,
  dispatches,
  critic,
  verification,
  editorIterations,
  editorVerdicts,
  demotionCount,
  deliverable,
  verdict,
  completion_ratified_at,
  promoted_to,
  promoted_at,
  raw_project_name,
  rating
}) {
  const ipList = (ledger && Array.isArray(ledger.inflection_points))
    ? ledger.inflection_points : [];
  const inflectionPoints = ipList.map(ip => ({
    id: ip.id,
    topic: ip.topic || null,
    importance: ip.importance || null,
    method: ip.method || null,
    has_research: !!(ip.research || ip.researched || (ip.evidence && ip.evidence.length > 0))
  }));

  const sectionList = (sections && Array.isArray(sections.sections))
    ? sections.sections : [];
  const sectionSummaries = sectionList.map(s => ({
    id: s.id,
    name: s.id || null,
    depends_on: [],
    estimated_builders: 1
  }));

  const contracts = extractContracts(sectionSummaries, contractFileNames);
  const waves = extractWaves(dispatches);

  const lifecyclePhase = deriveLifecyclePhase({
    verdict,
    verification_passed: verification ? (verification.verdict === 'pass'
                                          || verification.verdict === 'pass_with_concerns')
                                       : null,
    completion_ratified_at,
    promoted_to,
    promoted_at
  });

  const phaseBandStates = derivePhaseBandStates(
    lifecyclePhase,
    sectionSummaries.length > 0,
    !!verification
  );

  const totals = {
    sections: sectionSummaries.length,
    inflection_points: inflectionPoints.length,
    builders: waves.reduce((acc, w) => acc + w.builders.length, 0),
    waves: waves.length,
    escalations: critic ? (critic.escalations_open || 0) : 0,
    dispatches: Array.isArray(dispatches) ? dispatches.length : 0
  };

  return {
    schema: 'v0.15',
    slug,
    deliverable_kind: deliverable ? deliverable.kind : 'other',
    deliverable_label: raw_project_name || slug,

    inflection_points: inflectionPoints,
    sections: sectionSummaries,
    contracts,
    waves,

    researcher_dispatch_count: Array.isArray(dispatches)
      ? dispatches.filter(d => d && (d.event === 'researcher_dispatch'
                                       || d.role === 'researcher')).length
      : 0,
    builder_dispatch_count: Array.isArray(dispatches)
      ? dispatches.filter(d => d && d.event === 'builder_dispatch').length
      : 0,
    overseer_dispatch_count: Array.isArray(dispatches)
      ? dispatches.filter(d => d && (d.event === 'overseer_dispatch'
                                       || d.role === 'overseer')).length
      : 0,

    critic_high: critic ? critic.by_severity.high : 0,
    critic_medium: critic ? critic.by_severity.medium : 0,
    critic_low: critic ? critic.by_severity.low : 0,

    editor_iterations: editorIterations || 0,
    editor_final_verdict: (Array.isArray(editorVerdicts) && editorVerdicts.length > 0)
      ? editorVerdicts[editorVerdicts.length - 1] : null,

    demotion_count: demotionCount || 0,

    cv_verdict: verification ? verification.verdict : null,
    cv_tier1_pnv: rating && rating.deliverability ? rating.deliverability.tier1_pnv : 'not_run',
    cv_tier2_first_contact: rating && rating.deliverability ? rating.deliverability.tier2_first_contact : 'not_run',
    cv_tier3_subgoal: rating && rating.deliverability ? rating.deliverability.tier3_subgoal : 'not_run',

    lifecycle_phase: lifecyclePhase,
    ratified: !!completion_ratified_at,
    promoted: !!(promoted_to || promoted_at),
    promoted_to: promoted_to || null,

    totals,
    phase_band_states: phaseBandStates
  };
}
