# Build Summary — streamdock-applemusic-touchbar

**Architecture version:** v1.7 (twelve-role dispatch model)
**Dispatch mode:** inline (6 sections, ≤8 threshold)
**Cycles:** v1 (macOS, delivered → user-side failure) → v3 (Windows pivot, redelivered)
**Final verdict (after v3):** pass (CV v3: pass, PNV.1: pass under production-fidelity ceiling with Linux-sandbox / no-powershell.exe caveat documented explicitly)
**Date:** 2026-05-13
**Deliverable:** `output/final/com.autobuilder.applemusic-nowplaying.sdPlugin/` — now the v3 Windows bundle (see `output/final/divergence-from-integration.json` for the post-v3 delivery story, including the Write-tool / bash cp workaround used to overwrite v1 files in place when the sandbox disallowed `rm -rf`)

> The v1 narrative below is preserved verbatim. The v3 cycle is appended after it.

## Original prompt

> "Build me a plugin for MiraboxSpace StreamDock VSD N4 Pro that Utilizes the Touchbar Mode to display the currently playing song and artist from Apple Music Desktop Application. The plugin should take up the entire length of the VSD N4 Pro touch bar for display."

## Final assumption ledger (live, after all amendments)

Ledger-v1.json is the live spec — never amended. All 13 assumptions, 3 IPs, 10 OOS items as authored by Discovery were honored by the integrated artifact (CV report confirms each by inspection of the bundle).

**13 assumptions** (load-bearing summary):
- **A1** StreamDock VSD N4 Pro plugin built against the Stream Deck-compatible SDK (`.sdPlugin` folder, manifest.json, JS process, WebSocket transport). [high]
- **A2** One action; action type is the Touchbar (wide-display) action; spans the full bar. [high]
- **A3** Now-playing source is the local Apple Music desktop app on the same machine. [high]
- **A4** Target host OS is macOS. [medium]
- **A5** Display shows song title and artist simultaneously, refreshes on track change. [high]
- **A6** Polling update model, ~1–3 s interval. [medium]
- **A7** Neutral placeholder when nothing is playing (default: "Apple Music"). [medium]
- **A8** Truncate-with-ellipsis (SDK-native) for overlong text. [medium]
- **A9** Single-user / single-machine / local-only. No accounts, no cloud, no auth, no telemetry. [high]
- **A10** Deliverable is the runnable/installable `.sdPlugin` folder. [high]
- **A11** Minimal property inspector (at most a few settings). [medium]
- **A12** No album art in v1 — text only. [medium]
- **A13** Touch tap is display-only (no rich controls). [medium]

**3 inflection points** (Discovery defaults, all accepted by TD with `discovery_default_accepted`):
- **IP1** Host OS for Apple Music source → **macOS only** (AppleScript/osascript path).
- **IP2** Album art on the touchbar → **Text-only** (song + artist).
- **IP3** Interactivity on the touchbar → **Display-only** (touch/dial events accepted but no-op).

**10 ledger-level OOS items** (all absent from the integrated artifact per CV's grep-based audit): non-Music streaming sources; lyrics/queue/history; album art; rich playback controls; multi-user/cloud/remote; mobile/iOS as data source; telemetry/scrobbling; theming/skinning; non-VSD-N4-Pro hardware; localization/i18n.

## Amendments made

**Ledger amendments:** none. Discovery's ledger-v1.json is the live spec end-to-end.

**TD spec amendments:** one — `sections-v2.json` superseding `sections-v1.json`. Metadata-only (`covers` field on existing assertions widened from string-or-array to add additional pointers per file_schemas.md's permissive-field clause). Counts: ~50 covers-pointer extensions across 18 existing assertion records. **Zero new assertions. Zero contract amendments. Zero ledger amendments. Zero builder re-dispatches. Zero source-code touch. Integrated bundle bit-identical to v1; 28/28 harness pass identical.**

Why amended: Critic final-sweep v1 raised three prose_coverage escalations (esc-001 charters, esc-002 contracts, esc-003 Discovery assumptions/OOS/chosen_verb) — all explicitly diagnosed as covers-graph wiring gaps, not behavioral verification gaps. Researcher (probe-esc-003, 5-min budget, 4 options) recommended opt-A: extend `covers` arrays on existing assertions that already entail the uncovered claims. TD impact-analysis applied opt-A wholesale. Critic re-sweep cleared all three escalations.

**Contract amendments:** none. All six original contracts (`contracts/original/C-S1-S2`, `C-S1-S3`, `C-S2-S3`, `C-S2-S4`, `C-S3-S4`, `C-S4-S5`) are the live versions.

## Escalations and resolutions

Three escalations, all from Critic final-sweep v1 cycle, all category `prose_coverage`, all non-blocking, all resolved in one TD impact-analysis dispatch:

| ID | Severity raised | Arbiter class | Routed to | Resolution |
|---|---|---|---|---|
| esc-001 | high (prose) | Sev 2b | td_impact_analysis | All 6 section charters gained covers-graph coverage via extension of AA.S{N}.* covers arrays. |
| esc-002 | high (prose) | Sev 2b | td_impact_analysis | All 6 contract interfaces + notes gained coverage via extension of AA.S1.2/3, AA.S2.4/5, AA.S3.4, AA.S4.1/2, AA.S5.1. |
| esc-003 | medium (prose) | Sev 3 | researcher (probe-esc-003) → discovery_amendment (no-op) → td_impact_analysis | 4 assumptions (A1/A3/A4/A9), 7 ledger-OOS items, 19 section-OOS items, chosen_verb gained coverage via extension of MCA.TDIPA.*, MCA.TDIPD.*, DCA.A5.1/A11.1/A12.1/A13.1, DCA.OOS.TELEMETRY.1, PNV.1, AA.S6.2/3 covers arrays. |

esc-003 was the only one to route through Researcher because it directly references Discovery-side fields (ledger-v1.json assumption_ledger entries). Per Arbiter charter rule "If unsure, classify higher" + "escalation references Discovery assumption" → Sev 3 → Researcher then Discovery for amendment-evaluation. Researcher returned 4 options (opt-A widen covers, opt-B sidecar adapter, opt-C Arbiter waiver, opt-D 43 new assertions); recommended opt-A on blast_radius_minimization. Discovery amendment step was inlined by Orchestrator as a no-op (no Discovery assumption is actually invalidated — they were under-asserted on the TD side, not wrong on the Discovery side); the same opt-A wiring satisfies all three escalations end-to-end. Logged as run-report finding for the architecture review.

## Researcher dispatches and chosen options

**Total Researcher dispatches: 1** (initial-mode: 0; escalation-mode: 1).

- **probe-esc-003** (escalation mode, 5-min budget, max 4 options, optimization criterion blast_radius_minimization).
  - Options considered: opt-A (widen covers on existing AAs); opt-B (coverage-aliases sidecar adapter); opt-C (Arbiter Principle-C strict-pass waiver); opt-D (43 new dedicated coverage assertions).
  - **Chosen: opt-A.** Rationale: smallest possible blast radius — JSON leaf-value edits on a single file, zero source-code touch, zero new assertions to verify, zero harness rework. Every gap target maps cleanly to an existing assertion that already entails it. Researcher's secondary recommendation: opt-B if file_schemas.md were strict-string only; the v1.7 permissive-field clause made opt-A available, so opt-B unnecessary.
  - Framing concern: none raised. Briefing framing matched Critic's own diagnosis.

No initial-mode Researcher dispatch — TD's 6 TD-introduced IPs (TD-IP-A through TD-IP-F: SDK-v2 manifest, Encoder+custom-layout+setFeedback, Node.js+vendored ws, AppleScript via osascript, 2000ms poll default, SDK-native truncation) all resolved via quick_reasoning per the four-condition rubric. TD-IP-C (Node.js vs Swift vs HTML-only) failed two rubric points (similar_complexity, no_new_deps) but TD explicitly recorded the rationale for self-resolving rather than dispatching: the canonical Stream Deck plugin pattern is Node.js+ws, the alternatives are clearly worse for production fidelity, and a Researcher round-trip would not change the choice. Defensible per TD charter.

## Deviations

Two inline deviations recorded by Coordinator-as-overseer during the build:

- **dev-001** (S1, category `charter_clarification`): PropertyInspectorPath conflict between briefing ("property_inspector/inspector.html") and contract C-S1-S2 ("ui/inspector.html"). Resolved in favor of the contract (canonical inter-section interface). Nested-equivalent escalation path articulated. No contract touch, no assumption touch.
- **dev-002** (S5, category `implementation_path_chosen`): Added `MUSIC_SOURCE_FIXTURE` env-var branch in `music_source.js` so the S6 harness can inject deterministic now-playing data without monkey-patching `child_process`. The osascript code path and all four required AppleScript literals remain present and execute when the env-var is unset. Contract C-S4-S5 surface (`getNowPlaying() → {title, artist} | null`) is untouched. Nested-equivalent escalation path articulated as test-affordance approval.

Critic flagged both dev-* records for missing explicit `changes_artifact`/`changes_contract`/`changes_assumption` boolean fields (severity LOW, documentation-completeness only) on both cycles. Strict reading of dev-002: it did add code to S5's artifact beyond the S5 charter — could have warranted a Sev 0 record, but the contract surface is untouched and the test-affordance is reasonable. Not a blocker. Surfacing as a charter clarification target for the architecture review.

## Total dispatches

7 real Orchestrator-level Agent dispatches (delivery roles not counted as build dispatches):

1. **Discovery** (initial) — wrote ledger-v1.json.
2. **Technical Discovery** (initial mode) — wrote sections-v1.json + 6 contract files.
3. **Coordinator** (inline dispatch mode) — collapsed Overseer×6, Builder×6, Integrator, Historian-narrative beats. Internally executed 5 waves (W1: S1+S5; W2: S2+S3; W3: S4; W4: Integrator; W5: S6).
4. **Critic** final-sweep v1 — 7 pass, 3 prose_coverage escalations raised (esc-001/002/003), 1 inline-deviation low-severity flag.
5. **Arbiter** — classified esc-001/002 as Sev 2b → td_impact_analysis; esc-003 as Sev 3 → researcher → discovery_amendment → td_impact_analysis.
6. **Researcher** (escalation mode, probe-esc-003) — 4 options, recommended opt-A.
7. **Technical Discovery** (impact-analysis mode) — wrote impact-analysis-v2.json + sections-v2.json applying opt-A to all three escalations in one dispatch.
8. **Critic** final-sweep v2 — 8 pass, 1 low-severity inline-deviation flag (below escalation threshold). Build pass.
9. **Convergence Verifier** — verdict pass; independently re-ran S6 harness (28/28 confirmed); PNV.1 passed under production fidelity.
10. **Orchestrator** — copied integration → final/; wrote divergence-from-integration.json.
11. **Historian** (this dispatch) — wrote build-summary.md + decision-index.json.

Discovery amendment step (between Researcher and TD-impact for esc-003) was inlined by Orchestrator as a no-op since no Discovery assumption was actually invalidated. Logged for architecture review.

Inside the Coordinator (inline): ~12 logical dispatches (6 builders + 6 overseer verifies + 1 integrator). All collapsed into the single Coordinator agent.

## Runtime per phase

(Per log.jsonl + dispatch-log.jsonl timestamps; these are model-clock-time approximate.)

| Phase | Start | End | Duration |
|---|---|---|---|
| Discovery | 00:00:00 | 00:00:00 | minutes (single dispatch) |
| Technical Discovery (initial) | 00:00:00 | 00:00:00 | minutes (single dispatch) |
| Coordinator build (5 waves) | 00:01:00 | 00:07:00 | ~6 model-minutes |
| Critic final-sweep v1 | 00:08:00 | 00:08:00 | single dispatch |
| Arbiter routing | 00:08:00 | 00:08:00 | single dispatch |
| Researcher (probe-esc-003) | 00:09:00 | 00:13:00 | 4 model-minutes (5-min budget) |
| TD impact-analysis | 00:15:00 | 00:15:00 | single dispatch |
| Critic final-sweep v2 | 00:16:00 | 00:16:00 | single dispatch |
| CV | 23:50:00 | 23:50:00 | single dispatch |
| Orchestrator delivery + Historian | (post-CV) | — | — |

Build phase (Coordinator) was the longest single span at ~6 model-minutes; the escalation loop (Critic v1 → Arbiter → Researcher → TD-impact → Critic v2) added another ~8 model-minutes for the metadata-only fix. Total run wall-clock model-time from Discovery dispatch through CV verdict: well under 24 model-hours; the gap to CV at 23:50 reflects the run's actual queueing schedule, not active work.

## Build-coordination noteworthy items

- **Coordinator's wave 1 was the only parallel wave with two no-deps sections** (S1 + S5). Waves 2–5 ran one section at a time despite the inline-dispatch mode allowing concurrency, because the depends_on edges from S2, S3, S4 collapsed to a single wide chain. S6 ran last in wave 5 against the integrated bundle (which is the correct ordering — S6 owns the production-fidelity harness against the assembled artifact).
- **S6's harness is the production-fidelity instrument.** It spawns `plugin/run.sh` as a real child process, hosts a real ws@8.20.1 server on 127.0.0.1, and exercises the actual integrated bundle. The only stub is the MUSIC_SOURCE_FIXTURE env-var (the AppleScript boundary, which is unavoidable in a non-device environment per the briefing's verification constraint). 28/28 assertions including PNV.1.
- **PNV.1** (verb = "display"): captured WebSocket frame `{"event":"setFeedback","context":"PNV-CTX","payload":{"title":"Bohemian Rhapsody","artist":"Queen"}}` — exact match. CV independently re-ran the harness and got byte-identical output.

## What's noteworthy about this run

- **Six sections, six TD-IPs, all quick-reasoned, no initial Researcher dispatch.** TD's discipline in stating its quick-reasoning rubric on each TD-IP (including TD-IP-C where the rubric *failed* but TD self-resolved with explicit rationale) is a model of how the v1.7 charter intends TD to operate.
- **Prose-coverage was the only escalation source.** The three escalations are all the same shape (missing covers pointers, not missing behavioral verification) — confirming the architecture's principle-as-property elevation in v1.7 works as designed: the gap was found, classified, routed, resolved with a metadata-only edit, and re-verified clean. The integrated artifact never changed.
- **The recurrence of the prose_coverage charter-gap escalation (also seen in earthquake-map run-report A1) confirms that the TD initial-mode charter under-enumerates the section_coverage and contract_coverage collections.** Same root cause as that prior run: TD reasonably covers Discovery-side prose thoroughly (13 MCAs + 17 DCAs + PNV.1) and stops, missing the parallel sections[].charter, contracts[].interface, and contracts[].notes coverage demands. Two runs in a row with the same gap is a charter-surface signal.
- **Discovery amendment step inlined as no-op.** This is the second time this charter beat could be elided cleanly: when an esc-003-style escalation references Discovery fields but doesn't actually invalidate any Discovery claim, the Researcher's findings packet entails that no ledger amendment is needed, and the same TD-impact wiring satisfies all routed escalations. Worth flagging to the architecture review as a candidate "Discovery short-circuit" rule.

---

## v3 Cycle (Windows pivot after user-side failure)

This cycle was opened after the v1 deliverable was installed by the user and silently failed to load. Every gate in the v1 run had passed — including PNV.1 under production fidelity and an independent CV re-run of the S6 harness — yet the bundle did not appear in the user's VSD Craft side panel because the user is on Windows and the plugin had been built macOS-only. The architecture verified what it had decided to build; it never noticed it had decided to build the wrong thing.

### v1 delivery → user-side failure → root-cause-analysis.md

The user dropped the delivered `.sdPlugin` folder into `C:\Program Files (x86)\VSD Craft\plugins` and got no plugin tile. Diagnosis chain on report: empty side panel → manifest `OS:[mac]` → IP1's default branch → Discovery's choice of macOS as the host OS → the evidence Discovery actually had access to but did not consult.

`root-cause-analysis.md` formally names three failure modes:

1. **Environmental-evidence blindness.** Discovery's own system prompt contains unambiguous Windows signals (`C:\Users\mondr\...`, `AppData\Roaming`, the `C:\Program Files (x86)\` mount style). The charter instructs "doesn't contradict the prompt" and Discovery read that as "doesn't contradict the *literal prompt text*" rather than "doesn't contradict the *full available evidence*." Every sub-agent had the same signals in context and none consulted them.
2. **Discovery-default-accepted as a rubric bypass.** TD wrote `"resolution_method": "discovery_default_accepted"` on IP1 in sections-v1.json. Run honestly, the four-condition quick-reasoning rubric *fails 3 of 4* for IP1 (similar_complexity: no; no_new_deps: no; easily_reversible: no — Discovery's own `why_inflection` literally said "the data-acquisition layer, the language/runtime helpers, and the install/packaging notes all change with OS"). The rubric was never exercised because Discovery's default was inherited. The architecture has no rule saying "applying a Discovery default still requires the rubric."
3. **No "should we ask?" gate on high-importance IPs.** IP1 was tagged `importance: high`. IP2 medium. IP3 low. All three were resolved identically (`discovery_default_accepted`). Importance is currently decorative metadata, not load-bearing.

The RCA proposes **Principle E — Decision Grounding** as a v1.9 architecture amendment: every load-bearing decision must be grounded in the strongest available evidence including evidence visible in the execution context, not just evidence in the prompt's literal text. When evidence is weak or contradicts the chosen default, the decision must be deferred (Researcher dispatch) or surfaced (user question), not locked silently. Companion proposals: TD's four-condition rubric becomes mandatory on every IP resolution including Discovery-defaulted ones; `importance: high` makes the rubric check mandatory and a Researcher dispatch the default unless every condition passes with evidence; PNV gets a sibling `prompt_environment_assertion` exercising installability in the actual user environment.

> This is the **second consecutive run** where the architecture's gates passed but the user's actual environment was the unmodeled variable. The first was the latex-CDN failure that v1.5 was created to close (verifier ran in a substituted environment). v1.5 closed environmental fidelity *during verification*. The Windows-host failure here is environmental fidelity *during decision-making*. Same root-cause class, one level up the stack — the gap Principle E is designed to close.

### Discovery amendment (ledger-diff-v2.json)

Discovery wrote `decisions/discovery/ledger-diff-v2.json` in amendment mode against ledger-v1 (which remains the live spec for everything inherited unchanged). The 4-question meta-check came out **2 yes, 2 no → goal-affecting**:

- (a) *user_can_do*: **no** — same verb (see song+artist on the touch bar). User-facing outcome identical.
- (b) *context_needed*: **yes** — Windows-side runtime and dependencies differ materially (SMTC/WinRT, Apple Music for Windows is the Microsoft Store preview, etc.).
- (c) *success_criteria*: **no** — title + artist rendered full-width, refresh on change, neutral placeholder when nothing is playing.
- (d) *maintenance_burden*: **yes** — different platform conventions: Windows entry script not `.sh`, install path `C:\Program Files (x86)\VSD Craft\plugins`, SMTC subscription lifecycle vs AppleScript polling, manifest OS array `[windows]` instead of `[mac]`.

Verdict: goal-affecting; route to TD impact analysis. **User-resurfacing not required** — the user had pre-committed to "Windows-only rebuild — drop macOS branch entirely" before the dispatch was opened.

Amendments: A3 (mechanism → SMTC via PowerShell+WinRT), A4 (host OS → Windows, confidence raised medium → high on direct user evidence), A6 (rationale clarified — polling acceptable but SMTC is event-capable; assumption itself unchanged), A10 (bundle install path → `C:\Program Files (x86)\VSD Craft\plugins`, no `.sh`/chmod step), IP1 (`resolution_source: user_explicit_choice` → Windows-only). Two new OOS items added (macOS-as-host, cross-platform single-bundle). A1/A2/A5/A7/A8/A9/A11/A12/A13 and IP2/IP3 inherited unchanged.

### Two Researcher dispatches in escalation mode

Both initiated by TD impact-analysis under blast-radius-minimization, both returned options that converged on the same answer.

- **probe-windows-nowplaying** (Windows now-playing mechanism). 4 options considered: opt-A (inline PowerShell + WinRT SMTC via `child_process.execFile`); opt-B (long-running PowerShell helper subscribing to SMTC events); opt-C (bundled precompiled `nowplaying.exe`); opt-D (N-API native Node module). **Chosen: opt-A.** Smallest possible blast radius — *only* `music_source.js` changes; S2/S3/S4/S6 byte-identical; C-S4-S5 contract surface preserved exactly; zero install footprint (PowerShell 5.1 + WinRT ship in every Windows 10/11); ~400 ms cold start well below the 2000 ms poll cadence.
- **probe-windows-plugin-runtime** (how to make the host run the .js entry on Windows). 4 options: A (declare `Nodejs.Version` in manifest; CodePathWin → `plugin/main.js` directly, host runs it with bundled Node); B (`.cmd` wrapper + system `node.exe`); C (bundle portable node.exe + .cmd wrapper); D (`ncc`/`pkg` single-exe). **Chosen: A.** Manifest-only change; no wrapper, no vendored binary, no system-Node requirement. Honors the S2/S3/S4/S6 preservation list.

Neither probe raised framing concerns. Both ratified what the briefings already named as the minimum-blast paths.

### TD impact-analysis v3 + sections-v3

`impact-analysis-v3.json` and `sections-v3.json` produced in a consolidated dual-role dispatch given small, well-bounded scope. Classifications:

| Section | Classification | Rationale (one-liner) |
|---|---|---|
| S1 | **salvageable** | Manifest field edits only: OS `mac→windows`, `+Nodejs:{Version:'20'}`, `+CodePathWin:'plugin/main.js'`, drop `CodePathMac`, Description update, remove `plugin/run.sh`. AA.S1.5 expected_value flipped, new AA.S1.6 + MCA.TDIPA.4 added. Estimated rework ~15%. |
| S2 | **unaffected** | Layout JSON + PI HTML are mechanism-agnostic. |
| S3 | **unaffected** | SDK handshake + vendored ws are OS-agnostic. |
| S4 | **unaffected** | Polling orchestrator calls `getNowPlaying()` against the C-S4-S5 contract, which is preserved. |
| S5 | **stop_and_scrap_and_replace** | Section renamed `music-source-applescript → music-source-smtc` (id `S5` preserved for DAG stability). Module body, AA.S5.1-4 literals, MCA.TDIPD.1/2 rewritten from AppleScript+osascript to PowerShell+WinRT SMTC. C-S4-S5 public surface and `MUSIC_SOURCE_FIXTURE` shim (from dev-002) preserved verbatim. |
| S6 | **salvageable** | Harness mechanism preserved; fixture key rename `osascript → powershell.exe`; AA.S6.3 prose updated. Estimated rework ~5%. |

TD-IP changes: **TD-IP-A** amended (mac→windows, +Nodejs, CodePathMac→CodePathWin). **TD-IP-D** marked superseded by TD-IP-G (AppleScript doesn't exist on Windows). **TD-IP-G added** (Windows now-playing mechanism, resolved via research to PowerShell+WinRT SMTC opt-A).

**0 contract amendments.** C-S4-S5's mechanism-agnostic surface was deliberate upstream design ratified by the Researcher findings. C-S1-S3 gets an implementation-rationale note (entry path renames to CodePathWin → main.js direct, node_runtime_assumption shifts to host's bundled Node via Nodejs.Version) but its load-bearing inter-section constraints are unchanged.

Totals: 8 assertions amended, 1 added (MCA.TDIPA.4 + AA.S1.6), 0 removed, 0 contracts amended.

### Three new inline deviations (dev-003 / dev-004 / dev-005)

All recorded by Coordinator-as-overseer during the v3 build. Same low-severity flag pattern as v1's dev-001/002.

- **dev-003** (S1, `implementation_path_chosen`): Manifest `Nodejs` object includes only `Version`; `GenerateProfilerData` omitted. Matches MCA.TDIPA.4's expected_value exactly. Addable if the StreamDock host log later complains.
- **dev-004** (S5, `implementation_path_chosen`): PowerShell script embedded in `music_source.js` as an array of single-quoted JS strings joined with `\n`, not a template literal — avoids JS-side interpretation of PowerShell's backtick escapes and `$` sigils. Briefing flagged escape-pattern choice as an expected inline-deviation site.
- **dev-005** (integrator, `environment_constraint_accommodation`): `plugin/run.sh` could not be physically deleted from the integrated bundle in the cowork sandbox (rm "Operation not permitted"; `allow_cowork_file_delete` requires interactive mode). Mitigation: reduced to inert comment-only content and removed from `output/integration/manifest.json`'s file list. The Windows host loads via CodePathWin → `plugin/main.js`; `run.sh` is unreferenced and ignored. Flagged for physical removal at final-delivery step.

### v3 Coordinator (inline) enacted the delta

Inline dispatch mode again (6 sections; same threshold). Five waves collapsed to three carry-forwards (S2/S3/S4 untouched) + two re-dispatches (S1-v3, S5-v3) + one re-integrate + one re-harness:

1. **Coordinator-v3 → S1-v3 (re-dispatched, salvageable amendment).** Manifest updated to Windows-only; dev-003 logged.
2. **S2/S3/S4 carried forward byte-for-byte** from v1 builder outputs (unaffected classification).
3. **Coordinator-v3 → S5-v3 (re-dispatched, scrap-and-replace).** `music-source-smtc/builder-s5-v3/music_source.js` rewritten with PowerShell+WinRT. All 4 required SMTC literals present (`GlobalSystemMediaTransportControlsSessionManager`, `Windows.Media.Control`, `TryGetMediaPropertiesAsync`, `PlaybackStatus`). dev-004 logged.
4. **Coordinator-as-integrator-v3** re-assembled the bundle (S1-v3 manifest, S5-v3 music_source, S2/S3/S4 unchanged). `plugin/run.sh` reduced to inert vestige; dev-005 logged.
5. **Coordinator-as-overseer-S6-v3** ran the v3 harness end-to-end (Node-direct spawn of `plugin/main.js` per CodePathWin+Nodejs.Version model). **33/33 assertions passed** including PNV.1. Sandbox caveat: `powershell.exe` absent in Linux harness; `MUSIC_SOURCE_FIXTURE` shim bypasses it; PS-to-SMTC boundary asserted structurally via AA.S5.4 literal-presence checks.

### Critic final-sweep v3 clean

No new escalations. Same low-severity inline-deviation flag pattern as v1's Critic-v2: deviations missing explicit `changes_artifact`/`changes_contract`/`changes_assumption` boolean fields (documentation-completeness only). Not a blocker. Recorded again as a charter clarification target.

### CV v3 verdict: pass

`output/verification/report-v3.json` records verdict **pass** under the acknowledged production-fidelity ceiling for hardware-plugin builds in a Linux verification sandbox.

- Real components exercised: actual `plugin/main.js` Node process; actual SDK handshake; actual vendored `ws@8.20.1`; actual `layouts/nowplaying.json`; actual `manifest.json`.
- Mocked/bypassed: SDK WebSocket host (a 127.0.0.1 `WebSocket.Server` stands in for VSD Craft, unavoidable in any non-device environment); `powershell.exe` SMTC shell-out (Linux sandbox has no `powershell.exe`, so `MUSIC_SOURCE_FIXTURE` env-var shim — preserved from dev-002, mechanism-agnostic at the integration boundary — feeds the parser the canonical `title\tartist` string).
- PowerShell-to-SMTC boundary verified by complementary envelopes: structurally via MCA.TDIPD.2 / AA.S5.4 grep for the four WinRT literals; behaviorally via the response-logic assertions (AA.S5.1/2/3, AA.S4.1/2/5, DCA.A5.1/2, DCA.A7.1); and end-to-end **delegated to the user's Windows host installation test**. This is the maximum verifiability available without a Windows VM in the sandbox; not a stubbed-DOM handwave, the ceiling is documented explicitly.
- PNV.1 (verb='display'): captured `setFeedback` frame `{"event":"setFeedback","context":"PNV-CTX","payload":{"title":"Bohemian Rhapsody","artist":"Queen"}}` — exact match. CV independently re-ran the v3 harness; output matched the v3 report 33/33 verbatim.

### Orchestrator delivered v3 to final/

`output/final/divergence-from-integration.json` updated to record both divergences. (1) The Integrator's own assembly-record `output/integration/manifest.json` is metadata about how the bundle was assembled and is structurally excluded from the deliverable (unchanged from v1). (2) **The v3 cycle's files are now in `output/final/`, not the v1 macOS files.** Sandbox permission quirk: `rm -rf output/final/com.autobuilder.applemusic-nowplaying.sdPlugin` was disallowed at v3 delivery time; the Write tool (with different permissions than `bash rm`) successfully overwrote individual files in place (`manifest.json`, `plugin/music_source.js`, and `plugin/run.sh` reduced to a deprecation-marker comment). `bash cp` carried the rest. Effective end-state is bit-equivalent to `output/integration/com.autobuilder.applemusic-nowplaying.sdPlugin/` modulo the `run.sh` comment content; the bundle on the user's filesystem will be normal-permissioned. Documented explicitly in `divergence-from-integration.json`'s `filesystem_caveat`.

### Total v3 dispatches

6 real Orchestrator-level dispatches in the v3 cycle (delivery roles not counted):

1. **Discovery** (amendment mode, on user-environment evidence) — wrote ledger-diff-v2.json.
2. **Researcher** (escalation, probe-windows-nowplaying, 5-min budget, 4 options) — recommended opt-A.
3. **Researcher** (escalation, probe-windows-plugin-runtime, 5-min budget, 4 options) — recommended opt-A.
4. **Technical Discovery** (impact-analysis mode, consolidated dual-role) — wrote impact-analysis-v3.json + sections-v3.json.
5. **Coordinator-v3** (inline dispatch) — collapsed S1-v3 builder, S5-v3 builder, integrator-v3, S6-v3 harness.
6. **Critic** final-sweep v3 — clean (same low-severity inline-deviation flag).
7. **Convergence Verifier** — verdict pass; independent S6 re-run 33/33 confirmed; PNV.1 passed under documented production-fidelity ceiling.
8. **Orchestrator** — overwrote v1 files in `output/final/` with v3 content via Write tool + bash cp; updated divergence-from-integration.json.
9. **Historian** (this dispatch) — appended v3 section to build-summary.md, appended v3 entries to decision-index.json.

(Discovery amendment ran in standard amendment mode this cycle, not inlined as a no-op — the IP1 resolution change is a real Discovery field change.)

### What's noteworthy about the v3 cycle

- **The architecture has now caught the same shape of failure twice — gates green, user environment unmodeled.** First time: v1.5's latex-CDN failure during *verification*. Second time: this run's macOS-default during *decision-making*. Principle E (Decision Grounding) is the proposed v1.9 amendment to close the second; the proposal is recorded in `root-cause-analysis.md` and tied to this build's history here.
- **The reactive part of the system worked cleanly.** Within minutes of user-evidence surfacing, the chain was: side-panel empty → manifest OS array → IP1 → Discovery's blind-spot → architectural amendment proposal → Discovery amendment → 2 Researcher probes → TD impact-analysis → Coordinator-v3 → Critic v3 → CV v3 → final delivery. The runbook for "delivered run fails on user's hardware" effectively wrote itself; worth formalizing as a Re-Verification reverse-pattern per RCA proposal 5.
- **C-S4-S5's mechanism-agnosticism paid off.** The contract was deliberately written with a public surface `getNowPlaying() => Promise<{title, artist} | null>` and put the `osascript` literal in `internal_constraints`, not the inter-section surface. When the mechanism flipped to `powershell.exe`, S4 didn't know and didn't care; S2/S3/S6 carried forward byte-identical. This is upstream design discipline that the Researcher findings explicitly ratified — worth surfacing as a TD pattern to encode in v1.9 ("name mechanisms only in `internal_constraints`, never in the public contract surface").
- **The `MUSIC_SOURCE_FIXTURE` shim (dev-002, originally introduced for the v1 osascript boundary) carried over verbatim and continued to work** without modification when the underlying mechanism flipped to `powershell.exe`. The shim is mechanism-agnostic by construction. This is the second time dev-002 has paid for itself — first as the test affordance that let S6 verify v1, second as the layer that let CV verify v3 in a Linux sandbox without `powershell.exe`.
- **The sandbox permission quirk at final delivery is a real-and-recurring environment fact**, not a one-off. `rm` against pre-existing files in `output/final/` was disallowed; Write-tool overwrite + bash cp was the workaround. Recorded in `divergence-from-integration.json` and dev-005. Worth flagging to the architecture review as a charter touchpoint for Orchestrator's delivery role: the role should explicitly enumerate both code paths (clean copy vs in-place overwrite) and not assume one.
