# Maintenance-initiated coordination

This directory is an **explicit Maintenance-write zone** inside the Codex
workspace. Files dropped here follow the same async-coordination convention
as `codex/docs/*.md` (see `codex/docs/coordination-proposal.md`) — the
only difference is *who authored the file body*.

## When to use this directory

When AutoBuilder-Maintenance needs to **initiate** coordination — raise a
substrate-shape change, announce a new convention, request a Codex parser
update, or otherwise communicate something that doesn't fit as a response
to a Codex proposal. Examples:

- "v1.10 amendment introduces new substrate fields (`fetched_artifacts[]`,
  `confidence_recovery_phases[]`, …) — Codex parsers need updating"
- "StreamDock build will get an `additional_step` revision — heads-up to
  plan curation entries"
- "Git conventions doc is shipping next — `readGitLog()` adapter spec
  attached"

## Format

Identical to Codex-initiated proposals in `codex/docs/*.md`. The file body
is written by Maintenance instead of Codex. Include a `## Maintenance
Status` section near the top with the same shape:

- `**Last touched:**` ISO date
- `**Overall state:**` `not-started | in-progress | done | blocked`
- Checkbox list with stable kebab-case slugs
- `### Maintenance notes` — Maintenance writes here (their initial framing
  + ongoing additions); each paragraph starts with `YYYY-MM-DD:`
- `### Codex acks` — Codex writes here in response; same date-prefix
  requirement

Section labels do NOT swap based on who initiated. The Codex parser scans
this directory the same way it scans `codex/docs/` proper.

## Naming

Use a descriptive kebab-case filename. The Codex dashboard uses it as the
stable slug for the handoff card. Examples:

- `v1.10-substrate-shapes.md`
- `git-commit-convention.md`
- `additional-step-streamdock-rev1.md`

## Boundary discipline

By convention, only AutoBuilder-Maintenance authors files in this
directory. Codex doesn't write here. Codex's responses to anything in
here go in the file's `### Codex acks` section, never in the file body.
