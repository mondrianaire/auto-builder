// ============================================================================
// architecture/scripts/decision-flowchart-extract.mjs
//
// Pass 1 of 4 for the decision-flowchart wrap-up artifact generator.
// Input:  a build slug.
// Output: a normalized BuildGraph object that downstream layout + render
//         passes consume.
//
// Design: per decision #1 in `codex/docs/maintenance-initiated/
// decision-flowchart-wrap-up-artifact.md`, this is the mechanical-from-JSON
// extractor (hybrid 1c). When v1.11 role-completion-reports land, swap each
// role's extractor function to read the role's Completion Report blurb.
// Layout downstream is unchanged.
//
// BuildGraph shape:
//
//   {
//     slug, prompt, telos, verdict, deliverable_kind,
//     phases: [
//       { id, name, agents: [
//         { id, label, revisited_by_escalation_id?, decisions: [
//           { id, label, emphasis: 'normal'|'escalation-trigger'|'escalation-impact' }
//         ] }
//       ] }
//     ],
//     escalations: [
//       { id, raised_by, raised_at_decision, summary, route_path: [...],
//         resolution_verdict }
//     ],
//     stats: { decision_count, agent_count, escalation_count }
//   }
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';

// ---- safe JSON reader ----
function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function readTextSafe(p, fallback = '') {
  try { return fs.readFileSync(p, 'utf8'); }
  catch { return fallback; }
}

function readJsonlSafe(p) {
  const text = readTextSafe(p, '');
  if (!text) return [];
  return text.split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

// ---- per-role extractors ----
// Each returns an Agent object: { id, label, decisions: [...] } or null if no data.

function extractDiscovery(runDir) {
  const ledger = readJsonSafe(path.join(runDir, 'decisions/discovery/ledger-v1.json'));
  if (!ledger) return null;
  const decisions = [];
  let n = 1;
  if (ledger.restatement) {
    decisions.push({ id: `D-DSC-${n++}`, label: 'Restatement of the user prompt.', emphasis: 'normal' });
  }
  const assumptions = ledger.assumption_ledger || ledger.assumptions || [];
  if (assumptions.length) {
    const idRange = assumptions.length > 1
      ? `${assumptions[0].id || 'A1'}–${assumptions[assumptions.length-1].id || `A${assumptions.length}`}`
      : (assumptions[0].id || 'A1');
    decisions.push({
      id: `D-DSC-${n++}`,
      label: `Logged ${assumptions.length} assumption${assumptions.length === 1 ? '' : 's'} (${idRange}).`,
      emphasis: 'normal'
    });
  }
  const ips = ledger.inflection_points || ledger.IPs || [];
  if (ips.length) {
    decisions.push({
      id: `D-DSC-${n++}`,
      label: `Surfaced ${ips.length} inflection point${ips.length === 1 ? '' : 's'} (IP1${ips.length > 1 ? `–IP${ips.length}` : ''}).`,
      emphasis: 'normal'
    });
  }
  const oos = ledger.out_of_scope || [];
  if (oos.length) {
    decisions.push({
      id: `D-DSC-${n++}`,
      label: `Marked ${oos.length} item${oos.length === 1 ? '' : 's'} out-of-scope.`,
      emphasis: 'normal'
    });
  }
  return { id: 'discovery', label: 'Discovery', decisions };
}

function extractTechnicalDiscoveryInitial(runDir, escalations) {
  const sections = readJsonSafe(path.join(runDir, 'decisions/technical-discovery/sections-v1.json'));
  if (!sections) return null;
  const decisions = [];
  let n = 1;
  if (sections.prompt_verb_analysis || sections.prompt_named_verb_assertion) {
    decisions.push({ id: `D-TD-${n++}`, label: 'Prompt-verb selection.', emphasis: 'normal' });
  }
  const ipResolutions = sections.inflection_resolutions || [];
  // Bucket: which resolutions ratify Discovery IPs vs which introduce new TD-IPs
  const ratified = ipResolutions.filter(r => r.ratifies || r.discovery_ip);
  const newTdIps = ipResolutions.filter(r => r.new_td_ip || r.td_ip);
  if (ratified.length) {
    decisions.push({
      id: `D-TD-${n++}`,
      label: `Ratified Discovery's ${ratified.length} inflection point${ratified.length === 1 ? '' : 's'}.`,
      emphasis: 'normal'
    });
  } else if (ipResolutions.length) {
    // fallback if shape differs from earthquake-map
    decisions.push({
      id: `D-TD-${n++}`,
      label: `Resolved ${ipResolutions.length} inflection point${ipResolutions.length === 1 ? '' : 's'}.`,
      emphasis: 'normal'
    });
  }
  if (newTdIps.length) {
    decisions.push({
      id: `D-TD-${n++}`,
      label: `Introduced + resolved ${newTdIps.length} TD-level inflection point${newTdIps.length === 1 ? '' : 's'}.`,
      emphasis: 'normal'
    });
  }
  const sectionsArr = sections.sections || [];
  if (sectionsArr.length) {
    decisions.push({
      id: `D-TD-${n++}`,
      label: `Section breakdown (${sectionsArr.length} section${sectionsArr.length === 1 ? '' : 's'}).`,
      emphasis: 'normal'
    });
  }
  // Coverage assertions — this is the slot where esc-001 trigger may live
  const coverage = sections.discovery_coverage_assertions || [];
  if (coverage.length) {
    // Check whether any escalation was raised on coverage
    const escFromTd = (escalations || []).find(e => e.raised_by && /technical[- ]discovery|td/i.test(e.raised_by));
    const isTrigger = escFromTd && /coverage/i.test(escFromTd.summary || escFromTd.category || '');
    decisions.push({
      id: `D-TD-${n++}`,
      label: `Coverage assertions${isTrigger ? ' — gap that triggered escalation' : ''}.`,
      emphasis: isTrigger ? 'escalation-trigger' : 'normal'
    });
  }
  return {
    id: 'td-initial',
    label: 'Technical Discovery (initial)',
    decisions,
    revisited_by_escalation_id: undefined  // set later if escalation routes back
  };
}

function extractTechnicalDiscoveryImpact(runDir) {
  // impact-analysis-vN.json files indicate TD was re-invoked in impact mode
  const tdDir = path.join(runDir, 'decisions/technical-discovery');
  if (!fs.existsSync(tdDir)) return null;
  const impactFiles = fs.readdirSync(tdDir).filter(f => /^impact-analysis-v\d+\.json$/.test(f));
  if (!impactFiles.length) return null;
  const decisions = [];
  let n = 1;
  for (const f of impactFiles) {
    const impact = readJsonSafe(path.join(tdDir, f));
    if (!impact) continue;
    if (impact.trigger) {
      decisions.push({ id: `D-TD2-${n++}`, label: `Triggered by ${impact.trigger.escalation_id || impact.trigger.id || 'escalation'}.`, emphasis: 'escalation-impact' });
    }
    if (impact.chosen_option) {
      decisions.push({ id: `D-TD2-${n++}`, label: `Chosen option: ${truncate(impact.chosen_option.id || impact.chosen_option.label || 'see impact analysis', 50)}.`, emphasis: 'escalation-impact' });
    }
    if (impact.delta_plan) {
      decisions.push({ id: `D-TD2-${n++}`, label: 'Produced delta plan.', emphasis: 'escalation-impact' });
    }
    if (impact.contract_amendments && impact.contract_amendments.length) {
      decisions.push({ id: `D-TD2-${n++}`, label: `${impact.contract_amendments.length} contract amendment${impact.contract_amendments.length === 1 ? '' : 's'}.`, emphasis: 'escalation-impact' });
    }
  }
  if (!decisions.length) return null;
  return { id: 'td-impact', label: 'Technical Discovery (impact mode)', decisions, is_impact_mode: true };
}

function extractCoordinator(runDir, escalations) {
  const dag = readJsonSafe(path.join(runDir, 'state/coordinator/dag.json'));
  const dispatchLog = readJsonlSafe(path.join(runDir, 'state/coordinator/dispatch-log.jsonl'));
  const buildComplete = readJsonSafe(path.join(runDir, 'state/coordinator/build-complete.json'));
  const deviations = readDirJson(path.join(runDir, 'state/inline-deviations'));
  if (!dag && !dispatchLog.length && !buildComplete) return null;
  const decisions = [];
  let n = 1;
  const mode = buildComplete?.dispatch_mode || dag?.dispatch_mode || 'inline';
  decisions.push({ id: `D-CRD-${n++}`, label: `Dispatch mode = ${mode}.`, emphasis: 'normal' });
  if (dag) {
    const nodes = (dag.nodes || []).length;
    const waves = (dag.waves || []).length;
    decisions.push({
      id: `D-CRD-${n++}`,
      label: `DAG construction (${nodes} node${nodes === 1 ? '' : 's'}, ${waves} wave${waves === 1 ? '' : 's'}).`,
      emphasis: 'normal'
    });
  }
  if (dispatchLog.length) {
    decisions.push({
      id: `D-CRD-${n++}`,
      label: `${dispatchLog.length} dispatch entr${dispatchLog.length === 1 ? 'y' : 'ies'} logged.`,
      emphasis: 'normal'
    });
  }
  if (deviations.length) {
    const ids = deviations.map(d => d.id || 'dev').join(', ');
    decisions.push({
      id: `D-CRD-${n++}`,
      label: `Logged inline-deviations (${ids}).`,
      emphasis: 'normal'
    });
  }
  // Re-engagement: if any escalation routes back through coordinator
  const escAffectingCoord = (escalations || []).filter(e =>
    (e.route_path || []).some(p => p.agent_id === 'coordinator')
  );
  return {
    id: 'coordinator',
    label: 'Coordinator (initial dispatch)',
    decisions,
    revisited_by_escalation_id: escAffectingCoord[0]?.id
  };
}

function extractCoordinatorReengaged(runDir, escalations) {
  const escAffectingCoord = (escalations || []).filter(e =>
    (e.route_path || []).some(p => p.agent_id === 'coordinator-reengaged')
  );
  if (!escAffectingCoord.length) return null;
  const decisions = [];
  let n = 1;
  for (const esc of escAffectingCoord) {
    decisions.push({
      id: `D-CRD2-${n++}`,
      label: `Re-engaged for ${esc.id}: routed delta plan through sections.`,
      emphasis: 'escalation-impact'
    });
  }
  return { id: 'coordinator-reengaged', label: 'Coordinator (re-engaged)', decisions, is_impact_mode: true };
}

function extractSections(runDir) {
  const stateSections = path.join(runDir, 'state/sections');
  if (!fs.existsSync(stateSections)) return null;
  const files = fs.readdirSync(stateSections).filter(f => /^section-.*\.json$/.test(f));
  if (!files.length) return null;
  return {
    id: 'sections',
    label: 'Sections',
    decisions: [{ id: 'D-SEC-1', label: `${files.length} section${files.length === 1 ? '' : 's'} built + verified.`, emphasis: 'normal' }]
  };
}

function extractIntegrator(runDir) {
  const integrationDir = path.join(runDir, 'output/integration');
  if (!fs.existsSync(integrationDir)) return null;
  const files = listFiles(integrationDir);
  return {
    id: 'integrator',
    label: 'Integrator',
    decisions: [{ id: 'D-INT-1', label: `Assembled ${files.length} integration file${files.length === 1 ? '' : 's'}.`, emphasis: 'normal' }]
  };
}

function extractEditor(runDir) {
  const review = readJsonSafe(path.join(runDir, 'decisions/editor/review-v1.json'));
  if (!review) return null;
  const decisions = [];
  let n = 1;
  // Editor review schema varies — pull what's commonly there
  if (review.scope_decision) {
    decisions.push({ id: `D-EDT-${n++}`, label: `Scope decision: ${truncate(review.scope_decision, 60)}.`, emphasis: 'normal' });
  }
  if (review.changes_requested && review.changes_requested.length) {
    decisions.push({ id: `D-EDT-${n++}`, label: `Requested ${review.changes_requested.length} change${review.changes_requested.length === 1 ? '' : 's'}.`, emphasis: 'normal' });
  }
  if (!decisions.length) {
    decisions.push({ id: 'D-EDT-1', label: 'Editor review completed.', emphasis: 'normal' });
  }
  return { id: 'editor', label: 'Editor', decisions };
}

function extractCritic(runDir) {
  const flags = readJsonlSafe(path.join(runDir, 'audit/flags.jsonl'));
  if (!flags.length) return null;
  const medHigh = flags.filter(f => /medium|high/i.test(f.severity || ''));
  const decisions = [];
  let n = 1;
  decisions.push({ id: `D-CRT-${n++}`, label: `Raised ${flags.length} flag${flags.length === 1 ? '' : 's'} (${medHigh.length} medium/high).`, emphasis: 'normal' });
  return { id: 'critic', label: 'Critic (final sweep)', decisions };
}

function extractCV(runDir) {
  const report = readJsonSafe(path.join(runDir, 'output/verification/report.json'));
  if (!report) return null;
  const decisions = [];
  let n = 1;
  decisions.push({
    id: `D-CV-${n++}`,
    label: `Verdict: ${report.verdict || 'unknown'}.`,
    emphasis: 'normal'
  });
  const checks = report.assumption_checks || [];
  if (checks.length) {
    const verified = checks.filter(c => c.verified !== false).length;
    decisions.push({
      id: `D-CV-${n++}`,
      label: `${verified}/${checks.length} assumptions verified.`,
      emphasis: 'normal'
    });
  }
  if (report.production_fidelity) {
    decisions.push({ id: `D-CV-${n++}`, label: 'Production-fidelity gate cleared.', emphasis: 'normal' });
  }
  return { id: 'cv', label: 'Convergence Verifier', decisions };
}

// ---- escalation extraction ----
function extractEscalations(runDir) {
  const queueDir = path.join(runDir, 'state/escalations/queue');
  if (!fs.existsSync(queueDir)) return [];
  const queueFiles = fs.readdirSync(queueDir).filter(f => /^esc-.*\.json$/.test(f));
  const out = [];
  for (const f of queueFiles) {
    const raised = readJsonSafe(path.join(queueDir, f));
    if (!raised) continue;
    const id = raised.id || f.replace(/\.json$/, '');
    const routing = readJsonSafe(path.join(runDir, `state/escalations/routed/${id}-routing.json`));
    const resolution = readJsonSafe(path.join(runDir, `state/escalations/routed/${id}-resolution.json`));
    // Construct the route_path the highway will visualize
    const route_path = [];
    // 1. Raised at (originating agent)
    route_path.push({
      agent_id: normalizeAgentId(raised.raised_by),
      side: 'right',
      label: `raised by ${humanize(raised.raised_by)}`,
      kind: 'origin'
    });
    // 2. Arbiter classification
    if (routing) {
      route_path.push({
        agent_id: 'arbiter',
        side: 'right',
        label: `severity ${routing.classified_severity || '?'}; routed to ${humanize(routing.dispatched_to || '?')}`,
        kind: 'route'
      });
      // 3. Dispatched to (impact-mode landing)
      route_path.push({
        agent_id: normalizeAgentId(routing.dispatched_to),
        side: 'right',
        label: 'delta plan',
        kind: 'land-impact'
      });
    }
    // 4. Resolution
    if (resolution) {
      route_path.push({
        agent_id: normalizeAgentId(resolution.resolved_by),
        side: 'right',
        label: `verdict ${resolution.verdict || '?'}`,
        kind: 'resolve'
      });
    }
    out.push({
      id,
      raised_by: normalizeAgentId(raised.raised_by),
      raised_at_decision: raised.context_pointers?.[0]?.decision_id || undefined,
      summary: raised.summary || raised.details || '',
      severity: raised.severity || routing?.classified_severity || 'unknown',
      route_path,
      resolution_verdict: resolution?.verdict || 'pending'
    });
  }
  return out;
}

function normalizeAgentId(raw) {
  if (!raw) return 'unknown';
  const s = String(raw).toLowerCase();
  if (/critic/.test(s)) return 'critic';
  if (/arbiter/.test(s)) return 'arbiter';
  if (/technical[-_ ]discovery|^td[_-]/.test(s)) return /impact|reengage|re-engage/.test(s) ? 'td-impact' : 'td-initial';
  if (/discovery|^dsc\b/.test(s)) return 'discovery';
  if (/coordinator|^crd\b/.test(s)) return /reengage|re-engage|impact/.test(s) ? 'coordinator-reengaged' : 'coordinator';
  if (/edit/.test(s)) return 'editor';
  if (/integrator/.test(s)) return 'integrator';
  if (/convergence|verifier|^cv\b/.test(s)) return 'cv';
  return s;
}

function humanize(agentId) {
  if (!agentId) return 'unknown';
  const map = {
    discovery: 'Discovery',
    'td-initial': 'TD',
    'td-impact': 'TD impact mode',
    coordinator: 'Coordinator',
    'coordinator-reengaged': 'Coordinator (re-engaged)',
    critic: 'Critic',
    arbiter: 'Arbiter',
    integrator: 'Integrator',
    editor: 'Editor',
    cv: 'Convergence Verifier'
  };
  return map[agentId] || agentId;
}

// ---- helpers ----
function readDirJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => readJsonSafe(path.join(dir, f))).filter(Boolean);
}

function listFiles(dir) {
  const out = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      if (f.isDirectory()) walk(path.join(d, f.name));
      else out.push(path.join(d, f.name));
    }
  }
  walk(dir);
  return out;
}

function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ---- main ----
export function extract(slug, runDir, repoRoot) {
  const prompt = readTextSafe(path.join(runDir, 'prompt.txt'), '(prompt.txt missing)');
  const report = readJsonSafe(path.join(runDir, 'output/verification/report.json')) || {};
  // best-effort telos + deliverable_kind from codex/data/index.json
  let telos = '';
  let deliverable_kind = 'unknown';
  try {
    const idx = JSON.parse(fs.readFileSync(path.join(repoRoot, 'codex/data/index.json'), 'utf8'));
    const r = (idx.runs || []).find(x => x.slug === slug);
    if (r) {
      telos = r.telos || '';
      deliverable_kind = r.deliverable_kind || 'unknown';
    }
  } catch { /* fall through */ }

  // Escalations are extracted first because some role extractors check them
  const escalations = extractEscalations(runDir);

  // Mark agents on the route_path as revisited
  const revisitedByEsc = {};
  for (const esc of escalations) {
    for (const wp of esc.route_path) {
      if (wp.agent_id && wp.agent_id !== 'unknown') {
        revisitedByEsc[wp.agent_id] = esc.id;
      }
    }
  }

  // Build phases bottom-up.
  const phases = [];

  // Phase 1: Discovery
  const dsc = extractDiscovery(runDir);
  if (dsc) {
    if (revisitedByEsc[dsc.id]) dsc.revisited_by_escalation_id = revisitedByEsc[dsc.id];
    phases.push({ id: 'discovery', name: 'PHASE 1 — DISCOVERY', agents: [dsc] });
  }

  // Phase 2: Technical Discovery (initial + optional impact)
  const tdInitial = extractTechnicalDiscoveryInitial(runDir, escalations);
  const tdImpact = extractTechnicalDiscoveryImpact(runDir);
  if (tdInitial || tdImpact) {
    const agents = [];
    if (tdInitial) {
      if (revisitedByEsc[tdInitial.id]) tdInitial.revisited_by_escalation_id = revisitedByEsc[tdInitial.id];
      agents.push(tdInitial);
    }
    if (tdImpact) agents.push(tdImpact);
    const name = tdImpact
      ? 'PHASE 2 — TECHNICAL DISCOVERY (initial → revisited in impact mode)'
      : 'PHASE 2 — TECHNICAL DISCOVERY';
    phases.push({ id: 'technical-discovery', name, agents });
  }

  // Phase 3: Build (Coordinator + Sections + Editor)
  const coord = extractCoordinator(runDir, escalations);
  const coordRe = extractCoordinatorReengaged(runDir, escalations);
  const sections = extractSections(runDir);
  const editor = extractEditor(runDir);
  const buildAgents = [];
  if (coord) buildAgents.push(coord);
  if (coordRe) buildAgents.push(coordRe);
  if (sections) buildAgents.push(sections);
  if (editor) buildAgents.push(editor);
  if (buildAgents.length) {
    phases.push({ id: 'build', name: 'PHASE 3 — BUILD', agents: buildAgents });
  }

  // Phase 4: Integration
  const integrator = extractIntegrator(runDir);
  if (integrator) {
    phases.push({ id: 'integration', name: 'PHASE 4 — INTEGRATION', agents: [integrator] });
  }

  // Phase 5: Verification (Critic + CV)
  const critic = extractCritic(runDir);
  const cv = extractCV(runDir);
  const verifAgents = [];
  if (critic) verifAgents.push(critic);
  if (cv) verifAgents.push(cv);
  if (verifAgents.length) {
    phases.push({ id: 'verification', name: 'PHASE 5 — VERIFICATION', agents: verifAgents });
  }

  // Stats
  let decision_count = 0;
  let agent_count = 0;
  for (const phase of phases) {
    for (const agent of phase.agents) {
      agent_count++;
      decision_count += agent.decisions.length;
    }
  }
  const stats = { decision_count, agent_count, escalation_count: escalations.length };

  return {
    slug,
    prompt: prompt.split('\n')[0].slice(0, 300),  // first line, truncated
    telos,
    verdict: report.verdict || 'unknown',
    deliverable_kind,
    phases,
    escalations,
    stats
  };
}

