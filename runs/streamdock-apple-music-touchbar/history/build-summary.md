# Build Summary — streamdock-apple-music-touchbar (v1.9 Coordinator inline run)

## Original prompt

> Build me a plugin for MiraboxSpace StreamDock VSD N4 Pro that Utilizes the
> Touchbar Mode to display the currently playing song and artist from Apple
> Music Desktop Application. The plugin should take up the entire length of
> the VSD N4 Pro touch bar for display.

## Final assumption set

Inherited verbatim from `decisions/discovery/ledger-v1.json` (no amendments).
Telos: "A plugin that shows the user, on their MiraboxSpace StreamDock VSD
N4 Pro's Touchbar Mode, the song and artist currently playing in the Apple
Music Desktop Application on their Windows PC, occupying the entire length
of the touch bar."

## Sections (5) and architecture

| # | Section | Charter | Builder count |
|---|---------|---------|---|
| 1 | host-integration | Stream Dock WebSocket+JSON client; spawnSidecar; lifecycle/log | 2 |
| 2 | now-playing-source | PowerShell SMTC sidecar + Node consumer with subscribe(onTrack) | 2 |
| 3 | touchbar-renderer | composes Title — Artist; marquee on overflow; calls drawText | 1 |
| 4 | packaging | manifest.json, index.js entry, README with install path | 1 |
| 5 | edge-case-testing | exercises verifier:edge_case_testing assertions | 1 |

Plus an integrator pseudo-node that assembled the `.sdPlugin` directory.

## Researcher dispatches

Four probes (all run before this Coordinator dispatch):

- **probe-ip1** (SDK identity) → opt-A: MiraboxSpace canonical SDK at
  sdk.key123.vip + github.com/MiraboxSpace/StreamDock-Plugin-SDK. NOT Elgato.
- **probe-ip2** (Apple Music data source) → opt-A: SMTC via PowerShell
  sidecar; Microsoft Learn + 9to5Mac confirmation.
- **probe-ip3** (Touchbar Mode geometry) → opt-A: host's widget primitives
  (REFINED from Discovery's "pixel canvas" default). Exact manifest field
  name and pixel resolution are `external_source_unreachable`.
- **probe-ip4** (Install flow) → opt-A: `.sdPlugin` directory copied into
  `%APPDATA%\HotSpot\StreamDock\plugins` + host restart. Canonical excerpt.

## Editor gate

`decisions/editor/review-v1.json` — verdict `pass_with_recommendations`. Five
recommendations passed through to Critic / CV / Historian / Uncertainty
Manifest. No re-routing required.

## Build execution

Dispatch mode: **inline** (5 sections ≤ 8 threshold). Six waves linear:

1. host-integration → 2. now-playing-source → 3. touchbar-renderer →
4. packaging → 5. integrator (pseudo) → 6. edge-case-testing.

Total inline-deviations logged: **3** (all `implementation_path_chosen`).

- **dev-001** — drawText dual-send (setTitle + setFeedback) because S1.A3
  host-protocol field is `external_source_unreachable`.
- **dev-002** — character-count proxy (STATIC_FIT_CHAR_LIMIT=28) for the
  marquee branch because the canonical Touch Bar widget width is not
  reported in the documented protocol.
- **dev-003** — manifest Action declares `Controllers:["TouchBar","Information"]`
  + `Type:"TouchBar"` + `TargetDevice:"streamdock-n4-pro"`; IP3.A1 is
  `external_source_unreachable` and Builder is explicitly delegated the
  literal-value choice.

Zero escalations filed. Zero Sev 0 fixes applied.

## Integrator

Assembled `output/integration/com.autobuilder.applemusic-now-playing.sdPlugin/`
containing `manifest.json`, `index.js`, `js/{host,process-utils,source,renderer}.js`,
`sidecar/smtc-reader.ps1`, `package.json`, `images/icon.txt` (placeholder).
README written alongside.

Two known gaps documented in `output/integration/manifest.json`:

1. **Icon PNG assets missing** — the text-only build cannot produce binary
   image assets. Production should add 72×72 / 144×144 PNGs.
2. **`node_modules/ws` not bundled** — depends on whether the Stream Dock
   host's built-in Node.js 20 ships `ws` or requires `npm install`. The
   plugin's `package.json` declares the dep; a final packaging step needs
   to either bundle `node_modules` or confirm the host provides it.

## Edge-case testing results

- **3 pass**: S3.A1, S3.A2, S3.A3 (renderer logic against contracted mock
  surfaces).
- **6 unverifiable_without_hardware**: S1.A1, S1.A2, S1.A4, S2.A3,
  DCA.A6, DCA.FC.6 — all require the user's Stream Dock host application,
  VSD N4 Pro hardware, or Windows + Apple Music + SMTC. Per Principle G
  Tier 2, no substitution permitted.

## Uncertainty Manifest

Six items to surface to the user:

1. The exact manifest field name to declare an N4 Pro Touch Bar Action is
   `external_source_unreachable`. The build uses `"TouchBar"` literally
   based on VSDinside porting guide naming + MiraboxSpace example plugin
   references; if the host rejects it the action will not appear on the
   Touch Bar.
2. The exact host-protocol message for updating Touch Bar widget text is
   `external_source_unreachable`. The build sends `setTitle` + `setFeedback`
   on every draw; the host should accept whichever it recognizes.
3. Apple Music's exact SMTC `SourceAppUserModelId` is
   `external_source_unreachable`. The build matches on substring `AppleMusic`
   case-insensitively; if Apple ships a build with a different identifier
   the plugin shows `Not Playing`.
4. PNV.1 (end-to-end "display title+artist on Touch Bar") and DCA.FC.1
   through DCA.FC.6 cannot be verified by the build agent — they require
   the user's Stream Dock host + N4 Pro hardware + Apple Music + Windows.
5. Icon PNG assets are not produced by the text-only build; the host
   typically falls back to a default icon with a warning.
6. `node_modules/ws` is not bundled; install or host-provision required.

## Runtime by phase (inline)

- Discovery + TD + Editor + Researchers: prior to this Coordinator
  dispatch.
- Build (inline): waves 1–4 ≈ 19 minutes wall-clock equivalent.
- Integration: ≈ 2 minutes.
- Edge-case testing: ≈ 3 minutes.

Total Coordinator-time: ≈ 30 minutes wall-clock equivalent.
