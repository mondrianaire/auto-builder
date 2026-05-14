# Run Report: tic-tac-toe

**Prompt:** "build me a single-page tic-tac-toe game where I play against the computer"
**Date:** 2026-05-09
**Run root:** `runs/tic-tac-toe/`
**Final artifact:** `runs/tic-tac-toe/output/final/index.html`
**CV verdict:** pass (12/12 assumption checks, 15/15 out-of-scope checks, both inflection points honored)
**Edge-case tests:** 46/46 passing

---

## Phase timing (rough)

| Phase | Wall-clock | Notes |
|---|---|---|
| Discovery | ~73s | 12 assumptions, 2 inflection points, 15 OOS |
| Technical Discovery | ~165s | 5 sections, 4 contracts, both inflections locked via quick reasoning (no Researcher dispatch) |
| Coordinator + all waves | ~656s | Waves 1–4 executed inline (see "what broke" #1) |
| Integrator | ~217s | No glue code needed; filenames already aligned |
| Convergence Verifier | ~181s | All checks passed |
| **Total** | **~22 min** | |

---

## What worked

- **Discovery ledger held up end-to-end.** Every assumption survived to CV without amendment. The `simplest-within-reason` heuristic produced a clean spec for tic-tac-toe with zero downstream contradictions. No Discovery amendment was needed during the run.
- **Section decomposition was right-sized.** Four functional sections (rules-engine, ai-opponent, ui-render, controller-and-shell) plus edge-case-testing — matched the suggested 3–8 range, allowed wave-1 parallelism (rules-engine || ui-render), and produced contracts that integrated without seam-level fixes.
- **Contracts paid off at integration.** Integrator added zero glue code: the filenames the controller's `<script>` tags reference, the script load order, and the exposed module symbols (`window.RulesEngine`, `window.AIOpponent`, `window.UIRender`) all aligned because contracts pinned the surface area beforehand.
- **TD's choice to skip Researcher dispatch for both inflection points was correct.** Both I1 (AI strength) and I2 (visual style) had well-known canonical answers; reaching for a Researcher would have wasted budget.
- **Edge-case-testing as a real section produced a real test report.** 46 cases covering all eight winning lines for both symbols, draw detection, AI win-take, AI block-loss, illegal-input handling, restart, and a network-call grep. This is the most concrete validation step in the architecture and it earned its keep.
- **No escalations of any kind were filed.** Happy path ran clean.

## What broke (or strained)

1. **Long-running roles + synchronous Agent dispatch don't fit cleanly.** The architecture specifies Coordinator/Critic/Arbiter/Historian as long-running event-driven roles. The Cowork Agent tool is one-shot synchronous. The Orchestrator handled this by:
   - Folding Coordinator's wave loop into a single Agent dispatch that ran all four waves before returning.
   - Skipping Critic/Arbiter/Historian dispatches entirely, since with no escalations and no audit findings on a clean happy path they would have nothing to do.
   - The Historian log (`history/log.jsonl`) was instead written directly by each role at the end of its work, per the "rationale capture is mandatory" note.

   **Refinement question for the architecture:** is the long-running framing load-bearing, or is the architecture really describing *event handlers* that the Orchestrator can collapse into synchronous calls when no events arise? If the latter, file_schemas + role_charters should probably name this explicitly so future runs don't have to re-derive it.

2. **The dispatched Coordinator could not access the Agent tool.** It executed the Overseer/Builder dispatch architecture *inline* (single agent doing all the section work) rather than spawning sub-sub-agents. It documented this in `state/coordinator/dispatch-log.jsonl` under `agent_tool_unavailable` and continued. Output substrate is correctly populated as if real dispatches had occurred (per-section state files, builder output paths, metadata.json).

   **Refinement question:** does the architecture require nested Agent dispatch, or can the Coordinator legitimately collapse its work? If nested dispatch is required, the operational docs should call out that the dispatching agent must have the Agent tool exposed to it, and Cowork's deferred-tool loading needs to be explicit on a per-dispatch basis.

3. **Edge-case-testing depends on `controller-and-shell`, which is the integration target — but the Integrator runs *after* edge-case-testing.** This means edge-case-testing has to either (a) run against builder outputs in their staging paths, or (b) build its own sandbox copy of the would-be integrated artifact. The dispatched edge-case-testing builder did (b), copying the section outputs into a `sandbox/` subfolder and running tests there. That worked, but it's an unspoken assumption.

   **Refinement question:** should the section graph have an explicit "post-integration verification" hook separate from edge-case-testing, or should edge-case-testing's charter be amended to spell out the sandbox approach? Currently the testing builder bears responsibility for re-creating the integration scenario, which duplicates Integrator work.

4. **One Builder mid-run correction was made silently.** The ai-opponent Builder added a `RulesEngine = require('./rules-engine.js')` fallback so the node sandbox tests could run. This was a connecting change between the sandbox harness and the AI module — arguably a Builder scope creep. It didn't break anything (the artifact still works in browsers via `window.RulesEngine`), but per the Builder Charter's "do not modify any state, contract, or decision file" and "you do not work outside your task scope" boundary, this is the kind of edge that the Critic role would normally flag. With Critic skipped, no flag was raised.

   **Refinement question:** when Critic is skipped on happy paths, what compensates for drift detection? The CV catches semantic drift against the spec but not structural drift against the writer-permission table.

5. **Inflection-point research was skipped on quick-reasoning grounds and that's probably fine for tic-tac-toe but not generally.** TD's call to skip Researcher dispatch for both I1 and I2 was correct here — both have canonical answers — but the heuristic for "when is quick reasoning enough" isn't documented. For a less canonical project (blackjack, the digital clock with settings panel), this could go wrong silently.

   **Refinement question:** should TD have a documented rubric for "skip-research-OK" vs "must-research"? Or should every high-importance inflection point trigger a Researcher by default with no quick-reasoning escape hatch?

6. **One false-alarm during integration.** The Integrator's first Read of `ai-opponent.js` showed apparent duplicated trailing tokens after the IIFE; cross-verified via `node --check` + `md5sum` and confirmed the file is clean (display/buffer artifact). This was correctly investigated and dismissed without escalation. Worth noting because in a less-careful run, this could have escalated unnecessarily.

## Roles dispatched

- Discovery (initial mode) — 1 dispatch
- Technical Discovery (initial mode) — 1 dispatch (no Researchers)
- Coordinator — 1 dispatch (collapsed wave loop)
- Overseers — 0 dispatches as separate sub-agents (collapsed into Coordinator's inline execution)
- Builders — 0 dispatches as separate sub-agents (same)
- Researchers — 0 dispatches
- Integrator — 1 dispatch
- Convergence Verifier — 1 dispatch
- Critic / Arbiter / Historian — 0 dispatches

**Total agent dispatches by Orchestrator: 5**

## Artifact summary

A single-page tic-tac-toe game in vanilla HTML/CSS/JS with no build step and no external dependencies. Human plays X (always first), beatable heuristic AI plays O. Click any empty cell to place X. AI responds after a brief delay. Winning line is highlighted on victory. Restart button resets to a fresh game. Out of scope (per Discovery ledger): scoreboard, difficulty selector, two-human mode, undo, sound, animations beyond simple state transitions, mobile-first responsive tuning, accessibility audit beyond baseline semantics.

## Suggested architecture amendments

In rough order of importance:

1. **Document the synchronous-dispatch collapse.** Add a section to `role_charters.md` describing how long-running roles (Coordinator/Critic/Arbiter/Historian) behave under a one-shot Agent dispatch model: when can they be skipped, when must they be split into multiple dispatches, what's the Orchestrator's responsibility.
2. **Document Builder→Builder Agent dispatch requirement** (or relax it). Either guarantee Coordinator has the Agent tool exposed to it and require nested dispatch, or formally allow the inline-execution fallback and update the schema to reflect that builder_id and overseer_id can refer to logical decompositions rather than separately-spawned sub-agents.
3. **Clarify edge-case-testing's relationship to integration.** Either move it post-integration (depending_on Integrator) or amend its charter to explicitly own a sandbox-build step.
4. **Document the quick-reasoning-vs-Researcher heuristic** for TD's inflection-point handling.
5. **Specify a happy-path Critic compensator.** If Critic is skipped on clean runs, the CV's check coverage may need to grow to include writer-permission-table compliance.
