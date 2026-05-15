# Codex Data Schema (v0.1)

The Codex aggregator (`scripts/aggregate.mjs`) walks `runs/` and produces two
classes of JSON file. Both are derivations — no information in them is
authoritative; they exist to make the substrate fast to read and easy to
compare.

```
codex/data/
├── index.json              roll-up across all runs
└── runs/
    └── {slug}.json         per-run detail
```

This document defines both shapes and the **derivation rule** for every field
(which file in `runs/{slug}/` it reads, and what fallback applies if the field
is absent).

---

## Top-level: `codex/data/index.json`

```jsonc
{
  "schema_version": "0.1",
  "generated_at": "ISO-8601 UTC",
  "codex_version": "0.1",          // bumped when schema or aggregator changes
  "architecture_versions_seen": ["v1.4", "v1.5", "v1.6", "v1.7", "v1.9"],
  "run_count": 9,
  "runs": [ RunSummary, ... ],     // see below; one entry per runs/{slug}/
  "amendments": [ Amendment, ... ],// parsed from architecture/README.md version history
  "principles": [ Principle, ... ] // parsed from architecture/principles.md (when present)
}
```

### `RunSummary`

A compact per-run object suitable for the roster table on the dashboard's
home page. Larger / nested data is in `runs/{slug}.json`.

```jsonc
{
  "slug": "tic-tac-toe",                          // from folder name under runs/
  "prompt": "build me a single-page tic-tac-toe game where I play against the computer",
  "date": "2026-05-09",                           // from run-report.md front matter; ISO-8601
  "architecture_version": "v1.1",                 // from run-report or implied by amendment date
  "dispatch_mode": "inline" | "nested" | "mixed", // from run-report Phase summary
  "verdict": "pass" | "pass_with_concerns" | "pass_with_recommendations" | "fail" | "failed_recovered" | "unknown",
  "final_artifact": "output/final/index.html",    // relative to run root; from run-report
  "telos": "single-sentence canonical user want", // from ledger.telos (v1.9+) or derived from restatement
  "rating": Rating,                               // the four-dimensional rating; see below
  "counts": {
    "dispatches": 5,                              // tally of Orchestrator-level Agent dispatches
    "wall_clock_minutes": 22,                     // sum from run-report Phase timing table
    "sections": 5,                                // |sections-v{N}.json.sections|
    "researchers_dispatched": 0,
    "edge_cases_total": 46,
    "edge_cases_passing": 46,
    "critic_findings_high": 0,
    "critic_findings_medium": 0,
    "critic_findings_low": 0,
    "sev0_fixes": 0,
    "escalations_open": 0,
    "demotions": 0,                               // v1.9+; from decisions/discovery/demotion-v*.json
    "editor_iterations": 1                        // v1.9+; from decisions/editor/review-v*.json
  },
  "links": {
    "run_report": "runs/tic-tac-toe/run-report.md",
    "verification": "runs/tic-tac-toe/output/verification/report.json",
    "final_dir": "runs/tic-tac-toe/output/final/",
    "ledger": "runs/tic-tac-toe/decisions/discovery/ledger-v1.json"
  }
}
```

### `Rating` — the four-dimensional rating

```jsonc
{
  "telos_fidelity": "strong" | "adequate" | "weak" | "violated" | "unknown",
  "deliverability": {
    "tier1_pnv":  "verified" | "unverifiable" | "failed" | "not_run",
    "tier2_first_contact": "verified" | "unverifiable" | "failed" | "not_run",
    "tier3_subgoal":       "verified" | "unverifiable" | "failed" | "not_run"
  },
  "cost": {
    "dispatches": 5,
    "minutes": 22,
    "escalations_high": 0,
    "critic_high": 0
  },
  "learning_yield": {
    "amendment_candidates": 5,    // 'v1.10 candidate:' style lines in run-report
    "principle_violations_caught_structurally": 0,
    "principle_violations_escaped": 0
  },
  "composite": "clean" | "shipped_with_concerns" | "shipped_partial" | "failed" | "reclassified"
}
```

#### Derivation rules per Rating field

| Field | Source | Rule |
|---|---|---|
| `telos_fidelity` | Editor review (v1.9+), demotion files, run-report prose | `strong` if Editor `pass` AND no demotions AND proper_nouns all `verified` · `adequate` if Editor `pass_with_recommendations` AND no Principle E/F/H violation · `weak` if `route_to_discovery`/`route_to_td` triggered OR a proper noun ended `unreachable` without Demotion · `violated` if Critic flagged Principle F (silent training-data fallback) or H (self-referential verification) escaped to delivery · `unknown` if pre-v1.9 run (Editor didn't exist) |
| `deliverability.tier1_pnv` | `output/verification/report.json` PNV result OR run-report PNV note | `verified` if PNV assertion passed under production fidelity · `unverifiable` if CV marked `unverifiable_under_production_fidelity` · `failed` if CV `fail` with PNV-named cause · `not_run` if pre-v1.5 |
| `deliverability.tier2_first_contact` | CV report `first_contact_results[]` (v1.9+) OR run-report | Same vocabulary; `not_run` if pre-v1.9 |
| `deliverability.tier3_subgoal` | Edge-case test report and assumption_checks | `verified` if 100% edge cases pass AND 100% assumption_checks `verified: true` · `failed` if any edge case fails AND no Sev 0 fix recorded · `unverifiable` if a section was `unverifiable_under_production_fidelity` (e.g., hardware-required) |
| `cost.*` | Run-report Phase timing + dispatch log | Direct sums |
| `learning_yield.amendment_candidates` | `grep "v[0-9.]\+ candidate:" runs/{slug}/run-report.md` | Count |
| `learning_yield.principle_violations_*` | Critic flags + run-report | `escaped` if a violation reached final delivery; `caught_structurally` if the architecture's gate stopped it pre-delivery |
| `composite` | Composition rule (next) | See below |

#### Composite verdict composition

```
if rating.deliverability.tier1_pnv == "failed":           composite = "failed"
elif verdict in ("fail", "failed_recovered"):             composite = "failed" or "reclassified"
elif tier2_first_contact == "failed":                     composite = "failed"
elif verdict == "pass" AND telos_fidelity == "strong"
     AND all deliverability tiers in ("verified",):       composite = "clean"
elif verdict in ("pass", "pass_with_concerns",
                 "pass_with_recommendations") AND
     any tier == "unverifiable":                          composite = "shipped_with_concerns"
elif verdict == "pass_with_concerns":                     composite = "shipped_with_concerns"
elif verdict == "pass_with_recommendations":              composite = "shipped_partial"
else:                                                     composite = "unknown"
```

The composite is **informational only**. The run-report's own verdict is
canonical for status disputes.

### `Amendment`

Parsed from `architecture/README.md` version-history bullets.

```jsonc
{
  "version": "v1.9",
  "title": "principle elevation + Editor + Discovery as authority...",
  "summary": "first sentence or two from the version-history bullet",
  "triggered_by_run": "streamdock-applemusic-touchbar",  // best-effort match by phrase
  "principles_introduced": ["E", "F", "G", "H"],         // when explicitly named in the bullet
  "roles_introduced": ["Editor"],                        // when explicitly named
  "new_schemas": ["decisions/editor/review-v{N}.json",
                  "decisions/discovery/demotion-v{N}.json"]
}
```

### `Principle`

If `architecture/principles.md` exists and is parseable as principle headings,
the aggregator extracts:

```jsonc
{
  "id": "E",
  "name": "Atomic Lexical Anchors",
  "introduced_in": "v1.9",
  "summary": "first paragraph",
  "structural_enforcement": "ledger.proper_nouns[]; Demotion Mode guardrails;
                              lexical-marker pre-weakening",
  "violations_caught_structurally_in_runs": ["streamdock-apple-music-touchbar"],
  "violations_escaped_in_runs": ["streamdock-applemusic-touchbar"]
}
```

Parsing may fall back to a smaller subset if `principles.md` is missing
sections — the Codex degrades gracefully.

---

## Per-run: `codex/data/runs/{slug}.json`

The shape that drives the run-detail page. Aggregated once per slug.

```jsonc
{
  "schema_version": "0.1",
  "slug": "tic-tac-toe",
  "summary": RunSummary,         // identical to the entry in index.json
  "ledger": {                    // selected fields from decisions/discovery/ledger-v1.json
    "restatement": "...",
    "telos": "...",              // v1.9+; null otherwise
    "assumption_count": 12,
    "inflection_count": 2,
    "oos_count": 15,
    "proper_nouns": [ { "surface": "...", "role": "...", "verification_status": "..." }, ... ],
    "first_contact_requirements": [ { "description": "..." }, ... ]
  },
  "td": {                        // selected fields from decisions/technical-discovery/sections-v*.json
    "sections": [ { "id": "...", "charter_excerpt": "...", "acceptance_excerpt": "..." }, ... ],
    "contracts": [ "rules-engine--ai-opponent", ... ],
    "prompt_verb_chosen": "play" // v1.6+; null otherwise
  },
  "timeline": [
    { "phase": "Discovery", "duration_seconds": 73, "dispatches": 1, "notes": "..." },
    { "phase": "Technical Discovery", "duration_seconds": 165, "dispatches": 1, "notes": "..." },
    ...
  ],
  "verification": {              // from output/verification/report.json
    "verdict": "pass",
    "assumption_checks_total": 12,
    "assumption_checks_verified": 12,
    "out_of_scope_total": 15,
    "out_of_scope_verified": 15,
    "inflection_point_checks_total": 2,
    "inflection_point_checks_honored": 2,
    "edge_cases_total": 46,
    "edge_cases_passing": 46,
    "first_contact_results": [],   // v1.9+
    "principle_h_skips": [],       // v1.9+
    "concerns": []
  },
  "critic": {                    // counts from audit/flags.jsonl
    "by_severity": { "high": 0, "medium": 0, "low": 0 },
    "by_principle": { "A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "F": 0, "G": 0, "H": 0 },
    "open": 0,
    "resolved": 0
  },
  "history": {                   // shape from history/log.jsonl
    "entry_count": 25,
    "earliest": "ISO-8601",
    "latest": "ISO-8601"
  },
  "run_report_excerpts": {
    "what_worked": [ "first sentence of each bullet, up to N" ],
    "what_broke":  [ "first sentence of each bullet, up to N" ],
    "amendment_candidates": [
      { "version": "v1.10", "text": "the candidate line" }
    ]
  },
  "uncertainty_manifest": [      // v1.9+ runs that include one
    { "bet": "...", "mitigation": "..." }
  ],
  "links": {
    "run_report":   "runs/{slug}/run-report.md",
    "verification": "runs/{slug}/output/verification/report.json",
    "ledger":       "runs/{slug}/decisions/discovery/ledger-v1.json",
    "sections":     "runs/{slug}/decisions/technical-discovery/sections-v1.json",
    "final_dir":    "runs/{slug}/output/final/",
    "audit_flags":  "runs/{slug}/audit/flags.jsonl"
  }
}
```

### Derivation notes

- **All counts are best-effort.** A missing or malformed source file means the
  field is `null` (or `0` for counters), never a crash.
- **Markdown parsing is regex-light.** The aggregator parses run-report.md by
  recognizing headings and bullet patterns — not a full markdown AST. If a
  run-report deviates strongly from the conventional shape, the Codex may
  show partial data; the run-report itself remains authoritative.
- **Excerpts cap at 240 characters per bullet** to keep `index.json` lean.
  Full prose is one click away on the dashboard via the `links` block.
- **The aggregator never edits source files.** It is read-only against
  `runs/`, `architecture/`, and the project root. Its only writes are under
  `codex/data/`.

---

## Migration path to SQLite (future)

If/when the corpus is large enough to want joins and indices, the schema
translates as follows:

| JSON | SQL |
|---|---|
| `index.runs[]` | `runs(id PK, slug, prompt, date, architecture_version, dispatch_mode, verdict, final_artifact, telos)` |
| `RunSummary.counts` | columns on `runs` |
| `RunSummary.rating` | columns on `runs` (flattened) + child `tier_results(run_id, tier, status)` |
| `index.amendments[]` | `amendments(version PK, title, summary, triggered_by_run, ...)` |
| `index.principles[]` | `principles(id PK, name, introduced_in, summary, ...)` + child `principle_run_outcomes(principle_id, run_id, outcome)` |
| `runs/{slug}.timeline[]` | `phases(run_id, phase, duration_seconds, dispatches, notes)` |
| `runs/{slug}.verification.first_contact_results[]` | `first_contact_checks(run_id, idx, description, status)` |
| `runs/{slug}.critic.by_principle` | `critic_findings(run_id, principle, severity, status)` |
| `runs/{slug}.uncertainty_manifest[]` | `uncertainty_bets(run_id, bet, mitigation)` |

Migration is not on the roadmap until the corpus is >30 runs or a query the
dashboard needs becomes too slow.

---

# Codex Data Schema — v0.2 addendum (events, role attribution, first-delivery axis)

v0.2 introduces three new concepts: **events** (per-run records of decisions
/ exceptions / flags / demotions / etc.), **role attribution** on those
events (explicit + inferred with a confidence field), and the
**first_delivery_outcome** axis (user-experience verdict, distinct from the
architecture's internal verdict).

All v0.1 fields remain. v0.2 adds new fields; nothing existing is broken.

## New axis: `first_delivery_outcome`

The architecture's `verdict` (and the Codex composite) tracks whether the
*build pipeline* converged on a deliverable. `first_delivery_outcome`
tracks whether the *user* got something that worked on the first prompt.

```
first_delivery_outcome ∈ {
  "succeeded",                  // first prompt produced a working artifact, no follow-up
  "succeeded_with_concerns",    // worked, but with documented caveats (Uncertainty Manifest non-empty)
  "failed_user_reprompted",     // user had to re-prompt or get a fix to make it work
  "failed_unrecoverable",       // no follow-up could make this satisfy the original ask
  "unverified"                  // we don't have signal — flag for curation
}
```

Distinct from the architecture's verdict because: a build can pass every
internal gate and still ship something that fails at the user's first touch
(latex's KaTeX-not-loaded; streamdock-v1.8's wrong-OS plugin). The user's
ground truth lives here.

### Derivation precedence

The aggregator derives `first_delivery_outcome` in this order — first match
wins:

1. **Curation overlay** (`codex/data/curation/{slug}.yaml`) explicitly sets it.
2. **Run-report STATUS block** at the top says "RECLASSIFIED FAILED",
   "FAILED → RECOVERED", or describes a user-found defect on first delivery.
3. **`root-cause-analysis.md`** has a "what the architecture verified vs.
   what the user actually got" section naming a first-contact failure.
4. **Uncertainty Manifest** non-empty AND verdict pass_with_concerns →
   `succeeded_with_concerns`.
5. **Verdict pass** with no concerns and no curated counter-signal →
   `unverified` (NOT `succeeded` by default — absence of evidence isn't
   evidence of absence; the user has to confirm).
6. Otherwise: `unverified`.

### Distinction from `architectural_health_under_current_arch`

The v0.1 composite captures *architectural health* — would this build pass
the current architecture's gates? `first_delivery_outcome` captures
*user-experience health*. The two are independent:

| Build | Architectural health | First-delivery |
|---|---|---|
| tic-tac-toe | `would_fail_current_arch` (7 fail gates in v16-reaudit) | `unverified` (artifact appears to work) |
| latex-equation-renderer | `gaps_under_current_arch` (4 fail gates, then v1.5 recovery) | `failed_user_reprompted` (KaTeX didn't load) |
| streamdock-applemusic v1.8 | `would_fail_current_arch` | `failed_user_reprompted` (wrong OS) |
| streamdock-apple-music v1.9 | `clean_under_current_arch` | `succeeded_with_concerns` (unverifiable on user hw) |

Both axes appear on the dashboard. `first_delivery_outcome` is the
user-facing badge; architectural health is the inside-baseball view.

## New: `events[]` per run

Each event in `runs/{slug}.json` records a single moment of consequence in
the build — a decision, an exception, an audit flag, a demotion, an inline
deviation, a Sev 0 fix, a recovery patch, or a reclassification.

```jsonc
{
  "id": "evt-007",                       // monotonic per run, source-stable
  "kind": "audit_flag" | "decision" | "demotion" | "inline_deviation"
        | "sev0_fix" | "recovery_patch" | "reclassification" | "exception"
        | "rca_finding" | "reaudit_gate" | "user_first_contact_failure",
  "phase": "discovery" | "td" | "build" | "integration" | "verification"
        | "delivery" | "post_delivery" | "reaudit",
  "ts": "ISO-8601 if known, else null",
  "module": "rules-engine" | "ui-render" | ...  // section name; null for cross-cutting events
  "summary": "one-line description, ≤240 chars",
  "verbatim_excerpt": "exact text from source file, ≤500 chars",
  "source_file": "runs/{slug}/audit/flags.jsonl#L12",
  "severity": 0 | 1 | 2 | 3 | 4 | null,    // architecture's Sev scale; null for non-escalation events
  "explicit_roles": ["TD", "Researcher"],   // roles named directly by the source
  "inferred_roles": ["Discovery"],          // roles inferred from phase/principle/heuristics
  "principles_implicated": ["E", "F"],      // Principle A–H letters; empty if none
  "confidence": "high" | "medium" | "low",  // how confident the attribution is
  "curated": false                          // true if this event came from the curation overlay
}
```

### Event-kind sources

| `kind` | Primary source | Default confidence |
|---|---|---|
| `audit_flag` | `audit/flags.jsonl` entries | high (Critic names check + sev) |
| `decision` | `decisions/discovery/ledger-v1.json#inflection_points[]`, `decisions/technical-discovery/sections-v1.json#inflection_resolutions[]` | high |
| `demotion` | `decisions/discovery/demotion-v*.json` | high (Discovery role explicit) |
| `inline_deviation` | `state/inline-deviations/dev-*.json` | high (Coordinator role explicit) |
| `sev0_fix` | `state/escalations/sev0-fixes/sev0-*.json` | high (fixer role explicit) |
| `recovery_patch` | `output/final/divergence-from-integration.json` (v1.6+) | high |
| `reclassification` | run-report STATUS block | high (run-report explicit) |
| `exception` | run-report "what broke" bullets | medium (parsed prose) |
| `rca_finding` | `root-cause-analysis.md` per-principle assessments | high (RCA is explicit attribution) |
| `reaudit_gate` | `v16-reaudit.json#gates_re_evaluated[]` | high |
| `user_first_contact_failure` | run-report STATUS or curation overlay | high if explicit, low if inferred |

### Role attribution rules

**Explicit roles** are extracted only when the source text names them directly:
- "Discovery's IP1 default…" → `Discovery`
- "TD selected the Elgato SDK from training-data familiarity" → `TD`
- "Researcher MUST cite canonical evidence" → `Researcher`
- "CV's `production_fidelity_environment`…" → `CV` (Convergence Verifier)
- "Editor's `pass_with_recommendations`" → `Editor`
- "Builder added a fallback require…" → `Builder`
- "Coordinator absorbed Historian's responsibilities" → `Coordinator`, `Historian`
- "Critic flagged that…" → `Critic`

**Inferred roles** come from the event's phase and implicated principles:

| Phase | Default inferred role |
|---|---|
| `discovery` | `Discovery` |
| `td` | `TD` |
| `build` | `Builder` (+ `Coordinator` for orchestration events) |
| `integration` | `Integrator` |
| `verification` | `CV` (+ `Critic` for audit events) |
| `delivery` | `Orchestrator` |
| `post_delivery` | (no inference; user-side) |
| `reaudit` | `Re-Verification` |

| Principle | Default inferred role(s) |
|---|---|
| A — Verification Fidelity | `CV` |
| B — Audit Completeness | `Critic` |
| C — Spec-to-Test Coverage | `TD`, `Critic` |
| D — Path Coverage | `TD` |
| E — Atomic Lexical Anchors | `Discovery` |
| F — External Authority Discipline | `Researcher`, `TD` |
| G — Deliverability Tier Discipline | `CV` |
| H — Verification Independence | `CV`, `TD` |

If `explicit_roles` is non-empty for an event, `inferred_roles` is computed
in addition (helps spot mismatches), but the dashboard prefers explicit on
display.

**Confidence** is one of:
- `high` — explicit role attribution OR a structured source with an
  unambiguous mapping (e.g., demotion files always attribute to Discovery)
- `medium` — inferred from phase AND principle agreeing, no explicit role
- `low` — inferred from one signal only, or from a regex-extracted prose
  bullet

## New: curation overlay

```
codex/data/curation/
└── {slug}.yaml                  optional; one per build that needs corrections
```

Schema:

```yaml
# codex/data/curation/blackjack.yaml
first_delivery_outcome: failed_user_reprompted
first_delivery_outcome_rationale: |
  User found the Deal-button-stays-disabled defect after delivery and had
  to re-prompt for the v1.3 acceptance-assertion fix.
first_delivery_curated_by: Jett
first_delivery_curated_at: 2026-05-14
events:
  - id: curated-001
    kind: user_first_contact_failure
    phase: post_delivery
    summary: "Deal button stays disabled after phase==resolved; user reported"
    explicit_roles: [Builder, CV]
    principles_implicated: [C]
    confidence: high
    curated: true
```

Curation **always wins** on the fields it sets. Auto-extracted events
remain alongside curated ones unless a curated event has the same `id` (in
which case the curated version wins).

YAML chosen over JSON for hand-editing ergonomics (multi-line strings,
comments). Aggregator uses the minimal in-tree YAML parser at
`codex/scripts/yaml.mjs` (no npm deps) — handles the subset of YAML the
curation schema needs.

## New: per-run narrative summary

```
codex/data/runs/{slug}-narrative.md
```

Generated by the aggregator on every run. Human-readable timeline of the
build, reconstructed from events with role tags inline. Links back to the
canonical run-report, ledger, verification, and audit files — the
narrative is a reading guide, not a replacement.

Format:

```markdown
# {slug} — Codex narrative

**First-delivery outcome:** failed_user_reprompted
**Composite (architectural):** failed
**Date:** 2026-05-09 · **Architecture:** v1.1

> One-sentence telos restatement.

## Timeline

- **[Discovery]** 12 assumptions locked, 2 IPs, 15 OOS items.
  _roles: Discovery (high)_
- **[TD]** 5 sections charted; PNV deferred (pre-v1.5). _roles: TD (high)_
- **[Build]** 6 builders ran inline. _roles: Coordinator, Builder (medium)_
- **[Verification]** CV pass; 46/46 edge cases passing. _roles: CV (high)_
- **[Reaudit · v1.6]** Reclassified FAIL — 7 fail gates, including absent PNV,
  no machine-checkable assertions, no production-fidelity exercise.
  _roles: Re-Verification (high) · principles: A, C_

## What this run cost the architecture to learn

- v1.5 production-fidelity exercise requirement (motivated by this class)
- v1.6 PNV verb analysis (motivated by this class)
- ...

## Source files

- [run-report.md](runs/{slug}/run-report.md)
- [verification](runs/{slug}/output/verification/report.json)
- [v16-reaudit.json](runs/{slug}/v16-reaudit.json) (if present)
- [root-cause-analysis.md](runs/{slug}/root-cause-analysis.md) (if present)
```

## Bundle schema additions

`window.CODEX_BUNDLE.runs[slug]` gains:
- `summary.first_delivery_outcome` — the value
- `summary.first_delivery_outcome_source` — `curation | run_report_status | rca | uncertainty_manifest | default`
- `events[]` — the full per-run event list
- `role_attribution_totals` — cached `{ "TD": { high: 3, medium: 2, low: 0 }, ... }` for dashboard speed

`window.CODEX_BUNDLE.index` gains:
- `role_attribution_corpus_totals` — same shape as per-run, aggregated across all builds
- `first_delivery_outcome_distribution` — `{ succeeded: 0, succeeded_with_concerns: 1, failed_user_reprompted: 3, failed_unrecoverable: 0, unverified: 5 }`

## SQLite migration (extends v0.1 table)

| JSON | SQL |
|---|---|
| `summary.first_delivery_outcome` | column on `runs` |
| `summary.first_delivery_outcome_source` | column on `runs` |
| `events[]` | `events(run_id, id PK, kind, phase, ts, module, summary, verbatim_excerpt, source_file, severity, confidence, curated)` |
| `events[].explicit_roles[]` | `event_roles(event_id, role, kind='explicit')` |
| `events[].inferred_roles[]` | `event_roles(event_id, role, kind='inferred')` |
| `events[].principles_implicated[]` | `event_principles(event_id, principle)` |
| curation overlay | overlay tables OR stored as YAML blobs in a `curation` table |

---

# Codex Data Schema — v0.3 addendum (revision lineage)

v0.3 introduces **revisions** — a way to distinguish the primary Auto Builder
run from any *additional steps* taken to produce a working artifact (user
re-prompts, hand-patches, follow-up builds). The architecture's
`first_delivery_outcome` axis already captures the primary-run verdict;
revisions captures *what happened after*.

The artifact and its lessons are valuable regardless of how many revisions
were needed. The revision lineage preserves that value without confusing it
with primary-run success.

## Coordination contract with AutoBuilder-Maintenance

The Codex does not initialize or operate git per-run. AutoBuilder-Maintenance
owns that. What the Codex needs from the eventual git layer (when it
exists) is a way to distinguish a primary-run commit from an additional-step
commit. The Codex is convention-agnostic — once Maintenance picks one, a
small `readGitLog()` adapter populates `revisions[]` automatically. Until
then, the curation overlay is the bridge.

## `revisions[]` per run

```jsonc
{
  "revisions": [
    {
      "id": "rev-0",
      "kind": "primary_run",                    // exactly one per run
      "ref": null | "<git-commit-hash>",         // populated once git is wired
      "ts": "ISO-8601 if known, else null",
      "summary": "Initial Auto Builder run",
      "verdict": "pass | pass_with_concerns | pass_with_recommendations | fail | failed_recovered | unknown",
      "first_delivery_outcome": "...",           // mirrors summary.first_delivery_outcome
      "diff_summary": null
    },
    {
      "id": "rev-1",
      "kind": "additional_step",
      "ref": "<git-commit-hash>",
      "ts": "...",
      "summary": "User re-prompted for bundled KaTeX",
      "triggered_by_event": "evt-001",           // links to the user_first_contact_failure event
      "triggered_by_outcome": "failed_user_reprompted",
      "verdict": "pass | partial | fail",
      "diff_summary": "+ bundled vendor/katex/; - CDN script tag",
      "rationale": "User opened artifact, KaTeX failed to load from CDN; bundled local copy resolves first-contact",
      "curated_by": "Jett | AutoBuilder-Maintenance | <other>",
      "curated_at": "YYYY-MM-DD"
    }
  ]
}
```

### Cardinal rules

- Exactly one `primary_run` revision per build. Aggregator emits a default
  if no curation/git data provides one.
- Additional-step revisions can be zero or many.
- **`first_delivery_outcome` lives on `summary` (primary-run truth) and is
  ALSO mirrored onto the rev-0 entry** for dashboard convenience. The
  `summary` value is canonical; rev-0's is derived.
- Additional steps **do not change** `first_delivery_outcome`. If the
  primary run was `failed_user_reprompted`, even a successful additional
  step leaves the axis at `failed_user_reprompted`. The additional step's
  own `verdict` field captures whether that step itself succeeded.
- Events may carry an optional `rev_id` field linking them to a revision.
  Default: events are attributed to `rev-0` unless curation says otherwise.

## Derivation precedence

The aggregator builds `revisions[]` in this order — first match wins:

1. **Curation overlay** (`codex/data/curation/{slug}.json#revisions[]`)
   provides the full lineage.
2. **Git log adapter** (future: once AutoBuilder-Maintenance enacts the
   commit-signal convention) reads commit messages / branches / tags
   matching the convention and synthesizes revisions.
3. **Default**: a single `rev-0 primary_run` revision derived from the
   run's existing fields (verdict, first_delivery_outcome, run date).

When (1) and (2) both produce data, curation supplements git history —
curation can add prose/rationale to git-derived revisions and can add
revisions that aren't in git (e.g., a hand-patched fix the user never
committed). Curation never silently overrides git's commit-level facts;
the schema preserves `ref` from git and `rationale` from curation.

## Curation overlay extension

```jsonc
// codex/data/curation/{slug}.json
{
  ...existing curation fields...,
  "revisions": [
    {
      "id": "rev-1",
      "kind": "additional_step",
      "summary": "User re-prompted to fix KaTeX bundling",
      "triggered_by_outcome": "failed_user_reprompted",
      "verdict": "pass",
      "rationale": "Bundled vendor/katex/ resolves first-contact",
      "curated_by": "Jett",
      "curated_at": "2026-05-14"
    }
  ]
}
```

A curator does not need to specify `rev-0` — the aggregator synthesizes it
from the existing per-run signals. Curators add additional steps starting
at `rev-1` and increasing.

## Bundle additions

`window.CODEX_BUNDLE.runs[slug]` gains `revisions` and a derived
`revision_count`. `summary.revision_count` is the same number for quick
roster access. The roster doesn't render lineage detail (would be too
wide); the per-build detail panel does.

## SQLite migration

| JSON | SQL |
|---|---|
| `runs[slug].revisions[]` | `revisions(run_id, id PK, kind, ref, ts, summary, verdict, diff_summary, rationale)` |
| `summary.revision_count` | column on `runs` |
| event `rev_id` field | column on `events` |

---

# Codex Data Schema — v0.4 addendum (deliverable kinds + live URLs + showcase)

v0.4 introduces the **deliverable-kind taxonomy** and **live URLs**. Every
build now carries a kind classifier and a publicly-viewable URL. For
browser-runnable builds the URL points to the hosted artifact itself; for
non-runnable builds (plugins, CLIs, libraries, documents) the URL points
to a Codex-generated **showcase page** that captures the deliverable's
contents and purpose.

## Per-build additions on `summary`

```jsonc
{
  "summary": {
    ...existing fields...,
    "deliverable_kind": "web_app | plugin | cli | library | document | data | other",
    "deliverable_can_run_in_browser": true | false,
    "live_url":         "https://...",           // hosted artifact OR showcase page
    "live_url_kind":    "artifact | showcase | none",
    "deliverable_index": "output/final/index.html | output/final/{slug}.sdPlugin/ | ...",
    "showcase_assets": {                          // populated from curation when present
      "screenshots":          ["images/{slug}/file.png"],
      "screencast_url":       "https://...",
      "install_command_override": "...",
      "demo_steps":           ["step 1", "step 2"]
    }
  }
}
```

## Detection rules

The aggregator picks a `deliverable_kind` per build by inspecting
`output/final/` plus the discovery ledger's `telos`. First match wins:

| Signal | → kind |
|---|---|
| `output/final/` contains `*.sdPlugin/` directory OR `manifest.json` with a `Type`/`Actions`/`Controllers` field | `plugin` |
| `output/final/index.html` exists AND no native binary present | `web_app` |
| `output/final/` contains a top-level `.exe`, `.bin`, executable shell script, or `package.json` with `bin` field | `cli` |
| `output/final/` contains a `package.json` with `main`+`exports` but no `bin` and no html | `library` |
| `output/final/` contains `*.pdf`, `*.docx`, `*.md` as the load-bearing artifact | `document` |
| `output/final/` is CSV/JSONL/Parquet/SQL | `data` |
| None of the above | `other` |

**Curation always overrides** — `codex/data/curation/{slug}.json#deliverable_kind` wins.

## Live URL composition

Per the GitHub Pages goal (single-Pages model assumed):

| `deliverable_kind` + can_run_in_browser | `live_url_kind` | `live_url` template |
|---|---|---|
| `web_app` & true   | `artifact` | `{pages_base}/runs/{slug}/output/final/` |
| `plugin`           | `showcase` | `{pages_base}/codex/showcase/{slug}.html` |
| `cli` / `library` / `document` / `data` / `other` | `showcase` | `{pages_base}/codex/showcase/{slug}.html` |
| any if `pages_base` not configured | `none` | null |

`pages_base` lives in `codex/data/config.json` (a new file the user
configures once when GitHub Pages is set up). Until that exists,
`live_url_kind === 'none'` and the dashboard's view button falls back to
the existing `final/` relative link.

## Showcase page contract

A Codex-generated HTML page at `codex/showcase/{slug}.html`. Self-contained
(reuses the dashboard's dark aesthetic via inlined styles). Sections rendered
per deliverable kind:

**Universal sections** (all kinds):
- Header: slug, deliverable_kind chip, link back to dashboard
- Hero: telos as one-sentence headline + restatement as supporting prose
- Build context: date, architecture version, first_delivery_outcome, verdict
- Source tree of `output/final/` (clickable to GitHub blob URLs when `repo_base` is configured)
- Build narrative summary (events, revisions, role attribution) linking to the dashboard's detail view

**Plugin-specific sections** (when `deliverable_kind === 'plugin'`):
- Hardware/host context (from telos parsing or curation)
- Manifest contents rendered as a definition list
- Install instructions (verbatim from run-report's install section, OR curation override)
- "How to verify it works" (Tier 2 first-contact requirements from CV report)
- Uncertainty Manifest items
- Download link to packaged artifact (`.zip`, `.tar.gz`, etc.)

**Other-kind fallback sections** (when kind is `cli` / `library` / `document` / `data` / `other`):
- File tree only
- README contents if present
- Manifest contents if present
- "How to use" block populated from curation `showcase_assets.demo_steps`

## SQLite migration

| JSON | SQL |
|---|---|
| `summary.deliverable_kind` | column on `runs` |
| `summary.live_url` | column on `runs` |
| `summary.live_url_kind` | column on `runs` |
| `summary.showcase_assets.screenshots[]` | `showcase_screenshots(run_id, idx, path)` |
| `summary.showcase_assets.demo_steps[]` | `showcase_demo_steps(run_id, idx, text)` |
