# Root-Cause Analysis — blackjack-trainer

**Architecture version at time of run:** approximately v1.2 (after blackjack run motivated the v1.2 amendments; before kanban-board)
**Outcome:** delivered with full artifact set; original verdict pass; no known artifact defects (the artifact apparently does train the user on basic strategy as claimed).

## What this run reveals about each principle

**Principle A (verification fidelity).** Partially honored, accidentally. The verification report does heavy static-inspection work — explicit grep for fetch/XHR/WebSocket, explicit confirmation of strategy table dimensions, explicit walks of the dispatch flow. These checks are *thorough* but they are still inspection, not exercise. There is no `cv-runner.js`, no DOM-loaded artifact-exercise, no fetch_log_evidence.

If the trainer artifact contained a Deal-button-stays-disabled-after-resolve-class defect, this verification regime would not catch it. It happens not to contain such a defect (the run-report's traceback through S6.A3 walks the gameplay flow in code, which approximates exercise), but the regime is not principled enough to guarantee it.

**Principle B (audit completeness).** Honored more completely than blackjack, less completely than kanban. `build-complete.json` exists. `audit/flags.jsonl` exists. `output/final/` is populated. `runs/blackjack-trainer/run-report.md` exists. Missing: Historian's `build-summary.md` and `decision-index.json` (those weren't required at the time but are required as of v1.6).

The run conforms to v1.2's enumerated checklist. It does not conform to the property-level principle (every state-changing action requires a record), because that principle has never been enforced. The gap is architecturally invisible — the run "passes" because the checklist enumeration was satisfied at the time of the run, not because the property holds.

**Principle C (spec-to-test coverage).** Partially honored. The verification report's `assumption_checks` walk each ledger assumption with explicit evidence. This is closer to the principle than tic-tac-toe (which had no assumption checks at all) but still operates on hand-extracted evidence rather than structured assertions derived from prose.

There is no PNV. The prompt's named verb (whatever it was — likely "train me on blackjack" or similar) was not asserted end-to-end in production fidelity. There is no `prompt_verb_analysis`. Some prose remains uncovered.

**Principle D (path coverage).** Same as other runs — Researcher, re-Discovery, TD impact-analysis, Arbiter, escalation, nested dispatch all unexercised. This run does not differentiate from the others on this principle because no run has exercised these paths.

## What this run teaches the architecture

This is the **partial-conformance pattern.** The run was built after v1.2's amendments were already informing practice. It honors the new requirements that existed at its time. It does not honor requirements that didn't yet exist (v1.3's cv_artifact_exercise, v1.5's PNV, v1.6's Historian artifacts). Its "pass" verdict is reasonable for its era and meaningless for the current era.

The deeper lesson: **the architecture cannot retroactively learn from runs that succeeded under weaker enforcement.** A passing verdict under v1.2 is not evidence of principle compliance; it's evidence of v1.2 checklist compliance. Treating it as proof of correctness would be a mistake.

This is also evidence for why principle enforcement as property check matters more than enumeration. If the architecture had enforced "every prose claim derives a structured assertion" at v1.2 time, this run would have produced acceptance_assertions and a PNV organically — not because v1.3 and v1.5 added them as enumerated requirements, but because the property required them.

## Recommendation

Do **not** patch this run. It is interesting as a "midpoint conformance" exhibit — neither v1.0's near-zero enforcement nor v1.6's current best — but patching it would erase the data point.

If we want a v1.6-conformant trainer, run the prompt fresh under v1.6. The new run will produce all the v1.6 artifacts; if it produces a substantially similar trainer artifact, we learn that v1.6's additional gates didn't change what got built (only how it got verified). That's useful information about whether the architecture's growth has been merely defensive or substantively shaping the artifact.
