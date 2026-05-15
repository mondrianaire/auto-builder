# Auto Builder

An experiment in giving Claude a multi-instance architecture for end-to-end software builds — from a one-line prompt to a delivered artifact.

> *The perfect Auto Builder would understand exactly what the user means and build them exactly what they want.* — North Star, [`architecture/principles.md`](architecture/principles.md)

## Entry points

- **[Dashboard](https://mondrianaire.github.io/auto-builder/codex/)** — live aggregator view of every run, with verdicts, revision lineage, and per-build deep links. The bare Pages URL ([mondrianaire.github.io/auto-builder](https://mondrianaire.github.io/auto-builder/)) redirects here.
- **[Architecture](architecture/)** — principles, role charters, file schemas. Currently v1.10.
- **[Codex docs](codex/docs/)** — proposals and coordination notes between the two meta-instances (AutoBuilder-Maintenance and Codex-Frontend) working on this project.

## What's here

- `runs/{slug}/` — every build's full substrate: prompts, Discovery ledgers, TD plans, Editor reviews, Builder outputs, CV reports, Historian summaries, and the final delivered artifact under `output/final/`. Each build is self-contained.
- `architecture/` — the meta-design of the system itself. Principles operationalize the North Star; charters are the system prompts dispatched to each role; schemas pin down what files get written and by whom.
- `codex/` — the dashboard layer. Read-only against `runs/` and `architecture/`; aggregates everything into a single browsable view.
- `scripts/` — the operational tooling (commit-build, commit-step, retroactive-bootstrap, promote-build) per the git-integration convention.

## Git convention (v1.10)

Builds land as scoped commits prefixed `[run:{slug}]` and tagged `delivery/{slug}` at first delivery. Additional-step revisions get `delivery/{slug}/rev-N`. The `delivery/{slug}` tag is structurally immutable — it always points to the first-delivery commit regardless of how many refines accumulate. Promotion of select builds to standalone GitHub repos uses `git filter-repo` per [`codex/docs/maintenance-initiated/git-integration-proposal.md`](codex/docs/maintenance-initiated/git-integration-proposal.md).

## Status

This is a research bed, not a product. Most builds in the corpus failed in instructive ways; the architecture's value is in the failures it catches at the gate, not the builds it delivers. Recent amendments (v1.9, v1.10) are driven by specific retrospectives — see [`architecture/README.md`](architecture/README.md#version-history) for the full version history.
