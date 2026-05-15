# Build Summary: gto-poker-async-duel

**Project:** gto-poker-async-duel (display name "GTO Duel")
**Run root:** `runs/gto-poker-async-duel/`
**Date:** 2026-05-14
**Final artifact:** `output/integration/` (awaiting Orchestrator copy to `output/final/`)
**CV verdict:** pass_with_concerns (4 minor concerns, all inherent to the verifier env or platform constraints)
**Edge-case tests:** 32/32 passing
**Critic final sweep:** clean (13/13 checks, 0 flags)

---

## Original prompt

> Previously you created an application called "GTO Poker Training" that was a proof of concept and a mini research and analysis project for creating a web application that allows a user to play poker, track useful GTO orientated poker stats and had an almost "quiz like" application relating to presenting various "edge cases" that highlight specific GTO philosophies and presenting the user with various choices and ranking them and providing feedback based on interpretation of GTO research.
>
> I introduced my mom to this application and she loved it. We would read through the hand descriptions, and guess to each other what the correct answer was. When we entered it and saw the actual data, it was so much fun and so informative to be able to read the GTO description and defense of "optimal" plays while identifying plays where confidence may be lower and the answer may not be as clear cut.
>
> I do not live physically near my mom and I was thinking how easy it would be to extrapolate on this GTO build and attempt to create an asynchronous multiplayer GTO Poker head to head quiz game where users are presented with identical GTO "gotchas" and there is some type of communication either direct or in game to discuss or diagree with the GTO verified action.
>
> In addition to a selection of a correct answer, it would be neat to implement a "confidence" function where users indicate how sure they are of their decisions. This would allow a post-game wrap up screen that highlighted the GTO gotchas that showed the highest confidence gap between differing answers.
>
> It is imperative that this application fully can be hosted on github pages, that the game fully functions asynchronsly, and users can "build up" a handful of answers before they must wait for the other user to submit their answers and then create more for the opposing player. This rotation goes for a set number of rounds and then statistics regarding player performance and player agreement is shown to both users. If possible implement an opt in notification function that will use mobile or desktop notification libraries to notify the opposing player that it is their turn.

---

## Final assumption set (ledger-v1, no amendments)

The Discovery ledger written at run-start (`decisions/discovery/ledger-v1.json`) was never amended; ledger-v1 is the live assumption set. All 20 assumptions verified PASS by the Convergence Verifier.

| ID | Assumption | Confidence |
|---|---|---|
| A1 | Single self-contained static web app on GitHub Pages; no user-deployed server, no required build step | high |
| A2 | Exactly two players per game session (head-to-head, not N-player) | high |
| A3 | Fully asynchronous: neither player needs to be online when the other plays | high |
| A4 | Both players see identical GTO scenarios per round (shared, not independently sampled) | high |
| A5 | Each player answers a handful (~3-8) of scenarios per turn; configurable | medium |
| A6 | Game runs for a set number of rounds configured at game-creation time | high |
| A7 | Per-decision confidence rating supplied at submission time | high |
| A8 | Post-game wrap-up highlights scenarios with highest joint-confidence disagreement | high |
| A9 | End-of-game stats include both individual performance AND inter-player agreement | high |
| A10 | In-app async communication mechanism between players exists | medium |
| A11 | Opt-in notifications via web-standard APIs; no native iOS/Android app | high |
| A12 | Game variant is No-Limit Texas Hold'em (inherited from ancestor build) | medium |
| A13 | GTO gotcha scenarios are precomputed/curated content (no live solver) | medium |
| A14 | Lightweight non-account identifier (player name + game/share code) | medium |
| A15 | One player creates a game and shares a code/link; the other joins by it | medium |
| A16 | Game state persists between sessions for the duration of a game | high |
| A17 | Order-of-play within a round is well-defined; alternates per round | medium |
| A18 | Answer blindness preserved: neither sees the other's answer until both submit | high |
| A19 | Build deliverable is static assets ready to deploy; user pushes/enables Pages themselves | high |
| A20 | The new build does not runtime-link the ancestor "GTO Poker Training" app | high |

**Proper nouns:**
- PN.1 "GTO Poker Training" — role: supportive, demoted via inline `demotion_note` (four guardrails satisfied)
- PN.2 "GitHub Pages" — role: target_defining, verified against canonical docs via Researcher Probe 001 CIT.1

**Inflection point resolutions:**
- IP1 (state transport) — **Firebase (Firestore + W3C Web Push via VAPID) Spark plan**, sourced from Probe 001 canonical evidence
- IP2 (notification delivery) — **Web Push API + service worker + client-signed VAPID JWT** (W3C Push protocol, not FCM HTTP v1), sourced from Probe 001 canonical evidence
- IP3 — Firebase Anonymous Auth
- IP4 — Per-game share code in `?join=<code>` URL parameter
- IP5 — Ported ancestor scenario library as static JSON (20 entries)
- IP6 — Game-creator-configurable handful size (1-10) at game-creation
- IP7 — Per-scenario optional async note (<=280 chars)
- IP8 — Discrete 1-5 confidence scale with joint-confidence-min ranking

---

## Amendments

**None.** Discovery's ledger-v1 was not amended at any point. No `ledger-v{N}` artifacts exist beyond v1. Editor's review-v1 surfaced two low/medium structural lifecycle gaps (PN.1/PN.2 status fields never transitioned from `pending`) but these were flagged non-blocking, routed-to nobody, and TD's substantive compliance was already intact via DCA.31/DCA.32 and the inline demotion_note.

---

## Escalations and resolutions

**None.** No `state/escalations/` directory exists. No Sev 3, Sev 4, route_to_discovery, or route_to_td events occurred. Editor returned `verdict: pass_with_recommendations` with `routed_to: []`.

---

## Researcher dispatches

**One probe** (`probe-001`), dispatched by Technical Discovery at planning phase to cover IP1 and IP2 as a coupled pair per Discovery's `concerns_for_downstream.researcher_dispatch_recommended` note.

| Field | Value |
|---|---|
| probe_id | probe-001 |
| dispatched_by | technical-discovery |
| phase | planning |
| question | Simplest viable client-only architecture for async two-player gameplay with persistent shared state + out-of-app push on GitHub Pages (2026) |
| coupled IPs | IP1, IP2 |
| budget_minutes | 30 |
| max_options | 4 |
| options evaluated | OPT.A Firebase Spark, OPT.B Supabase, OPT.C URL-payload, OPT.D Gist |
| chosen | **OPT.A Firebase Spark + W3C Web Push (client-side VAPID)** |
| canonical citations | 6 (GitHub Pages limits, Firebase pricing, Apple WebKit Web Push docs ×2, Supabase auto-pause docs) |

**Disqualifications in the probe:**
- Supabase free tier auto-pauses after 7 days of inactivity — fatal against a "mom plays once a week" cadence (CIT.4)
- URL-payload model has no server actor to fire push when recipient tab is closed (violates explicit prompt requirement)
- GitHub Gist API requires authenticated writes (anonymous-gist deprecated); no native push partner

The probe's finding that FCM HTTP v1 requires server-side OAuth and therefore cannot be safely client-called from static hosting is what forced the build into the **standard W3C Web Push protocol with client-signed VAPID JWT** — using Chrome/Edge/Firefox/iOS subscription endpoints directly. This is the trigger for inline deviation dev-001.

---

## Inline deviations

| ID | Category | Section | Summary |
|---|---|---|---|
| dev-001 | implementation_path_chosen | section-3 | Client-side VAPID signing for Web Push (vs. server-side push relay via Cloud Functions). Briefing-directed; security tradeoff documented in README. |
| dev-002 | contract_micro_adjustment | integrator | Integrator's own build-manifest moved to `_build-manifest.json` because `manifest.json` at project root is the load-bearing W3C Web App Manifest required for iOS PWA install. |

Both deviations carry articulated `nested_equivalent` rationales (dev-001 would have been a Sev 2b consult to TD under nested mode; dev-002 a Sev 0 trivial-fix consult to the Orchestrator). Critic's final sweep audited both and returned clean.

---

## Sev 0 fixes

**None.** Convergence Verifier's `sev0_fixes_applied: []`. Critic's final sweep recorded `sev0_audit: clean — state/escalations/ directory does not exist`.

The Coordinator's report did reference one test-script clarification during section-7 (edge-case-testing): the test harness shimmed Firebase CDN imports to allow Node ESM execution against the integration directory, since `state.js` could not import `firebase-firestore` from `gstatic` inside Node. This is documented in the verifier's `production_fidelity_environment.components.browser_runtime` note and was a test-harness adaptation, not a code-change fix to the deliverable artifact.

---

## Dispatch count by role

From `dispatch-log.jsonl` (Coordinator's section-level dispatch ledger; inline mode):

| Role | Dispatches | Notes |
|---|---|---|
| Discovery | 1 | initial mode, wrote ledger-v1 |
| Technical Discovery | 1 | initial mode, wrote sections-v1 + 11 contracts |
| Researcher | 1 | probe-001 (planning) |
| Editor | 1 | review-v1 |
| Coordinator | 1 | dispatched inline; collapsed wave loop |
| Overseers (decompose) | 7 | one per section (section-1, -2, -3, -5, -4, -6, -7) |
| Builders (completed) | 11 | 1a, 2a, 2b, 3a, 3b, 5a, 4a, 4b, 4c, 6a, edge-tests |
| Integrator | 1 | assembled output/integration/ |
| Critic | 1 | final-sweep, 13 checks |
| Convergence Verifier | 1 | pass_with_concerns |
| Historian | 1 | this artifact |

**Total Coordinator-level section verifications:** 7 (sections 1, 2, 3, 4, 5, 6, 7) + 1 integrator verification.
**Total builder completions:** 11.
**Total agent-tool dispatches by Orchestrator (effective):** ~12 (collapsed inline per the tic-tac-toe pattern — Overseers and Builders folded into Coordinator's single inline execution).

---

## Phase ordering and rough wall-clock (from dispatch-log timestamps)

| Phase | Start | End | Duration | Notes |
|---|---|---|---|---|
| Discovery | 2026-05-14T00:00:00Z | 2026-05-14T00:00:00Z | n/a | ledger-v1 written |
| TD researcher dispatch | 00:05:00Z | 00:35:00Z | ~30 min | probe-001 budget |
| Researcher findings | 00:35:00Z | 00:35:00Z | n/a | findings.json written |
| Technical Discovery sections | 00:40:00Z | 00:40:00Z | n/a | sections-v1 written |
| Contracts | 00:45:00Z | 00:45:00Z | n/a | 11 contract files |
| Editor review | 00:50:00Z | 00:50:00Z | n/a | review-v1 written |
| Coordinator DAG build | 01:00:00Z | 01:00:00Z | n/a | 7-wave DAG |
| Wave 1 (section-1: scenarios) | 01:00:01Z | 01:00:31Z | ~30s | builder-1a |
| Wave 2 (section-2: state+rules) | 01:00:32Z | 01:01:31Z | ~59s | builder-2a, 2b |
| Wave 3 (section-3 + section-5 parallel) | 01:01:32Z | 01:02:46Z | ~74s | builder-3a, 3b, 5a |
| Wave 4 (section-4: flow+stats+ui) | 01:02:47Z | 01:03:31Z | ~44s | builder-4a, 4b, 4c |
| Wave 5 (section-6: shell) | 01:03:32Z | 01:04:01Z | ~29s | builder-6a |
| Wave 6 (integrator) | 01:04:02Z | 01:04:32Z | ~30s | output/integration/ assembled |
| Wave 7 (section-7: edge-case testing) | 01:04:33Z | 01:05:31Z | ~58s | 32/32 PASS |
| Critic final sweep | 01:06:00Z | 01:06:00Z | n/a | 13/13 clean |
| Convergence Verifier | 21:30:00Z | 21:30:00Z | n/a | pass_with_concerns |
| Edge-case-test report timestamp | 20:44:06Z | — | — | regenerated late in run |

**Total Coordinator build phase (DAG build to build_complete):** ~5 min 32 s wall-clock by log timestamps.

---

## Roles dispatched (summary)

- Discovery — 1 dispatch (initial)
- Technical Discovery — 1 dispatch (initial)
- Researcher — 1 dispatch (probe-001 planning)
- Editor — 1 dispatch (review-v1)
- Coordinator — 1 dispatch (inline, collapsed wave loop per the tic-tac-toe pattern)
- Overseers — 7 inline decompositions (one per section)
- Builders — 11 inline completions across 6 product sections + 1 edge-case-testing section
- Integrator — 1 inline assembly
- Critic — 1 final-sweep (13 checks, 0 flags)
- Convergence Verifier — 1 final verification (pass_with_concerns, 4 minor concerns)
- Historian — 1 (this artifact)

**Total effective agent dispatches by Orchestrator:** approximately 12 distinct role-invocations, with Overseer/Builder steps collapsed inline under Coordinator.

---

## Final integration manifest

Assembled at `output/integration/` (build_id `gto-poker-async-duel-integration-001`):

- `index.html` — entrypoint
- `manifest.json` — W3C Web App Manifest (display: standalone) for iOS PWA install
- `sw.js` — service worker (push + notificationclick handlers)
- `firestore.rules` — pasted by user into Firebase Console
- `README.md` — load-bearing four-step user setup
- `_build-manifest.json` — integrator's own manifest (renamed per dev-002)
- `src/{app,scenarios,state,push,onboarding,ui,flow,stats,config}.js` — 9 ES modules
- `data/scenarios.json` — 20-scenario GTO library
- `styles/app.css` — vanilla CSS
- `icons/icon-{192,512}.svg` — PWA icons
- `sections_integrated`: section-1, section-2, section-3, section-4, section-5, section-6
- `static_cross_check`: all asset paths relative; only `state.js` imports the Firebase SDK; zero `gto-poker-trainer` references; no companion server present

---

## Verification headline

- **Tier 2 first-contact:** 8/8 pass (FC.1-FC.8 all verified)
- **Tier 1 prompt-named-verb (PNV.1 "play"):** structural 10/10 pass + edge-case-testing 32/32 cited as closest behavioral evidence; live end-to-end execution deferred per v1.9 honest-reporting contract (no spawnable browser + no live Firebase project in verifier env)
- **Tier 3 sub-goal:** 20/20 assumption checks pass; 14/14 out-of-scope checks pass; 8/8 inflection-point checks pass
- **Principle H skips:** none
- **Concerns:** 4 minor (production-fidelity gap inherent to verifier env; one-time VAPID setup burden; EU iOS DMA platform constraint; cryptographic subtlety in client-side VAPID signing — all gracefully handled with try/catch + README disclosure)

**Verdict:** PASS WITH CONCERNS. Artifact is deliverable. Two live-only verifications (FC.6 real push delivery + FC.7 real mobile rendering) are first-contact items the user will exercise on first deploy.
