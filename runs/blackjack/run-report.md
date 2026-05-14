# Run Report: blackjack

> **STATUS: RECLASSIFIED FAILED (2026-05-10).**
>
> Reclassified retroactively under the v1.5 amendment that closed the production-fidelity-exercise loophole. The original `pass_with_concerns` verdict relied on cv_artifact_exercise + edge-case-testing running in jsdom against the integrated artifact — a configuration that does not exercise the prompt's named verb against the deliverable in its target deployment environment. The Deal-button-stuck-disabled defect documented in the v1.3 amendment history is the canonical evidence: it shipped past every gate of the v1.2 stack and was caught only by the user. The v1.3 patch added cv_artifact_exercise on top of the same flawed substrate (jsdom with stubbed/substituted runtime context), which left the same class of failure live — as latex-equation-renderer subsequently demonstrated. Per the v1.5 standard, this run did not satisfy the prompt's named verb against the deliverable in production fidelity and is therefore FAILED.
>
> No remediation is being applied to this artifact retroactively. The reclassification is a record correction so that the run history doesn't carry a misleading green flag for future architecture work to learn from.
>
> See `runs/latex-equation-renderer/run-report.md` for the v1.5 derivation and `architecture/role_charters.md` (Convergence Verifier + Technical Discovery sections) for the production-fidelity gate that this run did not satisfy.

**Prompt:** "build me a web app to play blackjack"
**Date:** 2026-05-09
**Run root:** `runs/blackjack/`
**Final artifact:** `runs/blackjack/output/final/index.html`
**Original CV verdict:** pass_with_concerns (13/13 assumption checks, 15/15 out-of-scope checks, both inflection points honored; concerns are TD-level tightenings, not spec violations) — **superseded by FAILED reclassification above**
**Edge-case tests:** 14/14 passing (Coordinator-driven) + 6/6 independent spot-checks passing (parallel re-run)
**Total Orchestrator-spawned agent dispatches:** 6 (Discovery, TD, Coordinator, Critic-final-sweep, CV, edge-case-rerun)

---

## Phase timing (rough, from agent durations)

| Phase | Wall-clock | Notes |
|---|---|---|
| Discovery | ~87s | 13 assumptions, 2 inflection points, 15 OOS |
| Technical Discovery | ~158s | 5 sections, 3 contracts, both inflections locked via quick reasoning |
| Coordinator + all waves + Integrator | ~530s | Inline mode; 4 waves (1: rules-engine ‖ bankroll ‖ ui-render; 2: controller-and-shell; 3: integrator; 4: edge-case-testing) |
| Critic final-sweep | ~145s | All 4 checks pass |
| CV ‖ edge-case-rerun (parallel) | ~123s / 85s | Both pass |
| **Total** | **~17–18 min wall** | |

---

## What worked

- **Architecture v1.1 refinements held.** The dispatch-mode dichotomy from the tic-tac-toe retrospective is documented; the Orchestrator picked inline mode based on section count (5 ≤ 8) without ambiguity. The Critic final-sweep ran as a non-skippable structural compliance check before CV — this is the v1.1 addition and it cleanly caught zero issues, validating that the post-inline-build drift surface is small for a clean run.
- **Discovery's `simplest-within-reason` produced a coherent ledger that survived end-to-end.** All 13 assumptions verified at CV; no Discovery amendment was needed during the run. The hard line on real-money gambling (A4) and the explicit bounding of insurance/surrender/side bets (A5 + OOS) prevented Builder scope creep.
- **TD's quick-reasoning rubric correctly handled both inflection points.** IP1 (betting model → bankroll+bets) and IP2 (hand actions → full hit/stand/double/split) both passed all four rubric conditions: canonical knowledge, similar branch complexity, no new dependencies, easily reversible. No Researcher dispatch was needed, saving budget.
- **Contracts paid off at integration, exactly as in tic-tac-toe.** Integrator added zero glue code: the controller's `<script>` filenames (`rules-engine.js`, `bankroll.js`, `ui-render.js`, `controller.js`) and CSS link (`styles.css`) all aligned because contracts pinned the surface area. Stable DOM IDs in the ui-render contract (`btn-deal`, `btn-hit`, etc.) let controller bind events without coordination with the renderer.
- **Edge-case-testing pulled real weight.** 14 scenarios: blackjack-on-deal, dealer-blackjack-push, busts, soft-17 stands, splits (including ace-restriction), double-deals-one-card, illegal-action filters, payout precision, reset behavior, soft-ace handling. Independent re-run reproduced 14/14 plus added 6/6 spot-checks (smoke, deal-mechanics, payout precision including 1150 = 1000 - 100 + 250 for a blackjack, soft-ace transitions, HTML script-order regex check). Together this is concrete validation of the integrated artifact, not just per-section unit-style tests.
- **Section decomposition was right-sized.** Five sections (rules-engine, bankroll, ui-render, controller-and-shell, edge-case-testing) — within the recommended 3–8 range, one more than tic-tac-toe (the addition is bankroll, which is a real second pure-domain module that earns its independence from the rules engine). Wave 1 had genuine 3-way parallelism (the three pure modules with no inter-deps) before the controller integrated them.
- **No escalations of any kind were filed.** Happy path ran clean.

## What broke (or strained)

1. **Linux-bind-mount sync delay (false alarm, repeated from tic-tac-toe context).** The Coordinator agent observed that `wc -l` from inside the bash sandbox returned 0 lines for `state/coordinator/dispatch-log.jsonl`, `history/log.jsonl`, and `audit/flags.jsonl` even after writes — but the Windows-side Read tool showed the files fully populated. This was correctly diagnosed and dismissed without escalation: it's a one-way sync timing artifact between the Cowork Windows filesystem and the Linux workspace mount, not data loss. Files written via `cp` from inside bash itself were immediately visible (the integration directory). Worth surfacing as a known operational quirk so future agents don't waste budget chasing it.

   **Refinement question for the architecture:** should `file_schemas.md` or the role charters note this filesystem-asymmetry artifact for any role that mixes Edit/Write tool output with bash verification reads? The Integrator's "false-alarm prevention" clause covers display/buffer artifacts in single-tool reads; this is a different artifact (different tool, different filesystem view) that the docs don't currently address.

2. **CV's `pass_with_concerns` verdict on A6 deck-count tightening.** Discovery's A6 said "a standard 52-card deck, shuffled fresh for each hand (or each session)." TD's IP2 inflection-resolution rationale tightened this to "six-deck shoe shuffled fresh per session" — a perfectly defensible canonical-blackjack default. The implementation went one step further and reshuffles the shoe at the start of every round (`createInitialState()` is called in `controller.onDeal`), which renders the multi-deck-shoe choice cosmetic in practice (any single round uses one fresh shuffle of 312 cards rather than 52). The CV correctly noted this as "literal-wording divergence, not spec violation" and the Orchestrator accepted.

   **Refinement question:** when Discovery's wording is silent on a parameter (deck count, here), should TD's tightening produce a structured note that bubbles up into CV more visibly than the inflection-resolution prose? Right now CV had to do its own inference to conclude "the spec-relevant properties remain intact." A small `parameter_decisions[]` field on the sections file (or an explicit ledger amendment under amendment-mode) might let CV check it mechanically.

3. **Edge-case-testing position in the wave order — handled correctly but the architecture still has a soft spot.** Per the v1.1 fix, edge-case-testing's `depends_on: ["integrator"]` is honored: Coordinator ran section-5 only after Integrator marked the pseudo-node verified. Builder copied `output/integration/*` into a `sandbox/` and ran the test runner there. So far so good. But the *Orchestrator* charter step #3 also says "dispatch the execution phase of edge-case-testing in parallel with CV" after the Critic final-sweep. Under inline mode, the Coordinator already drove edge-case-testing to completion as a regular section — by the time the Critic final-sweep runs, the test report already exists at `output/builders/edge-case-testing/builder-ec-1/tests/report.json`. The Orchestrator handled this by dispatching an *independent re-run* alongside CV (which validates reproducibility and adds spot-checks). That's a sensible interpretation but it's an Orchestrator improvisation against ambiguous docs.

   **Refinement question:** should the architecture distinguish "edge-case-testing as a section that produces a test runner + initial report" from "the *post-Critic* execution phase that re-runs it alongside CV"? Currently both modes share one section name and the docs don't separate them. Options: (a) split into two sections (`edge-case-test-build` and `edge-case-test-execute`); (b) explicitly call the post-Critic phase a re-execution of the existing runner with no fresh build; (c) document that under inline mode the section's runner-build IS the execution phase, and the Orchestrator's parallel dispatch is reproducibility validation only.

4. **No Critic during the build (only final-sweep).** Same as tic-tac-toe — under inline dispatch the scheduled-mode Critic is collapsed into Coordinator, and the architecture says writer-permission compliance and out-of-scope drift are checked via the final-sweep. This run was clean enough that nothing was tested under stress, but the question from tic-tac-toe stands: if a Builder under inline-Coordinator subtly violates writer-permission boundaries (e.g., adding a sneaky require() across module boundaries), only the final-sweep catches it. That's tolerable on clean runs but means the feedback loop on a misbehaving Builder is "discovered after the entire build is done" rather than "during wave 2."

   **Refinement question (carried from tic-tac-toe):** is mid-build Critic worth a periodic dispatch in inline mode, or is the final-sweep sufficient given that drift on a clean run is rare?

5. **Bankroll module's "reset only when broke" UX is contract-correct but slightly user-hostile.** The bankroll contract gates the Reset button via `canReset = bankroll < MIN_BET`. CV noted this. A user who wants to start over with a fresh 1000 mid-session can't — they have to lose down to <5 first. Within scope of the spec (the spec said "if they go bust they can reset") but a real user might find this odd.

   **Refinement question:** is this the kind of thing that Discovery's amendment mode should catch via post-build user feedback, or should the CV's `pass_with_concerns` actually surface to the user as "consider adjusting"? Right now the concern was logged but the build was delivered; the user only sees this in the run report.

6. **No Researcher dispatched.** Both inflection points qualified for quick reasoning — same as tic-tac-toe. So we still don't have a real-world test of the Researcher dispatch path. The architecture has v1.1 documented rubric for skip-research-OK, but its first failure mode hasn't been exercised yet.

   **Refinement question:** is the next test build (something with genuinely contested inflection points — e.g., choice of charting library for a dashboard, or geo lookup provider for a location-aware app) worth scoping specifically to exercise the Researcher path?

7. **Post-delivery defect: CV missed a spec-violating UI bug.** After delivery, the user reported there was no way to continue past the first hand. The defect: the renderer disabled the bet input and Deal button whenever `phase !== 'betting'`, but the controller leaves `phase === 'resolved'` after `finishRound()`. End result: the Deal button was permanently disabled once any round ended. The controller-and-shell acceptance criterion explicitly required "see the round outcome, **and start a new round**" — so this *was* a spec violation.

   Why CV missed it: CV's checks are static (assumption walkthrough, OOS keyword scan, inflection-branch confirmation, schema conformance). They do not simulate gameplay. The 14 edge-case tests exercised the rules engine and bankroll through `applyAction` and `resolve` calls but never exercised the deal → resolve → re-deal cycle as a UI flow, because they bypass the renderer entirely.

   Why edge-case-testing missed it: same reason — its harness loads modules into a Node `vm` with a fake window and pokes the public APIs of RulesEngine and Bankroll. It never instantiates the renderer or simulates a button-disabled-state check.

   The fix was 2 lines in `ui-render.js` (`canStartDeal = inBetting || phase === 'resolved'`, applied to both bet input and Deal button). Engine and bankroll were already correct — verified post-fix by sequencing a full round 1 → round 2 in a Node script: round 1 win pays out (bankroll 1000 → 1100), round 2's `dealInitial` produces a fresh 2-card playerTurn state. The fix was applied as a hot-fix to the source builder output, the integration directory, and the final delivery directory; strictly per the writer-permission table this should have flowed through TD impact-analysis → re-dispatch ui-render Builder, but the fix is genuinely a 2-line UI-render bug and the proper flow would be heavy ceremony for the size of the change.

   **Refinement questions for the architecture:**
   - **Should CV (or edge-case-testing) include a "play through" check?** Even a scripted simulation of `bet → deal → stand → resolve → bet → deal → stand → resolve` would have caught this. Currently neither role explicitly requires UI-flow simulation. Adding a "two complete rounds played end-to-end" assertion to edge-case-testing's required scenario list would have cost ~10 minutes of build budget and saved this miss.
   - **Should the renderer's button-state logic be contract-bound?** The ui-render contract specifies stable IDs but is silent on which buttons should be enabled in which phases. That's why the Builder's choice to gate Deal on `phase === 'betting'` only was contract-compliant but spec-violating. A `button_enablement_matrix` field on the contract (rows = phases, columns = button IDs, cells = enabled/disabled) would have forced the Builder to think about the `resolved` phase explicitly.
   - **Is there a class of "post-delivery hot-fix" that the architecture should formalize?** The user-found defect with a 2-line fix is meaningfully different from a "needs full impact analysis" defect. A documented hot-fix path (write to all three locations + amend run-report + log as CV miss) would let future Orchestrators handle these cleanly without inventing the procedure each time.

## Roles dispatched

- Orchestrator → 6 sub-agents (Discovery, TD, Coordinator, Critic-final-sweep, CV, edge-case-rerun)
- Researchers → 0 dispatches
- Coordinator (inline mode) → ran Overseer + Builder + Integrator work for all 5 sections internally; produced 8 builder output dirs, 5 section state files, 1 integration manifest, full DAG snapshots
- Critic (scheduled mode) → collapsed into Coordinator (one inline-clean line in audit/flags.jsonl)
- Critic (final-sweep) → 1 dispatch (clean)
- Arbiter / Historian → 0 dispatches (no escalations; history written inline by acting roles)

## Artifact summary

A single-page blackjack web app in vanilla HTML/CSS/JS with no build step and no external dependencies. Single human player vs. fixed-rule dealer (S17). Player starts with 1000 play chips, min bet 5, blackjack pays 3:2. Full action surface: hit, stand, double-down (one card), split (single split, split aces get one card each only), no insurance/surrender/side bets. Six-deck shoe reshuffled per round. Reset button when bankroll falls below min bet restores the starting pool. Felt-green table metaphor with rendered cards by rank+suit, dealer/player zones, action button row, bankroll/bet display, message area for round outcome.

Out of scope (per Discovery ledger): multiplayer, real money, accounts/auth, persistence across sessions, leaderboards, backend, AI difficulty levels, card-counting trainer, insurance/surrender/side bets, native-mobile/PWA, sound, localization, immersive theming, social/share.

## Suggested architecture amendments

In rough order of importance:

1. **Document the Linux-bind-mount sync artifact** so future Coordinator/Integrator agents don't burn budget on it. Either in `file_schemas.md` § Lifecycle Notes or in a new "operational artifacts" appendix. Tic-tac-toe and blackjack both surfaced it.
2. **Clarify edge-case-testing's two phases.** The section produces a test runner + initial report under Coordinator (inline mode); the Orchestrator's "parallel-with-CV" dispatch is a re-execution / spot-check pass. Either rename, split, or document the distinction explicitly so future Orchestrators don't have to interpret.
3. **Consider a `parameter_decisions[]` field on the sections file** so TD's silent tightenings (deck count here, hash function choice elsewhere) bubble up to CV mechanically rather than as inferred prose-reading.
4. **Decide whether CV's `pass_with_concerns` should be surfaced to the user** or treated as Orchestrator-internal. Currently the run-report carries it but the user only sees it if they read the report.
5. **Carry forward unresolved questions from tic-tac-toe:** mid-build Critic in inline mode (still untested under stress), Researcher dispatch path (still not exercised), happy-path Critic compensator.
