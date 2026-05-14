# Root-Cause Analysis — kanban-board

**Architecture version at time of run:** v1.3 (cv_artifact_exercise existed; v1.4 inline-deviation logging was being motivated by this run; v1.5 production fidelity did not yet exist)
**Outcome:** delivered with full artifact set; original verdict pass; cv-runner exercised 8 user_flow scenarios in jsdom; one mid-build inline correction (S4.A4 assertion) made silently.

This run is the **strongest pre-v1.5 example of organic principle practice**. Honors more of each principle than its predecessors despite being built before some of the explicit enforcement existed.

## What this run reveals about each principle

**Principle A (verification fidelity).** Honored more substantively than any prior run. `cv-runner.js` actually loads the integrated artifact in jsdom, dispatches real DOM events, asserts state. The 8 user_flow scenarios test the real wired modules, not a parallel test harness against builder fragments.

But the principle is honored *accidentally*, not enforceably. Two ways:
1. The cv-runner is not labeled "production fidelity." If the artifact had a CDN dependency, the cv-runner would likely have stubbed it (the v1.5 failure mode), but kanban happens to have zero CDN deps so no substitution was needed. The principle was satisfied by the absence of opportunity to violate it.
2. There is no `production_fidelity_environment` declaration, no `runtime_dependency_substitution: false` evidence, no fetch_log. A future kanban-like build with a CDN dep would produce the same cv-runner shape and silently fail under v1.5's principle.

**Principle B (audit completeness).** Honored at the v1.4 enumeration level but reveals the principle's enforcement gap. The run-report acknowledges Coordinator silently amended assertion S4.A4 mid-build (the test was checking DOM-element-equality on an element that gets replaced by re-render). That correction was not logged in `state/inline-deviations/` — because v1.4's amendment that made such logging required was *motivated by* this exact incident.

This is an interesting recursion: the run that revealed the gap could not have logged the deviation because the requirement to log it didn't exist yet. v1.4 was added in response. But v1.4 is enumeration: it lists six categories that must be logged. It does not enforce the property: every judgment call must have a record. A future Coordinator that makes a judgment call outside the six categories still escapes audit.

**Principle C (spec-to-test coverage).** Honored substantively. 39 acceptance_assertions across 7 sections; every prose acceptance phrase has at least one structured form. 6 machine_checkable_assertions across 2 IPs. This is the most coverage of any pre-v1.5 run.

But still no PNV. The prompt's named verb ("organize tasks" or "use a kanban board" — TD never analyzed) is never asserted end-to-end. The 8 user_flow scenarios cover individual interactions (add list, drag card, delete card, persist) but no single scenario is the canonical user-success path. The user opens the page, expects to organize their work; nothing verifies that journey directly.

**Principle D (path coverage).** Same as all other runs — escalation paths, Researcher, re-Discovery, etc. all unexercised.

## What this run teaches the architecture

The kanban run is the **best evidence that organic principle practice is possible without enforcement, and also the best evidence that organic practice is unreliable.** The run does the right thing (real DOM exercise, structured assertions for every acceptance phrase) without being required to. It also misses things (no PNV, no production-fidelity declaration, S4.A4 deviation unlogged) that explicit enforcement would have caught.

The deeper lesson: **best practice without enforcement converges on most-but-not-all of the principle.** That "not-all" is where the next failure class lives. The fact that kanban had a near-perfect verification regime relative to its era does not mean future builds will produce equivalent regimes by default. Enforcement is what makes the principle reliable across runs.

## Recommendation

Do **not** patch this run, even though it's the easiest patch candidate (only 3 hard failures, all documentation-side). Patching teaches us about v1.6's enumeration; not patching preserves the run as evidence of organic-practice limits.

Optionally: write a one-paragraph addendum to the run-report explicitly noting that this run's strengths emerged from agent judgment, not architecture enforcement. That preservation matters because future architecture decisions can use it as evidence: "kanban achieved X without enforcement; the principle question is whether X is reliable across runs without enforcement, which the kanban-vs-blackjack difference suggests it isn't."

A v1.6 fresh run of the kanban prompt would test this directly. If v1.6's enforced gates produce a meaningfully more thorough verification regime (PNV, production-fidelity declaration, prompt_verb_analysis, Historian artifacts), v1.6 is doing real work. If they produce the same shape with extra labels, the kanban regime was already at the principle's enforcement frontier and v1.6 is paperwork.
