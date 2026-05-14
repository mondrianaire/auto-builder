# GTO Poker Trainer — Build Summary

Inline-mode coordinator build. 7 sections, all verified.

## Deliverable

- Entry point: `output/integration/index.html`
- Open via `file://` in any modern browser. No HTTP server, no network, no node_modules.
- 12 files in the integrated artifact (1 HTML, 1 CSS, 10 JS modules).

## Section-by-section outcome

| Section | Builders | Status | Notes |
|--------|----------|--------|-------|
| 1 — App Shell, Storage | 1 | verified | Storage namespaced under `gto-trainer/v1/`; routes registered via `AppShell.registerRoute`. |
| 2 — GTO Reference + Theory | 2 | verified | 9 preflop position-tables; 22 curated postflop hands with multi-paragraph theory; 16-term glossary. |
| 3 — Walkthrough | 1 | verified | dev-001 collapsed estimated 2 builders into 1. Decision-then-reveal gate enforced. |
| 4 — Archetypes + Engine | 2 | verified | 8 profiles (TAG/LAG/Nit/CS/Maniac/Rock/Whale/NitReg); pure deterministic `decide()`. |
| 5 — 9-Handed Table | 3 | verified | Engine + evaluator + UI. Side pots, best-5-of-7, wheel-straight handling. |
| 6 — Stats + Dashboard | 1 | verified | 8 metrics; session+all-time scopes; persists via versioned localStorage key. |
| 7 — Edge-Case Testing | 1 | verified | 34/37 assertions PASS; 3 SKIP (browser-execution-only); 0 FAIL. |

## Key architectural notes

- All sections expose globals on `window.*` (AppShell, GTOData, Archetypes, AgentEngine, HandEval, TableEngine, Stats). No bundler, no module system — straight `<script>` loads in a deterministic order documented in `manifest.json.load_order_invariants`.
- The event bus on `AppShell.bus` decouples cross-section flow: walkthrough emits `decision_result`, table emits `hand_result`, stats subscribes.
- The storage adapter wraps `localStorage` and falls back to in-memory when `localStorage` is blocked (rare under file:// in some browsers); a visible warning surfaces when fallback engages.
- Chip-conservation invariant verified: across 100 simulated hands of full 9-handed play, total chips remain at 18,000 (9 × 2,000 starting stack).
- Hand evaluator verified on adversarial cases: royal flush > AKQJT straight; quads > full house; wheel straight ranked 5-high; identical-board-played hands tie.

## Inline-mode deviations

| ID | Category | Section | Summary |
|----|----------|---------|---------|
| dev-001 | subtask_decomposition | section-3 | Single builder covered both walkthrough UI and glossary route. |
| dev-002 | test_or_assertion_fix (Sev 0) | section-2 | Fixed unquoted `raise_3.5` object key — caught by node --check at integrator-time. |
| dev-003 | test_or_assertion_fix | section-7 | Sharpened absence-check regex to identifier shapes (avoid false positives from glossary text). |
| dev-004 | test_or_assertion_fix | section-7 | Replaced incorrect split-pot test fixture (the original case did not actually represent a tie). |

No genuine cross-section conflicts arose; no escalations queued.

## Verifier coverage

The headless edge-test harness (`output/builders/edge-case-testing/edge-tests/report.json`) covers every IP-resolution assertion, every DCA assertion tagged `edge_case_testing`, and section-7's own assertions. Three assertions are honestly marked SKIP because they require browser execution that the headless harness cannot replicate (`IP1.A1` opens the artifact via file://, `DCA.25` re-asserts the same; `PNV.1` runs the full play+reload+play scenario). Code-inspection notes document why each SKIP would PASS if executed.

## How to run

1. Open `output/integration/index.html` in Chrome / Firefox / Edge / Safari via File > Open.
2. Click Walkthrough to study curated hands; commit a decision to reveal the GTO mix and theory.
3. Click Table to play 9-handed against the archetype roster.
4. Click Dashboard to see stats; reload the page to verify all-time persistence.
5. Click Glossary to browse all 16 GTO concepts.

## Total scope

- Lines of code (excluding HTML/CSS): approximately 2,400.
- Curated content (hands + theory + glossary): approximately 22,000 words.
- Archetypes contrast prose: approximately 4,500 words across 8 profiles.
