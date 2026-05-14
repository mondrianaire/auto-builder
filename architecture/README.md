# Auto Builder Architecture — Operational Documents

Companions to (but distinct from) the conceptual `revised_instructions.md` in the parent folder. Those describe intent and rationale. These describe operations.

## Files

- **`file_schemas.md`** — Every file the system writes, who writes it, what shape it takes, how it's versioned. Directory layout and permission table at the top.
- **`role_charters.md`** — Every role's prompt, written so it can be passed verbatim as the system prompt to a dispatched sub-agent. Includes briefing format, process, output schema, boundaries.
- **`principles.md`** — The four underlying principles (verification fidelity, audit completeness, spec-to-test coverage, path coverage) that the v1.x amendments instantiate. Written to shift the architecture from reactive enumeration of rules to proactive enforcement of laws. Also includes predicted-next-failures by principle. **New v1.6+; consult before proposing any amendment.**

Per-run analyses in `runs/{name}/root-cause-analysis.md` examine each prior run through the principles lens — what does this run reveal about which principle was or wasn't being honored. These are companions to `run-report.md` (which is the in-the-moment reflection); root-cause-analysis is the through-line analysis across runs.

## How to Use

To run a build:

1. **Orchestrator** is the entry point. Pass the Orchestrator charter (from `role_charters.md`) as a system prompt to a fresh Claude instance, along with the user's prompt.
2. The Orchestrator creates the project root and file substrate per `file_schemas.md` § Directory Layout, then dispatches Discovery.
3. Each subsequent dispatch follows the same pattern: dispatching role assembles a briefing packet (per the schemas), passes the receiving role's charter as system prompt + the briefing as the user message, and awaits completion.
4. The build runs to convergence; Orchestrator delivers final output to user.

## Open Questions Resolved by These Documents

| Question | Resolution |
|---|---|
| File schemas for all artifacts | Specified in `file_schemas.md` |
| Permission boundaries per role | Specified in `file_schemas.md` § Permission Table |
| Role charter prompts | Specified in `role_charters.md` |
| Builder cancellation mechanism | Cooperative — Builders poll `state/coordinator/cancellations.json` |
| Discovery's amendment 4-question check | In Discovery (Amendment Mode) charter; produces `meta_check` field in diff |
| Salvage vs scrap heuristic | <50% rework → salvage; conflicting assumption carry → scrap; tie → scrap |
| Dispatch mode (inline vs nested) | Orchestrator chooses based on section count; ≤8 → inline; specified in Orchestrator + Coordinator charters |
| Edge-case-testing position in DAG | Depends on special pseudo-node `integrator`; runs after Integrator |
| Drift detection on inline-dispatch happy paths | Critic in `final_sweep` mode is non-skippable |
| TD's quick-reasoning vs Researcher rubric | Four conditions in TD charter; all must hold to skip Researcher |
| Integrator false-alarm handling | Cross-verify with parser/checksum before escalating |
| Coordinator-Orchestrator handoff | Coordinator writes `state/coordinator/build-complete.json`; Orchestrator triggers final-verification on this file |
| Delivery checklist enforceability | Orchestrator charter enumerates 6 required artifacts; none skippable |
| Final/ population responsibility | Explicitly Orchestrator's job under both modes |
| Charter-implementation conformance | TD must produce `machine_checkable_assertions[]` per locked IP; Critic verifies |
| Acceptance assertions (per-section, behavioral) | TD must produce `acceptance_assertions[]` per section |
| CV artifact-exercise pass | CV loads integrated artifact in DOM-capable sandbox and simulates user_flow assertions |
| Sev 0 trivial-fix pathway | Critic, CV, Integrator may apply ≤5-line single-file fixes with audit |
| Inline-mode silent-correction blindspot | v1.4 mandates `state/inline-deviations/` logging for six categories with `nested_equivalent` articulation, audited by Critic |
| Verifier substitutes runtime dependencies | v1.5 strikes the "stubbed DOM" allowance; cv_artifact_exercise must run under production-fidelity (real headless browser or jsdom-with-real-resource-loading and no dependency substitution). Adds a non-skippable `prompt_named_verb_assertion` whose scenario literally exercises the prompt's named verb against the deliverable under production fidelity. |
| TD-introduced inflection points | v1.6 formally allows TD to surface IPs Discovery didn't see, with `source: "td"` and `td_introduction_rationale` fields on the resolution entry. |
| Integration/final divergence (recovery patches) | v1.6 requires `output/final/divergence-from-integration.json` whenever `final/` differs from `integration/`. Critic audits that every divergent file is documented. If vendoring is involved, also requires `output/final/vendor-manifest.json`. |
| Historian artifacts as part of delivery | v1.6 promotes `history/build-summary.md` and `history/decision-index.json` from charter-required-but-not-checklist-enforced to delivery checklist items. The run is incomplete without them. |
| Production-fidelity at TD design time | v1.6 adds a TD heuristic: design with production fidelity in mind from the start (vendored deps over CDN for browser builds, single-binary for CLI, etc.) so verification doesn't have to discover the gap. |
| PNV single point of failure | v1.6 adds `prompt_verb_analysis` requirement: TD must enumerate 2–3 candidate verbs from the prompt and pick the load-bearing one with rationale before deriving the PNV. |
| Re-verification under new architecture versions | v1.6 introduces a Re-Verification role and `runs/{name}/v{N}-reaudit.json` schema. Each architecture amendment can dispatch this role to walk prior runs and reclassify their verdicts. |
| Spec-to-test coverage as enumeration vs property | v1.7 elevates Principle C from enumeration (specific assertion arrays for specific artifact types: machine_checkable for IPs, acceptance for sections, PNV for prompt verb) to property check (every coverage-required field has at least one assertion pointing back via `covers` field). Adds: `covers` field on every assertion; `discovery_coverage_assertions[]` collection for Discovery's load-bearing prose; coverage-required table in file_schemas.md; new Critic final-sweep check `prose_coverage` that walks the table and verifies coverage as a graph operation. New load-bearing fields just get added to the table; no per-field assertion-type proliferation. |
| Progress communication via Cowork's Task* progress pane | v1.8 distributes Task* responsibility to the role with the knowledge: Orchestrator owns the 6 phase tasks (Discovery → TD → Build → Integration → Verification → Delivery) as the always-visible backbone; Discovery TaskCreates per-IP tasks; TD TaskCreates per-section tasks and per-Researcher tasks; Researcher updates its own task during work; Coordinator and Overseer transition section tasks during build; CV creates a `PNV: {verb}` sub-task for high-stakes visibility; Arbiter creates transient escalation tasks. Each role uses `activeForm` for moment-to-moment progress detail. No central manager — each role updates what it knows about. |

## What These Documents Are *Not*

- Not a software framework. Nothing imports anything. The "agents" are sub-Claudes dispatched via the Cowork Agent tool.
- Not exhaustive. Schemas show required fields; agents may add more. Charters describe load-bearing process; agents use judgment within boundaries.
- Currently v1.8. Expect further revisions as more builds surface new patterns.

## Version History

- **v1.0** — initial draft, before any runs.
- **v1.1** — refinements after the tic-tac-toe run. Added: dispatch-mode dichotomy (inline vs nested), edge-case-testing post-integration positioning, Critic final-sweep mode, TD quick-reasoning rubric, Integrator false-alarm prevention.
- **v1.2** — refinements after the blackjack run. Added: explicit Coordinator-Orchestrator handoff via `build-complete.json`, mandatory delivery checklist (6 required artifacts), Orchestrator's explicit responsibility for `final/`, and TD's machine-checkable assertions for IP locks consumed by Critic's charter-implementation conformance check.
- **v1.3** — after blackjack behavioral defect (Deal button stayed disabled after `phase === 'resolved'`, violating an acceptance phrase). Added: per-section `acceptance_assertions[]`, CV's required `artifact_exercise` pass that loads integrated artifact in DOM-capable sandbox and simulates user_flow assertions, Sev 0 trivial-fix pathway with mandatory scope_check audit by Critic.
- **v1.4** — addresses inline-mode silent-correction blindspot. Added: mandatory `state/inline-deviations/` logging for six judgment-call categories under inline mode, each with required `nested_equivalent` articulation, audited by Critic during final-sweep.
- **v1.5** — after the latex-equation-renderer build delivered with verdict `pass` while the artifact failed at the prompt's named verb in the user's actual environment. Root cause: cv_artifact_exercise ran in jsdom with the runtime CDN dependency substituted by an npm-installed copy of the same library; the deliverable was never loaded the way users open it. Reclassified the original blackjack run as FAILED for the same root-cause class — its v1.3-introduced cv_artifact_exercise was layered on the same flawed substrate. Added: (1) **production-fidelity exercise** requirement on the CV charter, striking the "Node sandbox with stubbed DOM" allowance — verifiers must run under real headless browser or jsdom-with-real-resource-loading and may not substitute any runtime dependency the artifact loads in production; (2) mandatory **`prompt_named_verb_assertion`** at the section-list level, derived from the literal verb in the user's prompt, exercised end-to-end against the deliverable under production fidelity, non-skippable, no `pass_with_concerns` permitted.
- **v1.6** — analysis-driven amendment after the latex-equation-renderer run-report and post-run insight pass. Six additions, all addressing patterns visible across the four-run corpus: (1) **TD-introduced IP schema** formalizes TD's ability to surface technical decisions Discovery didn't see, with `source` and `td_introduction_rationale` fields. (2) **Integration/final divergence record** required whenever `output/final/` differs from `output/integration/` (e.g., recovery patches), with companion `vendor-manifest.json` for any third-party assets. (3) **Historian artifacts** (`build-summary.md`, `decision-index.json`) promoted to mandatory delivery checklist items. (4) **Production-fidelity at TD design time**: TD heuristic to design with production fidelity in mind (vendored deps over CDN for browser builds, etc.) so the latex recovery pattern doesn't recur. (5) **`prompt_verb_analysis`** required on TD's section file: TD must enumerate candidate verbs and pick the load-bearing one with rationale, eliminating the PNV-single-point-of-failure risk. (6) **Re-Verification role and `v{N}-reaudit.json` schema**: each architecture amendment can dispatch this role to walk prior runs and reclassify their verdicts under the new architecture, eliminating the manual re-litigation that v1.5's blackjack reclassification did ad-hoc.
- **v1.7** — first **principle elevation** rather than reactive amendment. Per `principles.md`, the v1.x amendment trail had been reactive enumeration; v1.7 elevates Principle C (spec-to-test coverage) from enumeration to property check. The architecture used to enumerate specific assertion-array requirements per artifact type (machine_checkable_assertions for IPs, acceptance_assertions for sections, prompt_named_verb_assertion for prompt verb). v1.7 unifies these under one property: every coverage-required prose field has at least one assertion pointing back via a `covers` field. Adds: (1) **Coverage-Required Fields table** in `file_schemas.md` enumerating which prose fields are load-bearing (load-bearing prose makes claims about what gets built; narrative prose explains why decisions were made — only the former requires coverage). (2) **`covers` field** required on every assertion, providing explicit graph-walkable link from assertion to derivation source. (3) **`discovery_coverage_assertions[]`** new collection for Discovery's load-bearing fields (restatement, assumptions, OOS items, IP topics) that prior assertion types didn't cover; TD writes these as part of producing the sections file. (4) **`prose_coverage`** new Critic final-sweep check that walks the coverage-required table and verifies each field has at least one assertion via `covers`. New load-bearing fields just get added to the table; no per-field assertion-type proliferation. This is the first amendment designed to enforce a principle structurally rather than patch a specific symptom — the test of whether principle elevation is a generalizable pattern.
- **v1.8** — UX/observability amendment: distribute Cowork's Task* progress pane responsibility to the role with the knowledge. Each role's charter now includes Progress Communication instructions. Orchestrator TaskCreates the six phase tasks at build start (Discovery → TD → Build → Integration → Verification → Delivery) with appropriate `blockedBy` dependencies, as the always-visible structural backbone. Discovery TaskCreates per-IP tasks. TD TaskCreates per-section tasks (the user's primary visibility into the build's structure) and per-Researcher tasks. Researcher updates its own task during work. Coordinator and Overseer transition section tasks during the Build wave. CV creates a `PNV: {verb}` sub-task for high-stakes named-verb visibility. Arbiter creates transient escalation tasks. Each role uses `activeForm` for moment-to-moment detail. Not a principle elevation — pure observability. Motivated by the question "can the architecture present clear progress with pinned phases plus dynamic per-section detail?" and the answer being yes via Task* but only if every role knows its piece.

## Suggested First-Time Run

For a first run on the v1.4 architecture, start smaller than blackjack:
- A single-page tic-tac-toe game, OR
- A digital clock with a settings panel

Once one runs end-to-end, attempt more complex prompts with whatever refinements the first run surfaces.
