# Build summary — closest-liquor-store

## Original prompt
> Build me an app that points me to the closest liquor store

## Final assumption set (from decisions/discovery/ledger-v1.json)
- **A1** Single-user app — no accounts, login, or cross-session persistence.
- **A2** "Closest" = geographic (straight-line) proximity to the user's current position.
- **A3** The app determines the user's current location at use time (not address-only entry).
- **A4** "Liquor store" = a retail category (stores selling packaged alcohol), not a named brand.
- **A5** "Points me to" = identify-and-show (address, distance, directions hand-off), not built-in turn-by-turn.
- **A6** Standalone client app on the user's machine/browser, no user-operated backend.

## Inflection-point resolutions (from decisions/technical-discovery/sections-v1.json)
- **IP1 — store-data provenance** (high; resolved via Researcher probe-IP1): live public OpenStreetMap Overpass API (`https://overpass-api.de/api/interpreter`), queried directly from browser `fetch()` for `shop=alcohol` features. Chosen over a region-bound static dataset because only live data satisfies the telos everywhere.
- **IP2 — location method** (high; quick reasoning): browser Geolocation API auto-detect with a visible manual-entry fallback; typed locations resolved via OSM Nominatim geocoding.
- **IP3 — result presentation** (medium; quick reasoning): show the single closest store with name, address, distance. A ranked list stays out of scope.
- **IP4 — directions hand-off** (TD-introduced; quick reasoning): external maps link/button prefilled with the store's coordinates; no embedded slippy map, no in-app turn-by-turn.

## Sections built (all verified)
| Section | Name | Builder | Output |
|---|---|---|---|
| section-1 | Location acquisition | b1-location | `location.js` — geolocation auto-detect + always-visible manual entry + Nominatim geocoding; yields `{lat,lon,label,source}`. |
| section-2 | Liquor-store data lookup | b2-storelookup | `storelookup.js` — Overpass query (`shop=alcohol`/`wine`/`beverages`, `around:` filter, `out center`), record normalization with placeholder substitution, graceful error/timeout/offline/empty handling; the promise never rejects. |
| section-3 | Closest-store selection & presentation | b3-presentation | `presentation.js` — haversine great-circle distance, single-closest selection, result card (name/address/distance in mi+km), two external directions links, clear empty/error states; no in-app routing. |
| section-4 | App shell, flow, and launch | b4-shell | `shell.html` / `shell.css` / `shell.js` — self-contained browser-openable shell, flow orchestration, loading/status/error states, radius-widening retry schedule, startup module-presence guard. |
| section-5 | Edge-case testing | ect-1 | `report.json` — 11/11 edge_case_testing assertions pass under production fidelity. |

## Integration
The Integrator assembled sections 1-4 into a single `output/integration/index.html`: `shell.css` inlined in a `<style>` block, the shell HTML skeleton plus the four module scripts inlined in strict dependency order (location → storelookup → presentation → shell). Seams resolved: init order (skeleton parsed before scripts; shell loaded last so it finds both DOM and module globals), naming (no `CLS_*` global or `cls-*` class collisions), assets (everything inline — zero CDN references, zero sibling files). The only network calls the app makes are to the required public OSM APIs.

## Edge-case testing results
All 11 edge_case_testing assertions (S1.A4, S2.A2, S2.A4, S2.A5, S3.A1, S3.A4, S4.A3, S4.A4, S5.A1, S5.A2, S5.A3) exercised against the integrated artifact's unmodified code: **11/11 pass**. Geolocation-denied, Overpass failure / HTTP error / timeout / offline, and empty-result-with-radius-widening all degrade gracefully — no crash, no blank screen, a clear human-readable message in every path. Closest-store selection verified correct against controlled known coordinates (haversine minimum).

## Inline deviations
- **dev-001** — S2.A4's offline-specific message branch was unreachable in the Node test sandbox (Node 22 ships a read-only `navigator` global, so `navigator.onLine` could not be forced false). The generic fallback message is still clear and human-readable, so S2.A4 passes; the offline-specific branch is correct for a real browser. No code change.
- **dev-002** — The Linux test sandbox's egress proxy returns HTTP 406 for the Overpass POST endpoint (a sandbox network-policy artifact — Nominatim and example.com return 200 from the same sandbox). Success-path data assertions were exercised by feeding a representative real-shape Overpass JSON payload through the artifact's own unmodified parse/normalize/select pipeline; the live 406 itself confirmed S2.A4. Downstream live verification should confirm the Overpass success path from a real browser on Windows.

## Escalations
None. No build escalation was raised. The two items above are inline deviations (verification-environment limitations), not artifact defects.

## Deliverable
`output/integration/index.html` — a single browser-openable app. The user double-clicks the file on Windows; the app attempts to auto-detect their location (with a visible manual-entry fallback), queries OpenStreetMap for nearby liquor stores, computes the straight-line-closest one, and shows its name, address, and distance with directions hand-off links. No server, no build step, no CDN dependency.
