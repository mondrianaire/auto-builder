# Decision-Flowchart "Detail Full" Bridge Plan

**Filed:** 2026-05-16 by Maintenance after user surfaced three reference flowcharts at `example flowcharts/`.
**Status:** PLAN — phased roadmap to bring the generator from v0.1 (low-detail) to the "Detail Full" target.
**Scope:** post-completion rendering only. Live rendering is a separate workstream owned by Codex v0.16 (live narrative renderer) against the v1.11 substrate.

## Where we are vs. where we want to be

The reference flowcharts at `example flowcharts/` span three rungs of detail:

1. **`decision-flowchart-low.svg`** — what the v0.1 generator produces today (~8.9KB SVG). Decisions show as bare labels like "D-DSC-2: Logged 12 assumptions (A1–A12)" with no body text. One row per phase. Escalation highway is two red lines with arrows.

2. **`architecture_diagram-medium.svg`** — intermediate richness (not yet generated; reference only).

3. **`decision-flowchart - Detail Full.svg`** — the target (~53.9KB SVG). Each D-XXX-N decision has a label PLUS a multi-sentence plain-language body. User Prompt + Orchestrator preamble. Sections expanded into individual boxes with color-coded agent badges. Multi-mode agent wrappers (TD initial+impact in one bordered box; Coordinator initial+re-engaged similarly). Escalation highway shows traversal indicators ("↻ SECTIONS / delta says / all unaffected / no rebuild") along its path. Italic role descriptions. Run-report annotations.

The gap is roughly 6× the file size — most of which is **content body per decision** and **structural richness** (preamble, sub-boxes, traversal indicators), not raw geometry.

## Strategy: two paths to plain-language content

The core gap is that v0.1 emits labels but no bodies. There are two ways to produce per-decision body text:

**Path A — v1.11 Completion Reports** (canonical, future builds): every role emits `state/reports/{role}-{instance_id}-v{N}.json` with plain-language blurbs. Each blurb's `answer` text IS the body for a corresponding D-XXX-N entry. This is the right long-term source — written by the role at completion time, in the role's own voice, with the v1.11 style contract (no AutoBuilder vocabulary) enforced by Critic.

Mapping from blurbs to D-XXX-N denominations:

| Role | Blurb question | D-XXX-N |
|---|---|---|
| Discovery (initial) | "What did you understand the user wants?" | D-DSC-1 (restatement) |
| Discovery (initial) | "What choices did you make on their behalf?" | D-DSC-2 (IPs, one per choice) |
| Discovery (initial) | "What did you explicitly NOT do?" | D-DSC-3 (out-of-scope) |
| Discovery (initial) | "What couldn't you verify?" | D-DSC-4 (demoted/unreachable) |
| TD (initial) | "How are you breaking this into pieces?" | D-TD-1 (section breakdown) |
| TD (initial) | "What tech choices did you make?" | D-TD-2 ... D-TD-N (one per tech pick) |
| TD (initial) | "What handoffs exist between pieces?" | D-TD-N (contracts summary) |
| TD (impact) | "After re-examining, what changes?" | D-TD2-1 |
| TD (impact) | "What stays the same?" | D-TD2-2 |
| Coordinator | "How are you sequencing the work?" | D-CRD-1 (DAG) |
| Coordinator | "What's running in parallel?" | D-CRD-2 (waves) |
| Overseer (per section, intent) | "What does this piece need to do?" | D-SEC-{section}-1 |
| Overseer (per section, outcome) | "Did this piece come out as planned?" | D-SEC-{section}-2 |
| Builder | "What did you build, and what does it do?" | embedded in section box |
| Critic | "What did you find?" | D-CRT-1 |
| CV | "Does the artifact actually work?" | D-CV-1 (verdict) |
| CV | "Any caveats?" | D-CV-2 |
| Integrator | "What did you produce?" | D-INT-1 |

**Path B — post-completion synthesis** (one-off, backfill for pre-v1.11 builds): the extractor reads existing Cat-2 substrate (ledger, sections plan, audit flags, dispatch log, run-report) and produces synthesized plain-language bodies via a small templated translation layer. Quality is lower than Path A (no role-authored prose) but covers the 7 already-ratified pre-v1.11 corpus entries (earthquake-map, gto-poker-async-duel, gto-poker-trainer, blackjack-trainer, kanban-board, tic-tac-toe, streamdock-applemusic-touchbar).

The generator should support both paths. Default precedence: prefer `state/reports/*.json` when present, fall back to synthesized bodies from Cat-2 when absent. A `--source-mode reports|synth|prefer-reports` flag on the generator lets a re-render force one path.

## Phased rollout

Each phase is shippable on its own. Earlier phases unlock visual richness; later phases polish.

### Phase 1 — Per-decision body extraction (foundational)

**Goal:** every `decision` object emitted by the extractor carries a `body` field with plain-language text, not just a label.

**Changes:**

- `architecture/scripts/decision-flowchart-extract.mjs`: each extractor function (`extractDiscoveryDecisions`, `extractTDDecisions`, etc.) gains a `loadReports()` step that checks `runs/{slug}/state/reports/` for matching role reports. If found, the extractor maps blurb questions → D-XXX-N entries per the table above and uses `answer` text as the `body`. If absent, falls back to a per-role `synthesize{Role}Body()` function that produces a passable body from the existing Cat-2 sources.

- New shape for each decision: `{ id, label, body, role, importance, sources: ['reports/discovery-initial-v1.json'] | ['ledger-v1.json', 'sections-v1.json'] }`. The `sources` field documents provenance for audit and lets the renderer cite the underlying file in a tooltip.

- Synthesis templates per role (Path B fallback). Examples:
  - D-DSC-1: "Reframed prompt as ‹first sentence of `ledger-v1.restatement`›."
  - D-DSC-2: "Recorded N assumptions covering ‹first 3 assumption topics summarized›: A1 ‹topic›, A2 ‹topic›, etc."
  - D-CRD-1: "Set dispatch_mode: ‹value› for this N-section build."
  - D-CRT-1: "Raised N flags (M medium/high)."

- New unit test target: validate every extracted decision has both `label` and `body` populated; bodies pass a minimal style-contract check (no banned vocabulary list applied yet — that lands in Phase 8).

**Done when:** running `decision-flowchart.mjs` on earthquake-map produces an extracted graph where every decision has a non-empty `body` field. SVG output still uses the old renderer for now (labels only); only the data layer is enriched.

**LoC estimate:** ~250-300 added to extract.mjs.

### Phase 2 — Preamble + role subtitle + per-decision body rendering

**Goal:** Detail-Full-style preamble and per-role italic descriptions; decisions render with their body text below the label.

**Changes:**

- `architecture/scripts/decision-flowchart-render.mjs`: emit a preamble block at the top of the canvas before Phase 1:
  - User Prompt box: verbatim `prompt` from `prompt.txt`, displayed as italic centered text. **This is the "D-DSC-1 as user prompt itself" rendering** per the user's framing — D-DSC-1's body is the prompt; the D-DSC-1 marker is supplementary metadata on the Discovery box.
  - Orchestrator box: short bullet list of orchestrator actions (build environment setup, dispatch_mode selection, phase-task boot).
  - Connect User Prompt → Orchestrator → Phase 1 with arrows.

- Italic role-description subtitles under each role heading. Subtitle text is curated per role (drawn from charter purpose sentences):
  - Discovery: "Ascertains the user's true intent beyond the written prompt — surfacing implicit assumptions and load-bearing decisions"
  - TD: "Translates Discovery's goal into a technical action plan"
  - Coordinator: "Sequences and dispatches the build work; tracks section deps"
  - Critic: "Audits substrate consistency and surfaces gaps"
  - CV: "Exercises the artifact under production fidelity"
  - Etc.

- Each decision renders as: bold label line (e.g., `D-DSC-1: Restatement.`) + body text wrapped at the agent box width. Body uses 12px regular weight; label uses 13px bold + role-tinted color.

**Done when:** SVG output for earthquake-map matches Detail Full's visual style for the Discovery + TD initial sections. Subsequent phases are not yet at parity but the visual register is correct.

**LoC estimate:** ~200-250 added to render.mjs.

### Phase 3 — Multi-mode agent wrapper boxes

**Goal:** TD (initial + impact) and Coordinator (initial + re-engaged) render as single bordered wrapper boxes with internal vertical dividers between modes.

**Changes:**

- `decision-flowchart-layout.mjs`: detect when a build has both `td-initial` AND `td-impact` reports/decisions. Compute a single wrapper rect that encompasses both, with an internal vertical divider at the boundary.

- Render the wrapper with a top-left label badge ("TD AGENT · 2 MODES" in deep navy) and a top-right "↻ REVISITED esc-{nnn}" badge in red when the impact mode was escalation-triggered.

- Same pattern for Coordinator with red "COORDINATOR AGENT · 2 MODES" wrapper when re-engaged.

- Layout widens to accommodate the impact-mode sub-panel on the right.

**Done when:** earthquake-map renders TD initial + impact as a single bordered box matching Detail Full's structure. Coordinator wrapper similar.

**LoC estimate:** ~150 added to layout.mjs, ~80 added to render.mjs.

### Phase 4 — Expanded section sub-boxes with agent badges

**Goal:** sections render as individual sub-boxes (not a single Sections row), each with title + description + agent badges + bullet list. Color-coded agent badges (Overseer green, Builder orange, optionally Researcher purple, Vendor-builder olive).

**Changes:**

- `extract.mjs`: per-section enrichment — for each section, pull `description` from `sections-v1.json`, agent IDs from `dispatch-log.jsonl`, and 2-3 bullet items from per-section `state/sections/{name}.json` or from Builder Completion Reports.

- `layout.mjs`: section-box grid layout. N sections in a row when N ≤ 4; wrap to multiple rows when N > 4. Per-box width adapts to section count.

- `render.mjs`: each section box renders:
  - Title (e.g., "S1 · Data Fetcher") + italic subtitle (e.g., "isolates HTTP/GeoJSON parsing")
  - "AGENTS DISPATCHED HERE" header
  - Color-coded badge row (Overseer green / Builder orange / etc.)
  - Bullet list of what the section did
  - "→ Overseer verified..." footer in green italic (sourced from Overseer outcome blurb)

**Done when:** earthquake-map's S1/S2/S3 each render as their own sub-box with agent badges. S4 (edge-case testing) is its own row below the main sections wave per its `depends_on: integrator` relationship.

**LoC estimate:** ~200 across all three modules.

### Phase 5 — Integration, ECT, and Verification phase expansion

**Goal:** post-build phases render at parity with Detail Full — Integrator, Edge-Case Testing, Critic final-sweep, CV all visible as distinct boxes with their own decisions.

**Changes:**

- `extract.mjs`: extractor functions for Integrator, ECT (a special section type), Critic (final_sweep mode specifically), CV.

- `render.mjs`: each gets its own row in the canvas with phase-band labels above ("PHASE 4 — INTEGRATION", "PHASE 5 — VERIFICATION"). CV's decisions explicitly include verdict + first-contact result + caveats per its v1.11 blurbs.

**Done when:** earthquake-map's full pipeline from Discovery through CV verdict renders cleanly. Stat-card count includes Integrator + CV decisions.

**LoC estimate:** ~150 across modules.

### Phase 6 — Escalation highway traversal indicators

**Goal:** the vertical red highway showing esc-{nnn}'s journey gains inline traversal indicator boxes at each phase it passes through, showing what happened at that phase ("↻ SECTIONS / all unaffected / no rebuild").

**Changes:**

- `extract.mjs`: for each escalation, derive a "traversal record" showing which phases the delta plan passed through and what each phase did (typically "no-op" for unaffected sections; "rebuild" or "amendment" otherwise). Sourced from `state/escalations/routed/esc-{nnn}-routing.json` + post-escalation re-engagement reports.

- `layout.mjs`: compute positions along the highway for each traversal indicator. Spacing scales with the number of phases the delta touches.

- `render.mjs`: each traversal indicator is a small dashed-border box on the right side of the canvas, parallel to the corresponding phase row. Internal text shows "↻ {PHASE NAME}" + "delta says" + outcome (e.g., "all unaffected" in green or "rebuild" in red) + "{action taken}".

- Highway labels along the long vertical segments ("esc-001 raised back to TD agent (impact mode)") render rotated -90° next to the highway.

**Done when:** earthquake-map's esc-001 highway shows 5 traversal indicators (TD impact → Coordinator → Sections → Integrator → ECT → back to Critic Cycle 2).

**LoC estimate:** ~120 in layout + render.

### Phase 7 — Stat cards refinement + run-report annotations

**Goal:** stat cards reflect more granular counts, and run-report findings appear as italic gray annotations within relevant agent boxes (per Detail Full's pattern).

**Changes:**

- Stat-card "DECISIONS" count now counts every D-XXX-N entry across roles (Detail Full shows 47 for earthquake-map vs v0.1's 20). Means counting per-Builder and per-Overseer decisions too, not just the headline roles.

- "AGENTS DEPLOYED" includes per-section Builders + Vendor-builders + per-section Overseers. Detail Full shows 9 for earthquake-map.

- Run-report annotation extraction: parse `run-report.md` for "## Architecture findings" or similar sections; for each finding, place the text as italic gray near the relevant role (e.g., "Run-report A1: TD charter omits parallel section/contract coverage prescription." inside the TD impact box).

**Done when:** stat cards match Detail Full's numbers and at least one run-report annotation appears in earthquake-map's TD impact box.

**LoC estimate:** ~100.

### Phase 8 — v1.11 integration + style contract enforcement

**Goal:** once builds emit Completion Reports natively (post-v1.11, first new build), the generator preferences `state/reports/*.json` as the source. Style contract from v1.11 (banned vocabulary list) applied to decision bodies; violations flagged in the SVG via a small red asterisk on the offending blurb.

**Changes:**

- `extract.mjs`: precedence order documented and implemented. Source field on each decision shows which path produced the body.

- New audit step: every extracted body checked against the v1.11 banned-vocabulary list. Violations annotated in the SVG with a small red asterisk + tooltip ("vocabulary check: contains banned term 'Sev 1'").

- Backfill pass: extractor produces a `corpus-blurb-coverage.json` report showing per-build, per-decision whether the body came from a v1.11 report or from Path-B synthesis. Lets us track corpus-wide migration to native v1.11 sourcing as more builds run.

**Done when:** any post-v1.11 build's flowchart pulls bodies natively from `state/reports/`. Pre-v1.11 builds continue rendering with Path-B synthesis; corpus coverage report shows the mix.

**LoC estimate:** ~150.

## Cumulative scope

- Phase 1: ~250-300 LoC (extract.mjs)
- Phase 2: ~200-250 LoC (render.mjs)
- Phase 3: ~230 LoC (layout + render)
- Phase 4: ~200 LoC (all 3 modules)
- Phase 5: ~150 LoC
- Phase 6: ~120 LoC
- Phase 7: ~100 LoC
- Phase 8: ~150 LoC

**Total: ~1400-1500 LoC** added to the generator suite (currently ~1156 LoC). Final size ~2600 LoC across 4-5 modules.

Validation target after each phase: regenerate earthquake-map's flowchart and visually compare against Detail Full at increasing fidelity. The 7 ratified pre-v1.11 corpus entries become the test set for Path-B synthesis quality.

## Ordering and shippability

Phases 1-2 are foundational and must ship in that order. Phases 3-7 can ship in any order once phases 1-2 are landed; each adds visual richness independently. Phase 8 lands whenever the first post-v1.11 build ratifies.

**Recommended early-win sequence:**

1. Phase 1 (extractor enrichment) — unlocks every downstream phase.
2. Phase 2 (preamble + per-decision body rendering) — biggest single visual improvement; brings the SVG roughly halfway to Detail Full at a glance.
3. Phase 4 (section sub-boxes) — second-biggest visual improvement.
4. Phase 6 (traversal indicators) — addresses the user's specific call-out of the escalation flow ("ideally we will be able to fully visualize the integrator/critic exception raising process").
5. Phase 3, 5, 7 — polish.
6. Phase 8 — automatic switchover once builds emit v1.11 reports.

## Out of scope for this plan

- **Live narrative renderer.** That's Codex v0.16 against the v1.11 substrate, separate workstream. The bridge plan here is post-completion only — at wrap-up time, all data is available statically.
- **Per-build interactivity in the static SVG.** No click-to-expand sub-panels, no tooltips beyond the rendered text. Interactive richness lives in the Codex dashboard embed (separate proposal at `codex/docs/maintenance-initiated/decision-flowchart-dashboard-embed.md`), not in the static SVG.
- **Visual polish issues from v0.1.** The existing known bugs (Arbiter not rendered as box, overlapping labels at midpoints, doubled highway segments) are addressed inline during Phase 3 and Phase 6 work — not called out separately.

## Open questions for confirmation

None blocking. Implementation can proceed when you greenlight a starting phase.

Two soft questions worth surfacing before Phase 1 lands:

- **Body length budget.** Detail Full's per-decision bodies run 2-3 lines (~30-60 words). Should the generator enforce a hard cap (truncate longer blurbs with "…" + tooltip-equivalent) or wrap longer bodies and let the box grow? Recommend the latter for fidelity; the former for canvas budget. Default to "wrap and grow box height" unless the height delta becomes painful.

- **Multiple Builders per section.** Some sections have 2-3 Builders (e.g., earthquake-map S2 has builder-2a + builder-2-vendor). Should each Builder get its own badge or should they collapse into one badge per section with a "(2)" count? Detail Full shows individual badges — recommend matching that.
