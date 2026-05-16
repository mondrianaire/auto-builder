# Decision-flowchart wrap-up artifact (proposal)

**Status:** PROPOSAL — awaiting user review before implementation.

**Filed:** 2026-05-16 by Maintenance, per user directive: *"previously we talked about adding a simplified view of this structure to the live view that codex is working on. I also want to incorporate a much more technical and detailed version (similar to the linked one) as part of the wrap up procedure."*

**Reference artifact:** the user-supplied `decision-flowchart.svg` + `decision-flowchart.html` for earthquake-map (uploaded 2026-05-16; see `runs/earthquake-map/output/final/` after this lands — proposed home is also in that directory once shipped as a wrap-up artifact).

## What this is

A per-build, statically-rendered SVG decision flowchart, generated at wrap-up time, that visualizes the build's decision history, agent invocation timeline, and any escalations that occurred. Lives in the corpus at `runs/{slug}/decision-flowchart.html` alongside `PROJECT-OVERVIEW.md`.

It is the **frozen, archival counterpart** to Codex's live-build-visualization (which animates as a build progresses). Both consume the same underlying corpus data; the live view is the "watch it happen" experience and this is the "study what happened" experience.

## Why it matters

The earthquake-map manual SVG is a striking artifact. A fresh reader looking at it can see, in one image:
- Which agents got invoked, in what order, across how many phases
- Where the build hit an escalation and how the system routed it back through the pipeline
- Which roles were "revisited" by escalations vs ran once and finished

That's the kind of orientation that no amount of `run-report.md` prose can substitute for. Making it a corpus-standard artifact means every build's lifecycle is legible at a glance, not just the ones we happen to hand-draw.

## Visual layout (matching reference)

**Top of canvas:**
- Title bar: `{slug} Run — Decision Flowchart`
- Three stat cards: DECISIONS / AGENTS DEPLOYED / ESCALATIONS, each with a colored top accent (blue / purple / red)

**Main body (vertical flow, top to bottom):**
- User Prompt → Orchestrator node at top
- Phase bands as horizontal separators with phase name labels in gray on the left margin (PHASE 1 — DISCOVERY, PHASE 2 — TECHNICAL DISCOVERY, PHASE 3 — BUILD, PHASE 4 — INTEGRATION, PHASE 5 — VERIFICATION, PHASE 6 — DELIVERY)
- For each agent invoked in a phase: a labeled rounded-rect box with the agent name in a top header strip, the decisions listed inside as text rows with their decision IDs in bold (`D-{AGENT}-{N}`)
- For agents that got revisited by an escalation: an `↻ REVISITED esc-{N}` badge in the top-right of the box, plus an internal vertical divider separating initial-mode (left) from impact-mode/re-engaged (right) decisions
- For escalations: a thick red vertical "highway" running down the right margin, with text labels along its path describing the routing (e.g., "esc-001 raised back to TD agent (impact mode)" → "delta plan v2" → "delta plan traverses pipeline..." → "delta plan lands at Cycle 2 (recruited by Coordinator)")

**Stylistic:**
- Default decision color: dark blue (#0a3a6a)
- Escalation-related decision color: dark red (#5a1a1a), with the triggering decision in bright red (#c43c3c)
- "Unaffected" indicators on the escalation highway path: dark green (#0a5a0a)
- Phase band labels: medium gray (#888)
- Stat card numbers: large bold black (#1a1a1a) with smaller letter-spaced labels (#666)

**HTML wrapper:**
- Fixed-top toolbar (44px height): title, hint text ("scroll to zoom · click-drag to pan"), Reset / + / − buttons, zoom level indicator
- Pannable + zoomable stage below, holding the SVG
- Matches the uploaded reference HTML's interaction model verbatim — that's what the user wants

## Data sources

| Source | Use |
|---|---|
| `runs/{slug}/decisions/discovery/ledger-v1.json` | Discovery's decision list (restatement, assumptions, IPs surfaced) |
| `runs/{slug}/decisions/discovery/ledger-v2.json` (if present) | Discovery re-derivation triggered by an escalation |
| `runs/{slug}/decisions/technical-discovery/sections-v1.json` | TD's section breakdown + IP resolutions |
| `runs/{slug}/decisions/technical-discovery/sections-v2.json` (if present) | TD re-derivation |
| `runs/{slug}/decisions/technical-discovery/impact-analysis-v{N}.json` (if present) | TD impact-mode work for esc-{N} |
| `runs/{slug}/decisions/coordinator/*.json` (if present) | Coordinator's dispatch decisions |
| `runs/{slug}/decisions/editor/review-v1.json` (if present, v1.9+ builds) | Editor's review decisions |
| `runs/{slug}/state/escalations/queue/esc-*.json` | Escalation records (which agent raised, what trigger) |
| `runs/{slug}/state/escalations/routed/esc-*-routing.json` | How the Arbiter routed each escalation |
| `runs/{slug}/state/escalations/routed/esc-*-resolution.json` | Resolution outcome |
| `runs/{slug}/audit/{agent}/*.json` | Agent invocation timeline (for the AGENTS DEPLOYED stat) |
| `runs/{slug}/output/verification/report.json` | Verification verdict (final state in flowchart) |
| `runs/{slug}/run-report.md` | Fallback narrative source (not parsed; just cross-referenced) |

## Generator architecture

`architecture/scripts/decision-flowchart.mjs` (new file).

Pipeline:
1. **Discover all decision files** under `runs/{slug}/decisions/**` (glob).
2. **Per-agent decision extraction.** For each file, dispatch by role-name in path:
   - Discovery: extract restatement + assumption count + IP count → `D-DSC-1`, `D-DSC-2`, `D-DSC-3` summary rows
   - TD: extract section count + IP resolutions → `D-TD-1`..`D-TD-N` rows
   - Coordinator: extract dispatch decisions, DAG construction, inline deviations → `D-CRD-1`..N
   - Editor: extract review decisions → `D-EDT-1`..N
3. **Escalation graph extraction.** For each `state/escalations/queue/esc-*.json`:
   - Read the raising agent + decision ID that triggered it
   - Read the routing decision from `routed/esc-*-routing.json`
   - Read the resolution from `routed/esc-*-resolution.json`
   - Mark the triggering decision in red on the originating agent's box
   - Mark all agents in the routing chain as "↻ REVISITED esc-{N}"
4. **Layout computation.**
   - Single column, top to bottom
   - Each phase band's height is computed from the agent boxes inside it + per-decision row count
   - Escalation highways routed on the right margin (x = 2000+ region)
   - Auto-sizing: SVG viewBox grows as build complexity demands
5. **Render.** Write SVG to `runs/{slug}/decision-flowchart.svg` (raw asset), then wrap in the toolbar+pan+zoom HTML at `runs/{slug}/decision-flowchart.html`.
6. **Stats.** Compute totals (decisions, agents deployed, escalations) for the top-of-canvas cards.

## Where it goes

`runs/{slug}/decision-flowchart.html` — alongside `PROJECT-OVERVIEW.md`, in Cat 1 (project metadata) territory.

The HTML file is self-contained (SVG inlined, toolbar JS inlined, no external deps). Open directly in any modern browser.

Optionally, the dashboard's per-build detail panel can iframe-embed it at the bottom of the panel, giving the "study what happened" view alongside the run-report and other corpus pointers. That's a Codex-side affordance, separate from the generator itself.

## Integration with wrap-up routine

`architecture/scripts/wrap-up-build.mjs` gets one additional step after writing the sentinel:

```javascript
// Generate decision flowchart artifact
try {
  await import('./decision-flowchart.mjs').then(m => m.generate(slug, runDir, REPO_ROOT));
  artifacts.push('decision-flowchart.html');
} catch (e) {
  console.warn(`[wrap-up] decision-flowchart generation failed (non-fatal): ${e.message}`);
}
```

Non-fatal: if flowchart generation fails (e.g., due to malformed corpus data on an older build), wrap-up still produces `PROJECT-OVERVIEW.md` + sentinel. The flowchart artifact joins the sentinel's `artifacts[]` list when produced.

The PROJECT-OVERVIEW.md template gets one new section pointing at the flowchart:

```markdown
## See also

- [`decision-flowchart.html`](./decision-flowchart.html) — visual decision timeline of this build's agent invocations, decisions, and any escalations.
```

## Locked-in design decisions (user-approved 2026-05-16 via AskUserQuestion polls)

| # | Question | Decision | Implication |
|---|---|---|---|
| 1 | Per-decision summary curation | **1c — hybrid** | Generator ships with mechanical-from-JSON extractors. When `role-completion-report-amendment` (v1.11) lands, swap each role's extractor to read the role's `Completion Report` blurb. Layout unchanged; just polish upgrade. |
| 2 | Escalation highway routing | **2b — Manhattan auto-routed from day one** | The generator does proper path-planning: red lines bend to enter agent boxes from the right side and exit from below, threading through the canvas like the reference SVG. Expect ~150-200 LoC of routing logic. Multi-escalation builds need explicit overlap-avoidance. |
| 3 | Dashboard iframe embed | **Yes — Codex should embed in per-build detail panel** | Filed as a Maintenance-initiated Codex item (see `Cross-references` below). Not gated on this generator landing — they can stub it pending the artifact. |
| 4a | Canvas width when no escalations | **Auto-narrow** | Saves whitespace on clean PASS builds. Reference width is used only when escalations exist. |
| 4b | Missing role data (pre-v1.9 builds lack `decisions/editor/`) | **Silent skip** | No warning. The flowchart just omits the missing-role swimlane. |

## Implementation plan

Status: **all design questions locked; ready to code.**

Estimated cost: ~500-700 LoC total (the Manhattan routing pushes the upper bound from the original 400-500 estimate).

Suggested sequencing:

1. **Pass 1 — Data extraction.** `architecture/scripts/decision-flowchart-extract.mjs` takes a slug, returns a normalized `BuildGraph`: `{ phases, agents, decisions, escalations }`. No SVG yet. Validate by JSON-dumping the graph for the three current builds.
2. **Pass 2 — Layout computation.** `architecture/scripts/decision-flowchart-layout.mjs` takes `BuildGraph`, computes `{ canvasWidth, canvasHeight, agentRects, decisionRows, highwayPaths }`. Manhattan routing happens here; output as ordered waypoint lists per escalation.
3. **Pass 3 — SVG emission.** `architecture/scripts/decision-flowchart-render.mjs` takes layout output, emits SVG markup matching the reference's visual style.
4. **Pass 4 — HTML wrap.** Toolbar + pan/zoom wrapper. CSS + JS copied verbatim from the user-uploaded reference HTML.
5. **Pass 5 — Orchestration entry point.** `architecture/scripts/decision-flowchart.mjs` imports passes 1–4 and produces `runs/{slug}/decision-flowchart.html`.
6. **Pass 6 — Integration.** Hook into `wrap-up-build.mjs` after the sentinel write; non-fatal failure.
7. **Pass 7 — Validation.** Run against all three current builds; compare earthquake-map output side-by-side with the user's hand-drawn reference; iterate routing until visually plausible.
8. **Pass 8 — Back-fill.** Run via `wrap-up-build.bat` for all already-ratified builds.

Manhattan routing implementation notes (for future me or whoever picks this up):

- Treat each escalation as an ordered sequence of waypoints: `{agent, side, edge}` triples specifying where on each agent box the highway touches.
- From waypoint N to N+1, prefer a vertical-then-horizontal-then-vertical L-shape unless both waypoints are on the same side, in which case use a straight segment.
- Padding: keep at least 30px clearance from agent box edges on the right margin.
- Multi-escalation collision: stack escalation channels horizontally (esc-001 at x=2030, esc-002 at x=2080, etc.). Labels go in each channel's own vertical strip.
- Failure modes to watch: paths crossing on multi-escalation builds (mitigated by per-escalation lanes); labels colliding with agent boxes (mitigated by per-escalation label strips); arrow heads pointing into agent boxes (use small offsets at endpoints).

## Original open design questions (now resolved — retained for context)

1. **Per-decision summary curation.** The earthquake-map manual SVG has hand-curated decision summaries like `D-DSC-3: Surfaced 3 inflection points.` A mechanical generator can produce `D-DSC-3: IP1, IP2, IP3` from the ledger but the prose flair is harder. **Options:**
   - **(1a) Mechanical-only.** Generator just lists items from the JSON; user sees raw structured data. Less polished but ships today.
   - **(1b) Wait for role-completion-reports.** The pending v1.11 amendment introduces structured per-role blurbs that the generator can consume directly. Polished output but gates on v1.11 landing first.
   - **(1c) Hybrid: ship 1a now, upgrade to 1b when v1.11 lands.** Most pragmatic. The generator's per-role extractor functions get swapped from "read JSON, summarize" to "read completion-report blurb, render" with no other layout changes.

   **Recommendation:** 1c.

2. **Escalation highway routing complexity.** The earthquake-map flowchart has a beautifully-routed red highway with bends and labels. Auto-routing this is a graph-drawing problem. **Options:**
   - **(2a) Simple straight vertical.** Right margin, one straight red line per escalation, with text labels at vertical waypoints. Less elegant but correct.
   - **(2b) Manhattan routing.** Right-angled bends to wrap around agent boxes. Looks like the reference; needs path-planning logic.

   **Recommendation:** 2a for v0.1; revisit 2b for v0.2 only if the v0.1 version looks ugly on multi-escalation builds.

3. **Handling builds with no escalations.** Most clean PASS builds have zero escalations. The "1 ESCALATION" stat card disappears; the right-margin highway region is empty. Should the canvas auto-narrow, or stay reference-width with blank right column? **Recommendation:** auto-narrow when escalation count = 0 (saves whitespace; the layout doesn't need the right column).

4. **Builds that pre-date a role (e.g., Editor introduced in v1.9).** A pre-v1.9 build won't have `decisions/editor/`. The generator should skip missing roles gracefully. **Recommendation:** yes, skip; no warning needed.

5. **Where to embed in the dashboard (optional).** The wrap-up artifact is self-contained at `runs/{slug}/decision-flowchart.html`. Should Codex add an iframe-embed in the build's detail panel? **Recommendation:** Codex's call. Separate from this proposal.

## Cross-references

- Codex's `live-build-visualization-proposal.md` — the live, animating counterpart. v0.16+ direction-corrected to be telos-anchored real-world-speak per user feedback after this exact decision-flowchart was surfaced as the visual reference. This proposal formalizes the static-wrap-up half of the same vision.
- `codex/docs/maintenance-initiated/decision-flowchart-dashboard-embed.md` — Maintenance-initiated note to Codex about dashboard iframe embedding (filed alongside this proposal per user decision #3 above).
- `role-completion-report-amendment.md` (v1.11 candidate) — gates the v1.11 upgrade path to polished blurbs (decision #1's 1c → polished swap).
- `architecture/build-lifecycle.md` § Promotion gates — defines the wrap-up gate that this artifact extends.
