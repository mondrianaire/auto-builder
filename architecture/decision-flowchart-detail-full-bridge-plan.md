# Decision-Flowchart "Detail Full" Bridge Plan

**Filed:** 2026-05-16 by Maintenance after user surfaced three reference flowcharts at `example flowcharts/`.
**Amended 2026-05-16 (same session):** scope expanded from "Detail Full SVG parity" to **exhaustive verbatim enumeration**, per user direction. See § "Exhaustive enumeration amendment" below.
**Status:** PLAN — phased roadmap to bring the generator from v0.1 (low-detail) to the exhaustive post-build target.
**Scope:** post-completion rendering only. Live rendering is a separate workstream owned by Codex v0.16 (live narrative renderer) against the v1.11 substrate. The Meta-architecture flowchart (build-agnostic, explanatory) is a third artifact — see `architecture/meta-architecture-flowchart-spec.md`.

## The three-flowchart family

This bridge plan covers the **second** of three flowchart artifacts:

| Artifact | Audience | Mode | Spec doc |
|---|---|---|---|
| **Live build-view** | The user who wrote the prompt; high-level goal-oriented progress | Live — updates as roles complete | Codex's `live-build-visualization-proposal.md` (v0.16) |
| **Post-build detail flowchart** *(this plan)* | The user reviewing a finished build; corpus researchers | Static — emitted at wrap-up | this doc |
| **Meta-architecture flowchart** | Outsiders learning AutoBuilder; internal docs anchor | Static — versioned with architecture | `meta-architecture-flowchart-spec.md` |

The Live view summarizes; the Post-build view enumerates exhaustively; the Meta view models the system. Different audiences, different purposes, different content density.

## Exhaustive enumeration amendment (2026-05-16)

User direction: *"the final post-build flow chart should be as detailed as the final-flowchart example provided. Instead of logged 20 assumptions, list them. Instead of marking 14 items out of scope, list them. Instead of simply indicating the number of overseer-sections, create containers for every role involved in the section and provide their purposes…"*

This pushes the target past the Detail Full SVG reference. Detail Full still summarizes some content as counts ("Logged 12 assumptions (A1–A12)" without listing the assumptions; "Raised 22 flags (1 medium/high)" without listing the flags). The amended target is **verbatim enumeration** wherever the underlying substrate provides per-item content.

Specific changes to the post-build flowchart's content rules:

- **Assumptions.** List every A1…AN entry with its one-line plain-language content. Earthquake-map's 12 assumptions become 12 blurb lines under D-DSC-2, not a count summary.
- **Out-of-scope items.** List every OOS entry verbatim with one-line plain-language framing under D-DSC-3 or its rendered equivalent.
- **Inflection points.** List every IP1…IPN with default branch + reason (already partly in Detail Full; make it exhaustive).
- **Proper nouns / demotions.** List every proper noun checked, its `verification_status`, and the demotion outcome if any.
- **Per-section role instances.** For each section, render a sub-container with *every dispatched role instance* (Overseer + every Builder + every Vendor-builder + Researcher if dispatched). Each role instance gets its own labeled badge AND a one-line description of what it did. Detail Full does this partially (3 sections rendered with badges); the amended target does it for every section, including S4 (edge-case testing) and any escalation-spawned sections.
- **Per-section purposes.** Every role instance per section explains its purpose (build-step-specific, drawn from its `state/reports/...json` blurb where available, or from `dispatch-log.jsonl` + section context where not). Not just "Builder-2a" — but "Builder-2a: wrote map.js (mount, markers, magnitude encoding)."
- **Critic flags.** List every flag with severity + plain-language summary. 22 flags → 22 blurb lines under D-CRT-N (or wrapped to multiple D-CRT-1 through D-CRT-N entries).
- **CV first-contact + assumption-check results.** List every first-contact requirement (FC.1…FC.N) and every assumption check (A1…AN re-verified) with pass/fail + brief evidence note.
- **Run-report architecture findings.** Every finding listed (A1…AN) as an italic gray annotation in the relevant role's box, with brief plain-language framing.

The implication for layout: rows grow vertically as more content lands. The post-build canvas is allowed to grow tall — corpus researchers and the build's user are reading at their own pace, scrolling is fine. The Live view stays summary-level; the Post-build stretches.

### Performance implication

A build with 12 assumptions, 14 OOS items, 6 IPs, 22 Critic flags, 8 first-contact requirements, 12 assumption-checks, and 4 sections with ~10 role-instances total produces roughly 88 decision blurbs. At ~30 words average per blurb body that's ~2640 words of plain-language content per flowchart. SVG file size lands roughly 200-300KB per build (vs. Detail Full's 54KB which summarizes). Acceptable for static rendering; the file size is one-time at wrap-up and never re-rendered.

### Source-precedence rules under exhaustive enumeration

- **v1.11 Completion Reports** (Path A) give plain-language blurbs natively for the role-level decisions. They do NOT enumerate every assumption inside Discovery's single "what choices did you make" blurb — that blurb summarizes. So for post-build enumeration, the extractor reads BOTH the report (for the natural-language framing) AND the underlying Cat-2 source (for the verbatim assumption list).
- **Cat-2 substrate** (Path B) provides the verbatim enumeration: `ledger-v1.json:assumption_ledger[]`, `ledger-v1.json:out_of_scope[]`, `ledger-v1.json:proper_nouns[]`, `dispatch-log.jsonl` for role-instance enumeration, `audit/flags.jsonl` for Critic flags, `verification/report.json:first_contact_results[]` etc.
- The extractor's job is to **join** these two sources: the report's blurb becomes the section header / parent decision label; the Cat-2 verbatim list becomes the sub-bullets enumerated underneath. Example for D-DSC-2:

  ```
  D-DSC-2: What choices did you make on their behalf?
  [report blurb verbatim — "Three things you didn't specify, with my defaults: …"]

  Full assumption list:
   A1  Visualization is the primary interaction (not a report).
   A2  Map as primary surface (not a table).
   A3  Magnitude is the primary encoding axis.
   …
   A12 General-user audience (not a researcher specialist).
  ```

This means the extractor does both — natural-language framing AND verbatim enumeration, joined in a single decision entry with hierarchical rendering.

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

### Phase 1 — Per-decision body extraction + verbatim enumeration (foundational)

**Goal:** every `decision` object emitted by the extractor carries a `body` field with plain-language text AND, where applicable, an `enumeration` field listing every individual item the decision references (assumptions, OOS items, IPs, proper nouns, flags, etc.).

**Changes:**

- `architecture/scripts/decision-flowchart-extract.mjs`: each extractor function (`extractDiscoveryDecisions`, `extractTDDecisions`, etc.) gains:
  1. **A `loadReports()` step** that checks `runs/{slug}/state/reports/` for matching role reports. If found, maps blurb questions → D-XXX-N entries per the table above and uses `answer` text as the `body`. If absent, falls back to a per-role `synthesize{Role}Body()` function that produces a passable body from Cat-2 sources.
  2. **An `enumerate{Decision}()` step** that pulls verbatim sub-items from the appropriate Cat-2 source and attaches them as an `enumeration` array on the decision. The enumeration is the verbatim list the user wants surfaced.

- New shape for each decision:
  ```js
  {
    id: "D-DSC-2",
    label: "What choices did you make on their behalf?",
    body: "Three things you didn't specify, with my defaults: ...",  // from blurb or synthesis
    enumeration: [
      { id: "A1", text: "Visualization is the primary interaction (not a report)." },
      { id: "A2", text: "Map as primary surface (not a table)." },
      // ...
    ],
    role: "discovery-initial",
    importance: "high",
    sources: ["state/reports/discovery-initial-v1.json", "decisions/discovery/ledger-v1.json"]
  }
  ```

- **Enumeration sources** per decision type:
  - D-DSC-2 (assumptions) — `ledger-v1.assumption_ledger[]`. Each entry's `text` field is its plain-language statement; pre-v1.11 ledgers may have just an abbreviated form (TD's coverage assertions reference each).
  - D-DSC-3 (out-of-scope) — `ledger-v1.out_of_scope[]`. Verbatim.
  - D-DSC-IP (inflection points) — `ledger-v1.inflection_points[]`. Each entry: `{ id, label, default_branch, reason }`.
  - D-DSC-PN (proper nouns) — `ledger-v1.proper_nouns[]`. Each entry: `{ id, surface, role, verification_status }`.
  - D-TD-SEC (sections) — `sections-v1.json:sections[]`. Each: `{ id, name, charter_summary, depends_on[] }`.
  - D-TD-CON (contracts) — `contracts/original/*` filenames + each contract's `interface` summary.
  - D-CRD-WAVE (waves) — derived from `dag.json` topological levels + `dispatch-log.jsonl` event grouping.
  - D-SEC-{section}-AGENTS — `dispatch-log.jsonl` filtered by section; each entry: `{ agent_id, role, dispatched_at, completed_at, brief_purpose }`. The `brief_purpose` comes from the agent's Completion Report (Path A) or a synthesis from the dispatch briefing (Path B).
  - D-CRT-FLAGS — `audit/flags.jsonl`. Each entry: `{ severity, check_name, summary }`. Summary translated to plain language.
  - D-CV-FC (first-contact) — `output/verification/report.json:first_contact_results[]`. Each: `{ requirement_id, description, result, details }`.
  - D-CV-AC (assumption checks) — `verification/report.json:assumption_checks[]`. Each: `{ id, verified, evidence }`.
  - D-CV-PNV (prompt-named verb) — `verification/report.json:prompt_named_verb_result`. Single entry but explicitly enumerated.
  - D-RUN-FINDINGS (run-report architecture findings) — parsed from `run-report.md` Architecture-findings section. Each: `{ id, title, body }`.

- Synthesis templates per role (Path B fallback) for the `body` field. Examples:
  - D-DSC-1 body: "Reframed prompt as ‹first sentence of `ledger-v1.restatement`›."
  - D-DSC-2 body: "Recorded N assumptions about how this should work. Defaulting to the simplest reasonable interpretation where you didn't specify."
  - D-CRD-1 body: "Decided to run this build in ‹value› mode for the N pieces."
  - D-CRT-1 body: "Did N audit checks; found M concerns worth flagging (severity ‹highest seen›)."

- **Style contract** (anticipates Phase 8): bodies should already be styled toward user-facing language during synthesis. Banned vocabulary (IP, dispatch, section in structural sense, verdict, Sev N, Principle X) screened in Phase 8.

- New unit test target: validate every extracted decision has both `label` and `body` populated; decisions of types that should enumerate have non-empty `enumeration[]`.

**Done when:** running the extractor on earthquake-map produces an extracted graph where:
- Every decision has a non-empty `body`.
- D-DSC-2 has 12 enumeration entries (all 12 assumptions).
- D-DSC-3 has the full OOS list.
- D-CRT-1 has 22 enumeration entries (all 22 Critic flags).
- D-SEC-{S1, S2, S3, S4} each list every dispatched agent with brief purpose.

SVG output still uses the old renderer for now (labels only); only the data layer is enriched.

**LoC estimate:** ~400-500 added to extract.mjs (revised up from 250-300 to account for enumeration extractors).

### Phase 2 — Preamble + role subtitle + per-decision body + enumeration rendering

**Goal:** Detail-Full-style preamble and per-role italic descriptions; decisions render with body text AND verbatim enumeration as nested bullets below the label.

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

- Each decision renders hierarchically:
  - Bold label line (e.g., `D-DSC-2: What choices did you make on their behalf?`)
  - Body text wrapped at the agent box width (12px regular, role-tinted color on label).
  - **If `enumeration[]` is non-empty:** indented bulleted list below the body. Each enumeration entry: `[A1]` ID prefix in monospace + plain-language text. Indent ~18px, smaller font (11px) than body. Long lists may wrap; box height grows.

  Example rendered for D-DSC-2:

  ```
  D-DSC-2: What choices did you make on their behalf?
  Three things you didn't specify, with my defaults: (1) snapshot, not live updates;
  (2) past 24 hours; (3) no filters.

    A1   Visualization is the primary interaction (not a report).
    A2   Map as primary surface (not a table).
    A3   Magnitude is the primary encoding axis.
    A4   Single-user, no auth required.
    ...
    A12  General-user audience (not a researcher specialist).
  ```

- **Box height now auto-grows** based on body + enumeration line count. Layout engine computes height-per-decision = body-wrap-height + enumeration-line-count × 13px. Agent boxes sum these and add padding.

**Done when:** SVG output for earthquake-map renders the Discovery section with D-DSC-1 (prompt body), D-DSC-2 (12 assumptions enumerated), D-DSC-3 (OOS enumerated), D-DSC-IP (every IP enumerated with default + reason). Visual register matches Detail Full but content is denser. Canvas height grows accordingly.

**LoC estimate:** ~300-350 added to render.mjs (revised up from 200-250 to account for hierarchical decision rendering with auto-grow).

### Phase 3 — Multi-mode agent wrapper boxes

**Goal:** TD (initial + impact) and Coordinator (initial + re-engaged) render as single bordered wrapper boxes with internal vertical dividers between modes.

**Changes:**

- `decision-flowchart-layout.mjs`: detect when a build has both `td-initial` AND `td-impact` reports/decisions. Compute a single wrapper rect that encompasses both, with an internal vertical divider at the boundary.

- Render the wrapper with a top-left label badge ("TD AGENT · 2 MODES" in deep navy) and a top-right "↻ REVISITED esc-{nnn}" badge in red when the impact mode was escalation-triggered.

- Same pattern for Coordinator with red "COORDINATOR AGENT · 2 MODES" wrapper when re-engaged.

- Layout widens to accommodate the impact-mode sub-panel on the right.

**Done when:** earthquake-map renders TD initial + impact as a single bordered box matching Detail Full's structure. Coordinator wrapper similar.

**LoC estimate:** ~150 added to layout.mjs, ~80 added to render.mjs.

### Phase 4 — Expanded section sub-boxes with per-role-instance containers

**Goal:** every section renders as a container; **every role instance inside that section gets its own sub-container** with title + purpose + atomic-step-evidence (what it actually did during this section). Detail Full shows badges; the amended target shows per-role-instance containers, mirroring the user direction *"create containers for every role involved in the section and provide their purposes."*

**Changes:**

- `extract.mjs`: per-section enrichment now produces nested structures:
  ```js
  {
    section_id: "section-1",
    name: "Data Fetcher",
    description: "isolates HTTP/GeoJSON parsing",
    role_instances: [
      {
        role: "Overseer",
        instance_id: "overseer-section-1",
        purpose: "Decomposed Data Fetcher into 1 builder task, dispatched, verified output against contract",
        outcome: "verified",  // from Overseer outcome blurb
        evidence_bullets: ["dispatched Builder-1a", "verified output matches contract", "marked section complete"]
      },
      {
        role: "Builder",
        instance_id: "builder-1a",
        purpose: "Wrote the part that fetches earthquake data from USGS and parses it into events",
        evidence_bullets: ["fetch(USGS all_day.geojson)", "parse FeatureCollection → events[]", "exposes loadEvents() promise"],
        sources: ["state/reports/builder-section-1-builder-1a-v1.json", "output/builders/section-1/builder-1a/metadata.json"]
      },
      // ... every role instance, including any Researcher dispatched mid-section
    ]
  }
  ```

  Pull `purpose` from Builder Completion Reports (Path A) or from `dispatch-log.jsonl` briefings + Builder `metadata.json` (Path B). Pull `evidence_bullets` from contract assertions + post-build verification of what the file actually exposes.

- `layout.mjs`: section container is now a multi-row grid: header row (title + description) + N rows for role-instance sub-containers. Section container height grows with role-instance count. When a section has 3+ role instances (e.g., S2 = Overseer + Builder-2a + Builder-2-vendor), container stays vertical-stacked; layout engine widens horizontally to allow side-by-side instances if canvas budget allows.

- `render.mjs`: each section container renders:
  - Section header: bold title + italic subtitle
  - For each role instance, a sub-container with:
    - Color-coded role badge (Overseer green / Builder orange / Researcher purple / Vendor-builder olive / Critic-scheduled red) — same color palette across the whole flowchart
    - Instance ID (e.g., "Builder-1a") in bold next to badge
    - Purpose line (1-2 sentences plain language)
    - Evidence bullets (2-4 items)
  - Section footer: "→ Verified by Overseer-N; passed contract checks before next wave" (italic green) sourced from Overseer outcome blurb.

- **Edge case — escalation-spawned section role instances.** If a Researcher was dispatched mid-section to investigate an issue, that Researcher instance gets its own sub-container in the section, with the escalation context as part of its purpose ("Investigated whether USGS endpoint shape matches Discovery's assumption; returned canonical evidence confirming GeoJSON FeatureCollection schema").

**Done when:** earthquake-map's flowchart renders all 4 sections with full per-role-instance breakdown. S1 shows Overseer-1 + Builder-1a. S2 shows Overseer-2 + Builder-2a + Builder-2-vendor as three distinct containers. S3 shows Overseer-3 + Builder-3a. S4 (edge-case testing) shows Overseer-4 + Builder-4a, distinct from main sections row.

**LoC estimate:** ~350 across all three modules (revised up from 200 to account for nested role-instance containers).

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

## Cumulative scope (revised after exhaustive-enumeration amendment)

- Phase 1: ~400-500 LoC (extract.mjs + enumeration extractors)
- Phase 2: ~300-350 LoC (render.mjs + hierarchical decision rendering)
- Phase 3: ~230 LoC (layout + render)
- Phase 4: ~350 LoC (per-role-instance containers across all 3 modules)
- Phase 5: ~150 LoC
- Phase 6: ~120 LoC
- Phase 7: ~100 LoC
- Phase 8: ~150 LoC

**Total: ~1800-1950 LoC** added to the generator suite (currently ~1156 LoC). Final size ~3000-3100 LoC across 4-5 modules.

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

- **Body length budget.** Detail Full's per-decision bodies run 2-3 lines (~30-60 words). Under exhaustive enumeration, bodies + enumerations push the per-decision content to 10+ lines. Recommend "wrap and grow box height" without a cap — the post-build view is for considered reading, not glanceability. The Live build-view (Codex v0.16) is where length budgets matter.

- **Multiple Builders per section.** Resolved by Phase 4 amendment: every role instance gets its own sub-container, not a count-collapsed badge. earthquake-map S2 renders three containers (Overseer-2, Builder-2a, Builder-2-vendor) with individual purposes and evidence bullets.

- **Footprint expectation.** With exhaustive enumeration a typical 4-section build will produce a flowchart on the order of 200-300KB SVG, roughly 6000x8000 canvas. Acceptable for static rendering; the file is produced once at wrap-up and read at the user's pace. The Codex dashboard embed (separate proposal) should put this inside a scrollable container, not a fixed-viewport iframe.
