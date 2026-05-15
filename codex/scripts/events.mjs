/**
 * events.mjs
 *
 * Event extraction + role attribution for the Codex v0.2 layer.
 *
 * Exports:
 *   extractEvents(ctx)       → returns { events, first_delivery }
 *   roleTotals(events)       → per-run role-attribution rollup
 *   PHASE_TO_ROLE            → fallback role inference table
 *   PRINCIPLE_TO_ROLES       → principle-driven inference table
 *
 * Inputs are the parsed pieces the aggregator already has on hand:
 *   - reportText       run-report.md raw text
 *   - rcaText          root-cause-analysis.md raw text (or null)
 *   - reAudit          parsed v16-reaudit.json (or null)
 *   - flags            audit/flags.jsonl entries
 *   - inlineDeviations parsed state/inline-deviations/*.json
 *   - demotions        parsed decisions/discovery/demotion-v*.json
 *   - editor           parsed decisions/editor/review-v*.json
 *   - sev0Fixes        parsed state/escalations/sev0-fixes/*.json
 *   - dispatches       state/coordinator/dispatch-log.jsonl entries
 *   - curation         contents of codex/data/curation/{slug}.json or {}
 *   - cv               output/verification/report.json
 *   - ledger           decisions/discovery/ledger-v1.json
 *
 * The extractor is tolerant: any missing piece just yields fewer events.
 * The function never throws on bad input; it logs and continues.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PHASE_TO_ROLE = {
  discovery:    ['Discovery'],
  td:           ['TD'],
  build:        ['Coordinator', 'Builder'],
  integration:  ['Integrator'],
  verification: ['CV'],
  delivery:     ['Orchestrator'],
  post_delivery: [],   // user-side; no inference
  reaudit:      ['Re-Verification']
};

export const PRINCIPLE_TO_ROLES = {
  A: ['CV'],                  // Verification Fidelity
  B: ['Critic'],              // Audit Completeness
  C: ['TD', 'Critic'],        // Spec-to-Test Coverage
  D: ['TD'],                  // Path Coverage
  E: ['Discovery'],           // Atomic Lexical Anchors
  F: ['Researcher', 'TD'],    // External Authority Discipline
  G: ['CV'],                  // Deliverability Tier Discipline
  H: ['CV', 'TD']             // Verification Independence
};

// Recognized role names — used to detect role mentions in prose.
const ROLE_NAMES = [
  'Orchestrator', 'Discovery', 'TD', 'Technical Discovery', 'Researcher',
  'Coordinator', 'Overseer', 'Builder', 'Integrator', 'Critic',
  'CV', 'Convergence Verifier', 'Editor', 'Re-Verification',
  'Historian', 'Arbiter'
];

// Map of "alias seen in prose" -> "canonical role"
const ROLE_ALIAS = {
  'technical discovery': 'TD',
  'convergence verifier': 'CV',
  're-verification': 'Re-Verification',
  'reverification':    'Re-Verification'
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function trunc(s, n) {
  if (s == null || s === '') return s;
  if (typeof s !== 'string') s = String(s);
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function detectExplicitRoles(text) {
  if (!text) return [];
  const found = new Set();
  for (const role of ROLE_NAMES) {
    const re = new RegExp(`\\b${role.replace(/\\s+/g, '\\s+')}\\b`, 'i');
    if (re.test(text)) {
      const lc = role.toLowerCase();
      found.add(ROLE_ALIAS[lc] || role);
    }
  }
  return [...found];
}

function detectPrinciples(text) {
  if (!text) return [];
  const found = new Set();
  const re = /\bPrinciple\s+([A-H])\b/g;
  let m;
  while ((m = re.exec(text)) !== null) found.add(m[1]);
  return [...found];
}

function inferRoles(phase, principles) {
  const set = new Set();
  if (phase && PHASE_TO_ROLE[phase]) PHASE_TO_ROLE[phase].forEach(r => set.add(r));
  for (const p of (principles || [])) {
    (PRINCIPLE_TO_ROLES[p] || []).forEach(r => set.add(r));
  }
  return [...set];
}

function confidenceFor({ explicit, inferred }) {
  if (explicit && explicit.length) return 'high';
  if (inferred && inferred.length >= 2) return 'medium';
  if (inferred && inferred.length === 1) return 'low';
  return 'low';
}

function makeEvent(idx, partial) {
  const explicit = partial.explicit_roles || detectExplicitRoles(partial.verbatim_excerpt || partial.summary || '');
  const principles = partial.principles_implicated || detectPrinciples(partial.verbatim_excerpt || partial.summary || '');
  const inferred = inferRoles(partial.phase, principles).filter(r => !explicit.includes(r));
  return {
    id: 'evt-' + String(idx).padStart(3, '0'),
    kind:      partial.kind,
    phase:     partial.phase || null,
    ts:        partial.ts || null,
    module:    partial.module || null,
    summary:   trunc(partial.summary, 240),
    verbatim_excerpt: trunc(partial.verbatim_excerpt, 500),
    source_file: partial.source_file || null,
    severity:  partial.severity != null ? partial.severity : null,
    explicit_roles: explicit,
    inferred_roles: inferred,
    principles_implicated: principles,
    confidence: partial.confidence || confidenceFor({ explicit, inferred }),
    curated:   !!partial.curated
  };
}

// ---------------------------------------------------------------------------
// Extractor sub-functions (one per kind)
// ---------------------------------------------------------------------------

function isPassingFlag(f) {
  // Audit flag schemas vary across the run corpus. Treat any of these as
  // "all-clear, skip from event timeline":
  if (f.flagged === 0 || f.flagged === false) return true;
  if (f.result === 'pass' || f.status === 'pass') return true;
  if (f.verdict === 'clean') return true;
  if (Array.isArray(f.findings) && f.findings.length === 0) return true;
  if (typeof f.summary === 'string' && /^clean$/i.test(f.summary)) return true;
  if (f.severity === 'none' && !f.detail) return true;
  return false;
}

function fromAuditFlags(flags, slug, push, counter) {
  for (let i = 0; i < (flags || []).length; i++) {
    const f = flags[i];
    if (!f) continue;
    if (!f.check) continue;                  // cycle-summary rows have no .check
    if (f.check === 'summary') continue;     // explicit summary checks
    if (isPassingFlag(f)) continue;          // skip routine "all-clear" entries
    push(makeEvent(counter(), {
      kind: 'audit_flag',
      phase: 'verification',
      ts: f.ts || null,
      summary: f.check ? `[${f.check}] ${f.detail || f.summary || ''}` : (f.summary || ''),
      verbatim_excerpt: f.detail || f.summary || '',
      source_file: `runs/${slug}/audit/flags.jsonl`,
      severity: f.severity === 'high' ? 1 : f.severity === 'medium' ? 2 : f.severity === 'low' ? 3 : null
    }));
  }
}

function fromInlineDeviations(devs, slug, push, counter) {
  for (const d of (devs || [])) {
    if (!d) continue;
    push(makeEvent(counter(), {
      kind: 'inline_deviation',
      phase: 'build',
      ts: d.ts || d.timestamp || null,
      module: d.section || d.module || null,
      summary: `[${d.category || d.kind || 'deviation'}] ${d.description || d.summary || ''}`,
      verbatim_excerpt: d.nested_equivalent || d.rationale || d.description || '',
      source_file: d.source_file || null,
      explicit_roles: ['Coordinator']
    }));
  }
}

function fromDemotions(dems, slug, push, counter) {
  for (const d of (dems || [])) {
    if (!d) continue;
    push(makeEvent(counter(), {
      kind: 'demotion',
      phase: 'discovery',
      summary: `Demotion: ${d.proper_noun_id || d.surface || '?'} → ${d.verdict || '?'}`,
      verbatim_excerpt: d.rationale || JSON.stringify(d.guardrails || {}),
      source_file: d.source_file || null,
      explicit_roles: ['Discovery'],
      principles_implicated: ['E']
    }));
  }
}

function fromSev0(fixes, slug, push, counter) {
  for (const f of (fixes || [])) {
    if (!f) continue;
    push(makeEvent(counter(), {
      kind: 'sev0_fix',
      phase: f.phase || 'build',
      summary: `Sev 0 fix: ${f.summary || f.description || ''}`,
      verbatim_excerpt: f.rationale || f.diff_summary || '',
      severity: 0,
      explicit_roles: f.fixer ? [f.fixer] : []
    }));
  }
}

function fromReAudit(reAudit, slug, push, counter) {
  if (!reAudit) return;
  const gates = Array.isArray(reAudit.gates_re_evaluated) ? reAudit.gates_re_evaluated : [];
  for (const g of gates) {
    if (!g) continue;
    push(makeEvent(counter(), {
      kind: 'reaudit_gate',
      phase: 'reaudit',
      summary: `[${g.gate}] (${g.introduced_in}) ${g.result}`,
      verbatim_excerpt: g.rationale || '',
      source_file: `runs/${slug}/v16-reaudit.json`,
      severity: g.result === 'fail' ? 1 : null,
      explicit_roles: ['Re-Verification']
    }));
  }
  for (const obs of (reAudit.incidental_observations || [])) {
    push(makeEvent(counter(), {
      kind: 'rca_finding',
      phase: 'reaudit',
      summary: 'Incidental: ' + (typeof obs === 'string' ? trunc(obs, 200) : (obs.detail || obs.summary || '')),
      verbatim_excerpt: typeof obs === 'string' ? obs : (obs.detail || obs.summary || ''),
      source_file: `runs/${slug}/v16-reaudit.json`
    }));
  }
}

function fromRootCause(rcaText, slug, push, counter) {
  if (!rcaText) return;
  // Heading-driven extraction. We split on `###` and `##` then keep level-3
  // findings as discrete events; level-2 sections become umbrella events.
  const sections = rcaText.split(/\n(?=##\s+)/);
  for (const sec of sections) {
    const head = (sec.match(/^##\s+(.+)/) || [])[1];
    if (!head) continue;
    const body = sec.replace(/^##\s+.+\n/, '');
    // Pull principle assessments — paragraphs that lead with "Principle X — name"
    const principleRe = /(Principle\s+[A-H])\s*[—-]\s*([^\n]+)\n+([^]*?)(?=\nPrinciple\s+[A-H]|\n##|\n###|$)/g;
    let m;
    while ((m = principleRe.exec(body)) !== null) {
      const pId = m[1].match(/[A-H]/)[0];
      push(makeEvent(counter(), {
        kind: 'rca_finding',
        phase: 'reaudit',
        summary: `${m[1]} — ${trunc(m[2].trim(), 100)}`,
        verbatim_excerpt: m[3].trim().split(/\n{2,}/)[0],
        source_file: `runs/${slug}/root-cause-analysis.md`,
        principles_implicated: [pId]
      }));
    }
    // Pull named failure modes — `### 1. Title`
    const failModeRe = /###\s+\d+\.\s+([^\n]+)\n+([^]*?)(?=\n###|\n##|$)/g;
    let m2;
    while ((m2 = failModeRe.exec(sec)) !== null) {
      push(makeEvent(counter(), {
        kind: 'rca_finding',
        phase: 'reaudit',
        summary: `Failure mode: ${m2[1].trim()}`,
        verbatim_excerpt: m2[2].trim().split(/\n{2,}/)[0],
        source_file: `runs/${slug}/root-cause-analysis.md`
      }));
    }
  }
}

function fromRunReportStatus(reportText, slug, push, counter) {
  if (!reportText) return;
  // STATUS blockquote at the top: "> **STATUS: RECLASSIFIED FAILED ..."
  const m = reportText.match(/^>\s*\*\*STATUS:?\s*([^\n*]+)\*\*[ \t]*([^\n]*)/m);
  if (m) {
    push(makeEvent(counter(), {
      kind: 'reclassification',
      phase: 'post_delivery',
      summary: 'STATUS: ' + m[1].trim() + (m[2] ? ' — ' + m[2].trim() : ''),
      verbatim_excerpt: m[0],
      source_file: `runs/${slug}/run-report.md`
    }));
  }
  // "Original verdict ... WRONG" / "Original CV verdict ... superseded by FAILED"
  const wrongRe = /\*\*Original[^*]{0,40}verdict[^*]{0,40}:\*\*[ \t]*([^\n]+)/i;
  const w = reportText.match(wrongRe);
  if (w && /wrong|superseded|reclassif/i.test(w[1])) {
    push(makeEvent(counter(), {
      kind: 'user_first_contact_failure',
      phase: 'post_delivery',
      summary: 'Original delivery was reclassified as failed: ' + trunc(w[1], 160),
      verbatim_excerpt: w[0],
      source_file: `runs/${slug}/run-report.md`
    }));
  }
  // "Verdict on user installation" (streamdock v1.8 pattern)
  const userInstall = reportText.match(/\*\*Verdict on user installation[^*]*\*\*[ \t]*\*?\*?([^*\n][^\n]*)/i);
  if (userInstall && /fail/i.test(userInstall[1])) {
    push(makeEvent(counter(), {
      kind: 'user_first_contact_failure',
      phase: 'post_delivery',
      summary: 'User installation failed: ' + trunc(userInstall[1], 160),
      verbatim_excerpt: userInstall[0],
      source_file: `runs/${slug}/run-report.md`
    }));
  }
}

function fromCurationEvents(curation, push, counter) {
  if (!curation || !Array.isArray(curation.events)) return;
  for (const e of curation.events) {
    push(makeEvent(counter(), Object.assign({}, e, { curated: true })));
  }
}

// ---------------------------------------------------------------------------
// First-delivery outcome derivation
// ---------------------------------------------------------------------------

export function deriveFirstDeliveryOutcome(ctx) {
  const { curation, reportText, rcaText, summary } = ctx;

  // 1. Curation overlay wins outright.
  if (curation && curation.first_delivery_outcome) {
    return {
      outcome: curation.first_delivery_outcome,
      source: 'curation'
    };
  }

  // 2. Run-report STATUS block: explicit reclassification.
  if (reportText) {
    const statusMatch = reportText.match(/^>\s*\*\*STATUS:?\s*([^\n*]+)\*\*/m);
    if (statusMatch) {
      const s = statusMatch[1].toLowerCase();
      if (s.includes('reclassif') && s.includes('fail'))   return { outcome: 'failed_user_reprompted', source: 'run_report_status' };
      if (s.includes('failed') && s.includes('recover'))   return { outcome: 'failed_user_reprompted', source: 'run_report_status' };
      if (s.includes('failed'))                            return { outcome: 'failed_unrecoverable',   source: 'run_report_status' };
    }
    // Explicit user-installation failure (streamdock v1.8 pattern)
    if (/\*\*Verdict on user installation[^*]*\*\*[ \t]*\*?\*?FAIL/i.test(reportText)) {
      return { outcome: 'failed_user_reprompted', source: 'run_report_status' };
    }
    // "WRONG" or "superseded by FAILED" on Original verdict
    if (/\*\*Original[^*]{0,40}verdict[^*]*\*\*[ \t]*[^\n]*?(?:WRONG|superseded by FAILED|reclassif)/i.test(reportText)) {
      return { outcome: 'failed_user_reprompted', source: 'run_report_status' };
    }
  }

  // 3. Root-cause-analysis: "what the user actually got" naming first-contact fail
  if (rcaText) {
    if (/what (?:the architecture verified|verified) vs\.?\s+what the user actually got/i.test(rcaText)
        && /first[- ]contact/i.test(rcaText)) {
      return { outcome: 'failed_user_reprompted', source: 'rca' };
    }
  }

  // 4. Uncertainty Manifest non-empty + pass_with_concerns → succeeded_with_concerns
  if (summary && summary.verdict === 'pass_with_concerns') {
    return { outcome: 'succeeded_with_concerns', source: 'uncertainty_manifest' };
  }

  // 5. No clear signal — default unverified (NOT 'succeeded')
  return { outcome: 'unverified', source: 'default' };
}

// ---------------------------------------------------------------------------
// Main extractor entry point
// ---------------------------------------------------------------------------

export function extractEvents(ctx) {
  const events = [];
  let counter = 0;
  const nextIdx = () => counter++;
  const push = (e) => events.push(e);

  const { slug, reportText, rcaText, reAudit, flags,
          inlineDeviations, demotions, sev0Fixes, curation, summary } = ctx;

  fromRunReportStatus(reportText, slug, push, nextIdx);
  fromReAudit(reAudit, slug, push, nextIdx);
  fromRootCause(rcaText, slug, push, nextIdx);
  fromAuditFlags(flags, slug, push, nextIdx);
  fromInlineDeviations(inlineDeviations, slug, push, nextIdx);
  fromDemotions(demotions, slug, push, nextIdx);
  fromSev0(sev0Fixes, slug, push, nextIdx);
  fromCurationEvents(curation, push, nextIdx);

  const fdo = deriveFirstDeliveryOutcome({ curation, reportText, rcaText, summary });
  return { events, first_delivery: fdo };
}

// ---------------------------------------------------------------------------
// Role-attribution rollups
// ---------------------------------------------------------------------------

export function roleTotals(events) {
  const totals = {};
  for (const e of events) {
    const all = new Set([...(e.explicit_roles || []), ...(e.inferred_roles || [])]);
    for (const r of all) {
      if (!totals[r]) totals[r] = { high: 0, medium: 0, low: 0, total: 0, explicit_count: 0 };
      totals[r][e.confidence || 'low']++;
      totals[r].total++;
      if ((e.explicit_roles || []).includes(r)) totals[r].explicit_count++;
    }
  }
  return totals;
}

export function corpusRoleTotals(perRunTotals) {
  const totals = {};
  for (const slug in perRunTotals) {
    const rt = perRunTotals[slug];
    for (const role in rt) {
      if (!totals[role]) totals[role] = { high: 0, medium: 0, low: 0, total: 0, explicit_count: 0, runs_implicated: 0 };
      totals[role].high += rt[role].high;
      totals[role].medium += rt[role].medium;
      totals[role].low += rt[role].low;
      totals[role].total += rt[role].total;
      totals[role].explicit_count += rt[role].explicit_count;
      totals[role].runs_implicated++;
    }
  }
  return totals;
}

export function firstDeliveryDistribution(summaries) {
  const dist = {
    succeeded: 0,
    succeeded_with_concerns: 0,
    failed_user_reprompted: 0,
    failed_unrecoverable: 0,
    unverified: 0
  };
  for (const s of summaries) {
    const o = s.first_delivery_outcome || 'unverified';
    if (dist[o] !== undefined) dist[o]++;
  }
  return dist;
}

// ---------------------------------------------------------------------------
// Revision lineage (v0.3)
// ---------------------------------------------------------------------------
//
// Builds a `revisions[]` array distinguishing the primary Auto Builder run
// from additional steps (user re-prompts, hand-patches, follow-up builds).
//
// Derivation precedence:
//   1. Curation overlay revisions[] — full lineage from the curator
//   2. Future: git log adapter (not yet implemented; awaits AutoBuilder-
//      Maintenance to enact a commit-signal convention)
//   3. Default: synthesize a single rev-0 primary_run from the run's
//      existing fields
//
// Cardinal rule: revisions never change `first_delivery_outcome`. The
// primary-run truth is sacred; additional steps add value but don't alter
// the primary-run rating.

export function extractRevisions(ctx) {
  // Field-level three-way merge across:
  //   - synthesized: rev-0 derived from summary (always present)
  //   - git:         readGitLog() output (zero or more entries; primary_run + additional_step)
  //   - curation:    codex/data/curation/{slug}.json#revisions[] (zero or more)
  //
  // Per the git-integration-proposal §6 closing paragraph and Codex's
  // 2026-05-14 refinement #2: git owns `ref` and `ts` authoritatively.
  // Curation owns `rationale`, `diff_summary`, `triggered_by_event`,
  // `triggered_by_outcome`, `verdict`. For `summary`, prefer git's commit
  // subject unless curation explicitly opts in via `curated_summary_override: true`.
  // The primary_run's `first_delivery_outcome` always comes from the
  // build summary (the v0.3 cardinal rule).
  //
  // The merge proceeds by revision id, allowing additional_step entries
  // to be partially-described by either source and completed by the other.

  const { curation, summary, gitRevisions } = ctx;

  // ---- Bucket each source by id ----

  // (a) Synthesized rev-0 — always present.
  const synthesized = {
    'rev-0': {
      id: 'rev-0',
      kind: 'primary_run',
      ref: null,
      ts: summary && summary.date ? summary.date : null,
      summary: 'Initial Auto Builder run',
      verdict: summary ? summary.verdict : null,
      first_delivery_outcome: summary ? summary.first_delivery_outcome : null,
      diff_summary: null,
      source: 'synthesized'
    }
  };

  // (b) Git-derived entries.
  const gitMap = {};
  for (const r of (gitRevisions || [])) {
    if (r && r.id) gitMap[r.id] = r;
  }

  // (c) Curation entries.
  const curMap = {};
  for (const r of (curation && Array.isArray(curation.revisions) ? curation.revisions : [])) {
    if (!r) continue;
    const id = r.id || (r.kind === 'primary_run' ? 'rev-0' : null);
    if (id) curMap[id] = r;
  }

  // ---- Merge ----
  const allIds = new Set([
    ...Object.keys(synthesized),
    ...Object.keys(gitMap),
    ...Object.keys(curMap)
  ]);

  const merged = [];
  for (const id of allIds) {
    const s = synthesized[id] || null;
    const g = gitMap[id] || null;
    const c = curMap[id] || null;

    // Determine kind: prefer curation > git > synthesized.
    const kind = (c && c.kind) || (g && g.kind) || (s && s.kind)
                 || (id === 'rev-0' ? 'primary_run' : 'additional_step');

    // ref + ts: git owns authoritatively when present; fall back to curation
    // (e.g., for revisions captured in curation but never committed), then
    // to synthesized.
    const ref = (g && g.ref) || (c && c.ref) || (s && s.ref) || null;
    const ts  = (g && g.ts)  || (c && c.ts)  || (s && s.ts)  || null;

    // summary: git wins unless curation has curated_summary_override:true.
    let mergedSummary;
    if (c && c.curated_summary_override && c.summary) {
      mergedSummary = c.summary;
    } else if (g && g.summary) {
      mergedSummary = g.summary;
    } else if (c && c.summary) {
      mergedSummary = c.summary;
    } else if (s && s.summary) {
      mergedSummary = s.summary;
    } else {
      mergedSummary = (kind === 'primary_run' ? 'Initial Auto Builder run' : 'Additional step');
    }

    // Curation-owned narrative fields. Curation wins where set.
    const rationale = (c && c.rationale) || null;
    const diff_summary = (c && c.diff_summary) || null;
    const triggered_by_event = (c && c.triggered_by_event) || null;
    const triggered_by_outcome = (c && c.triggered_by_outcome) || null;

    // verdict: curation > git (parsed from annotation if available) > synthesized.
    const verdict = (c && c.verdict) || (g && g.verdict) || (s && s.verdict) || null;

    // first_delivery_outcome: ALWAYS comes from synthesized (build summary).
    // This is the v0.3 cardinal rule — git or curation MUST NOT override it.
    const first_delivery_outcome = (s && s.first_delivery_outcome) || null;

    // Sources: a small array telling the dashboard where the data came from.
    const sources = [];
    if (s) sources.push('synthesized');
    if (g) sources.push('git');
    if (c) sources.push('curation');

    const rev = {
      id,
      kind,
      ref,
      ts,
      summary: mergedSummary,
      verdict,
      rationale,
      diff_summary,
      triggered_by_event,
      triggered_by_outcome,
      sources
    };
    // Only attach first_delivery_outcome to primary_run (v0.3 schema)
    if (kind === 'primary_run') {
      rev.first_delivery_outcome = first_delivery_outcome;
    }
    // Preserve git's contributing_commits if present — useful for narrative.
    if (g && Array.isArray(g.contributing_commits)) {
      rev.contributing_commits = g.contributing_commits;
    }
    // Curation-only fields preserved for the curator's audit trail
    if (c) {
      if (c.curated_by) rev.curated_by = c.curated_by;
      if (c.curated_at) rev.curated_at = c.curated_at;
    }
    merged.push(rev);
  }

  // ---- Stable sort: rev-0 first, then rev-1, rev-2, ... numerically ----
  merged.sort((a, b) => {
    if (a.id === 'rev-0' && b.id !== 'rev-0') return -1;
    if (b.id === 'rev-0' && a.id !== 'rev-0') return 1;
    const an = parseInt((a.id || '').replace(/^rev-/, ''), 10);
    const bn = parseInt((b.id || '').replace(/^rev-/, ''), 10);
    if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
    return (a.id || '').localeCompare(b.id || '');
  });

  return merged;
}

// Tag each event with the revision it belongs to. Default: rev-0. Curated
// events may carry a `rev_id` field that we honor; future git-driven events
// will be tagged by their commit's revision.
export function tagEventsWithRevisions(events, revisions) {
  const validIds = new Set(revisions.map(r => r.id));
  for (const e of events) {
    if (e.rev_id && validIds.has(e.rev_id)) continue;
    e.rev_id = 'rev-0';
  }
  return events;
}

