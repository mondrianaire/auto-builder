# Build Summary: Earthquake Activity Map

## Original prompt
> Build me a tool to visualize earthquake activity on a map.

## Final assumption set (from Discovery ledger v1)
- A1-A12 from `decisions/discovery/ledger-v1.json`. Highlights:
  - Single interactive web visualization (A1, A2)
  - Markers encode at least magnitude (A3)
  - No accounts, no persistence, no upload, no backend (A4-A6, A11)
  - Global coverage, past 24 hours (A7, A8)
  - Pan/zoom + click-for-details interactivity (A9)
  - Desktop-first, local file deployment (A10, A11)
  - General-user audience (A12)

## Inflection-point resolutions

| IP | Topic | Resolution | Path |
| --- | --- | --- | --- |
| IP1 | Live vs static data | Static snapshot (single fetch on load) | quick_reasoning |
| IP2 | Time-window control | Fixed past-24h, no UI control | quick_reasoning |
| IP3 | Filtering controls | None; magnitude shown via marker encoding | quick_reasoning |
| TD-IP1 | Map library | Leaflet 1.9.4, vendored locally | quick_reasoning |
| TD-IP2 | Data source | USGS past-day GeoJSON feed | quick_reasoning |
| TD-IP3 | Magnitude encoding | Both size (radius) and color (5-bucket palette) | quick_reasoning |

## Sections delivered

1. **section-1 — Earthquake Data Fetcher** (`data-fetcher.js`): async `fetchEarthquakes()` calling the USGS past-day feed and returning `{ ok, events|error }`. Single named URL constant; structured error returns for network/http/parse failures. No polling.
2. **section-2 — Map Renderer** (`map.js` + `vendor/leaflet/`): exposes `mount()`, `magnitudeColor()`, `magnitudeRadius()`. Uses `L.map`, `L.tileLayer` (OSM), `L.circleMarker`. 5-bucket sequential palette; monotonic radius. Popup shows time, magnitude, place, depth.
3. **section-3 — Page Shell** (`index.html`, `styles.css`, `main.js`): desktop-first layout with header, dominant `#map` region, `#legend` overlay (5 buckets generated from section-2 style functions), hidden-by-default error banner. `main.js` wires section-1 + section-2 on `DOMContentLoaded` and shows the banner with the error message on failure.
4. **section-4 — Edge-Case Testing**: report at `output/builders/edge-case-testing/builder-4a/report.json` walking every `verifier: edge_case_testing` assertion. 22 pass, 1 pass-with-caveat, 3 deferred to CV (real-browser user-flows), 0 fail.

## Dispatch mode
**inline** — Coordinator acted as Overseer + Builder for every section, plus Integrator and Historian. Critic scheduled cycles collapsed into Coordinator. Critic final-sweep + CV + delivery are still external (Orchestrator).

## Inline deviations logged
- **dev-001** (`implementation_path_chosen`): Integrator writes to `output/integration/` per Coordinator briefing boundary, not `output/final/` (Orchestrator's responsibility). Does not affect product code or contracts.
- **dev-002** (`implementation_path_chosen`): Flat layout at integration root (modules + CSS at root, vendor under `vendor/leaflet/`) rather than `js/`+`css/` subdirs sketched in the integrator--section-4 contract. The contract's directory sketch is illustrative; section-4 verifies relative paths and absence-of-CDN, both satisfied by the flat layout. Does not affect product code or contracts.

## Total dispatch count
8 logical dispatches (collapsed inline):
1. coordinator boot
2. section-1 builder-1a
3. section-2 builder-2a
4. section-2 builder-2-vendor (Leaflet download)
5. section-3 builder-3a
6. integrator
7. section-4 builder-4a (edge-case-testing)
8. historian + completion-signal

## Integrated artifact location
`output/integration/index.html` (12 files; entry point. Open via file:// in a real browser; requires network for USGS feed and OSM tiles).

## Next steps required (not done by Coordinator)
- `critic_final_sweep`
- `convergence_verifier`
- `delivery_to_final_directory` (Orchestrator copies `output/integration/` -> `output/final/`)
- `run_report`
