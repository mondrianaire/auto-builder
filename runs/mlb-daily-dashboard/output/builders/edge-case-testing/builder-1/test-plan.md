# Edge-Case Testing — Manual / CV Test Plan

This file documents the live-data and headless-browser scenarios that the
static-fidelity Node runner (`run-tests.mjs`) cannot cover under inline
Coordinator mode (no Playwright in the orchestrator session). These are
deferred to Critical Verification (CV) and a follow-up live run after
deploy to GitHub Pages.

## Deferred to CV / live browser

### CV.LIVE — Live load against production deployment
**URL:** `https://mondrianaire.github.io/auto-builder/runs/mlb-daily-dashboard/output/final/`

Steps:
1. Open URL in a modern desktop browser (Chrome, Firefox, Safari, Edge).
2. Confirm page responds HTTP 200 and renders within ~15 seconds.
3. Open DevTools > Network tab, reload, and confirm:
   - At least 4 requests to `https://statsapi.mlb.com/api/v1/...`
   - Each returns 200 with `Access-Control-Allow-Origin: *`
4. Confirm DOM contains:
   - `#rankings-panel` with 6 division tables (AL East, AL Central, AL West, NL East, NL Central, NL West) plus AL/NL Wild Card lists
   - `#trends-panel` with 30 team rows, each showing abbreviation + W-L + sparkline + run-diff
   - `#upcoming-panel` with at least one game (or empty-state copy on an off-day)
   - `#last-updated` with today's date + HH:MM
   - `#error-banner` is hidden (`hidden` attribute present)
5. Confirm DevTools Console has no error-severity messages.

Assertions covered: PNV.1, DCA.FC.1, DCA.FC.2, DCA.FC.3, DCA.FC.4, DCA.FC.5, DCA.FC.6, DCA.A2, DCA.A3, DCA.A5, DCA.A6, DCA.A7, DCA.A8, DCA.IP1, DCA.IP2, DCA.IP4, DCA.IP5, DCA.IP8, DCA.PN.1, DCA.PN.2, S5.A2, S5.A3, S5.A4.

### CV.CORS — CORS sanity check
Steps:
1. With DevTools Network tab open, click the first statsapi.mlb.com request.
2. Inspect response headers; confirm `Access-Control-Allow-Origin: *` (or
   one that includes `mondrianaire.github.io`).
3. If absent: per Editor F.2, this is a structural failure that routes back
   to Editor for a snapshot-builder amendment (GitHub Actions cron path).
   Do not patch around at render time.

### CV.RETURN — Next-day refresh
Steps:
1. Note the date/scores displayed on day N.
2. Return on day N+1, hard-reload.
3. Confirm at least one of:
   - Standings W/L numbers have changed
   - Schedule contains new dates and drops past ones
   - Last-updated timestamp has advanced

Assertions covered: DCA.FC.7.

## Coverage Summary

| Verifier type            | Where exercised               |
|--------------------------|-------------------------------|
| Structural / fixture     | run-tests.mjs (Node, this dir)|
| Live HTTP                | CV.LIVE (real browser)        |
| Visual layout / CV       | CV artifact exercise          |
| Cross-day refresh        | CV.RETURN (return visit)      |
| Empty-state / error-state| run-tests.mjs branch checks   |
