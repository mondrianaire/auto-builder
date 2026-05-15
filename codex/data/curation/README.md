# Curation overlay

Hand-curated corrections and additions that the auto-extracted aggregator
can't derive from the substrate alone. Most importantly: the
`first_delivery_outcome` field, which captures user-experience truth
("did your first prompt produce a working artifact?") rather than the
architecture's internal verdict.

## How it works

For any run slug, create `codex/data/curation/{slug}.json` with whichever
fields you want to override or add. The aggregator merges this overlay on
top of the auto-extracted detail. Curation always wins on the fields it
sets.

When the aggregator runs (via `build-codex.bat` or directly), it reads
each curation file and re-emits the per-run JSON + the dashboard bundle.

## Schema

See `.template.json` in this directory for the full shape. Required fields
when curating a `first_delivery_outcome`:

- `first_delivery_outcome` — one of `succeeded`, `succeeded_with_concerns`,
  `failed_user_reprompted`, `failed_unrecoverable`, `unverified`.
- `first_delivery_outcome_rationale` — one paragraph explaining the call,
  so the next curator (or AutoBuilder-Maintenance) can audit it.
- `first_delivery_curated_by` — who made the call. Free-text.
- `first_delivery_curated_at` — ISO-8601 date.

Optional fields:

- `events[]` — additional events to inject into the timeline. Useful for
  events the substrate can't see (user-side defects, re-prompt cycles, etc.).
  Each event uses the same shape as auto-extracted events (see
  `codex/SCHEMA.md` v0.2 section).
- `notes` — free-form text the dashboard can render alongside the run.

## Builds awaiting curation (as of Codex v0.2)

Five of the nine current builds are `unverified` because no explicit
first-delivery signal could be auto-extracted from their substrate:

- `tic-tac-toe`
- `blackjack-trainer`
- `kanban-board`
- `earthquake-map`
- `gto-poker-trainer`

For each, the curator (you or AutoBuilder-Maintenance) should recall: did
the original one-line prompt produce something the user could use on first
contact, or did the user need to re-prompt / patch / re-run to get
something working? Fill in `first_delivery_outcome` accordingly.

The four builds that auto-extracted a signal:

- `blackjack` → `failed_user_reprompted` (Deal-button defect)
- `latex-equation-renderer` → `failed_user_reprompted` (KaTeX did not load)
- `streamdock-applemusic-touchbar` (v1.8) → `failed_user_reprompted` (wrong OS)
- `streamdock-apple-music-touchbar` (v1.9) → `succeeded_with_concerns`
  (unverifiable on user hardware; Uncertainty Manifest non-empty)

These can still be overridden by curation if you disagree.

## What NOT to put here

- Anything that belongs in the run's substrate. Curation is for things the
  substrate cannot capture (user-experience, retrospective re-rating).
- Anything that contradicts the run-report's own narrative — instead,
  amend the run-report. Curation is for supplemental signal, not for
  rewriting history.

---

## v0.3 addition — revisions (primary run vs additional steps)

Curators can record a build's revision lineage in the same file. Schema:

```json
{
  "revisions": [
    {
      "id": "rev-1",
      "kind": "additional_step",
      "summary": "User re-prompted to bundle KaTeX locally",
      "triggered_by_outcome": "failed_user_reprompted",
      "triggered_by_event": "evt-000",
      "verdict": "pass",
      "rationale": "Original CDN load failed at first contact; bundled vendor copy resolves",
      "diff_summary": "+ vendor/katex/, - <script src=\"cdn...\">",
      "curated_by": "Jett",
      "curated_at": "2026-05-14",
      "ts": "2026-05-10",
      "ref": null
    }
  ]
}
```

**You do NOT need to specify `rev-0`** — the aggregator synthesizes the
primary_run revision from the build's existing fields (verdict, date,
first_delivery_outcome). You only add `additional_step` entries starting
at `rev-1` and increasing.

### Important: revisions don't change `first_delivery_outcome`

If a build's primary run was `failed_user_reprompted`, even a perfectly
successful additional step does NOT change that outcome. The
`first_delivery_outcome` field is the primary-run truth — what the user's
first prompt produced. Additional steps add value (working artifacts +
documented lessons) but they don't retroactively change whether the first
prompt was sufficient.

The additional step's own `verdict` field records whether the step
succeeded; it lives on the revision, not on the build summary.

### Bridge until git is in place

AutoBuilder-Maintenance owns the eventual per-build git workflow. Until
that lands, the curation overlay is the only way to populate revisions.
Once git is wired and the Codex's `readGitLog()` adapter is built, the
aggregator will merge git-derived revisions with curated ones: git
contributes the `ref` (commit hash) and `ts`; curation contributes the
`rationale`, `diff_summary` prose, and any revision that wasn't
committed.


---

## v0.4 addition — showcase_assets (for non-web deliverables)

Plugins, CLIs, libraries, documents — any build that can't run in a
browser — gets a Codex-generated showcase page at
`codex/showcase/{slug}.html`. By default the page is built from the
build's existing substrate (manifest, telos, uncertainty manifest,
revisions). Curators can enrich it via `showcase_assets`:

```json
{
  "showcase_assets": {
    "screenshots": [
      "images/{slug}/touchbar-mockup.png",
      "images/{slug}/install-step-3.png"
    ],
    "screencast_url": "https://...",
    "install_command_override": "(verbatim install command, replaces auto-pulled)",
    "demo_steps": [
      "Step 1: Open StreamDock Settings.",
      "Step 2: Drag the action onto the Touch Bar layout."
    ]
  }
}
```

Screenshots live under `codex/data/curation/images/{slug}/`. See that
directory's README for path conventions. The showcase page renders them
inline at the top.

`deliverable_kind` can also be overridden here when auto-detection picks
the wrong kind (e.g., a build whose `final/` is unconventional but you
want the showcase page to render in plugin-template style anyway).
