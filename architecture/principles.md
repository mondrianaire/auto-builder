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

## Principle E — Atomic Lexical Anchors

> **Proper nouns in the prompt are atomic identifiers, not descriptive vocabulary. They name specific external systems whose properties exist independent of the architecture's assumptions.**

**Why it matters.** The StreamDock run failed because three proper nouns (MiraboxSpace StreamDock VSD N4 Pro, Touchbar Mode, Apple Music Desktop Application) were treated as descriptive — Discovery restated them as a generic "wide-display strip" and a generic "Apple Music desktop client." Each of those proper nouns names a specific product whose actual properties are not the generic stand-in. TD then locked the entire technical plan to the wrong SDK (Elgato Stream Deck) because TD's training data recognized the SDK shape but not the StreamDock product name. The build passed all internal gates and failed first-contact because every load-bearing decision was made about products other than the ones the user named.

The asymmetry that makes this important: prompt specificity must not scale with the architecture's failure modes. If the architecture needs the user to over-specify, that is an architecture bug, not a user bug (see North Star).

**What enforcement requires.**
- Discovery enumerates every proper noun in the prompt as an atomic identifier in `ledger-v1.proper_nouns[]`, with a citation requirement: Researcher must verify each one against canonical evidence (Principle F).
- TD's technical decisions that depend on a proper noun must cite the noun's resolved evidence (the canonical source documenting the proper noun's actual properties), not training-data familiarity.
- Critic's `prose_coverage` extends to proper nouns: every proper noun in the prompt either has a corresponding entry in `ledger-v1.proper_nouns[]` with a citation, or Discovery has explicitly demoted it.
- Proper nouns are overridable only by Discovery's **demotion** operation, which requires all four guardrails:
  - The proper noun is genuinely unreachable (canonical source unavailable, not merely inconvenient).
  - The proper noun is in a *supportive/illustrative* role in the prompt, not a *target-defining* role.
  - Discovery can articulate the telos *without* the demoted noun.
  - The build with substitution still demonstrably satisfies user intent.
- Lexical markers `sample`/`example`/`e.g.`/`such as`/`like`/`for instance` weaken atomicity automatically: proper nouns inside these constructions are pre-flagged as supportive rather than target-defining.

**v1.x mapping.**
- None prior to v1.9. The principle is added in response to the StreamDock retrospective (`failure-catalog-streamdock.md` §2 Law A).

**Where this falls short / what's still unspecified.** The boundary between "supportive" and "target-defining" roles for a proper noun is a judgment call Discovery must make. The four guardrails constrain the demotion but the Discovery charter needs operational rules for the judgment itself. The interaction with Principle F (what happens when a proper noun's canonical source is unreachable) is partially specified by the demotion criteria but needs explicit Sev 4 surfacing rules for the cases where demotion is not allowed.

---

## Principle F — External Authority Discipline

> **Every load-bearing inference about an external system carries a citation traceable to canonical evidence. Training-data familiarity is not a citation.**

**Why it matters.** The StreamDock run had Researchers that listed GitHub repo URLs as `context_pointers` and returned findings as if those repos had been read — but they had not been read; they had been summarized from training-data familiarity. The architecture has no mechanism to distinguish "I read this in the canonical source" from "I recall this is true." A Critic-type audit cannot follow a citation if the citation is decorative.

This is the failure mode where the architecture's structural defense against TD's blind spot (Researcher exists to expand option space when TD can't quick-reason) was itself blind: Researcher returned recommendations consistent with TD's pre-existing assumptions, adding the appearance of due diligence without the substance.

**What enforcement requires.**
- Every Researcher finding has a `citations[]` array; each citation is a URL or file path, plus a `verbatim_excerpt` field showing the exact text from the source that supports the finding.
- Critic-type audit can spot-check by following the citation: if the verbatim excerpt does not appear at the cited URL/path, the citation is decorative and the finding is invalid.
- TD's load-bearing decisions that depend on external system properties must cite Researcher findings (which transitively cite canonical sources), not TD's own training data.
- For domains where training-data certainty is genuinely high (e.g., basic ECMAScript syntax), TD may quick-reason without citation per the existing four-condition rubric. The rubric's first condition (`well-known canonical answers in your training data`) requires honest self-assessment: well-known means demonstrable, not familiar.
- **Unreachable canonical source interaction with Principle E:** when a proper noun is named but its canonical source cannot be verified, the architecture must not silently fall back to training-data familiarity. It must escalate to Discovery for demotion analysis (Principle E). Discovery commits to a best-effort outcome — demote (substitute material), substitute (target the closest verifiable equivalent and document the substitution), or best-effort target commitment (build against the most plausible interpretation when no better evidence exists). The architecture never surfaces uncertainty to the user; the user gets a delivered artifact with an explicit uncertainty manifest in the run-report.

**v1.x mapping.**
- v1.2's machine_checkable_assertions partially address this for IP locks by requiring structured assertions, but the assertions can still reference internal expectations rather than external sources.
- v1.6's `prompt_verb_analysis` partially addresses this for the prompt verb by requiring rationale, but the rationale can still be training-data-sourced.
- Neither requires citations to canonical sources. The principle is added in v1.9 in response to the StreamDock retrospective (`failure-catalog-streamdock.md` §2 Law B).

**Where this falls short / what's still unspecified.** The mechanics of `verbatim_excerpt` verification require Researcher findings to be re-readable by Critic. For findings derived from interactive or rate-limited sources (web pages that change, docs behind auth), the verbatim excerpt may not be re-fetchable. The schema needs a fallback for non-static citations — snapshot/archive URLs, content hashes, or a `citation_class` field distinguishing static from dynamic sources. TBD.

---

## Principle G — Deliverability Tier Discipline

> **Every claim about the deliverable's success requires verification at the tier it operates in. Telos-level claims verify at telos; sub-goal claims verify at sub-goal; first-contact claims verify at first-contact. Verification at the wrong tier is no verification.**

**Why it matters.** Two builds (poker 1.0, StreamDock) passed every internal gate and failed first-contact — the simplest possible user-facing test ("does it appear / open / install?"). The architecture has a Tier 1 verifier (CV's PNV checks the prompt-named verb — telos) but no Tier 2 verifier (can the user reach the artifact at all?) and no Tier 3 verifier (does each TD-identified sub-goal user-accessibly work?). Critic checks substrate consistency (does the manifest declare what TD said it should declare?) — but substrate-consistency is not a tier; it asks whether the build matches the plan, not whether the plan works for the user.

**What enforcement requires.**

Three tiers, each with its own gate:

| Tier | Verification target | Failure mode it prevents |
|------|---------------------|--------------------------|
| 1 — Telos | The prompt-named verb is exercised against the deliverable | Build does the wrong thing |
| 2 — First-contact | The user reaches the deliverable in one obvious action (inline link, native install, no procedural setup) | Build is unreachable even if correct |
| 3 — Sub-goal | Each TD-identified technical sub-goal works at the user-access level | Build appears to work but TD's sub-claims fail when actually used |

Cross-tier design constraint: the verification mechanism for each tier should be replicable by the user in one step. If verifying a sub-goal requires the user to install dev tools, that is a deliverability failure even if the sub-goal technically works.

Each tier gate has scope discipline:
- Tier 1 does not check sub-goals (Tier 3's job).
- Tier 2 does not check deep functionality (Tier 1/3's job).
- Tier 3 does not check the prompt-verb (Tier 1's job) or compliance with TD's plan as a document (Critic's job).

**v1.x mapping.**
- v1.5 introduced PNV — Tier 1 instantiation.
- No v1.x amendment addresses Tier 2 or Tier 3. The principle is added in v1.9 in response to `failure-catalog-streamdock.md` §8.

**Where this falls short / what's still unspecified.** Which role owns Tier 2 and Tier 3 verification is TBD. CV is the obvious candidate but may need to expand or split. The mechanics of "user-accessible sub-goal verification" for hardware/SaaS targets the verifier cannot reach is also TBD — possibly resolved by reading the target environment's canonical documentation and asserting conformance, per Principle F (the substantive equivalent of Principle H's independent-source criterion).

---

## Principle H — Verification Independence

> **The verifier and the verified must not share their source of truth. Verification criteria derive from a source independent of the artifact's construction. Self-referential verification is structurally insufficient.**

**Why it matters.** Law C from the StreamDock retrospective generalizes. Two failure modes share the same shape:

- **CV's fake-SDK case:** CV's `production_fidelity_environment` was "real plugin process + real ws library + fake SDK host on 127.0.0.1" — and the fake SDK host was modeled on the Stream Deck protocol, the same protocol the artifact was built for. The PNV couldn't fail because the test environment was wrong in the same way as the artifact.
- **Critic's self-consistency case:** Critic checked `manifest.json#SDKVersion == 2` and reported PASS because the integrated artifact did have SDKVersion 2. The assertion was the wrong assertion — `SDKVersion: 2` is an Elgato Stream Deck construct, not a VSDinside StreamDock construct. Critic had no role-defined way to question whether an assertion's `expected_value` was itself correct, because both the assertion AND the expected value derived from TD.

In both cases, the verifier derived its expectations from the same source as the artifact's construction. The verification was a closed loop and could not catch errors in the shared assumptions.

This is the **logical** counterpart to Principle A's **environmental** independence requirement. Principle A says the verification *environment* must reproduce the user's environment. Principle H says the verification *criteria* must derive from an external source.

**What enforcement requires.**
- Every load-bearing verification check has a `source` field: where did the expected value come from?
  - `prompt` (the user's literal text) — strongest external source for telos-level checks.
  - `canonical_evidence` (Researcher finding citing external docs, with `verbatim_excerpt` per Principle F) — strongest source for sub-goal checks involving external systems.
  - `td_plan` — flagged as **self-referential**; not sufficient on its own for any check whose subject is an external system. Allowed only for internal-consistency checks (e.g., "this internal contract is honored").
- Critic's audit walks every assertion and flags any whose `source: td_plan` is being used to check an external-system property.
- CV's `production_fidelity_environment` must declare, for each component, whether the component is "real" (the user's actual environment / canonical) or "modeled" (the architecture's representation). Any "modeled" component receives an explicit exception rationale per Principle A; additionally per Principle H, the modeled component must be *independently sourced* (e.g., reading the target's documentation), not derived from TD's construction plan.

**v1.x mapping.**
- v1.3's `cv_artifact_exercise` is partially aligned: it verifies against the integrated artifact rather than TD's plan, so it has source independence for behavioral checks. But it can still verify in an environment derived from TD's assumptions (CV/fake-SDK case).
- v1.5's production-fidelity-environment closed the runtime-dependency-substitution case (Principle A instantiation) but did not address verification-criteria independence.
- None of these address Critic's verifier-derived-from-TD-plan issue. The principle is added in v1.9 in response to `failure-catalog-streamdock.md` §2 Law C and Addendum A.

**Where this falls short / what's still unspecified.** "Independent source" for a verification criterion is sometimes unavailable — for novel artifacts where no canonical documentation exists, TD's plan may be the only available source. The principle permits `source: td_plan` with an explicit `external_source_unreachable: true` flag in these cases. CV records the gap in `principle_h_skips[]` and the run-report's uncertainty manifest documents that verification of that property was structurally impossible. The build still ships (per the project's "always deliver" contract); the user gets transparency about which claims were independently verified vs. taken on TD's word.

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
