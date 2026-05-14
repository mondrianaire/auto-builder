# Root-Cause Analysis — tic-tac-toe

**Architecture version at time of run:** v1.0–v1.1 (pre-most-amendments)
**Outcome:** delivered, original CV verdict pass; architecture has since added 11 gates this run does not honor.

## What this run reveals about each principle

**Principle A (verification fidelity).** Zero enforcement. CV's checks were entirely static inspection (grep + structural). The artifact was never loaded in any DOM environment. The "pass" verdict was based on the absence of evidence of failure, not the presence of evidence of success.

The artifact happens to work. That's because tic-tac-toe's behavioral surface is small enough that static inspection plus edge-case-testing (which did execute against the integrated artifact via Node) caught the only paths that mattered. The build got lucky in a way that won't generalize: any artifact whose central behavior depends on real-DOM interaction (kanban DnD, blackjack Deal-button-after-resolve, latex CDN-script-execution) would have shipped broken under the same regime.

**Principle B (audit completeness).** Minimal enforcement, mostly accidental. The run produced a `dispatch-log.jsonl`, `history/log.jsonl`, section state files, builder metadata. It did not produce `build-complete.json`, did not have a Critic final-sweep entry in audit/flags, did not produce Historian build-summary or decision-index. None of these existed as requirements at the time. The audit trail is partial; the partial-ness was invisible because the run succeeded.

**Principle C (spec-to-test coverage).** Zero enforcement. Sections file lacks `acceptance_assertions[]`, IP locks lack `machine_checkable_assertions[]`, no PNV, no prompt_verb_analysis. The prose acceptance criteria ("see the round outcome and start a new round") were honored by the Builders implementing them, but no machine ever verified the implementations against the prose. This is exactly the gap the v1.3 amendment was added to close — but by then this run was already shipped.

**Principle D (path coverage).** Not applicable yet. This was the first run; no untested paths yet exist relative to it.

## What this run teaches the architecture

The artifact-correctness-by-luck pattern. A small enough domain hides the absence of principled verification. tic-tac-toe is the architecture's "easy mode" baseline: shows the architecture *can* produce correct artifacts, but doesn't prove the architecture *will* in non-trivial cases. Don't treat it as evidence of architectural soundness.

## Recommendation

Do **not** patch this run to v1.6 conformance. Patching would teach nothing about the architecture; it would just produce a v1.6-conformant tic-tac-toe. The run's value is its evidence of "shipped correct on minimal verification" — preserve it as historical exhibit.

If we want to know whether v1.6 produces a meaningfully better tic-tac-toe, run the prompt fresh under v1.6 and compare. If the v1.6 run produces the same artifact with the new structured artifacts attached (acceptance_assertions, PNV, etc.), v1.6 isn't adding artifact value for this complexity tier; it's adding architectural rigor. If v1.6 produces a substantially different artifact, the new gates were exerting force we can study.
