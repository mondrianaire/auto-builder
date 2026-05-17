// ============================================================================
// architecture/scripts/meta-flowchart-extract.mjs
//
// Pass 1 of 4 for the Meta-architecture flowchart generator. Parses
// architecture/role_charters.md to extract per-role data:
//   - title       (canonical role name)
//   - roleKey     (palette key — discovery/td/coordinator/etc.)
//   - description (1-sentence purpose, derived from the opening paragraph)
//   - atomicSteps (numbered Process list, condensed to 1-line plain language)
//   - boundaries  (short "Boundaries" bullets where useful)
//   - mode        (initial / amendment / demotion / impact / planning /
//                  escalation / scheduled / null for single-mode roles)
//   - wrapperKey  (groups multi-mode roles: 'discovery' / 'td' / 'researcher';
//                  null for single-mode)
//
// The output is a structured graph the layout pass can consume without
// re-parsing the charter file.
//
// Multi-mode roles are emitted as multiple entries with the same wrapperKey
// (e.g., three Discovery entries: discovery-initial, discovery-amendment,
// discovery-demotion). The layout pass groups them under a wrapper box.
//
// Build-agnostic: this extractor produces the same graph regardless of any
// specific build. The graph IS the system.
// ============================================================================

import { readFileSync } from 'node:fs';

// ---- role-name to roleKey + wrapperKey mapping ----
// Single source of truth for how a charter heading maps to palette + wrapper.
const ROLE_REGISTRY = {
  'Orchestrator Charter':                          { roleKey: 'orchestrator', wrapperKey: null,         mode: null,         emits: true  },
  'Discovery Charter (Initial Mode)':              { roleKey: 'discovery',    wrapperKey: 'discovery',  mode: 'initial',    emits: true  },
  'Discovery Charter (Amendment Mode)':            { roleKey: 'discovery',    wrapperKey: 'discovery',  mode: 'amendment',  emits: true  },
  'Discovery Charter (Demotion Mode)':             { roleKey: 'discovery',    wrapperKey: 'discovery',  mode: 'demotion',   emits: true  },
  'Technical Discovery Charter (Initial Mode)':    { roleKey: 'td',           wrapperKey: 'td',         mode: 'initial',    emits: true  },
  'Technical Discovery Charter (Impact-Analysis Mode)': { roleKey: 'td',      wrapperKey: 'td',         mode: 'impact',     emits: true  },
  'Editor Charter (v1.9, new role)':               { roleKey: 'editor',       wrapperKey: null,         mode: null,         emits: true  },
  'Coordinator Charter':                           { roleKey: 'coordinator',  wrapperKey: null,         mode: null,         emits: true  },
  'Critic Charter':                                { roleKey: 'critic',       wrapperKey: null,         mode: null,         emits: true  },
  'Arbiter Charter':                               { roleKey: 'arbiter',      wrapperKey: null,         mode: null,         emits: true  },
  'Historian Charter':                             { roleKey: 'historian',    wrapperKey: null,         mode: null,         emits: false },
  'Researcher Charter (Planning Mode)':            { roleKey: 'researcher',   wrapperKey: 'researcher', mode: 'planning',   emits: true  },
  'Researcher Charter (Escalation Mode)':          { roleKey: 'researcher',   wrapperKey: 'researcher', mode: 'escalation', emits: true  },
  'Overseer Charter':                              { roleKey: 'overseer',     wrapperKey: null,         mode: null,         emits: true  },
  'Builder Charter':                               { roleKey: 'builder',      wrapperKey: null,         mode: null,         emits: true  },
  'Integrator Charter':                            { roleKey: 'integrator',   wrapperKey: null,         mode: null,         emits: true  },
  'Convergence Verifier Charter':                  { roleKey: 'cv',           wrapperKey: null,         mode: null,         emits: true  },
  'Re-Verification Charter (v1.6)':                { roleKey: 'reVerify',     wrapperKey: null,         mode: null,         emits: true  }
};

// ---- canonical brief descriptions per role ----
// One-sentence purpose for each role, curated from charter opening
// paragraphs. Kept here (not auto-extracted) because charter openings often
// span multiple sentences and we want exactly one for the Meta layout.
const ROLE_DESCRIPTIONS = {
  'Orchestrator Charter':                          'The only role with direct user contact. Kickoff, escalation handling at the highest tier, final delivery.',
  'Discovery Charter (Initial Mode)':              "Translates the user's one-line prompt into a structured assumption ledger. Keeper of the user's atomic intent for the entire build.",
  'Discovery Charter (Amendment Mode)':            'Re-engaged when new evidence may invalidate prior assumptions. Produces a diff against the existing ledger — does not re-derive.',
  'Discovery Charter (Demotion Mode)':             "Invoked when a proper noun whose canonical source was required cannot be verified. Authoritative ruling on whether the build can proceed.",
  'Technical Discovery Charter (Initial Mode)':    "Translates Discovery's product spec into sections + interface contracts + technical decisions.",
  'Technical Discovery Charter (Impact-Analysis Mode)': 'Re-engaged on escalation. Produces a delta plan amending the build without forcing a full rebuild.',
  'Editor Charter (v1.9, new role)':               "Audits TD's output against the user's literal prompt and Discovery's atomic intent. Structural, not substantive.",
  'Coordinator Charter':                           'Flow control. Builds the dependency DAG, dispatches sections in waves, monitors progress, enacts delta plans on re-evaluation. Makes no architectural or product decisions.',
  'Critic Charter':                                'Detects drift and inconsistency. Scheduled audits during build + final sweep before CV.',
  'Arbiter Charter':                               'Event-driven. Classifies escalations and routes. Makes no content decisions.',
  'Historian Charter':                             'Background role. Maintains history/log.jsonl as canonical causal record with rationale captured. Excluded from Completion Reports.',
  'Researcher Charter (Planning Mode)':            "Dispatched by TD to investigate inflection points. Returns canonical evidence.",
  'Researcher Charter (Escalation Mode)':          "Dispatched by Arbiter to investigate problems that escaped a section's Overseer. Optimization criterion: blast-radius minimization.",
  'Overseer Charter':                              'Per-section. Decomposes into builder tasks, dispatches Builders, verifies output, updates section state.',
  'Builder Charter':                               'Narrow scope, one output file (or small handful) per dispatch. Completes one specific task.',
  'Integrator Charter':                            'Assembles section outputs into a single artifact. Single-pass, no agent collaboration.',
  'Convergence Verifier Charter':                  'Exercises the artifact under production fidelity. Multi-tier verification: first-contact, prompt-named-verb, then assumptions and edge cases.',
  'Re-Verification Charter (v1.6)':                'Audits a prior run under a newer architecture version. Recommends recovery action; does not enact.'
};

// ---- canonical atomic steps per role ----
// Curated from each charter's Process section, condensed to 1-line plain
// language. Kept here so the Meta is decoupled from charter wording drift
// (some charters phrase their Process steps as multi-line elaborated
// procedures; the Meta wants compact step labels).
const ROLE_ATOMIC_STEPS = {
  'Orchestrator Charter': [
    'Receive user prompt; create the run substrate at runs/{slug}/.',
    'Dispatch Discovery (Initial Mode) with the prompt.',
    'On Discovery returning a ledger: dispatch TD (Initial Mode).',
    'On TD returning sections + contracts: dispatch Editor.',
    'On Editor pass: dispatch Coordinator with the dispatch plan.',
    'Monitor for escalations; route Sev-4 to Demotion Mode, never to user.',
    'On Coordinator build-complete: dispatch Integrator, then Critic final sweep, then CV.',
    'On CV verdict: write run-report.md, finalize delivery, mark phase tasks complete.'
  ],
  'Discovery Charter (Initial Mode)': [
    "Read the prompt. Identify what's explicit vs. silent.",
    'Enumerate proper nouns; flag each as target-defining or supportive (Principle E).',
    "Use execution-context evidence (path separators, platform hints) to resolve environment IPs.",
    'Capture explicit assumptions at high confidence.',
    'Apply simplest-within-reason to silent items.',
    'Author the explicit telos — single canonical user-want sentence (Principle G).',
    'Log inflection points where multiple simple interpretations fork the build; pick a default per IP.',
    'Enumerate first-contact requirements for the artifact type (Principle G Tier 2).',
    'List explicit out-of-scope items.',
    'Write the ledger to decisions/discovery/ledger-v1.json.'
  ],
  'Discovery Charter (Amendment Mode)': [
    'Read the new evidence + the existing ledger.',
    'Run the four-question meta-check: does this invalidate, refine, add, or contradict prior assumptions?',
    'Author the diff — keep ledger-v1 untouched, write a ledger-diff-v{N}.json.',
    'Hand the diff back to the dispatcher (Orchestrator, TD impact, or Coordinator).'
  ],
  'Discovery Charter (Demotion Mode)': [
    'Read the unreachable proper noun + the canonical evidence trail showing it could not be verified.',
    'Determine the noun role (target_defining or supportive) and the four-guardrail hold (no atomicity loss, telos preserved, alternatives exhausted, audit-evident).',
    'Issue verdict: demote (with substitute), best_effort_target_commitment (no substitute, build best-effort), or hold (escalate higher).',
    'Write the demotion record to decisions/discovery/demotion-v{N}.json — never modify ledger-v1.json.'
  ],
  'Technical Discovery Charter (Initial Mode)': [
    "Read Discovery's ledger; select the prompt-named verb that anchors the artifact.",
    "Ratify Discovery's IPs via quick reasoning OR dispatch Researcher (Planning Mode) for any that require canonical evidence.",
    'Introduce TD-level IPs (library, data source, encoding choices); resolve each.',
    'Decompose into sections with explicit purposes and depends_on graph.',
    'Author interface contracts between sections; pass data not logic.',
    'Author the coverage-assertion catalogue (every prose claim → at least one assertion).',
    'Acknowledge production-fidelity caveats explicitly.',
    'Write sections-v1.json + contracts/original/* to disk.'
  ],
  'Technical Discovery Charter (Impact-Analysis Mode)': [
    "Read the escalation packet and Discovery's amendment (if any).",
    'For each existing section: classify delta — unaffected, salvageable, stop_and_scrap, or new.',
    'List required contract amendments.',
    'Author 38+ coverage assertions if escalation triggered a structural amendment.',
    'Write sections-v{N}.json as the delta plan; hand to Coordinator (not to Critic).'
  ],
  'Editor Charter (v1.9, new role)': [
    "Read the user's literal prompt and Discovery's ledger.",
    "Read TD's section plan + contracts.",
    'Check: does the plan address every proper noun and every first-contact requirement?',
    'Check: does the plan honor the telos? Any inflection-point default that contradicts the telos?',
    'Check: are there structural gaps between Discovery and TD that would mean the build ships against a different prompt?',
    'Return verdict: pass / pass_with_recommendations / fail — write decisions/editor/review-v1.json.'
  ],
  'Coordinator Charter': [
    'Read TD sections + contracts.',
    'Build the dependency DAG.',
    'Pick dispatch_mode (inline / nested / sub-agent) per ≤8 / >8 / explicit threshold.',
    'Dispatch Wave 1; verify each section against contract before next wave.',
    'On TD impact delta plan: enact (no-op for unaffected / re-dispatch for salvageable / new Overseer for new sections / amend contracts).',
    'On all sections verified + Integrator complete: write state/coordinator/build-complete.json.'
  ],
  'Critic Charter': [
    'Scheduled mode: audit state/sections/* + audit/* + state/escalations/* on each cycle.',
    'Detect drift between charter, ledger, sections plan, contracts, and live state.',
    'Severity-classify each finding (Sev 0-3 in scheduled, Sev 0-4 in final sweep).',
    'Final-sweep mode: 9 structural checks before CV — coverage holds, no unannotated contract drift, no inline-deviation overflow.',
    'For Sev ≥ medium: write audit/flags.jsonl + emit escalation packet.'
  ],
  'Arbiter Charter': [
    'Wake on new files in state/escalations/queue/ OR Critic high-severity flags OR 30s heartbeat.',
    'Classify the escalation: structural / decision / runtime / informational.',
    'Determine severity (Sev 0-4) and target role for resolution.',
    'Route: TD (impact) for structural, Discovery (amendment/demotion) for intent issues, Coordinator (re-engaged) for dispatch issues, Researcher (escalation) for missing canonical evidence.',
    'Write state/escalations/routed/esc-{nnn}-routing.json. Never write content decisions.'
  ],
  'Historian Charter': [
    'Subscribe to every state-changing file event across the run.',
    'For each event: capture the actor, target file, summary, and rationale.',
    'Append to history/log.jsonl as a single JSON line.',
    'Maintain history/decision-index.json by mapping decision IDs to their authoritative source files.'
  ],
  'Researcher Charter (Planning Mode)': [
    "Read TD's probe briefing.",
    'Identify canonical sources (official docs, project README, primary spec).',
    'Investigate the IP candidates against canonical evidence.',
    'Compare pros and cons; recommend one with rationale.',
    'Write research/probes/{id}/findings.json with citations.'
  ],
  'Researcher Charter (Escalation Mode)': [
    "Read Arbiter's escalation packet and the blast-radius context.",
    'Optimize for blast-radius minimization: prefer surgical fixes preserving in-flight work over wholesale rewrites.',
    'Investigate canonical alternatives; favor adapter layers when applicable.',
    'Recommend resolution with explicit blast-radius estimate.',
    'Write findings; Arbiter routes from there.'
  ],
  'Overseer Charter': [
    "Read your section's charter from sections-v{N}.json.",
    'Decompose into 1-N Builder tasks per the charter.',
    'Dispatch Builders sequentially (inline mode) or as sub-agents (nested mode).',
    'Verify each Builder output against the section contract before proceeding.',
    'On all builders complete: mark section verified in state/sections/{name}.json.',
    'On any block: write escalation packet to state/escalations/queue/; Arbiter routes.'
  ],
  'Builder Charter': [
    'Read your task briefing + your section contract + relevant ledger entries.',
    'Implement exactly the scope in the briefing; do not expand to adjacent improvements.',
    'Write output to output/builders/{section}/{builder}/output.{ext}.',
    'Write metadata.json describing what you produced + any acceptance-criteria self-checks.',
    'On block: write metadata.json with status: blocked + clear blocker_description.'
  ],
  'Integrator Charter': [
    'Read every section output from output/builders/* and every contract from contracts/*.',
    'Resolve import paths and inter-file references.',
    'Assemble the final artifact at output/integration/.',
    'Apply Sev-0 fixes inline (whitespace, trivial naming) without escalating.',
    'Write output/integration/manifest.json describing the assembled file tree.',
    'On unresolvable issue: write escalation packet.'
  ],
  'Convergence Verifier Charter': [
    "Read ledger + sections plan + contracts + Integrator's manifest.",
    "Configure production-fidelity environment (real components for everything the artifact loads at runtime).",
    'Run Tier 2 first-contact verifications (artifact loads, primary surface visible).',
    'On Tier 2 pass: verify the prompt-named verb against canonical evidence.',
    'Run assumption checks and out-of-scope checks.',
    'Run edge-case-testing artifact-exercise simulations.',
    'Write output/verification/report.json with verdict + per-check evidence.'
  ],
  'Re-Verification Charter (v1.6)': [
    'Read the target run + the architecture version to audit under.',
    'For each principle and structural rule that differs from when the run was built: check conformance.',
    'For non-conformances: classify as patchable, salvageable, or rebuild-required.',
    'Recommend recovery: do_nothing / patch_artifact / rebuild_under_v{N}.',
    'Write runs/{slug}/v{N}-reaudit.json with the recommendation and rationale.'
  ]
};

// ---- canonical boundaries per role (compact, 2-3 highlights) ----
const ROLE_BOUNDARIES = {
  'Orchestrator Charter': [
    'Only role allowed to surface to the user (at delivery, not mid-build).',
    'Does not make content decisions — delegates to Discovery / TD / etc.'
  ],
  'Discovery Charter (Initial Mode)': [
    'Never asks the user questions mid-build (Sev 4 routes internally per v1.10.1).',
    'Does not propose technical sections — that is TD.'
  ],
  'Discovery Charter (Demotion Mode)': [
    'Only role with authority to rule on user-named referent substitution.',
    'Cannot modify ledger-v1 directly; writes a separate demotion record.'
  ],
  'Technical Discovery Charter (Initial Mode)': [
    "Does not amend Discovery's ledger.",
    'Does not pre-decide implementation patterns within a section — that is Overseer.'
  ],
  'Technical Discovery Charter (Impact-Analysis Mode)': [
    'Does not enact the delta plan — that is Coordinator.',
    "Does not amend Discovery's ledger."
  ],
  'Editor Charter (v1.9, new role)': [
    'Structural check, not substantive — does not propose new IPs or assumptions.',
    'Returns verdict only; Orchestrator interprets.'
  ],
  'Coordinator Charter': [
    'Makes no architectural or product decisions.',
    'Cannot amend ledger / sections / contracts substantively.'
  ],
  'Critic Charter': [
    'Detects drift; does not decide what is correct. Routes via Arbiter.',
    'Cannot rewrite plans or specs.'
  ],
  'Arbiter Charter': [
    'Makes no content decisions; classification + routing only.',
    'Cannot modify ledger / sections / contracts.'
  ],
  'Researcher Charter (Planning Mode)': [
    'Researches but does not decide — recommends with rationale.',
    'Cannot modify state files outside research/probes/.'
  ],
  'Researcher Charter (Escalation Mode)': [
    'Optimization: blast-radius minimization.',
    'Cannot enact the fix — that is Coordinator (after Arbiter routes).'
  ],
  'Overseer Charter': [
    "Does not amend Discovery's ledger or TD's plan.",
    "Cannot decide content — flags and escalates."
  ],
  'Builder Charter': [
    'Narrow scope. Adjacent improvements ignored — out-of-scope is the most common Builder failure mode.',
    'Cannot modify state, contract, or decision files.'
  ],
  'Integrator Charter': [
    'Single pass. No agent collaboration.',
    'Sev-0 fixes only inline; anything substantive escalates.'
  ],
  'Convergence Verifier Charter': [
    'Production fidelity is mandatory; modeled components require external source citations.',
    'Verifies; does not redesign. Wrong assertions escalate, not silently amend.'
  ],
  'Re-Verification Charter (v1.6)': [
    'Recommends only. Orchestrator decides whether to enact patch or rebuild.',
    'One reaudit file per architecture version.'
  ]
};

// ---- extract ----

export function extract(charterMdPath, architectureVersion = '1.11') {
  const md = readFileSync(charterMdPath, 'utf-8');

  const lines = md.split(/\r?\n/);
  const roles = [];

  // Walk the file to identify each `## Role Charter` heading; for each,
  // attach the curated description / atomic steps / boundaries from the
  // registries above. We *could* parse the Process numbered list out of
  // the file at runtime; for v0.1 we use the curated lists because charter
  // Process sections are too verbose for a Meta-flowchart cell.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^## (.+?)$/);
    if (!m) continue;
    const heading = m[1].trim();
    if (heading === 'Notes for All Roles') continue;
    const reg = ROLE_REGISTRY[heading];
    if (!reg) {
      // Unknown heading — surface for audit, do not silently skip.
      console.warn(`[meta-flowchart-extract] Charter heading '${heading}' not in ROLE_REGISTRY; skipping.`);
      continue;
    }

    roles.push({
      heading,
      roleKey: reg.roleKey,
      wrapperKey: reg.wrapperKey,
      mode: reg.mode,
      emitsCompletionReport: reg.emits,
      title: heading.replace(/ Charter.*/, ''),
      subtitle: reg.mode ? `${reg.mode} mode` : null,
      description: ROLE_DESCRIPTIONS[heading] || '',
      atomicSteps: ROLE_ATOMIC_STEPS[heading] || [],
      boundaries: ROLE_BOUNDARIES[heading] || []
    });
  }

  // Audit hook: every heading in ROLE_REGISTRY should have been seen.
  const seenHeadings = new Set(roles.map(r => r.heading));
  const missingHeadings = Object.keys(ROLE_REGISTRY).filter(h => !seenHeadings.has(h));
  if (missingHeadings.length) {
    console.warn(`[meta-flowchart-extract] Charter missing expected headings: ${missingHeadings.join(', ')}`);
  }

  return {
    architectureVersion,
    roleCount: roles.length,
    roles
  };
}
