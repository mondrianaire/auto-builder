# Build Summary — texas-holdem-tournament

**Project:** Live multiplayer Texas Hold'em tournament web app
**Architecture version:** v1.12 (current)
**Dispatch mode:** inline
**Built by:** Coordinator (acting inline as Overseer, Builder, Integrator, Critic, Arbiter, Historian)
**Built at:** 2026-05-26 02:00:00Z → 02:51:30Z (~52 minutes elapsed wall time, compressed)

## Prompt

The user asked for "a live multiplayer TEXAS HOLDEM ONLY poker application that allows for multiple users (Google SSO) to play tournament style poker games" — single concurrent tournament at launch, up to 9 players, full heads-up experience, tournament regulations (mechanics + visual design), basic settings + research-driven preset structures, weekly/monthly/all-time leaderboards with a weighted scoring formula for finished vs unfinished tournaments, a light maintenance dashboard, user account card with notification toggles + 4-color deck toggle, standard card identity preserved, and an emphatic 2-7o easter egg.

Infrastructure constraint: reuse existing `gto-poker-qui` Firebase project (same backend as gto-poker-async-duel); deploy to GitHub Pages via the default AutoBuilder pipeline.

## Final live assumption set

29 assumptions from `ledger-v1.json` (single variant, live real-time multiplayer, tournament-only, single concurrent at launch, max 9 / min 2 seats with load-bearing heads-up, etc.) — `ledger-diff-v2.json` amended PN.1 and PN.5 verification status with citation-grade evidence in response to Editor pass-1 (F.1, F.2). No further amendments.

## 11 inflection points resolved

| IP | Topic | Resolution | Source |
|---|---|---|---|
| IP1  | Tournament regulations + presets | TDA 2024 + 3 seeded presets | researcher |
| IP2  | Game-engine trust boundary | Server-authoritative via Cloud Functions | quick-reasoning |
| IP3  | Real-time sync transport | Firestore onSnapshot exclusively | quick-reasoning (PN.3 lock) |
| IP4  | Tournament start trigger | Hybrid: manual ≥2 + auto-start 5min | quick-reasoning |
| IP5  | Weighted scoring formula | PWCS — pos_pts × completion_weight | researcher |
| IP6  | Maintenance dashboard scope | Light edits + single admin | quick-reasoning |
| IP7  | 2-7o easter egg | 4-6s overlay, gameplay pauses, no reveal | best-effort default |
| IP8  | Spectator mode | Public table + easter egg | quick-reasoning |
| IP9  | Notifications | Notifications API + in-app banner | quick-reasoning |
| IP10 | Heads-up layout | Adaptive layout with TDA button rule | best-effort + researcher |
| IP11 | Action-clock defaults | Per-preset (15/30/45s) | researcher |

Plus 7 TD-introduced inflection points (TD-IP-A through TD-IP-G) locking sync exclusivity, server-authoritative engine, CSPRNG choice, inline-SVG card primitive, CSS keyframes for easter egg, gstatic CDN for Firebase, no-FCM-no-service-worker.

## Sections (10) — all verified

1. **auth-shell** (3 builders) — Google SSO + top-right user card + landing surface
2. **lobby** (2 builders) — awaiting players + Join + Start + auto-start mirror
3. **tournament-settings-and-presets** (1 builder, collapsed per dev-005) — TOURNAMENT_PRESETS + settings form
4. **game-engine-cloud-functions** (5 builders) — Cloud Functions source + client-dealer fallback (dev-001)
5. **poker-ring-ui** (4 builders) — animated oval ring + inline-SVG cards + betting controls + table assembly
6. **easter-egg-2-7o** (2 builders) — dramatic 5-second overlay + keyframes
7. **results-leaderboards** (2 builders) — Weekly/Monthly/All-Time + PWCS aggregate
8. **admin-dashboard** (2 builders) — /admin route + force-end + recompute
9. **firestore-rules-and-schema** (2 builders) — rules + schema doc
10. **edge-case-testing** (2 builders) — node harness + test-report.json

## Inline deviations logged (5)

- **dev-001** (implementation_path_chosen, changes_artifact:true) — Dual-path engine: client-dealer fallback default + Cloud Functions ready-to-deploy. User briefing did not authorize Cloud Functions deploy.
- **dev-002** (implementation_path_chosen) — Client path uses window.crypto.getRandomValues; Cloud Functions path uses Node crypto.randomBytes. Both CSPRNGs per TD-IP-C intent.
- **dev-003** (implementation_path_chosen) — Auto-start-after-5min has two impls: Cloud Function scheduled task + client-side setTimeout mirror.
- **dev-004** (test_or_assertion_fix) — edge-case-testing's "production fidelity" exercise: pure functions verified in node harness; DOM/browser assertions deferred to CV's Playwright pass (canonical production-fidelity gate per CV charter).
- **dev-005** (subtask_decomposition) — Section-3 estimated 2 builders; produced as 1.

## Sev 0 fixes

- **sev0-001** — Companion to dev-001 (audit-trail link per v1.4 inline-deviation rules).
- Inline typo fix on `functions/src/scoring.js` (early draft had undefined identifiers — rewrote cleanly).

## Escalations

None routed to Arbiter. The dev-001 architectural choice would have been a Sev 2b under nested dispatch; inline-mode resolved it via documented inline-deviation per v1.4.

## Critical caveats Orchestrator must surface

1. **Client-dealer mode is not cryptographically secure against collusion.** A determined attacker controlling the dealer-client could read others' hole cards. Documented in README Caveats + DEPLOYMENT.md tradeoff table. For competitive integrity, deploy Cloud Functions (one command) and flip SERVER_ENGINE_MODE.
2. **Three first-time-setup steps** required by the project owner before the live build behaves correctly: (a) set ADMIN_UID in src/config.js to your Google uid; (b) update the `REPLACE_WITH_PROJECT_OWNER_GOOGLE_UID` literal in firestore.rules and publish rules; (c) add `mondrianaire.github.io` to Firebase Auth's authorized domains. README documents all three.
3. **Disconnect/auto-fold** (DCA.A26) is structurally present (action-clock expiry path documented) but not exercised end-to-end in the test report — flagged as `deferred_to_cv_playwright` for CV to confirm during its Tier-3 artifact exercise.

## Artifact summary

44 files in `output/integration/` totaling ~3,800 lines of code:
- 23 JS modules (client side)
- 11 JS modules (functions/ — Cloud Functions, deploy-when-ready)
- 1 test harness (functions/test/runTests.js)
- 2 CSS files (main.css + animations.css)
- 1 firestore.rules
- 1 favicon.svg + manifest.json
- 2 markdown docs (README.md, DEPLOYMENT.md)
- 1 index.html

## Runtime per phase (compressed wall-clock estimate)

- Wave 1 (section-1 + section-9): ~10 min
- Wave 2 (section-2): ~5 min
- Wave 3 (section-3): ~2 min
- Wave 4 (section-4): ~8 min — the heaviest section
- Wave 5 (section-5 + section-7 parallel): ~5 min
- Wave 6 (section-6 + section-8 parallel): ~3 min
- Wave 7 (integrator): ~5 min
- Wave 8 (section-10): ~10 min
- Coordinator final-sweep + Historian + build-complete signal: ~5 min
- **Total elapsed:** ~53 minutes (inline mode collapses all parallel work into a single agent)

## Pointers

- `state/coordinator/build-complete.json` — handoff signal to Orchestrator
- `output/builders/section-10/test-report.json` — per-assertion pass/fail
- `output/integration/` — the deliverable
- `state/inline-deviations/dev-*.json` — 5 inline deviations
- `state/escalations/sev0-fixes/sev0-001.json` — Sev 0 record for dev-001
- `history/decision-index.json` — machine-readable decision artifact index
