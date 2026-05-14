# Architecture Principles

## North Star

> *"The perfect Auto Builder would understand exactly what the user means and build them exactly what they want."*
> — adapted from Larry Page on the perfect search engine

Every principle, role, and amendment below is in service of this. When a design choice does not bring the architecture closer to it, prefer revising the architecture. The asymmetry the project exists to invert is this: **prompt specificity must not scale with the architecture's failure modes.** If the architecture needs the user to over-specify to succeed, that is an architecture bug, not a user bug.

This is the operationalized mission. The lettered principles below are the laws that must hold for the architecture to keep approaching it.

---

The v1.x amendment trail has been **reactive enumeration** — each amendment closes one specific failure class as it surfaces. That pattern produces an architecture that grows by accumulating rules without articulating the laws those rules instantiate.

This document names the underlying laws. The goal is to shift from reactive enumeration to **proactive enforcement**: amendments going forward should be evaluated against whether they enforce a principle structurally, not whether they patch a specific symptom.

Each principle below has: a statement, why it matters, what enforcement looks like, which v1.x amendments instantiate it (and how completely), and what gaps still exist in v1.6.

---

## Principle A — Verification Fidelity

> **The verification environment reproduces the user's actual environment. Any departure from it is an explicit, justified exception.**

**Why it matters.** Every difference between verification environment and production environment is a potential failure class. The blackjack and latex runs both shipped past every gate while failing for the user — both because the verification environment substituted something the production environment doesn't (jsdom-stub for browser; npm-katex for CDN-katex). The architecture has been closing these substitutions one at a time as failures reveal them. That pattern can be extended forever.

**What enforcement requires.**
- Every CV report must declare a `production_fidelity_environment` describing the precise environment used.
- Every difference between that environment and the user's actual environment must be listed as an `exception` with: what is different, why this difference is acceptable for this verification, what class of failure it could mask.
- Critic's final-sweep verifies the exception list is complete (no silent substitutions) — a Critic check that doesn't currently exist.
- New exceptions cannot be silently added on a per-run basis; they require justification audited by Critic.

**v1.x mapping.**
- v1.3 introduced `cv_artifact_exercise` — closed: "no behavioral exercise at all" exception. Did not declare other exceptions.
- v1.5 struck "Node sandbox with stubbed DOM" — closed: "runtime dep substitution" exception. Did not declare remaining exceptions.
- v1.6 added production-fidelity-at-design-time TD heuristic — preventive, not enforcement.

**Where v1.6 falls short.** The architecture documents two specific substitutions as forbidden but does not require an explicit exception list per verification. jsdom approximates CSS layout, font metrics, focus management, animation frame timing, the JIT, memory characteristics, and security context (file:// vs https://). All of these are silent exceptions in the latex run's report-v15.json, even though that report is the canonical example of v1.5 conformance. The next failure class will exploit one of these unstated exceptions.

---

## Principle B — Audit Completeness

> **Every decision and state transition has both a producer and a record. Absence of a record is a defect, not a normal mode.**

**Why it matters.** The architecture's coherence depends on being able to reconstruct why each decision was made. When records are missing, future re-evaluation, escalation routing, and lessons learning all degrade silently. The kanban Coordinator silently amending an acceptance assertion mid-build is the canonical example: under nested dispatch the decision would have left a paper trail; under inline mode it didn't.

**What enforcement requires.**
- For every state-changing action that occurs during a build, both a producer (the role responsible) and a record (the artifact preserving the why) must exist.
- Critic's final-sweep walks events backward from artifacts and forward from dispatched roles, verifying both halves of every producer-record pair.
- The check is on the property ("every state change has a record"), not on the enumerated list of artifact types.

**v1.x mapping.**
- v1.2 added build-complete handoff and delivery checklist — closed: "logical completion ≠ delivery" gap by enumerating artifacts.
- v1.4 added inline-deviation logging — closed: "inline judgment calls vanish" gap by enumerating six categories.
- v1.6 added Historian artifacts to delivery checklist — closed: "Historian outputs unrequired" gap by enumerating two more artifacts.

**Where v1.6 falls short.** Every amendment patches one specific record-absence at a time. The Critic audit checks that *logged* deviations are correctly scoped, but does not check whether *all judgment calls* got logged. A Coordinator that silently makes 5 implementation-path choices and logs 0 of them passes audit. The principle would require Critic to detect the absence — likely by sampling the build's outputs and asking "for each output, is there a producer-record pair?"

---

## Principle C — Spec-to-Test Coverage

> **Every textual claim in any spec artifact derives at least one structured assertion with an assigned verifier. No prose ships unverified.**

**Why it matters.** Prose is read by humans during construction but never independently checked. The blackjack Deal-button defect happened because the literal acceptance phrase "see the round outcome, and start a new round" was prose that humans read and Builders honored partially, but no machine ever verified the second clause. Each subsequent amendment has been converting one more layer of prose into structured form.

**What enforcement requires.**
- Critic walks every spec artifact (prompt, ledger, sections, contracts, IP locks, charters).
- For every prose claim, verify at least one structured assertion derives from it with an explicit verifier role assigned.
- Coverage is the property: every claim has at least one assertion. Critic flags any prose that ships without coverage.

**v1.x mapping.**
- v1.2 introduced machine_checkable_assertions for IP locks — closed: "IP lock prose unverified" by enumerating IP-level structured assertions.
- v1.3 introduced acceptance_assertions for sections — closed: "section acceptance prose unverified" by enumerating section-level structured assertions.
- v1.5 introduced PNV — closed: "the prompt's verb is unverified" by enumerating one prompt-level assertion.
- v1.6 introduced prompt_verb_analysis — closed: "verb derivation is unverified" by enumerating verb-derivation rationale.

**Where v1.6 falls short.** Each amendment closes one specific prose-derivation gap. The architecture still has uncovered prose:
- Discovery's `restatement` field — paragraph of prose that nothing verifies.
- Discovery's `out_of_scope` items — each is prose; the verification is a grep that's only as good as the chosen keyword.
- Inflection point `topic`, `why_inflection`, `default_branch` — all prose with no structured derivation.
- Section `charter` — multi-sentence prose about what a section does; the acceptance_assertions cover *what should be verified* but not *what was actually intended*.
- Builder task descriptions in briefings — prose, no structured form.

The principle would require: each of these has at least one assertion, or the architecture explicitly marks the prose as documentation-only and not a load-bearing claim.

---

## Principle D — Path Coverage

> **Every architectural path is exercised before its outputs are trusted in production scenarios. An untested path is treated as suspect by default.**

**Why it matters.** Five runs into the project, multiple architectural paths have never executed: Researcher (planning + escalation), Discovery amendment, TD impact-analysis, Arbiter routing, all four severity tiers, nested dispatch, Sev 0 audit. Each is documented in charter but unverified by use. The first time any of them fires in a real build, it might silently fail in ways the happy-path runs never revealed. The Re-Verification role is the most recent example — added in v1.6, never dispatched.

**What enforcement requires.**
- The architecture maintains a coverage manifest — a list of every documented path with a "last exercised" timestamp and the run that exercised it.
- Untested paths are flagged as suspect; the README and any onboarding documents make untested-vs-tested status visible.
- Before treating a path as production-ready, deliberately design at least one run to exercise it.

**v1.x mapping.** None. This principle has no instantiation in v1.x because no failure has yet emerged from an untested path.

**Where v1.6 falls short.** No coverage manifest. The architecture treats all charters as equivalently valid even though some are textbook-only. This is a passive failure — nothing is broken because nothing has been tested where it would break — but it's the most predictable source of the next class of failure.

---

## How to Use These Principles

When proposing a v1.7+ amendment, the question is not "what symptom should this close" but "which principle does this enforce, and does it enforce it structurally or by enumeration?"

A reactive amendment looks like: "X happened in the last run; add a check for X."
A principled amendment looks like: "X is an instance of Principle Y. Y is currently enforced by enumeration of {A, B, C}. Add Z, which moves Y from enumeration to property check."

Reactive amendments are not wrong, but they don't prevent the next instance of the same principle violation. Principled amendments do.

---

## Predicted Next Failures (v1.6 → likely v1.7 motivation)

For each principle, the most likely next failure given v1.6's enforcement gaps:

**Principle A — likely next failure:** A run with a deliverable whose user-facing behavior depends on real-browser CSS layout (e.g., responsive resizing, drag-target hit detection, focus order). jsdom passes; user opens in real browser; behavior is wrong. Concretely: a build that involves "click the third element from the right" or "the dropdown opens below the button when there's room and above when there isn't." The PNV passes in jsdom because the test only checks "does an element appear"; the actual layout-dependent interaction fails for the user.

**Principle B — likely next failure:** A run under inline dispatch where Coordinator makes multiple implementation-path choices that should have been logged as inline deviations and isn't. Critic's audit only checks logged deviations for scope correctness; it doesn't detect unlogged ones. The build delivers, the choices are invisible in the audit trail, and the next time someone tries to re-evaluate the build (Re-Verification role), the rationale for those choices is lost. Failure mode: the build "passes" but its provenance is incomplete.

**Principle C — likely next failure:** A run where Discovery's `restatement` paragraph has a subtle interpretive error (e.g., "to play blackjack" → restatement says "single-player vs dealer" when the user actually wanted couch-multiplayer). No structured assertion derives from `restatement`. PNV is correctly derived from the prompt's literal verb but doesn't catch the interpretive error in the restatement. The build delivers a game that plays correctly against a dealer when the user wanted to play against a friend.

**Principle D — likely next failure:** A run that finally exercises Researcher (planning mode) because TD encounters a non-canonical IP. Researcher dispatches but produces malformed findings (wrong schema, missing fields). TD-in-impact-analysis-mode tries to consume the findings and behaves unpredictably because the path has never been integration-tested. Failure surfaces as a build that hangs or produces a delta plan with garbage entries.

---

## Suggested v1.7 Direction

Rather than enumerate these as four amendments, v1.7 could elevate one principle from enumeration to property check as a proof-of-concept and observe what that surfaces. **My recommendation: Principle C (spec-to-test coverage) first**, because it's the most concretely actionable — Critic walks every spec artifact, identifies prose, requires assertion coverage, flags gaps. Less ambiguous than Principle A's "exception list" or Principle B's "every state change" property, and produces a concrete delivery-blocking gate that future runs would have to honor.

If C goes well structurally, the same pattern (enumeration → property check) can be applied to A, then B. D is different — it's about epistemic honesty rather than enforcement; the manifest can be added at any time without architectural amendments.
