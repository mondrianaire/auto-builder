# Codex Changelog

The Codex's own versioning. Distinct from the architecture's `v1.x` because
the Codex sits outside the build pipeline — it is the historian-and-monitor
layer, not part of any run's substrate.

---

## v0.9 — 2026-05-15

**First-delivery-outcome corpus visualization shipped** — per
`codex/docs/maintenance-initiated/first-delivery-outcome-viz-proposal.md`.

Maintenance proposed surfacing the `first_delivery_outcome` axis more
prominently after the v0.6 curation pass populated it across the corpus.
The data was already aggregated (`index.first_delivery_outcome_distribution`)
but rendered as five undifferentiated text-and-number stat boxes above the
role-attribution heat map — visually flat against the rest of the
statistics column. v0.9 replaces that with a corpus-wide stacked-bar +
legend + divergence callout panel.

**Components shipped:**

1. **Stacked horizontal bar** at the top of the statistics column —
   5 segments proportional to count (zero segments collapse out),
   each labeled with its count when wide enough (>=8% of total),
   hover surfaces full label + count + percentage.
2. **Color palette** locked: green (`succeeded`) / amber
   (`succeeded_with_concerns`) / orange (`failed_user_reprompted`,
   recoverable) / deep red (`failed_unrecoverable`, currently zero
   but reserved as a hard signal) / gray (`unverified`). The orange
   distinction for `failed_user_reprompted` is new in v0.9 — earlier
   passes shared the deep-red `bad` class with `failed_unrecoverable`,
   conflating recoverable and abandoned failure modes.
3. **Legend below the bar** with swatch + label + count per outcome,
   zero items rendered at 0.4 opacity to keep the schema's full
   taxonomy visible.
4. **Divergence callout** beneath the legend surfacing (a) builds
   where `first_delivery: succeeded*` AND
   `re_audit_reclassified_verdict: fail` (the "user-facing truth
   diverges from retroactive principle-compliance" data point that
   was previously buried in detail panels), with slug list; (b) count
   of `failed_user_reprompted` builds framed as the recoverable
   failure mode.

**Roster outcome badge** (component 2 from the proposal) was already
shipped in earlier passes; v0.9 just added the orange treatment for
`failed_user_reprompted` so it visually distinguishes from
`failed_unrecoverable`.

**Filter-on-click** (component 4) — shipped in the same pass after
Maintenance flagged it as still-pending. Click any bar segment or
legend item to filter the roster to that outcome; click again to
clear. Active segment gets an outline highlight; non-active
segments dim to 0.35 opacity for visual focus. Filter state
persists in `localStorage` under key `codex.filter.firstDelivery`
(per the answer to open question 4 — localStorage matches the
dashboard's self-contained-stateless preference; URL params would
cross the design grain). A filter banner appears above the roster
table when active, with the outcome label + count + a Clear button.
The state machine (`getFilter` / `setFilter` / `toggleFilter` /
`applyFilter`) is module-scoped and re-renders both the corpus
widget and the roster on change.

**Symmetric "Currently waiting on Maintenance for ..." rule adopted.**
Per the 2026-05-15 followup on the meta-orchestrator proposal,
Codex now surfaces its waiting-state on Maintenance items as the
first line of every response (or the last line when the response
itself modifies the waiting state). Saved to memory as
`feedback_codex_waiting_on_maintenance_surfacing.md` for
cross-session persistence. Companion **session-start polling
cadence** declared: every Codex wake reads all
`codex/docs/maintenance-initiated/*.md` and surfaces any proposal
where the latest Maintenance note post-dates the latest Codex ack
on the same file. This closes the proactive-notification gap that
was the strongest case for an agentic Meta-Orchestrator while
costing zero infrastructure.

**Files touched:**

- `codex/index.html` — new CSS for `.fdo-corpus`, `.fdo-stacked-bar`,
  `.fdo-seg`, `.fdo-legend`, `.fdo-divergence`; new orange variant on
  `.fdo-pill`; replaced fdoStrip rendering block in `renderHeatmap`
  with the corpus panel construction.
- `codex/scripts/aggregate.mjs` — codex_version 0.8 → 0.9.
- `codex/data/index.json` + `bundle.js` — version bump.
- `codex/docs/maintenance-initiated/first-delivery-outcome-viz-proposal.md`
  — Codex ack with answers to four open questions; checklist now
  at 5/7 (proposal-reviewed, outcome-distribution-widget,
  roster-outcome-badge, divergence-callout-panel, schema-aggregator-changes
  all closed; design-agreed pending Maintenance review;
  filter-on-click deferred).

---

## v0.8 — 2026-05-15

**Cross-instance amendment pass — v1.10.1 Sev-4-to-user cleanup shipped.**

Per user grant ("proceed with your recommendations"), Codex crossed the
workspace boundary to author the v1.10.1 architecture amendment that
Maintenance had flagged as a candidate on the 2026-05-15 git-integration
note. Six locations purged of Sev-4-to-user routing across
`architecture/role_charters.md` (Orchestrator step 8, "On Severity 4
escalation" subsection, Discovery Amendment Mode escalation, Critic
IP-resolution check, Arbiter routing, Arbiter progress communication) and
one in `architecture/principles.md` (Principle E falls-short note). New
routing rule documented under "On Severity 4 escalation": Researcher
re-probes via alternate canonical channels (archived snapshot,
community-attested mirror with verbatim_excerpt per Principle F) →
Demotion Mode if still unreachable → one of five v1.9 outcomes → residual
in the Uncertainty Manifest. Orchestrator removed from the Sev 4 routing
path entirely.

This unblocks the v1.10 commit cadence: C1–C4-as-Sev-3 logging discipline
assumes no other Sev-4-to-user routing remains, and that assumption now
holds.

**Codex-side mirror of the amendment:**

- `codex/data/index.json` + `bundle.js` — architecture amendments list
  extended with v1.10.1 entry (principles_mentioned: [E, F])
- `codex/docs/maintenance-initiated/git-integration-proposal.md` —
  Maintenance note documenting the v1.10.1 amendment shipping;
  `retroactive-bootstrap-executed` ticked (closing the checkbox the
  evidence already supported); Codex ack confirming end-to-end coherence
- Handoff metadata refreshed: git-integration items_done 9 → 10
  (`retroactive-bootstrap-executed` closed), overall_state annotated as
  "10/11 — only first-going-forward-build-uses-convention remains"

**Architecture state after v1.10.1:**

- Currently v1.10.1 (Sev-4-routing cleanup over v1.10's commit-cadence
  over v1.9's principles)
- The always-deliver contract is now structurally honored across the
  dispatch graph
- No Sev-4-to-user escape hatches remain in the role charters
- The C1–C5 commit cadence is internally consistent

**Memory persisted:**

- `project_autobuilder_v1101_sev4_cleanup.md` — flipped from "candidate"
  to "shipped 2026-05-15"

**Cross-instance note.** Codex authored Maintenance-territory changes
this session under explicit user clearance. Future sessions should treat
the v1.10.1 amendment as Maintenance-shipped (the workspace-boundary
memory still applies — Codex doesn't write to architecture/ unless the
user grants clearance). Per `feedback_autobuilder_codex_workspace_boundary.md`.

---

## v0.7 — 2026-05-15

**Git integration end-to-end operational.**

Maintenance graduated the four bat-script drafts (`commit-build.bat`,
`commit-step.bat`, `retroactive-bootstrap.bat`, `promote-build.bat`) to the
repo root and ran `retroactive-bootstrap.bat` — 10 `delivery/{slug}`
annotated tags now exist, pointing at each build's most-recent-touching
commit and preserving the historical timeline. The `readGitLog.mjs`
adapter (shipped 2026-05-14 against the empty state) is now producing real
data: every per-run JSON under `codex/data/runs/` carries `sources:
[synthesized, git]` on its primary_run revision.

**Spot-check on the dashboard**: gto-poker-async-duel's REV-0 panel
displays `ref 5b38c9cc` — a real git short-SHA pulled from the tag's
contributing commit, not a synthesized placeholder. The three-way
field-level merge in `events.mjs#extractRevisions` is layering correctly:

- `ref` and `ts` — git authoritative (was: synthesized placeholder)
- `summary` — git's tag-annotation subject (was: substrate-derived)
- `first_delivery_outcome` — synthesized-only on rev-0, per cardinal rule
  (preserved across the merge)

**Handoff states after this milestone:**

- `coordination-proposal` — **done** (6/6, two-day window with no objection to
  the recommended flip; convention has cycled through three round-trips
  across two downstream proposals)
- `github-pages-proposal` — **in-progress 9/10** (only `codex-yml-created`
  remains, intentionally deferred as Path-B backstop)
- `git-integration-proposal` — **in-progress 9/11** (the two open checkboxes
  are Maintenance-owned and the evidence for `retroactive-bootstrap-executed`
  is operational; `first-going-forward-build-uses-convention` ticks on the
  next post-v1.10 build)

**Three end-to-end loops closed in under two days** of async meta-instance
work between Codex and AutoBuilder-Maintenance. The dashboard now displays
the architecture's history with structurally authoritative git anchors,
which is the data quality the corpus analysis needs to be load-bearing
rather than aspirational.

**Files touched (Codex side):**
- `codex/scripts/aggregate.mjs` — codex_version 0.6 → 0.7
- `codex/data/index.json` — github-pages items_done 6 → 9; coordination
  overall_state in-progress → done; git-integration codex_acks_latest
  refreshed
- `codex/data/bundle.js` — mirrors index.json
- `codex/docs/coordination-proposal.md` — Overall state flipped to done +
  Codex ack
- `codex/docs/github-pages-proposal.md` — Codex ack on the three new ticks +
  bootstrap milestone confirmation
- `codex/docs/maintenance-initiated/git-integration-proposal.md` — Codex ack
  celebrating bootstrap operational; surfaces that
  `retroactive-bootstrap-executed` evidence is closed in practice

---

## v0.6 — 2026-05-15

**Curation pass — first-delivery outcomes resolved for 5 unverified builds.**

The corpus had 5 builds (`earthquake-map`, `kanban-board`, `blackjack-trainer`,
`tic-tac-toe`, `gto-poker-trainer`) sitting at `first_delivery_outcome:
unverified` because the substrate's automated derivation (uncertainty manifest /
run-report STATUS block) couldn't speak to user-facing truth for runs that
shipped clean. Closed the gap with curation overlays at
`codex/data/curation/{slug}.json`, each grounded in run-report + RCA evidence
where available.

**Resolved distribution**

| outcome | before | after |
|---|---|---|
| succeeded | 0 | 3 |
| succeeded_with_concerns | 2 | 4 |
| failed_user_reprompted | 3 | 3 |
| failed_unrecoverable | 0 | 0 |
| unverified | 5 | 0 |

**Per-build rationale (short form; full text in curation files):**

- `earthquake-map` → **succeeded_with_concerns**. CV's headless-Chromium PNV
  passed with 480 markers from the live USGS feed, but Critic raised a
  severity-HIGH `prose_coverage` escalation that required TD impact-mode +
  38 added assertions before delivery cleared.
- `kanban-board` → **succeeded**. 16/16 edge-case + 8/8 CV user-flow scenarios
  pass; only a low-severity manifest-schema drift. The v16-reaudit
  reclassification to "fail" is a retroactive principle-compliance critique,
  not an artifact-quality finding (the RCA explicitly recommends NOT patching).
- `blackjack-trainer` → **succeeded**. "Nothing broke" run; CV pass, no
  escalations, no Sev 0 fixes. The v16-reaudit reclassification scores it
  against v1.6+ standards that didn't exist at build time.
- `tic-tac-toe` → **succeeded**. 46/46 edge cases, CV pass, "happy path ran
  clean." The RCA calls this "artifact-correctness-by-luck" because the
  small domain hid the absence of principled verification, but the user-facing
  artifact works.
- `gto-poker-trainer` → **succeeded_with_concerns**. PNV.1 verified
  end-to-end under jsdom production fidelity, but the run surfaced 4
  amendment candidates + 1 Sev 0 + 2 charter-compliance gaps (TaskCreate
  misses), warranting the concerns qualifier.

**Cross-build pattern surfaced.** Three of the five (kanban-board,
blackjack-trainer, tic-tac-toe) have `re_audit_reclassified_verdict: fail`
even though I curated them as `succeeded`. That divergence is the data point
worth keeping: the architecture's retroactive verification standard
(v1.6+ principle compliance) and the user's first-contact experience are
distinct axes. The dashboard already separates them; the curation just makes
the latter visible for the first time.

**Files touched**

- `codex/data/curation/earthquake-map.json` (new)
- `codex/data/curation/kanban-board.json` (new)
- `codex/data/curation/blackjack-trainer.json` (new)
- `codex/data/curation/tic-tac-toe.json` (new)
- `codex/data/curation/gto-poker-trainer.json` (new)
- `codex/data/index.json` (5 entries + distribution + version bump)
- `codex/data/bundle.js` (same 5 entries × 2 locations + distribution + version)
- `codex/data/runs/{slug}.json` × 5 (header + revisions[].primary_run entry)

The hand-edits to index.json + bundle.js + per-run JSONs match what
`build-codex.bat` will produce on the next run from the curation files, so
there's no drift when the user does eventually rebuild.

---

## v0.1 — 2026-05-14

First cut. Static dashboard + Node aggregator, no live monitoring.

**What ships**

- `codex/scripts/aggregate.mjs` — walks `runs/` and `architecture/`, emits
  `codex/data/index.json`, `codex/data/runs/{slug}.json`, and `codex/data/bundle.js`
  (the file-:// escape hatch for browsers that block local fetch).
- `codex/index.html` — single-file vanilla HTML dashboard. Sections:
  corpus overview, run roster with extended rating system, per-run detail
  drawer, architecture timeline, principles panel.
- `codex/README.md` — vision doc, rating extrapolation rationale,
  telos-aligned metrics, roadmap.
- `codex/SCHEMA.md` — formal data schema with derivation rules.
- `build-codex.bat` — Windows runner for the aggregator.

**Rating system extrapolation**

The existing Pass/Fail signal is generalized into four dimensions:

- **Telos Fidelity** (did we understand?) — Editor outcome, demotions,
  proper-noun verification status.
- **Deliverability** (does it work?) — Tier 1 (PNV), Tier 2 (first contact),
  Tier 3 (sub-goal), each with `verified | unverifiable | failed | not_run`.
- **Architectural Cost** — dispatches, wall-clock, escalations, critic.
- **Learning Yield** — amendment candidates surfaced, principle violations
  caught structurally vs. escaped.

A composite verdict (`clean | shipped_with_concerns | shipped_partial |
failed | reclassified | unknown`) rolls these up for the dashboard's roster
row. The composite is informational; the run-report's own verdict remains
canonical.

**What's deliberately NOT in v0.1**

- No live monitoring of in-flight runs. The aggregator is a snapshot taken
  when the user clicks `build-codex.bat`.
- No charts (Chart.js or similar). Text-and-pills only, until the corpus is
  large enough that visual trends would actually read.
- No write paths into `runs/`. The Codex is strictly read-only against the
  substrate.

**Known limitations**

- Two of nine current run-reports (`gto-poker-trainer`, `streamdock-applemusic-touchbar`)
  use older heading conventions that the date regex doesn't catch.
  Verdict and architecture-version do come through for both. Acceptable for
  v0.1; a polish-pass would normalize the older reports' front-matter.
- The aggregator's markdown parser is regex-based, not AST-based. Strongly
  non-conventional run-reports may produce partial data. Source files
  remain authoritative — `links` in each run's JSON point straight to them.
- Sandbox-mounted snapshot of `architecture/README.md` may lag the Windows
  source; the parser correctly handles whichever copy it sees.

## Roadmap (next iterations)

See `codex/README.md` for the full deferred list. Highest-value next steps:

- **v0.2** — architecture timeline page with motivating-run cross-links.
- **v0.3** — principles tracker with per-principle adherence trend.
- **v0.4** — A/B re-run comparison (the StreamDock pair is the seed case).
- **v0.5** — vendored Chart.js, first time-series visualizations.
- **v0.6** — live-monitor pane (requires a small Node server tailing
  `dispatch-log.jsonl` and `history/log.jsonl` of an active run).
- **v1.0 — DEFERRED #1** — the web frontend for prompt input that spawns
  Claude instances. The Codex's run-monitor view is the natural place to
  dock the live stream once the spawn-from-web infrastructure exists. See
  `docs/web-frontend.md`.

---

## v0.2 — 2026-05-14

Per-build deep documentation + role-attribution layer.

**What ships**

- `codex/scripts/events.mjs` — event extractor. Walks `v16-reaudit.json`,
  `root-cause-analysis.md`, `audit/flags.jsonl`, `state/inline-deviations/*`,
  `decisions/discovery/demotion-v*.json`, run-report STATUS blocks, and a
  curation overlay. Emits a unified `events[]` per run with explicit + inferred
  role attribution and confidence (high / medium / low).
- `codex/scripts/narrative.mjs` — generates
  `codex/data/runs/{slug}-narrative.md` per run. Human-readable timeline
  reconstruction with role chips inline; links back to all source files.
- `codex/data/curation/` — overlay directory with `README.md` + `.template.json`.
  Curators can override any auto-extracted field by creating
  `{slug}.json`. Curation always wins on the fields it sets.
- `codex/SCHEMA.md` v0.2 addendum — formal schema for events,
  role-attribution rollups, first-delivery axis, curation overlay format,
  derivation precedence.
- Aggregator extensions: per-run `events[]`, `role_attribution_totals`,
  `re_audit` block, `first_delivery_outcome` + source. Index-level
  `role_attribution_corpus_totals` + `first_delivery_outcome_distribution`.
- Dashboard extensions:
  - New "First delivery" column on the roster with a prominent FDO pill
    distinct from the architectural composite
  - New "Role attribution heat map" section showing per-role event totals
    with high/medium/low confidence breakdown
  - Per-build detail panel now includes a phase-grouped event timeline
    with role chips (explicit = solid, inferred = dashed) and principle
    chips

**Auto-derived first_delivery_outcome (without curation)**

- `failed_user_reprompted` (3): blackjack, latex-equation-renderer,
  streamdock-applemusic-touchbar (v1.8)
- `succeeded_with_concerns` (1): streamdock-apple-music-touchbar (v1.9)
- `unverified` (5): tic-tac-toe, blackjack-trainer, kanban-board,
  earthquake-map, gto-poker-trainer — awaiting curation

**Role attribution corpus (top of heat map)**

The Re-Verification role dominates by event count (71 events, 50 explicit)
because every gate evaluated in a v1.6 reaudit creates an event. CV is
next-most-implicated (23 events, 7 runs touched). Discovery, TD,
Coordinator, Builder, Integrator, Researcher, Critic, Historian, Overseer
each appear in 1–2 builds, mostly via the inline-deviation and audit-flag
sources. **Interpretation:** the reaudit role's high count is structural
(every gate is an event), not a signal that Re-Verification is the "worst"
role. The dashboard's `explicit_count` column makes the structural-vs-real
distinction visible.

**What's still NOT in v0.2**

- No per-event drill-in modal yet. Events render inline in the detail
  pane; clicking one doesn't open a full source-file view.
- No filter / sort on the heat map. The next iteration (v0.3) can let you
  filter by confidence, by run, by phase.
- No architecture timeline page (still v0.2 roadmap → v0.3).
- No vendored Chart.js — text-and-pill rendering only.

## Workspace boundary (operational)

Per the operational note from the user: the Codex's write surface is
`codex/` only. The single file outside that boundary — `build-codex.bat`
at the project root — was blessed in the v0.1 setup conversation. Any
future writes outside `codex/` require coordination with the
AutoBuilder-Maintenance meta-instance and adherence to git project rules.

---

## v0.3 — 2026-05-14

Revision lineage layer. Distinguishes the primary Auto Builder run from
any *additional steps* (user re-prompts, hand-patches, follow-up builds)
needed to produce a working artifact.

**What ships**

- `events.mjs#extractRevisions()` — builds the `revisions[]` array per
  run. Always synthesizes a `rev-0 primary_run`; merges additional_step
  revisions from the curation overlay.
- `events.mjs#tagEventsWithRevisions()` — stamps every event with its
  owning `rev_id` (default `rev-0`).
- Aggregator wires both: per-run JSON + bundle now carry `revisions[]`
  and per-event `rev_id`. Summary gains `counts.revision_count` and
  `counts.additional_step_count`.
- Curation overlay schema extended with a `revisions[]` section. Template
  updated. Curators add additional steps starting at `rev-1`; the
  aggregator handles `rev-0` synthesis automatically.
- Dashboard: between the detail-head and the main body, a horizontal
  revision strip renders each revision as a card (primary = accent-bordered;
  additional_step = warning-bordered). Events on the timeline pick up a
  `rev-N` tag in their meta line — additional-step events visually pop.
- `SCHEMA.md` v0.3 addendum — formal schema, derivation precedence,
  cardinal rules (most importantly: revisions never change
  `first_delivery_outcome`).

**Coordination contract with AutoBuilder-Maintenance**

Per-build git workflow is AutoBuilder-Maintenance territory. The Codex
doesn't initialize repos, write commit conventions, or set up branch
schemes. What the Codex needs from the eventual git layer is a signal to
distinguish primary-run commits from additional-step commits. Until that
convention is enacted, the curation overlay is the bridge. Once the
convention exists, a small `readGitLog()` adapter will populate
`revisions[]` automatically from commit metadata (`ref` and `ts`),
merging with curated rationale/diff_summary prose.

**What's still NOT in v0.3**

- No `readGitLog()` adapter (awaits AutoBuilder-Maintenance to enact the
  commit-signal convention).
- No automatic event-to-revision attribution (every event currently tags
  as `rev-0` unless curation overrides). Once git history exists, events
  derived from later commits should tag with their commit's revision.
- No filter on the dashboard for "primary only" vs "include additional
  steps." All revisions render together.

## Current revision counts (all builds)

All 9 builds currently show 1 revision (the synthesized `rev-0`). The 3
builds with `failed_user_reprompted` are the obvious candidates for
curated additional-step entries — but those entries depend on knowing
*what* the user re-prompted with, which is information that lives
outside the substrate. AutoBuilder-Maintenance plus the user can populate
these as the git workflow takes shape.

---

## v0.4 — 2026-05-14

Deliverable-kind taxonomy + showcase pages + smart live URLs.

**What ships**

- `codex/scripts/deliverable.mjs` — `detectDeliverableKind()` classifies each
  build by inspecting `output/final/` contents + manifest hints. Six
  taxonomies: `web_app | plugin | cli | library | document | data | other`.
  `composeLiveUrl()` builds a hosted URL per build given a configured
  `pages_base`. `loadCodexConfig()` reads the optional
  `codex/data/config.json` for `pages_base`, `repo_base`, `branch`.
- `codex/scripts/showcase.mjs` — generates `codex/showcase/{slug}.html` per
  non-web build. Self-contained Pages-deployable HTML. Plugin template renders
  telos hero, manifest as definition list, install steps, uncertainty
  manifest, revision lineage, source-file links. Fallback template handles
  CLI / library / document / data / other.
- Aggregator wires both: `summary.deliverable_kind`,
  `summary.deliverable_can_run_in_browser`, `summary.deliverable_index`,
  `summary.deliverable_manifest`, `summary.live_url`,
  `summary.live_url_kind`, `summary.showcase_assets`. Per-run JSON +
  bundle picks them up. Showcase pages emitted to `codex/showcase/`.
- Curation overlay: `showcase_assets` block + `codex/data/curation/images/`
  subdir for hand-supplied screenshots. Template + README extended.
- Dashboard: new "Kind" column (color-coded chip per taxonomy) and "View"
  column (smart button — `live ↗` / `showcase ↗` / fallback `final/`).
- `SCHEMA.md` v0.4 addendum — formal schema, detection rules, live URL
  composition, showcase page contract, SQLite migration.

**Auto-detected kinds in current corpus** (10 builds):

| Kind | Count | Slugs |
|---|---|---|
| `web_app` | 7 | tic-tac-toe, blackjack, blackjack-trainer, kanban-board, latex-equation-renderer, earthquake-map, gto-poker-trainer |
| `plugin` | 2 | streamdock-apple-music-touchbar, streamdock-applemusic-touchbar |
| `other` | 1 | gto-poker-async-duel (no recognizable final/ — likely incomplete or new convention) |

**Showcase pages generated**: 3 (the two plugins + the `other` build, fallback template). All three render with manifest contents where available, telos hero, uncertainty manifest, revision lineage, source-file links.

**Live URL composition status**: `live_url_kind === 'none'` for all 10 builds until `codex/data/config.json` is created. To activate the live URLs, add:

```json
{
  "pages_base": "https://jett.github.io/Auto-Builder",
  "repo_base":  "https://github.com/Jett/Auto-Builder",
  "branch":     "main"
}
```

Re-run `build-codex.bat` and the dashboard's view buttons + showcase page source links will compose against those bases.

**What's still NOT in v0.4**

- No GitHub Pages deployment workflow (the `.github/workflows/pages.yml` file
  lives outside `codex/` — needs AutoBuilder-Maintenance coordination).
- No filter on the roster by deliverable_kind. v0.5 candidate.
- The fallback showcase template (cli/library/document/data/other) is
  minimal. Specific templates per kind can be added as those builds appear.
- No automatic file-tree population for showcase pages. v0.5 candidate
  (would require reading `output/final/` recursively from the aggregator).

---

## v0.5 (incremental) — 2026-05-14

File-tree extraction for non-web showcase pages.

**What ships**

- `deliverable.mjs#walkFileTree()` — recursive walk of `output/final/`
  with sensible caps (max depth 6, max 500 nodes, files >256 KB flagged
  `oversized`). Skips `.git`, `node_modules`, `.DS_Store`. Directories
  sorted first, then files, alphabetical within each.
- Aggregator runs the walk for every non-web build. Per-run detail JSON
  gains `file_tree: { tree, node_count, truncated }`.
- Showcase generator renders the tree via `renderFileTree()`. Each
  showcase page now has a "Deliverable contents" section between the
  Uncertainty Manifest and the Revision Lineage.

**Concrete impact (streamdock-apple-music-touchbar)**

The showcase page now displays the full plugin structure inline:

```
📁 com.autobuilder.applemusic-now-playing.sdPlugin
  📁 images
    📄 icon.txt (752b)
  📁 js
    📄 host.js (6625b)
    📄 process-utils.js (1399b)
    📄 renderer.js (2091b)
    📄 source.js (3635b)
  📁 sidecar
    📄 smtc-reader.ps1 (4468b)
  📄 cv-test.tmp (1b)
  📄 index.js (2006b)
  📄 manifest.json (1441b)
  📄 package.json (371b)
📄 com.autobuilder.applemusic-now-playing.sdPlugin.zip (11562b)
📄 divergence-from-integration.json (4491b)
📄 README.md (4560b)
```

A visitor landing on the page can see exactly what shipped, byte sizes
per file, and the relationship between the plugin directory and the
packaged zip. The `cv-test.tmp` stray (already flagged in the
Uncertainty Manifest) is now visible in the structure too — uncertainty
manifest claim + observable evidence in the same view.

**What's still NOT in this iteration**

- File contents are not inlined — only the tree structure. Clicking a
  file in the tree doesn't open it. v0.6 could add a "view contents"
  modal for small text files, deferred until needed.
- No syntax highlighting on the eventual file-contents view.
- The web-app builds don't get a tree because the artifact itself is
  the visible content. If a curator wants one for a web-app build,
  curation overlay can override `deliverable_kind` to force showcase
  generation.

---

## v0.5 (continued) — 2026-05-14: Async coordination layer

Bidirectional file-based channel between Codex and AutoBuilder-Maintenance.

**What ships**

- `codex/scripts/coordination.mjs` — `parseMaintenanceStatus()` extracts a
  structured `## Maintenance Status` section from any markdown file in
  `codex/docs/` or `codex/docs/maintenance-initiated/`. Tolerant: em-dash
  / colon / hyphen separators on checkbox trailers; strips fenced code
  blocks so example status blocks inside markdown fences don't bleed
  into real parsing; missing fields default to null/empty.
  `collectHandoffs()` walks both directories and emits a sorted array of
  per-proposal handoff summaries (pending_ack first, then by
  last_touched desc).
- Aggregator wires `index.maintenance_handoffs[]` — each entry carries
  slug, title, origin (codex-initiated / maintenance-initiated),
  overall_state, items_done/total counts, pending_ack flag,
  notes_count, acks_count, and short excerpts of the latest note/ack.
- Dashboard panel: new "Maintenance handoff" section between the
  Role-attribution heat map and the Architecture timeline. One card per
  proposal: progress bar, overall-state pill, last-touched date, latest
  note/ack excerpts. Cards with `pending_ack: true` get a warning-amber
  left border and an inline "pending ack" badge.
- `codex/docs/coordination-proposal.md` — the convention itself, carrying
  its own status block as the first dogfooded surface.
- `codex/docs/maintenance-initiated/README.md` — establishes the
  Maintenance-write zone with naming and format conventions.

**The convention in three lines**

- Each `codex/docs/*.md` may carry a `## Maintenance Status` section.
- Maintenance ticks checkboxes and adds dated paragraphs in
  `### Maintenance notes` when they action items.
- Codex parses on next aggregator run, surfaces the state on the
  dashboard, and writes dated responses in `### Codex acks`.

**Refinements accepted from Maintenance feedback round 1**

- Dated paragraphs required (audit value)
- pending_ack flag in v1 (not deferred — parser already has the signal)
- URGENT/BLOCKING prefix reserved for v2
- Opt-in via section presence (not category membership)
- Em-dash / colon / hyphen all parse equivalently
- Maintenance-initiated coordination via
  `codex/docs/maintenance-initiated/` (option a from the open question)
- Boundary discipline promoted to top-level paragraph

**First real cycle observed during implementation**

While implementing, AutoBuilder-Maintenance retrofitted
`github-pages-proposal.md` with its own status block. The aggregator
parsed it on the next run: 10 checkbox items, 1 dated Maintenance note,
2 Codex acks. Dashboard correctly flagged `pending_ack: true` because
Maintenance's note (2026-05-14) post-dates any dated Codex ack. The
loop closed end-to-end on its first attempt.

**What's still NOT in this iteration**

- Codex ack lines on github-pages-proposal still need to be written
  with date prefixes (currently undated — they pre-date the dating
  convention). v1 of the convention tolerates this; the dashboard
  shows them in the latest-ack slot regardless.
- No notification when pending_ack flips to true outside an aggregator
  run. Surfaces on the next dashboard refresh, which is fine for this
  velocity.
- URGENT/BLOCKING prefix not styled yet (deferred per refinement 3).
