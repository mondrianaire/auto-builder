# Codex — the historian-and-monitor layer for Auto Builder

The Codex sits *next to* the architecture, not inside it. Where `architecture/`
describes the system Auto Builder uses to build, and `runs/` records what
happened on each build, the Codex is the **roll-up, comparison, and
observability surface** across runs. It documents the history of the building
of Auto Builder itself.

This first cut (`v0.1`) is a static dashboard backed by a Node aggregator that
walks `runs/` and emits structured JSON. No build step. Opens locally over
`file://` (or a one-line `python -m http.server` if your browser is strict about
local fetch). Future iterations grow toward a live monitor — see Roadmap.

## Why a Codex (separate from `runs/{slug}/run-report.md`)

Each run-report is the in-the-moment reflection on *one build*. It is rich,
prose-heavy, and tied to its substrate. What the project has been missing is
**the cross-run view**:

- Which architecture versions improved which failure modes?
- Are we honoring Principles A through H more consistently as `v1.x` advances?
- Is the deliverability tier discipline (v1.9 Tier 2) catching first-contact
  failures it was designed to catch?
- When did each role (Editor, Re-Verification, Demotion Mode) first appear, and
  what triggered it?

A Codex answers these. The unit of analysis is no longer the build — it is the
*architecture's behavior over the corpus of builds*.

## Extrapolating the rating system

The current `runs/{slug}/run-report.md` and `verification/report.json` files
already encode a richer rating than Pass/Fail — the Codex makes that explicit
and grades it consistently. The current system is essentially:

```
verdict ∈ { pass | pass_with_concerns | pass_with_recommendations | fail | unknown }
```

…with the implicit signal that a `pass` whose Uncertainty Manifest has open
items is qualitatively different from a `pass` with none. The Codex extends this
into a **multi-dimensional rating** that any build — game, web app, plugin,
CLI, document tool, anything — fits within:

### Dimension 1 — Telos Fidelity (Did we understand?)

Did Discovery's `telos` capture what the user actually meant? Did Editor's
prompt-fidelity audit pass without `route_to_discovery`? Did proper nouns
verify, and if not did Demotion Mode close cleanly?

Scoring tiers:
- **strong** — Editor `pass`; no demotions; all proper nouns `verified`.
- **adequate** — Editor `pass_with_recommendations`; demotions present but
  guardrails passed cleanly; Uncertainty Manifest captures any residual.
- **weak** — Editor `route_to_*` triggered mid-build OR a proper noun ended
  `unreachable` without Demotion Mode handling it OR a Tier 2 first-contact
  requirement is missing.
- **violated** — silent training-data fallback (Principle F) or self-referential
  verification (Principle H) escaped to delivery.

### Dimension 2 — Deliverability (Can the user use it?)

The v1.9 Tier 1/2/3 framework, made first-class:

- **Tier 1 — Telos / PNV.** Does the artifact do its named verb under
  production fidelity?
- **Tier 2 — First contact.** Can the user reach the artifact at all (script
  loads, plugin appears in host, app starts)?
- **Tier 3 — Sub-goal.** Per-section acceptance assertions and edge cases.

Each tier scores `verified | unverifiable_under_production_fidelity | failed |
not_run`. A `pass` artifact with Tier 2 `unverifiable` is qualitatively different
from one with Tier 2 `verified` — the Codex shows both honestly.

### Dimension 3 — Architectural Cost (How efficient were we?)

The audit-trail metrics: dispatches, wall-clock time, escalations, inline
deviations, contract amendments, Critic findings by severity, demotions
invoked, Editor iterations consumed (cap 3). These say nothing about the
artifact's quality on their own — they say what the *architecture* paid to
arrive at that quality.

### Dimension 4 — Learning Yield (What did the architecture learn?)

The run-report's "what broke" section is gold. The Codex extracts the
`v1.10 candidate:` lines (and prior-vintage equivalents) and tracks them as
amendment seeds across runs. A build that surfaces three load-bearing v1.10
candidates is qualitatively more valuable to the project than a clean run that
surfaces none — even if the clean run shipped a better artifact. The North
Star is a research-bed mission as much as a delivery mission.

### Composite verdict (informational, not gating)

A single emoji/badge for the dashboard's roster row, derived from the four
dimensions. The composite is *informational* — the run-report's own verdict
remains the source of truth. See `SCHEMA.md` for the composition rule.

## Telos-aligned metrics

The Codex tracks the metrics most useful to AutoBuilder's North Star
("understand exactly what the user means and build them exactly what they
want"), grouped by which side of the Star they speak to:

**Understanding metrics (Did we *understand*?)**

- Discovery assumption survival rate (assumptions accepted at CV / assumptions
  proposed)
- Editor iterations to convergence (1 = clean, 3 = capped)
- Proper-noun verification rate (verified / total in `ledger-v1.proper_nouns[]`)
- Demotion rate per run; Demotion Mode outcome distribution
- Researcher citation density (`verbatim_excerpt`-bearing findings per
  load-bearing TD decision)

**Building metrics (Did we build the right thing?)**

- Tier 2 first-contact verified rate
- PNV (prompt-named-verb) assertion verified rate
- Edge-case test pass rate (pass / total)
- Contract amendment count per build (more = more re-planning required)
- Inline-deviation count by category

**Cost metrics (At what architectural price?)**

- Total dispatches per build
- Wall-clock minutes per build
- Sev 0/1/2/3/4 escalation counts
- Critic findings by severity at final-sweep
- Re-verification cycles consumed

**Learning metrics (What did we learn?)**

- v{N+1} amendment candidates surfaced in run-report
- Failure modes catalogued in failure-catalog files
- Principle violations caught structurally vs. escaped to user
- A/B re-run delta (when a prior failed build is re-run under a new arch version)

## Database schema (file-based JSON, no DB)

The Codex matches the project's house style: file-based, append-only-ish,
human-readable. The aggregator emits two layers:

```
codex/data/
├── index.json              roll-up across all runs (table view, version timeline)
└── runs/
    └── {slug}.json         per-run detail (timeline, dimensions, raw refs)
```

Each `runs/{slug}.json` is a derivation — the aggregator can rebuild it any
time from `runs/{slug}/` source files. The Codex never *writes* into
`runs/{slug}/` — that boundary preserves the existing per-role permission table
in `architecture/file_schemas.md`.

If a future iteration outgrows JSON files (e.g., we need joins across hundreds
of runs), the right migration is SQLite. The schema in `SCHEMA.md` is designed
to translate cleanly: each top-level object becomes a table, each `[]` becomes
a child table with the parent id. Until then, JSON.

## Tech choices and rationale

- **Vanilla HTML + CSS + JS, no build step.** Matches the dominant pattern in
  the runs themselves (per tic-tac-toe / blackjack / latex run-reports). Honors
  the v1.6 production-fidelity-at-design-time lesson — the Codex you open is
  the Codex that runs.
- **Vendored dependencies, no CDN.** The latex-equation-renderer failure
  pattern (v1.5) is what this project learned to avoid. Any third-party JS the
  Codex needs (Chart.js when we add visualizations) goes in `vendor/` as a
  pinned local copy.
- **Aggregator is Node ESM (`.mjs`).** No npm install required; uses only
  built-ins (`fs`, `path`, `url`). The user runs it via `build-codex.bat`.
- **No live websocket monitor yet.** Static snapshot regenerated by re-running
  the aggregator. Live monitoring is a Roadmap item, not v0.1.

## How to use

1. Open `Auto Builder/build-codex.bat` (double-click, or run from
   command prompt). This runs the aggregator and refreshes
   `codex/data/*.json`.
2. Open `codex/index.html` in a browser. The roster of runs renders from the
   freshly regenerated JSON.
3. Click a run to drill in.

If your browser blocks `file://` fetches of local JSON (Chrome since some
recent version does for cross-origin local files), run a tiny local server
from the project root: `python -m http.server 8000` and visit
`http://localhost:8000/codex/`.

## Roadmap

In rough order of value:

1. **DEFERRED #1 — Web frontend for prompt input that spawns Claude
   instances.** The user-facing entry to the entire system: a textarea, a
   "build" button, an embedded live run view that streams from the active
   sub-agents. This is its own deliverable; the Codex's run-monitor view
   is the natural place to dock the live stream once the spawn-from-web
   infrastructure exists. See `docs/web-frontend.md` (stub).
2. **Architecture timeline page.** v1.0 → v1.9 visualized: what each version
   added, which run motivated it, which principles it enforced. Source data
   is already in `architecture/README.md` version history.
3. **Principles tracker (A–H).** Per-principle adherence trend over the run
   corpus; surfaces violations, structural-block events, and the runs where
   each principle was first enforced.
4. **Failure catalog cross-link.** `architecture/failure-catalog-streamdock.md`
   is the seed; future failures get their own catalog files. The Codex
   indexes them and links each failure mode to the amendment that addressed
   it.
5. **A/B re-run comparison view.** When the same prompt is re-run under a new
   arch version (the StreamDock pair already exists), the Codex shows them
   side-by-side: same prompt, different outcomes, why.
6. **Charts.** Vendored Chart.js. Time series of cost, severity distribution,
   verdict mix. Once the corpus is >20 runs the trends become readable.
7. **Live-monitor pane.** When a build is active, the Codex tails
   `runs/{active}/state/coordinator/dispatch-log.jsonl` and
   `history/log.jsonl` to show the in-flight DAG. Requires a small local
   server process (Node or Python); not a static-only Codex feature.

## What this is *not*

- Not a replacement for `runs/{slug}/run-report.md` or
  `runs/{slug}/output/verification/report.json`. Those remain authoritative.
  The Codex *summarizes and indexes*; it never invents a verdict.
- Not a writer into `runs/`. The per-role permission table in
  `architecture/file_schemas.md` is sacred.
- Not part of any build's runtime. The Codex is a tool for the user (and for
  agents reflecting on prior runs); no Orchestrator dispatch path runs through
  it.
- Not a live UI for the agent fleet (yet). v0.1 is a snapshot. Live tailing is
  Roadmap item #7.

## Versioning

The Codex's own versioning is intentionally separate from the architecture's.
The architecture is at v1.9; the Codex is at v0.1 because it's a new layer.
Codex versions advance when the schema changes or a new view ships — see
`docs/codex-changelog.md`.
