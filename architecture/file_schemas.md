# File Substrate Schemas

Every file type in the Auto Builder substrate, who writes it, and its expected shape. Schemas are illustrative JSON, not strict — fields shown are required; agents may add additional fields if useful.

The cardinal rule: **every file path has exactly one writer role**. Reads are open by default unless noted.

## Coverage-Required Fields (v1.7, Principle C as property check)

Per `principles.md` Principle C, every load-bearing prose claim must have at least one structured assertion derived from it. v1.7 promotes this from enumerated requirement (specific assertion arrays for specific artifact types) to property check (every coverage-required field has at least one assertion pointing back to it via the assertion's `covers` field).

The following fields are **coverage-required**. Critic's `prose_coverage` final-sweep check verifies each has at least one assertion in the build whose `covers` field points to it.

| Path | Field | Why load-bearing |
|---|---|---|
| `decisions/discovery/ledger.json` | `restatement` | Discovery's interpretation of what to build; if wrong, the wrong thing gets built |
| `decisions/discovery/ledger.json` | `telos` (v1.9) | Single-sentence canonical user want; the anchor for demotion analysis and telos-coherence checks |
| `decisions/discovery/ledger.json` | `assumption_ledger[].assumption` | Each assumption is a claim about what the user wants; load-bearing for the artifact |
| `decisions/discovery/ledger.json` | `inflection_points[].topic` | What is being decided; defines the choice space |
| `decisions/discovery/ledger.json` | `inflection_points[].default_branch` | The locked decision; load-bearing for the artifact |
| `decisions/discovery/ledger.json` | `out_of_scope[]` (each item) | Each is a negative claim about the artifact; load-bearing for what's absent |
| `decisions/discovery/ledger.json` | `proper_nouns[].surface` (v1.9) | Each proper noun the user named; load-bearing because the build's target depends on it (Principle E) |
| `decisions/discovery/ledger.json` | `first_contact_requirements[].description` (v1.9) | Each first-contact requirement for the artifact type; load-bearing for Tier 2 verification (Principle G) |
| `decisions/technical-discovery/sections-v{N}.json` | `inflection_resolutions[].chosen_branch` | The locked technical decision; load-bearing |
| `decisions/technical-discovery/sections-v{N}.json` | `prompt_verb_analysis.chosen_verb` | The verb that PNV verifies; if wrong, PNV verifies the wrong thing |
| `decisions/technical-discovery/sections-v{N}.json` | `sections[].charter` | What the section must do; load-bearing |
| `decisions/technical-discovery/sections-v{N}.json` | `sections[].acceptance` | What "done" means for the section; load-bearing |
| `decisions/technical-discovery/sections-v{N}.json` | `sections[].out_of_scope[]` (each item) | Per-section negative claim; load-bearing |
| `contracts/original/*.json` | `interface` (each method/field) | Contract surface between sections; load-bearing |
| `contracts/original/*.json` | `notes` | Often clarifies semantics not captured in interface; load-bearing if non-trivial |

**Narrative fields (NOT coverage-required):** `rationale`, `why_inflection`, `td_introduction_rationale`, `what_breaks_if_wrong`, run-report prose, history-log entries, build-summary narrative. These are audit-trail prose for humans; they don't make claims about what gets built.

**The `covers` field on assertions:** every structured assertion (machine_checkable_assertions, acceptance_assertions, prompt_named_verb_assertion) must include a `covers` field pointing back to the load-bearing field it derives from. Format: file path + JSON pointer (e.g., `"decisions/technical-discovery/sections-v1.json#sections[id=section-1].acceptance"`). This bidirectional link is what lets Critic verify coverage as a graph walk rather than as a fuzzy text match.

**Adding new coverage-required fields:** when v1.x adds a new load-bearing prose field (e.g., a future amendment introduces a new spec artifact), that field must be added to this table in the same amendment that introduces it. New load-bearing fields without a coverage-required declaration are themselves Critic violations (the schema is incomplete).

---

## Three Categories of Run Substrate

Every file under `runs/{slug}/` belongs to exactly one of three categories. This partition determines audience, lifecycle, and what gets included in the fork ceremony at promotion (per `build-lifecycle.md` § Three categories of run substrate).

| Category | What it is | Files | Audience |
|---|---|---|---|
| **1 — Project metadata** | Wayfinding document for a fresh reader with zero AutoBuilder context. Opens with the AutoBuilder ethos preamble (canonical text from `architecture/autobuilder-ethos.md`), then the build-specific section, then onward links to Cat-3 README or Cat-2 internals | `prompt.txt`, `completion-ratified.json`, (future) `PROJECT-OVERVIEW.md` — the synthesized Cat-1 document written at ratification, structured as: ethos preamble (verbatim from `autobuilder-ethos.md`) → about-this-build (project-specific) → where-to-go-next (links to Cat-3 README + Cat-2 internals) | Corpus readers, future humans/agents reading the corpus cold, the dashboard's per-build detail panel |
| **2 — Build byproduct data** | Records of how AutoBuilder built this artifact, in AutoBuilder's own vocabulary | `audit/`, `decisions/`, `state/`, `history/`, `research/`, `contracts/`, `output/builders/`, `output/integration/`, the full `output/verification/report.json`, `run-report.md`, `root-cause-analysis.md` (when present) | The AutoBuilder system measuring itself, corpus statistics, re-audits, principle-amendment loop |
| **3 — The deliverable** | The production artifact, post-verification | `output/final/*` and nothing else | End users, Claude Code sessions for post-promotion product work, the user running the app |

**Audience reframe for Cat 1:** the design target is a brand-new model with zero memory of AutoBuilder or this build. Cat 1 documents must be self-contained, written in plain English, and avoid all AutoBuilder vocabulary (role names, verdict strings, dispatch counts, section names, principle references, phase / commit-step terminology, architecture version numbers). Anything that would require explaining AutoBuilder internals belongs in Cat 2.

**Note on `run-report.md` and `root-cause-analysis.md`:** despite being human-readable Markdown, both are Cat 2 — they're written in AutoBuilder vocabulary and serve as internal post-mortems, not as fresh-reader orientation. The plain-language equivalent (PROJECT-OVERVIEW.md) is synthesized at ratification time *from* these Cat 2 sources, framed for the Cat 1 audience.

**At ratification:** all three categories freeze together in the AutoBuilder corpus. PROJECT-OVERVIEW.md is the new Cat-1 artifact created at this event.

**At promotion (opt-in):** ONLY Category 3 forks to the standalone repo. Categories 1 and 2 stay in the AutoBuilder corpus permanently as architectural measurement records. The promoted repo gets its own auto-generated `README.md` (a Cat-3-audience product handoff, distinct from Cat-1's PROJECT-OVERVIEW.md — both audiences are outsiders, but they need different things).

This is the architectural reason workflow #2's filter is `runs/{slug}/output/final/` rather than the broader `runs/{slug}/` — the fork extracts the deliverable, not the build's process records.

The Directory Layout below illustrates the partition: each top-level subdirectory of a run root belongs to exactly one category. The `output/` subtree partitions further (`output/builders/` and `output/integration/` are Cat 2; `output/verification/` is Cat 2; `output/final/` is Cat 3).

---

## Directory Layout

```
{project-root}/
├── decisions/
│   ├── discovery/
│   │   ├── ledger-v1.json
│   │   ├── ledger-diff-v{N}.json...
│   │   └── demotion-v{N}.json...           (v1.9)
│   ├── technical-discovery/
│   │   ├── sections-v1.json
│   │   └── impact-analysis-v{N}.json
│   └── editor/                              (v1.9)
│       └── review-v{N}.json
├── contracts/
│   ├── original/
│   │   └── {section-A}--{section-B}.json
│   └── amendments/
│       └── {section-A}--{section-B}-v{N}.json
├── state/
│   ├── coordinator/
│   │   ├── dag.json
│   │   ├── dispatch-log.jsonl
│   │   ├── cancellations.json
│   │   └── build-complete.json
│   ├── sections/
│   │   └── {section-name}.json
│   ├── escalations/
│   │   ├── queue/
│   │   │   └── esc-{nnn}.json
│   │   ├── routed/
│   │   │   └── esc-{nnn}-routing.json
│   │   └── sev0-fixes/
│   │       └── sev0-{nnn}.json
│   └── inline-deviations/
│       └── dev-{nnn}.json
├── research/
│   └── probes/
│       └── probe-{id}/
│           ├── briefing.json
│           └── findings.json
├── history/
│   └── log.jsonl
├── audit/
│   └── flags.jsonl
└── output/
    ├── builders/
    │   └── {section}/
    │       └── {builder-id}/
    │           ├── output.{ext}
    │           └── metadata.json
    ├── integration/
    │   └── manifest.json + actual artifact files
    ├── verification/
    │   └── report.json
    └── final/
        └── {delivered files}
```

## Permission Table

| Path pattern | Writer role | Notes |
|---|---|---|
| `decisions/discovery/*` | Discovery (Initial / Amendment / Demotion modes) | Append-only — never overwrite a prior version |
| `decisions/discovery/demotion-v{N}.json` (v1.9) | Discovery (Demotion mode) | Append-only; one per demotion decision |
| `decisions/technical-discovery/sections-*` | TD (initial mode) | Append-only |
| `decisions/technical-discovery/impact-analysis-*` | TD (impact mode) | One per re-evaluation |
| `decisions/editor/review-v{N}.json` (v1.9) | Editor | Append-only; one per Editor pass; non-skippable gate before Coordinator dispatch |
| `contracts/original/*` | TD (initial mode) | Written once at TD time |
| `contracts/amendments/*` | TD (impact mode) OR Coordinator (after Overseer concurrence on 2a amendments) | Versioned suffix `-v{N}` |
| `state/coordinator/*` | Coordinator | Live state; `build-complete.json` written exactly once |
| `state/sections/{name}.json` | The Overseer assigned to that section | Live state |
| `state/escalations/queue/*` | Any Overseer | Append-only (one file per escalation) |
| `state/escalations/routed/*` | Arbiter | Append-only |
| `state/escalations/sev0-fixes/*` | Critic, CV, or Integrator (whichever applied the fix) | Append-only; Critic audits |
| `state/inline-deviations/*` | Any role acting under inline dispatch (typically Coordinator) | Append-only; Critic audits scope claims |
| `research/probes/{id}/briefing.json` | The dispatching role (Arbiter, TD, or Coordinator) | Written once |
| `research/probes/{id}/findings.json` | The Researcher assigned to that probe | Written once |
| `history/log.jsonl` | Historian | Append-only |
| `audit/flags.jsonl` | Critic | Append-only |
| `output/builders/{section}/{builder}/*` | The Builder assigned to that task | Written once |
| `output/integration/*` | Integrator | Written once |
| `output/verification/report.json` | Convergence Verifier | Written once |
| `output/final/*` | Orchestrator | Written once at delivery; if it diverges from `output/integration/`, requires `divergence-from-integration.json` and (if vendoring) `vendor-manifest.json` |
| `output/final/divergence-from-integration.json` | Orchestrator | Required when `final/` differs from `integration/` |
| `output/final/vendor-manifest.json` | Orchestrator (or Integrator if bundling at integration time) | Required if `output/final/vendor/` exists |
| `history/build-summary.md` | Historian | v1.6: required for delivery |
| `history/decision-index.json` | Historian | v1.6: required for delivery |
| `runs/{name}/v{N}-reaudit.json` | Re-Verification role | v1.6: written when re-auditing prior runs under a new architecture version |

---

## Schemas

### `decisions/discovery/ledger-v1.json` — Discovery Ledger (initial)

**Writer:** Discovery (initial mode).

```json
{
  "version": 1,
  "created_at": "ISO-8601",
  "project_name": "blackjack web app",
  "telos": "A single-sentence canonical statement of user want, expressible without supportive proper nouns (v1.9, Principle G)",
  "restatement": "...",
  "execution_context_observed": {
    "platform_hints": ["windows", "macos", "linux", "unknown"],
    "path_evidence": ["C:\\...", "/Users/...", "/home/..."]
  },
  "proper_nouns": [
    {
      "id": "PN.1",
      "surface": "MiraboxSpace StreamDock VSD N4 Pro",
      "lexical_context": "Build me a plugin for MiraboxSpace StreamDock VSD N4 Pro that ...",
      "lexical_marker_weakening": null,
      "role": "target_defining",
      "canonical_source_required": true,
      "verification_status": "pending"
    },
    {
      "id": "PN.2",
      "surface": "map.kml",
      "lexical_context": "use sampledata from http://notasite.com/notreal/map.kml",
      "lexical_marker_weakening": "sample",
      "role": "supportive",
      "canonical_source_required": true,
      "verification_status": "pending"
    }
  ],
  "assumption_ledger": [
    {
      "id": "A1",
      "assumption": "single player",
      "confidence": "high",
      "rationale": "prompt's singular framing",
      "what_breaks_if_wrong": "..."
    }
  ],
  "inflection_points": [
    {
      "id": "IP1",
      "topic": "...",
      "choices": ["...", "..."],
      "default_branch": "...",
      "importance": "high|medium|low",
      "importance_action": "researcher_dispatched|best_effort_default|evidence_backed|n/a",
      "importance_action_evidence": "...",
      "why_inflection": "..."
    }
  ],
  "first_contact_requirements": [
    {
      "id": "FC.1",
      "description": "The plugin appears in the host application's UI / plugin list after install",
      "artifact_type_basis": "plugin"
    }
  ],
  "out_of_scope": ["...", "..."]
}
```

`confidence` ∈ `{"high", "medium", "low"}`. `importance` drives whether TD dispatches a Researcher.

**v1.9 new fields:**
- `telos` — load-bearing single sentence; the anchor for demotion analysis (Discovery Demotion Mode) and Editor's telos-coherence check.
- `execution_context_observed` — what platform/path evidence Discovery actually inspected. Required when the briefing's `execution_context` was non-empty. Used by Critic to verify Discovery used the evidence (Principle: Decision Grounding).
- `proper_nouns[]` — every trademarked or named external referent in the prompt, per Principle E. `role: target_defining` = the noun IS the target; `role: supportive` = illustrative/sample material. `lexical_marker_weakening` is the matched marker token (`sample`/`example`/`e.g.`/etc.) if any. `verification_status` is updated by TD/Researcher pipeline: `pending` → `verified` (canonical evidence found) | `unreachable` (escalates to Demotion Mode) | `demoted` (demotion ruled by Discovery).
- `importance_action` — what concrete differential action Discovery took for high-importance IPs. `n/a` only for low/medium importance. For high-importance IPs, must be one of `researcher_dispatched` / `best_effort_default` / `evidence_backed`; silent default without rationale is a Principle F violation flagged by Editor. `best_effort_default` is permitted (and expected) when canonical evidence cannot be obtained — the architecture commits to its best interpretation rather than asking the user. The `importance_action_evidence` field documents what was guessed and why.
- `first_contact_requirements[]` — Tier 2 verification inputs per Principle G. TD derives an `acceptance_assertion` for each; CV exercises them as the first behavioral check (non-skippable; halts pipeline on failure).

### `decisions/discovery/ledger-diff-v{N}.json` — Discovery Amendment

**Writer:** Discovery (amendment mode). Records changes to the ledger.

```json
{
  "version": 2,
  "supersedes_version": 1,
  "created_at": "ISO-8601",
  "trigger": { "type": "escalation", "escalation_id": "esc-007", "summary": "..." },
  "amendments": [
    {
      "assumption_id": "A4",
      "change_type": "amended|added|removed|strengthened",
      "old_text": "...",
      "new_text": "...",
      "rationale": "...",
      "confidence": "high"
    }
  ],
  "meta_check": {
    "changes_user_capability": false,
    "changes_user_context": true,
    "changes_success_criteria": false,
    "changes_maintenance_burden": false,
    "verdict": "amend ledger; not user-surfaceable"
  }
}
```

### `decisions/discovery/demotion-v{N}.json` — Discovery Demotion Record (v1.9)

**Writer:** Discovery (demotion mode). Records the ruling on a proper noun whose canonical source was unreachable, per Principle E and the Law A × Law B interaction.

```json
{
  "version": 1,
  "created_at": "ISO-8601",
  "trigger": {
    "proper_noun_id": "PN.2",
    "proper_noun_surface": "map.kml at notasite.com/notreal/map.kml",
    "unreachability_evidence_pointer": "research/probes/probe-{id}/findings.json"
  },
  "guardrails": {
    "G1_unreachable": {
      "verdict": true,
      "evidence": "Researcher probed for domain, archived copies, and equivalent filenames; all returned no results."
    },
    "G2_supportive_role": {
      "verdict": true,
      "evidence": "ledger-v1.proper_nouns[id=PN.2].role == 'supportive'; lexical_marker_weakening == 'sample'."
    },
    "G3_telos_preserved": {
      "verdict": true,
      "evidence": "Telos 'map walking activity' is expressible without naming map.kml."
    },
    "G4_substitution_satisfies": {
      "verdict": true,
      "evidence": "A class of substitute (any sample KML/GPX walking trail file) satisfies the same role; TD can source."
    }
  },
  "verdict": "demote | substitute | best_effort_target_commitment | rebrief_research | insufficient_evidence",
  "rationale": "All four guardrails hold. Demoting the URL atomicity; TD will source a substitute KML/GPX walking trail file matching the supportive role.",
  "uncertainty_manifest_entry": "If applicable: a single-sentence statement of what was guessed and what's at risk if the guess is wrong. Carried forward into the run-report's Uncertainty Manifest so the user has transparent visibility into Discovery's commitments.",
  "follow_up_action": {
    "role": "technical-discovery",
    "mode": "impact-analysis",
    "instruction": "Find a substitute dataset matching the supportive role of map.kml (a sample KML/GPX walking trail file)."
  }
}
```

**Verdict semantics (the architecture always delivers — no `block` verdict exists; every demotion path produces an artifact):**
- `demote` — all four guardrails hold. TD sources substitute silently. Historian logs the demotion.
- `substitute` — G1, G2, G4 hold but G3 fails (telos relies on the noun). TD sources a substitute that best preserves the telos. No user confirmation; no timeout. The substitution is recorded in the demotion record and surfaced in the run-report's Uncertainty Manifest.
- `best_effort_target_commitment` — G2 fails (target-defining) OR G4 fails (no class of substitute). Discovery commits to the most plausible interpretation of what the user meant, based on lexical context and partial evidence. TD builds against that interpretation. The `rationale` and `uncertainty_manifest_entry` fields document the guess and its risk. The build ships; the user never gets a clarifying question, only an artifact with honest documentation.
- `rebrief_research` — G1 fails (source may be reachable; just didn't try hard enough). TD dispatches a more thorough Researcher probe. Demotion Mode re-runs after research returns.
- `insufficient_evidence` — Researcher findings not credible per Principle F. TD re-probes.

**Critic audit:** every demotion record is checked for four-guardrail completeness. A `verdict: demote` with fewer than four `verdict: true` guardrails is a hard fail (must use a different verdict). `best_effort_target_commitment` and `substitute` records must have a non-empty `uncertainty_manifest_entry` so the run-report can carry the guess forward transparently.

**Why no `block` verdict:** the project's North Star commits to always delivering an artifact, even at 1% confidence. Halting the build to ask the user for input is incompatible with that contract. When canonical evidence is unavailable and substitution is not viable, Discovery commits to its best-effort interpretation and ships. The user gets honesty in the run-report, not a mid-build question.

### `decisions/editor/review-v{N}.json` — Editor Review (v1.9)

**Writer:** Editor. Records the structural audit of TD's plan against the user's prompt and Discovery's atomic intent.

```json
{
  "version": 1,
  "created_at": "ISO-8601",
  "based_on": {
    "prompt": "<literal user prompt>",
    "ledger": "decisions/discovery/ledger-v1.json",
    "sections": "decisions/technical-discovery/sections-v1.json"
  },
  "verdict": "pass | pass_with_recommendations | route_to_discovery | route_to_td",
  "findings": [
    {
      "id": "F.1",
      "check_id": "proper_noun_citation",
      "severity": "high|medium|low",
      "description": "Proper noun PN.1 ('MiraboxSpace StreamDock VSD N4 Pro') has verification_status: pending. TD did not dispatch a Researcher probe for a target-defining noun.",
      "evidence": "decisions/discovery/ledger-v1.json#proper_nouns[id=PN.1].verification_status",
      "recommended_route": "td_impact_analysis",
      "recommended_action": "dispatch_researcher"
    },
    {
      "id": "F.2",
      "check_id": "td_ip_source",
      "severity": "high",
      "description": "TD-IP-A resolution has source: td_plan but the subject is an external system property (SDK version). Principle H violation.",
      "evidence": "decisions/technical-discovery/sections-v1.json#inflection_resolutions[id=TD-IP-A].source",
      "recommended_route": "td_impact_analysis",
      "recommended_action": "source_externally"
    }
  ],
  "routed_to": [
    { "role": "technical-discovery", "mode": "impact-analysis", "trigger_findings": ["F.1", "F.2"] }
  ],
  "recommendations": []
}
```

**Check IDs (Editor's structural checks):**
- `proper_noun_citation` (Principle E + F): every `target_defining` proper noun has a `verification_status: verified` entry with non-empty citations; every `unreachable` has a corresponding demotion record.
- `discovery_high_importance_action` (Principle F): every `importance: high` IP has a non-`n/a` `importance_action`.
- `td_ip_source` (Principle H): every TD-IP resolution and machine-checkable assertion has a `source` field; `td_plan`-sourced assertions on external-system properties are flagged.
- `first_contact_coverage` (Principle G Tier 2): every `first_contact_requirements[]` entry has a corresponding acceptance assertion in the sections file.
- `telos_coherence` (Principle G): the section breakdown and assertions collectively serve the telos.

**Loop semantics:** Editor re-runs after any Discovery/TD amendment. `review-v2.json`, `review-v3.json`, etc., are written on successive passes. **Iteration cap: 3 passes.** If the loop has not converged to `pass` or `pass_with_recommendations` after 3 passes, the architecture commits to the current best-effort plan and the build proceeds to Coordinator. Unresolved findings are carried forward into the run-report's Uncertainty Manifest. The architecture's North Star contract overrides the gate: builds always deliver, never halt to ask the user.

### `decisions/technical-discovery/sections-v{N}.json` — TD Section Plan

**Writer:** TD (initial mode). Includes inflection point resolutions with machine-checkable assertions and per-section acceptance assertions.

```json
{
  "version": 1,
  "created_at": "ISO-8601",
  "based_on_ledger": "decisions/discovery/ledger-v1.json",
  "inflection_resolutions": [
    {
      "ip_id": "IP1",
      "source": "discovery",
      "resolved_via": "quick_reasoning|research",
      "chosen_branch": "...",
      "rationale": "...",
      "machine_checkable_assertions": [
        {
          "id": "IP1.A1",
          "statement": "Plain English claim",
          "check_type": "constant_value|behavior|structural|presence|absence",
          "target_module": "...",
          "target_symbol": "...",
          "expected_value": ...,
          "covers": "decisions/technical-discovery/sections-v1.json#inflection_resolutions[ip_id=IP1].chosen_branch"
        }
      ]
    },
    {
      "ip_id": "IP4",
      "source": "td",
      "resolved_via": "quick_reasoning|research",
      "topic": "...",
      "td_introduction_rationale": "Why TD surfaced this IP that Discovery didn't see",
      "chosen_branch": "...",
      "rationale": "...",
      "machine_checkable_assertions": [...]
    }
  ],
  "prompt_verb_analysis": {
    "candidate_verbs": ["render", "display"],
    "chosen_verb": "render",
    "rationale": "Verb 'render' is the prompt's literal head verb and names the deliverable's central job; 'display' is instrumental."
  },
  "discovery_coverage_assertions": [
    {
      "id": "DCA.1",
      "covers": "decisions/discovery/ledger-v1.json#restatement",
      "statement": "Restatement claim: 'A web-based single-player blackjack game ...'",
      "check_type": "user_flow",
      "scenario": "Open output/final/index.html, observe page, confirm a single-player game vs computer dealer presents",
      "expected_result": "One human player, one computer dealer, no other seats, no networking",
      "verifier": "cv_artifact_exercise"
    },
    {
      "id": "DCA.2",
      "covers": "decisions/discovery/ledger-v1.json#assumption_ledger[id=A1].assumption",
      "statement": "Single human player versus computer dealer; no multiplayer",
      "check_type": "absence",
      "scenario": "Grep integrated artifact for any networking or multi-seat affordance",
      "expected_result": "No fetch/XHR/WebSocket; no UI for additional players or seats",
      "verifier": "critic_final_sweep"
    },
    {
      "id": "DCA.3",
      "covers": "decisions/discovery/ledger-v1.json#out_of_scope[item=Real money, payments, or any gambling integration]",
      "statement": "Out-of-scope item: real money / payments absent",
      "check_type": "absence",
      "scenario": "Grep for 'payment', 'stripe', 'paypal', currency symbols other than chip count, real-money mentions",
      "expected_result": "Zero matches",
      "verifier": "critic_final_sweep"
    },
    {
      "id": "DCA.4",
      "covers": "decisions/discovery/ledger-v1.json#inflection_points[id=IP1].topic",
      "statement": "IP1 topic was 'betting model: bankroll vs no betting'; chosen_branch and machine_checkable_assertions cover the resolution; this assertion covers the topic itself by confirming the decision space was actually addressed",
      "check_type": "presence",
      "scenario": "Inspect sections-v{N}.json for inflection_resolutions[ip_id=IP1] entry",
      "expected_result": "Resolution exists, chosen_branch is non-null, machine_checkable_assertions[] is non-empty",
      "verifier": "critic_final_sweep"
    }
  ],
  "prompt_named_verb_assertion": {
    "id": "PNV.1",
    "verb_from_prompt": "render mathematical equations from LaTeX input",
    "scenario": "Open output/final/index.html under production fidelity; type 'x^2' into the input region; observe the output region",
    "expected_result": "A typeset visual representation appears in the output region (specifically: a .katex element with rendered glyphs; error region hidden)",
    "covers": "decisions/technical-discovery/sections-v1.json#prompt_verb_analysis.chosen_verb"
  },
  "sections": [
    {
      "id": "section-1",
      "name": "rules-engine",
      "charter": "Pure JS module implementing standard blackjack rules...",
      "acceptance": "Given any sequence of hands, returns correct scores...",
      "acceptance_assertions": [
        {
          "id": "S1.A1",
          "from_acceptance_phrase": "returns correct scores per standard rules",
          "check_type": "behavior|structural|presence|absence|user_flow|constant_value",
          "scenario": "concrete steps or values",
          "expected_result": "...",
          "verifier": "edge_case_testing|cv_artifact_exercise|critic_final_sweep",
          "covers": "decisions/technical-discovery/sections-v1.json#sections[id=section-1].acceptance"
        }
      ],
      "depends_on": ["section-x"],
      "estimated_builders": 3,
      "out_of_scope": ["..."]
    }
  ]
}
```

**Field notes (v1.2 / v1.3 / v1.5 / v1.6):**
- `inflection_resolutions[].machine_checkable_assertions[]` is required when an IP has been locked. Each describes a verifiable claim about the integrated artifact. Critic's final-sweep uses these to detect charter-vs-implementation drift.
- `acceptance_assertions[]` is required for every section. Each acceptance phrase must be derivable into at least one structured assertion. `check_type: "user_flow"` is for sequences of user actions — these are typically verified by `cv_artifact_exercise`.
- For `user_flow` assertions, write the scenario as explicit steps the verifier can simulate (click → assert state → click → assert state).
- The edge-case-testing section's acceptance must include "covers every assertion with `verifier: edge_case_testing` from the section list."
- `inflection_resolutions[].source` ∈ `{"discovery", "td"}` (added v1.6). Discovery-sourced IPs come directly from Discovery's ledger. TD-sourced IPs are technical decisions TD surfaced during section design that Discovery didn't see (e.g., library choice between two well-known options for a domain Discovery didn't recognize as ambiguous). When `source: "td"`, also include `topic` and `td_introduction_rationale` describing what TD saw that warranted the new IP. Critic's final-sweep flags TD-sourced IPs without a `td_introduction_rationale` as schema violations.
- `prompt_verb_analysis` (added v1.6) is required. TD must enumerate 2–3 candidate verbs from the prompt and pick the load-bearing one with rationale. The chosen verb determines the `prompt_named_verb_assertion`. Without this analysis, the PNV is a single point of failure for the verification regime — TD picks an arbitrary verb, the regime verifies the wrong thing, and the artifact still fails for the user.
- `prompt_named_verb_assertion` (introduced v1.5, formalized v1.6) is non-skippable. Verifier is implicitly `cv_artifact_exercise` under production fidelity. No `pass_with_concerns` permitted.
- `discovery_coverage_assertions[]` (added v1.7) covers Discovery's load-bearing prose fields (restatement, assumption_ledger items, out_of_scope items, inflection_point topics) that aren't covered by other assertion types. TD writes these as part of producing sections-v{N}.json. Same shape as machine_checkable_assertions but with `covers` field pointing into `decisions/discovery/ledger-v{N}.json`.
- All assertion entries (machine_checkable_assertions, acceptance_assertions, prompt_named_verb_assertion, discovery_coverage_assertions) **must include a `covers` field** (added v1.7). The `covers` value is a path + JSON pointer to the load-bearing prose field the assertion derives from. Critic's `prose_coverage` final-sweep check walks the coverage-required field list and verifies each has at least one assertion pointing back to it. Assertions without `covers` are flagged as schema violations.
- **All assertions must also include a `source` field (added v1.9, Principle H).** This field declares where the assertion's `expected_value` / `expected_result` derives from. Values:
  - `"prompt"` — derives from the user's literal prompt text. Strongest external source; use for telos-level checks (PNV, restatement-coverage).
  - `"canonical_evidence"` — derives from a Researcher finding citing external documentation. Strongest source for sub-goal checks involving external systems. Requires the assertion to include a `citations_pointer` field linking to the Researcher findings entry that supplied the expected value (with its `verbatim_excerpt` per Principle F).
  - `"td_plan"` — derives from TD's own plan. Allowed only for internal-consistency checks (e.g., "section A's interface returns what section B's contract says it returns"). NOT allowed for checks whose subject is an external system property; Editor flags these as Principle H violations.
  - `"external_source_unreachable"` — flag for assertions where the canonical source could not be reached and `td_plan` is the only available source. CV records these in `principle_h_skips[]` (not verified, structurally impossible to verify). The run-report's Uncertainty Manifest documents that this property was relied on without independent verification. The build still ships per the North Star contract; the user gets a transparent record of which claims were independently verified vs. taken on TD's word.

  The `source` field is what makes Principle H structurally enforceable: Editor walks every assertion's `source` and surfaces `td_plan`-against-external-system as a violation; CV reads the field and refuses to verify self-referential claims about external systems.

### `decisions/technical-discovery/impact-analysis-v{N}.json` — TD Impact Analysis

**Writer:** TD (impact mode). Delta plan when re-evaluation is triggered.

```json
{
  "version": 2,
  "created_at": "ISO-8601",
  "trigger": {
    "type": "escalation",
    "escalation_id": "esc-007",
    "research_findings": "research/probes/probe-esc-007/findings.json"
  },
  "chosen_option": "opt-A",
  "delta_plan": {
    "section-1": { "action": "unaffected", "rationale": "..." },
    "section-3": { "action": "salvageable", "rationale": "...", "re-dispatch_builders": ["builder-3a"] },
    "section-6": { "action": "new", "rationale": "...", "charter": "...", "depends_on": [] }
  },
  "contract_amendments": [
    { "file": "contracts/original/...", "type": "new|amended", "interface": {...} }
  ]
}
```

`action` ∈ `{"unaffected", "salvageable", "stop_and_scrap", "new"}`.

### `contracts/original/{A}--{B}.json` — Interface Contract

**Writer:** TD (initial mode).

```json
{
  "version": 1,
  "from_section": "section-1",
  "to_section": "section-3",
  "interface": {
    "scoreHand(cards)": {
      "params": { "cards": "Array<{rank, suit}>" },
      "returns": { "value": "int", "isBlackjack": "bool" }
    }
  },
  "notes": "section-3 calls these as pure functions"
}
```

### `contracts/amendments/{A}--{B}-v{N}.json` — Amended Contract

**Writer:** TD (impact mode) or Coordinator (after Overseer concurrence on 2a amendments).

```json
{
  "version": 2,
  "supersedes_version": 1,
  "from_section": "section-3",
  "to_section": "section-4",
  "amended_by": "coordinator|td",
  "agreement_record": {
    "overseer_3": "concur",
    "overseer_4": "proposed",
    "round_trips": 1
  },
  "interface": {...},
  "diff_from_prior": [{"field": "...", "change": "..."}]
}
```

`agreement_record` required when written by Coordinator (Sev 2a flow); omit when written by TD.

### `state/coordinator/dag.json` — Dependency DAG

**Writer:** Coordinator.

```json
{
  "updated_at": "ISO-8601",
  "version": 3,
  "nodes": [
    { "id": "section-1", "status": "verified", "wave": 1 },
    { "id": "integrator", "type": "pseudo-node", "status": "verified", "wave": 4, "is_pseudo": true },
    { "id": "section-5", "status": "pending", "wave": 5, "blocked_on": ["integrator"] }
  ],
  "edges": [{ "from": "section-1", "to": "section-2" }],
  "current_wave": 2
}
```

`status` ∈ `{"pending", "active", "blocked", "verified", "scrapped"}`. The `integrator` pseudo-node has `depends_on` all sections; sections that depend on integration (notably edge-case-testing) reference it.

### `state/coordinator/dispatch-log.jsonl` — Dispatch Log

**Writer:** Coordinator. Append-only record of every logical dispatch action.

```jsonl
{"ts":"ISO-8601","action":"dispatch","role":"discovery","dispatch_mode":"nested","briefing_path":"..."}
{"ts":"ISO-8601","action":"dispatch","role":"overseer","section_id":"section-1","dispatch_mode":"inline","note":"executed inline by Coordinator"}
```

`dispatch_mode` ∈ `{"nested", "inline"}`. `nested` = real sub-agent spawn via Agent tool. `inline` = dispatching agent performed receiving role's work itself. Required for dispatches after the initial Discovery dispatch.

### `state/coordinator/build-complete.json` — Build-Complete Handoff Signal (v1.2)

**Writer:** Coordinator. Explicit trigger for Orchestrator's final-verification sequence. Written exactly once.

```json
{
  "signaled_at": "ISO-8601",
  "all_sections_verified": true,
  "integrator_verified": true,
  "edge_case_testing_executed": true,
  "ready_for_final_verification": true,
  "next_steps_required": [
    "critic_final_sweep",
    "convergence_verifier",
    "delivery_to_final_directory",
    "run_report"
  ],
  "summary": "All sections verified, Integrator complete. Awaiting Orchestrator's final-verification dispatch."
}
```

`next_steps_required` is the canonical delivery checklist. Every item must be completed before the run is delivered. Orchestrator polls/watches for this file as the trigger. Until it exists, Orchestrator does not dispatch CV or copy to `final/`.

### `state/coordinator/cancellations.json` — Cancellation Flags

**Writer:** Coordinator. Builders poll this between major steps to cooperatively cancel.

```json
{
  "updated_at": "ISO-8601",
  "cancelled_builders": ["builder-4c"],
  "cancelled_sections": []
}
```

### `state/sections/{name}.json` — Section State

**Writer:** the Overseer assigned to this section.

```json
{
  "section_id": "section-1",
  "section_name": "rules-engine",
  "status": "active|pending|blocked|verified|scrapped",
  "owner": "overseer-1",
  "started_at": "ISO-8601",
  "charter_pointer": "decisions/technical-discovery/sections-v1.json#section-1",
  "active_contracts": ["contracts/original/..."],
  "sub_goals": [
    { "id": "1a", "description": "...", "status": "verified", "builder_id": "builder-1a", "output_path": "..." }
  ],
  "blockers": [],
  "escalations_filed": []
}
```

### `state/escalations/queue/esc-{nnn}.json` — Escalation Packet

**Writer:** any Overseer.

```json
{
  "id": "esc-001",
  "created_at": "ISO-8601",
  "from_overseer": "overseer-4",
  "section_id": "section-4",
  "severity_estimate": "local|cross-section-data|cross-section-architectural|plan-shaking|irreconcilable",
  "type": "contract_data_shape|contract_semantics|approach_conflict|assumption_violated|unresolvable",
  "summary": "...",
  "blocked_work": ["builder-4c"],
  "evidence": {...},
  "proposed_resolution": { "type": "amend_contract", "amendment": "..." }
}
```

### `state/escalations/routed/esc-{nnn}-routing.json` — Arbiter Routing Record

**Writer:** Arbiter.

```json
{
  "escalation_id": "esc-001",
  "routed_at": "ISO-8601",
  "classified_severity": "2a",
  "routing_decision": "coordinator-mediated overseer negotiation",
  "dispatched_to": "coordinator",
  "rationale": "...",
  "research_dispatched": false,
  "expected_resolution_path": "..."
}
```

### `state/escalations/sev0-fixes/sev0-{nnn}.json` — Trivial-Fix Record (v1.3)

**Writer:** Critic, CV, or Integrator. Audited by Critic.

```json
{
  "id": "sev0-001",
  "applied_at": "ISO-8601",
  "discovered_by": "convergence-verifier",
  "applied_by": "convergence-verifier",
  "fix_target_file": "output/integration/ui-render.js",
  "lines_changed": 2,
  "justification": "Acceptance criterion S4.A3 violated — Deal button disabled when phase==='resolved'.",
  "diff_summary": "Changed btn-deal disabled condition...",
  "section_affected": "ui-render",
  "scope_check": {
    "single_file": true,
    "single_section": true,
    "lines_changed_under_5": true,
    "fixes_acceptance_violation": true,
    "no_new_functionality": true,
    "no_interface_changes": true
  }
}
```

All six `scope_check` fields must be `true` for a fix to qualify as Sev 0. If any is false, escalate normally. Critic's final-sweep audits scope_check claims to prevent loophole abuse.

### `state/inline-deviations/dev-{nnn}.json` — Inline-Mode Deviation Record (v1.4)

**Writer:** any role acting under inline dispatch (typically Coordinator). Audited by Critic.

```json
{
  "id": "dev-001",
  "logged_at": "ISO-8601",
  "logged_by_role": "coordinator",
  "context": "section-4 acceptance assertion verification",
  "deviation_type": "test_or_assertion_fix|charter_clarification|implementation_path_chosen|subtask_decomposition|contract_micro_adjustment|oos_clarification",
  "spec_reference": "decisions/technical-discovery/sections-v1.json#section-4.acceptance_assertions[id=S4.A4]",
  "what_spec_said": "...",
  "what_was_done": "...",
  "rationale": "...",
  "nested_equivalent": "Under nested dispatch, section-4's Overseer would have escalated this as a Sev 1 within-section test correction; the Overseer would have updated the assertion text and continued.",
  "scope": {
    "changes_artifact": false,
    "changes_contract": false,
    "changes_charter_or_spec": true,
    "changes_assumption": false
  }
}
```

`nested_equivalent` is required and must articulate what would have happened under nested dispatch. If `scope.changes_artifact: true`, also write a Sev 0 fix record. If `scope.changes_contract` or `changes_assumption: true`, this should not be an inline deviation — escalate normally.

Categories that explicitly do NOT require logging: variable naming, internal code structure, comment phrasing, decisions explicitly left to Builder discretion ("Builder's choice"), adding tests beyond required minimum, defensive checks the charter doesn't forbid.

### `research/probes/probe-{id}/briefing.json` — Research Probe Briefing

**Writer:** the dispatching role (TD in planning, Arbiter in escalation).

```json
{
  "probe_id": "probe-001",
  "created_at": "ISO-8601",
  "phase": "planning|escalation",
  "dispatched_by": "technical-discovery",
  "question": "...",
  "context_pointers": ["..."],
  "constraints": ["..."],
  "optimization_criterion": "fit_to_project_goals|blast_radius_minimization",
  "preserve_sections": null,
  "questioning_authority": false,
  "budget_minutes": 10,
  "max_options": 5
}
```

### `research/probes/probe-{id}/findings.json` — Research Findings

**Writer:** the assigned Researcher.

```json
{
  "probe_id": "probe-001",
  "completed_at": "ISO-8601",
  "citations": [
    {
      "id": "C.1",
      "url_or_path": "https://docs.example.com/sdk/v3/manifest",
      "fetched_at": "ISO-8601",
      "verbatim_excerpt": "The plugin manifest must declare 'SDKVersion: 3' in the root object. Older SDKVersion 2 manifests are not loaded by VSDinside.",
      "citation_class": "static_canonical|archived_snapshot|interactive_doc",
      "external_source_unreachable": false
    }
  ],
  "options": [
    {
      "id": "opt-A",
      "summary": "...",
      "pros": ["..."],
      "cons": ["..."],
      "impact": { "section-4": "no change" },
      "confidence": "high",
      "supporting_citations": ["C.1"]
    }
  ],
  "recommended": "opt-A",
  "rationale": "...",
  "framing_concern": null
}
```

For escalation-mode probes, `impact` is required per option. `framing_concern` is non-null only when `questioning_authority` was true and the Researcher believes the question is malformed.

**v1.9 — citations and Principle F:**

Every load-bearing finding MUST include `citations[]` entries with non-empty `verbatim_excerpt`. The verbatim_excerpt is the exact text from the cited source that supports the finding — if a Critic-class auditor followed the citation, the same text would appear there. Citations without `verbatim_excerpt` are decorative and the finding is invalid (this is the StreamDock failure mode: the v3 Researcher listed repo URLs as `context_pointers` and returned findings as if those had been read, but the findings were summarized from training-data familiarity, not from the citations).

- `citation_class`:
  - `static_canonical` — official documentation, specification, or canonical source page; re-fetchable verbatim.
  - `archived_snapshot` — Wayback Machine, archive.today, or similar; use when the live source may change or disappear.
  - `interactive_doc` — sources that require authentication or interactive navigation; the `verbatim_excerpt` is the Researcher's transcription, with the limitation noted.

- `external_source_unreachable: true` — flag for findings where no canonical source could be located. When this is true, the finding is **not** sufficient to satisfy a `canonical_source_required` proper noun or a `source: canonical_evidence` assertion. It must escalate to Discovery (Demotion Mode). Discovery rules a best-effort outcome (`demote` / `substitute` / `best_effort_target_commitment`) and the build proceeds — the architecture's contract is to always deliver.

Critic and Editor spot-check citations by re-fetching the URL and matching the `verbatim_excerpt`. If the excerpt does not appear at the cited URL/path (or the source is unreachable when claimed reachable), the citation is invalid and the finding is treated as if it had no support.

### `output/builders/{section}/{builder}/output.{ext}` — Builder Output

**Writer:** the Builder. Schema is determined by the Builder's task spec.

### `output/builders/{section}/{builder}/metadata.json` — Builder Output Metadata

**Writer:** the Builder.

```json
{
  "builder_id": "builder-1b",
  "task_id": "1b",
  "section_id": "section-1",
  "started_at": "ISO-8601",
  "completed_at": "ISO-8601",
  "status": "completed|failed|cancelled|blocked",
  "output_files": ["scoring.js"],
  "exposes": [
    { "symbol": "scoreHand", "type": "function", "matches_contract": "contracts/original/..." }
  ],
  "notes": "...",
  "self_test_results": null
}
```

### `history/log.jsonl` — Historian Log

**Writer:** Historian. Append-only causal record.

```jsonl
{"ts":"ISO-8601","actor":"discovery","action":"wrote_ledger","artifact":"...","rationale":"why"}
```

Every entry must include `rationale` — the *why*, not just the *what*.

### `audit/flags.jsonl` — Critic Audit Log

**Writer:** Critic.

```jsonl
{"ts":"ISO-8601","cycle":1,"flagged":0,"checks_passed":["dag_consistency","writer_compliance","charter_implementation_conformance"]}
{"ts":"ISO-8601","cycle":2,"flagged":1,"flag":{"type":"writer_violation","detail":"...","severity":"medium"}}
```

### `output/integration/manifest.json` — Integration Manifest

**Writer:** Integrator.

```json
{
  "completed_at": "ISO-8601",
  "entry_point": "index.html",
  "files": [{ "path": "...", "role": "...", "imports": ["..."] }],
  "section_outputs_used": [{ "section": "section-1", "files": ["..."] }],
  "glue_code_added": [{ "file": "...", "lines": "...", "purpose": "..." }],
  "issues_resolved_during_integration": []
}
```

### `runs/{name}/v{N}-reaudit.json` — Re-Verification Audit (v1.6)

**Writer:** Re-Verification role. **Purpose:** when an architecture amendment introduces new gates that may invalidate prior verdicts, the Re-Verification role walks each prior run and produces this file documenting whether the run would still pass under the current architecture version. Without this, every amendment manually re-litigates the historical corpus.

```json
{
  "run_name": "blackjack",
  "audit_at": "ISO-8601",
  "audit_under_architecture_version": "v1.6",
  "original_verdict": "pass",
  "original_verdict_at": "ISO-8601",
  "original_verdict_path": "runs/blackjack/output/verification/report.json",
  "amendments_applied_since_original": ["v1.3", "v1.4", "v1.5", "v1.6"],
  "gates_re_evaluated": [
    {
      "gate": "cv_artifact_exercise_production_fidelity",
      "introduced_in": "v1.5",
      "result": "fail",
      "rationale": "Original verification ran in jsdom with stubbed runtime deps; would not pass v1.5's no-substitution rule."
    },
    {
      "gate": "prompt_named_verb_assertion",
      "introduced_in": "v1.5",
      "result": "fail",
      "rationale": "No PNV exists for this run; the prompt's named verb 'play blackjack' was never asserted end-to-end."
    },
    {
      "gate": "acceptance_assertions_coverage",
      "introduced_in": "v1.3",
      "result": "fail",
      "rationale": "Sections lack acceptance_assertions[]; the deal→resolve→deal user_flow was never structured."
    }
  ],
  "reclassified_verdict": "fail",
  "recovery_options": [
    { "type": "patch_artifact", "description": "Add acceptance_assertions to sections, regenerate user_flow tests, fix Deal-button bug, re-verify under v1.6 production fidelity." },
    { "type": "rebuild_under_v1.6", "description": "Discard prior outputs and re-run the prompt under current architecture." }
  ],
  "recommendation": "rebuild_under_v1.6",
  "rationale": "The defect set is structural to the v1.0 build; patching individual gates would still leave the build untested against several v1.x amendments. A clean v1.6 rebuild is cheaper than incremental patches."
}
```

**Field notes:**
- Critic's final-sweep does not re-audit prior runs; the dedicated Re-Verification role does, on demand or on architecture amendment.
- `reclassified_verdict` ∈ `{"pass", "pass_with_concerns", "fail"}`. If `fail`, `recovery_options` is required.
- One file per audited run; multiple files possible if re-audited under multiple subsequent versions (e.g., `v15-reaudit.json` then `v16-reaudit.json`).

### `output/final/divergence-from-integration.json` — Final/Integration Divergence Record (v1.6)

**Writer:** Orchestrator. **Purpose:** when `output/final/` legitimately diverges from `output/integration/` (e.g., recovery patches like the latex KaTeX vendor bundling), this file records the divergence with justification. Without it, the property "final/ is a copy of integration/" is silently broken.

```json
{
  "created_at": "ISO-8601",
  "supersedes_integration_at": "ISO-8601 (the integrator's manifest timestamp)",
  "reason": "recovery_patch | reintegration_skipped | other",
  "trigger": {
    "type": "v1.5_production_fidelity_failure",
    "evidence_pointer": "output/verification/report.json",
    "summary": "..."
  },
  "added_files": [
    { "path": "vendor/katex/katex.min.js", "source_url": "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js", "version": "0.16.9", "license": "MIT", "sha256": "..." }
  ],
  "modified_files": [
    { "path": "index.html", "lines_changed": 2, "diff_summary": "Replaced jsdelivr script + link tags with vendor/katex/* paths" }
  ],
  "removed_files": [],
  "approved_by_role": "orchestrator",
  "rationale": "v1.5 production-fidelity verification required local-bundle KaTeX rather than CDN dependency. Integrator was not re-run because the change is purely path-substitution + asset addition; re-integration would have produced byte-equivalent output."
}
```

**Field notes:**
- Required whenever any file in `output/final/` differs from its origin in `output/integration/` (including new files like vendored deps).
- Critic's final-sweep audits divergence: every file that exists in `final/` but not in `integration/` must be listed in `added_files`. Every file in both with different content must be listed in `modified_files`. Mismatches flag as severity high.
- `approved_by_role` must be `orchestrator` for v1.6 (only Orchestrator owns `final/`).

### `output/final/vendor-manifest.json` — Vendored Asset Manifest (v1.6)

**Writer:** Orchestrator (when bundling) or Integrator (when bundling at integration time). **Purpose:** track provenance of any third-party assets included in `output/final/`. Required if `output/final/vendor/` exists.

```json
{
  "updated_at": "ISO-8601",
  "vendored_assets": [
    {
      "name": "KaTeX",
      "version": "0.16.9",
      "source_url": "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/",
      "fetched_at": "ISO-8601",
      "license": "MIT",
      "license_file": "vendor/katex/LICENSE",
      "files": [
        { "path": "vendor/katex/katex.min.js", "sha256": "...", "size_bytes": 277445 },
        { "path": "vendor/katex/katex.min.css", "sha256": "...", "size_bytes": 23456 }
      ]
    }
  ],
  "total_vendored_size_bytes": 545891,
  "rationale": "Local bundle eliminates runtime CDN dependency per v1.5 production-fidelity requirement."
}
```

**Field notes:**
- Critic's final-sweep audits: every file under `output/final/vendor/` must appear in this manifest. Unmanifested vendored files flag as severity medium (license/provenance unknown).

### `history/build-summary.md` — Historian Build Summary (v1.6, was previously optional)

**Writer:** Historian. **Purpose:** human-readable narrative of the build, written at delivery time. Now required for delivery per the Orchestrator delivery checklist.

Free-form markdown. Should include: original prompt, final assumption set (live ledger after all amendments), amendments made and why, escalations and resolutions, Researcher dispatches and chosen options, deviations, total dispatch count, runtime per phase. Use prior `runs/{slug}/run-report.md` as a tone reference; build-summary is denser/more factual than run-report (which is reflective).

### `history/decision-index.json` — Historian Decision Index (v1.6, was previously optional)

**Writer:** Historian. **Purpose:** machine-readable index mapping each decision artifact (ledger versions, TD section versions, contract amendments, impact analyses) to the trigger that produced it. Required for delivery.

```json
{
  "updated_at": "ISO-8601",
  "decisions": [
    {
      "artifact": "decisions/discovery/ledger-v1.json",
      "version": 1,
      "produced_by": "discovery",
      "trigger": { "type": "initial", "from_prompt": "..." },
      "supersedes": null
    },
    {
      "artifact": "decisions/discovery/ledger-diff-v2.json",
      "version": 2,
      "produced_by": "discovery_amendment",
      "trigger": { "type": "escalation", "escalation_id": "esc-007" },
      "supersedes": 1
    },
    {
      "artifact": "decisions/technical-discovery/sections-v1.json",
      "version": 1,
      "produced_by": "td_initial",
      "trigger": { "type": "post_discovery" },
      "supersedes": null
    },
    {
      "artifact": "decisions/technical-discovery/impact-analysis-v2.json",
      "version": 2,
      "produced_by": "td_impact_analysis",
      "trigger": { "type": "escalation", "escalation_id": "esc-007", "research_findings": "..." },
      "supersedes": null
    }
  ]
}
```

### `output/verification/report.json` — Convergence Verifier Report

**Writer:** Convergence Verifier.

```json
{
  "completed_at": "ISO-8601",
  "verdict": "pass|pass_with_concerns|fail",
  "checked_against_ledger": "decisions/discovery/ledger-v1.json",
  "production_fidelity_environment": {
    "engine": "Playwright headless Chromium",
    "components": [
      { "name": "browser_runtime", "status": "real" },
      { "name": "usgs_geojson_endpoint", "status": "real", "endpoint": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson" },
      { "name": "osm_tiles", "status": "real" },
      { "name": "leaflet", "status": "real", "source": "output/final/vendor/leaflet/leaflet.js (vendored at design time per v1.6)" }
    ]
  },
  "first_contact_results": [
    {
      "requirement_id": "FC.1",
      "description": "...",
      "scenario": "...",
      "result": "pass",
      "details": "..."
    }
  ],
  "prompt_named_verb_result": {
    "assertion_id": "PNV.1",
    "verb_from_prompt": "...",
    "scenario": "...",
    "expected_result": "...",
    "actual_result": "...",
    "result": "pass",
    "source": "prompt",
    "production_fidelity_passed": true
  },
  "assumption_checks": [{ "id": "A1", "verified": true, "evidence": "..." }],
  "out_of_scope_checks": [{ "item": "...", "verified_absent": true }],
  "inflection_point_checks": [{ "id": "IP1", "default_branch_honored": true }],
  "artifact_exercise_results": [
    { "assertion_id": "S4.A3", "scenario": "...", "result": "pass", "source": "canonical_evidence", "citations_pointer": "research/probes/probe-001/findings.json#citations[id=C.1]", "details": "..." }
  ],
  "principle_h_skips": [
    {
      "assertion_id": "S2.A1",
      "reason": "source: td_plan but subject is external system property (host SDK version). Skipped per Principle H; escalated to Editor."
    }
  ],
  "summary": "..."
}
```

`artifact_exercise_results[]` (added v1.3) lists every user_flow assertion CV simulated and the result.

**v1.9 new required fields:**

- `production_fidelity_environment` (with `components[]` per-component real/modeled tagging) — required, per Principle H. Each component is `real` (the user's actual environment) or `modeled` (a stand-in). For `modeled` components, a `source` field citing external documentation is required; modeled components without external source are hard fails. See CV charter § "Verification source independence".

- `first_contact_results[]` (Tier 2 per Principle G) — required when `ledger-v1.first_contact_requirements[]` is non-empty. CV runs Tier 2 first among behavioral checks; any failure halts verification with verdict `fail` and `first_contact_failure: true` (no further tiers run).

- `prompt_named_verb_result.source` and `artifact_exercise_results[].source` — every behavioral verification result records the source of its expected value (per Principle H). Auditors can spot-check `source: canonical_evidence` results by following the `citations_pointer` and re-validating the `verbatim_excerpt`.

- `principle_h_skips[]` — assertions that CV refused to verify because they had `source: td_plan` against an external system property (self-referential, structurally insufficient). These are not "pass" — they're explicit non-verifications, surfaced for Editor/Critic re-review.

---

## Lifecycle Notes

**Versioning:** Files with `version` fields are append-only — `ledger-v1.json` stays untouched after `ledger-diff-v2.json` is written. Agents reconstruct current state from base + diffs (or read a precomputed "current" view if Historian maintains one).

**Live state files** (under `state/coordinator/`, `state/sections/`) are mutated in place. Critic detects unexpected mutation patterns.

**Append-only logs** (`history/log.jsonl`, `audit/flags.jsonl`, `dispatch-log.jsonl`) are never edited — only appended.

**Escalation packets** are written once into `queue/`; never edited. The `routed/` companion is also written-once.

**Builder outputs** are written once on completion. Re-dispatched builders write to a new output path (`builder-1b-v2/`) so the prior version is preserved.
