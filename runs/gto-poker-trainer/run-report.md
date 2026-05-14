# Run Report — gto-poker-trainer

**Build prompt (excerpt):** "Perform a deep dive into GTO poker theory and create a training application with multiple modes one of which highlights a curated selection of hands to walk through that identify edge cases of GTO play for training. Another mode should be a fully functional 9 person table that tracks stats over sessions and features a sampling of 'classic' poker player archetypes."

**Architecture version under build:** v1.8.
**Verdict:** pass (PNV.1 verified end-to-end under jsdom production fidelity).
**Dispatch mode chosen:** inline (section count 7, ≤ 8).
**Total duration:** ~30 min wall-clock across 5 sub-agent dispatches (Discovery, TD, Coordinator, Critic final-sweep, Convergence Verifier).

---

## Phase ledger

| Phase | Outcome | Notes |
|---|---|---|
| Discovery | 12 assumptions, 5 IPs, 11 OOS items | All IPs flagged at high or medium importance — IP1 (delivery surface) and IP2 (data source) are the cascade-loaded ones |
| Technical Discovery | 7 sections, 10 contracts, 12 estimated builders, 29 DCAs, 34 acceptance assertions, 1 PNV | All 5 IPs resolved via quick-reasoning. Prompt-named verb chosen as "play" (the 9-handed table session w/ persistence chain) |
| Build (inline Coordinator) | All 7 sections verified, 4 inline deviations logged, 1 Sev 0 fix applied | The Sev 0 (dev-002, quoted `'raise_3.5'` key) was caught by Integrator's `node --check` pass — exactly the false-alarm-prevention loop v1.1 specified |
| Integration | Single index.html + 9 JS modules + 1 CSS + 2 data modules; ~3,090 LOC; zero external origins | Byte-equivalent to `output/final/` |
| Verification | Critic final-sweep: 0 medium/high flags. CV verdict: pass. PNV.1 exercised in jsdom with `runScripts: 'dangerously'` + `resources: 'usable'` + zero runtime-dep substitution | jsdom workaround for `file://` localStorage documented in CV report |
| Delivery | All 8 checklist items present; final/ byte-equivalent to integration/, no divergence record needed | Run-report (this file) is the last item |

---

## What worked

- **Inline mode for 7 sections held up.** Coordinator-as-Overseer-as-Builder produced 56 files in a single dispatch. The substrate is faithful — section state files, dispatch log, deviations, history log, build-complete signal all present.
- **The PNV chain caught what per-section assertions wouldn't.** PNV.1 specified play → reload → play, which exercised cross-section state (table → stats writer → storage → reload → reconstitution). No single section's acceptance phrase tested this end-to-end; PNV did.
- **Production-fidelity gate had teeth.** CV correctly identified that jsdom's `file://` localStorage rejection is an environment quirk, not a runtime-dep substitution, and documented the workaround. The artifact's runtime code path is unchanged.
- **TD's quick-reasoning rubric saved a Researcher dispatch on every IP.** All five IPs were canonical-answer (browser vs desktop, embedded vs solver, quiz vs replay, static vs adaptive, dashboard vs full-history) — none warranted research given the simplest-within-reason heuristic.
- **GTO content depth.** The 22-hand library, 16-concept glossary, and 8-archetype roster with `contrast_with_gto` commentary live in the artifact (per TD's design choice to put the "deep dive" in the deliverable, not in a side document). This was the correct read of the prompt's intent.

## What broke / surprised

- **Sev 0 record went to `state/inline-deviations/` instead of `state/escalations/sev0-fixes/`.** Coordinator filed dev-002 (the `'raise_3.5'` quoted-key fix) at the deviations path, cross-referenced from build-complete.json, but the canonical home per `file_schemas.md` is the dedicated sev0-fixes subtree. Critic flagged this as low-severity. **Architecture observation:** under inline mode, the boundary between "inline deviation" and "Sev 0 trivial fix" can blur when the deviation IS the fix. The two records should be co-located or the schema should explicitly say the Sev 0 record cross-files into the deviations directory under inline.
- **TaskCreate per-IP task creation by Discovery did not happen.** Discovery's v1.8 charter says "For each inflection point identified, TaskCreate a task." The Discovery agent didn't. The phase-backbone tasks were created by Orchestrator (me), but the per-IP detail tasks are missing. **Architecture observation:** the charter instruction is buried mid-process; Discovery agents tend to focus on the ledger output and skip the progress-task instruction. Either move the TaskCreate instruction to the top of the Discovery process, or accept that per-IP tasks are nice-to-have and architecture v1.8's "no central manager" pattern means dropouts are silent.
- **TD's Researcher TaskCreate similarly didn't fire**, but for a benign reason: TD chose quick-reasoning for all five IPs, so no Researchers were dispatched and no Research tasks needed creating. v1.8 didn't anticipate the all-quick-reasoning path explicitly — worth adding an "or no Researchers needed" line to the TD charter to remove the mental overhead.
- **PNV's "play 10 complete hands" is a heavy scenario for jsdom.** The CV agent had to drive ten full hands of 9-handed poker through an event loop without a real user — this required programmatic forcing of the hero's `decide` step. CV did it cleanly here, but for a future run with more complex turn-state, the PNV scenario might need to be partitioned (a smaller "minimum viable round-trip" scenario for the gate, plus the longer scenario as a `verifier: edge_case_testing` assertion).

## Architectural amendment candidates surfaced

1. **v1.x — Sev 0 record location under inline mode.** Either add a note that Sev 0 records may live alongside inline-deviations when the fix is itself an inline deviation, or require Coordinator to write to both locations.
2. **v1.x — Charter instruction ordering.** Move TaskCreate-per-IP and TaskCreate-per-section to the top of Discovery and TD process lists so they're not lost in the work flow. Currently they're in step 4 of each, after the "do the substantive thing" step.
3. **v1.x — All-quick-reasoning path in TD charter.** Add explicit "if no Researchers dispatched, skip Research-task creation" so the charter doesn't have a phantom step.
4. **v1.x — PNV scenario complexity ceiling.** Consider a guidance heuristic: PNV scenarios should be the smallest scenario that exercises the named verb end-to-end. Long-form play sessions belong in `edge_case_testing` assertions, not the gate.

## Files of interest

- **Final deliverable:** `runs/gto-poker-trainer/output/final/index.html` (open via `file://` in any modern browser).
- **Discovery ledger:** `decisions/discovery/ledger-v1.json`.
- **Section plan + assertions:** `decisions/technical-discovery/sections-v1.json`.
- **Verification report:** `output/verification/report.json` (with `prompt_named_verb_result` block detailing the jsdom run).
- **Critic flags:** `audit/flags.jsonl` (17 entries, 0 medium+).
- **Historian build summary:** `history/build-summary.md`.
- **Inline deviations:** `state/inline-deviations/dev-001..004.json`.

## Run-time stats

- 5 sub-agent dispatches (Discovery, TD, Coordinator, Critic final-sweep, CV).
- 56 files written across substrate.
- 13 files in deliverable (`output/final/`).
- ~3,090 LOC in the integrated artifact.
- 22 curated hands, 16 glossary concepts, 8 archetype profiles, 9 preflop position ranges.
- 34 PASS / 0 FAIL / 3 SKIP at edge-case-testing time; CV upgraded all 3 SKIPs to PASS.
- PNV: 10 hands → reload → 5 hands; alltime_hands transitioned 0 → 10 → 10 (post-reload) → 15; zero network calls throughout.
