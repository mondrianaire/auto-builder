# Root-Cause Analysis — blackjack

**Architecture version at time of run:** v1.0
**Outcome:** delivered with apparent pass; subsequently reclassified failed; two real artifact defects (Deal button stays disabled after resolve; per-round shoe contradicts IP2 "per-session" lock).

This run is the **canonical proof-of-concept for why the principles need explicit enforcement.** A single run produced violations of three principles simultaneously, each of which independently shipped past the verification regime.

## What this run reveals about each principle

**Principle A (verification fidelity).** Violated and the violation was load-bearing. CV's checks were static inspection only — exactly like tic-tac-toe. But unlike tic-tac-toe, blackjack's behavioral surface is large enough that static inspection cannot catch the path defects. The Deal-button-stays-disabled-after-resolve defect is invisible to grep. It is visible only to a verifier that actually clicks Deal twice. The architecture didn't have such a verifier; the defect shipped.

The violation was not "verifier substituted runtime deps" (that's the v1.5 framing). At v1.0 the violation was even simpler: there was no verifier of behavior at all. Principle A was at zero enforcement and the consequences were immediate.

**Principle B (audit completeness).** Violated structurally. The Coordinator finished its work and signaled "run-complete" without writing `build-complete.json`. The Orchestrator interpreted that as delivery and stopped. No Critic final-sweep ran. No CV ran. No `output/final/` was populated. No `run-report.md` existed.

The principle would have caught this: every state-changing action requires a record, and "the build phase ended" is a state-change that requires producing the build-complete record. v1.0 had no such enforcement; v1.2 added the build-complete artifact to the delivery checklist (one specific instance of the principle); but the architecture has not generalized to the property check.

**Principle C (spec-to-test coverage).** Violated and again load-bearing. The acceptance phrase "see the round outcome, and start a new round" was prose. The Builders implemented "see the round outcome" but missed "start a new round" (the renderer disabled the Deal button after `phase === 'resolved'` and never re-enabled it). No machine verified the second clause because no machine had a structured form of it to verify against.

The IP2 lock said "six-deck shoe shuffled fresh per session." This is also prose. The Builders implemented "shuffled fresh" but not "per session" — they shuffled per round, contradicting the lock. No machine caught this because no machine had a structured assertion derived from the prose.

The principle would have caught both: every prose claim derives at least one structured assertion. v1.3 introduced acceptance_assertions to address the first instance of this pattern; v1.2 introduced machine_checkable_assertions to address the second. Both were specific instances of Principle C; neither generalizes to the property check.

**Principle D (path coverage).** Not applicable in the same way as tic-tac-toe; no architectural amendment paths existed yet.

## What this run teaches the architecture

Three failures from one run, each instantiating a different principle. The architecture's response was three separate amendments (v1.2 for build-complete + IP assertions, v1.3 for acceptance assertions + cv_artifact_exercise). Each amendment is a specific rule; none is a property-level enforcement of the underlying principle.

This run is also the proof that **failures cluster.** When the architecture lacks principle enforcement, a single run can hit multiple failure classes simultaneously. The corollary: when the architecture finally enforces a principle as property, *all* its instances are caught at once, including the ones we haven't predicted yet.

## Recommendation

Do **not** patch this run. The artifact has two real defects (Deal button, per-round shoe) and a verification regime that wouldn't have caught them anyway. Patching would mean fixing the artifact AND backfilling 9 gates worth of architecture conformance.

Treat this run as the architecture's reference example of "what unprincipled verification looks like." When discussing why a v1.7 amendment should enforce a principle as property rather than enumerate rules, point at this run: three failures from one prompt, each a different category, each invisible to the regime in place at the time.

If we want a working blackjack artifact, the cheapest path is a fresh v1.6 run of the same prompt. v1.6's enforced gates (PNV, acceptance_assertions, machine_checkable_assertions) would have caught both real defects on first verification. That fresh run becomes a positive control: "v1.6 catches what v1.0 missed for this prompt." Combined with this run as the historical exhibit, the pair is more useful than any patch.
