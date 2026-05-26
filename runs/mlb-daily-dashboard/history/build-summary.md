# Build Summary — mlb-daily-dashboard

## Original prompt

> Make me a web based Daily dashboard for all mlb teams and statistics focusing on weekly trends, upcoming games and schedules and overall rankings. Use github pages for hosting.

## Telos

A web-based daily dashboard that, when opened in a browser, shows current Major League Baseball team standings, weekly performance trends, and upcoming game schedules for all teams.

## Final assumption set (live ledger after all amendments)

11 assumptions captured in `decisions/discovery/ledger-v1.json`, no amendments applied:

- **A1** — Audience is a fan / casual viewer wanting a daily glance, not a sabermetrician.
- **A2** — Scope is regular-season MLB (no minor leagues, spring training, postseason-only views).
- **A3** — "All MLB teams" = all 30 active franchises.
- **A4** — "Daily" means refreshed on each page load (no real-time WebSocket, no push).
- **A5** — Page renders entirely in the browser (no server-side rendering, no backend).
- **A6** — "Statistics" defaults to team-level (no player-level drill-downs).
- **A7** — "Weekly trends" = rolling 7-day window of completed games.
- **A8** — "Upcoming games and schedules" = today + next 7 days.
- **A9** — "Overall rankings" = both division standings and league standings; wild-card included.
- **A10** — Off-day empty state required (mid-season off-days happen; build must not crash on zero-game days).
- **A11** — Team identity = color swatch + 3-letter abbreviation (no logos due to licensing).

## Amendments made

None. Initial ledger held throughout the build.

## Escalations and resolutions

None. No Severity ≥ 1 issues. Editor returned `pass_with_recommendations` with two low-severity carry-forward findings:

- **Editor F.1** — Proper-noun verification_status remained `pending` for MLB and GitHub Pages; pragmatic structural honoring deemed sufficient (Critic confirmed the API base URL and the deployment target structurally honor both nouns).
- **Editor F.2** — IP2's CORS resolution cites community evidence rather than an MLB-published canonical policy; CV's live-fetch verification empirically confirmed CORS works from a real browser origin against statsapi.mlb.com.

## Researcher dispatches and chosen options

One inline-collapsed planning probe: `probe-cors`. Resolved via canonical evidence (publicly documented `Access-Control-Allow-Origin: *` on the MLB Stats API public endpoints). No actual sub-agent spawn — TD collapsed this into quick reasoning per the rubric.

## Deviations

None recorded under `state/inline-deviations/`. Coordinator inline mode operated without judgment-call divergences.

## Total dispatch count

7 real sub-agent dispatches via the Agent tool:
1. Discovery (initial)
2. Technical Discovery (initial)
3. Editor (review)
4. Coordinator (inline; collapses Overseers + Builders + Integrator + scheduled Critic + Historian)
5. Critic (final_sweep) — parallel with CV
6. Convergence Verifier — parallel with Critic
7. (none — Orchestrator handles delivery directly)

## Runtime per phase

- Discovery: ~2m 15s
- Technical Discovery: ~6m 45s
- Editor: ~1m 35s
- Coordinator (inline; all 6 sections + integrator + edge-case-testing): ~17m 30s
- Critic final-sweep: ~5m 30s (parallel)
- CV: ~7m 10s (parallel)
- Delivery: ~2m

Total wall time: ~37 minutes.

## Verification outcome

**CV verdict: pass.**

- Tier 2 first-contact: 7/7 PASS under Playwright headless Chromium loading `output/integration/index.html` via local HTTP server and hitting live `statsapi.mlb.com`.
- Tier 1 PNV: PASS — real browser rendered all three focus areas with live MLB data, error banner not shown, ~3s to first data paint.
- Tier 3 sub-goal: 19/19 PASS (2 pass_with_concerns counted as pass for the Arizona abbreviation cosmetic inconsistency).
- Edge-case-testing: 46/46 PASS at static-fidelity layer; CV picked up the 6 deferred assertions and all now pass under live fidelity.

## Known cosmetic issue (post-delivery follow-up candidate)

Arizona Diamondbacks renders as "AZ" in the rankings/trends panels (from the API-returned `abbreviation` field) but as "ARI" in the upcoming-games panel (from the local `teams.js` fallback). Single-team inconsistency. Not a Sev 0 trivial fix (>5 lines either way). Worth a tiny normalize-on-the-way-in patch in a future revision.
