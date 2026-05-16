# {slug}

> {telos}

This is the Cat 1 (project metadata) wrap-up overview for AutoBuilder build **`{slug}`**, ratified on {ratified_at} by **{ratified_by}**. It is written automatically by the wrap-up routine that runs as the final step of `ratify-build.bat`.

The purpose of this document is to orient a brand-new reader — including a fresh Claude instance with no prior context on AutoBuilder — to what this build is, what it produced, and where to look next. It is intentionally lightweight; for full build provenance see Cat 2 documents listed at the end.

---

## What this build is

| Field | Value |
|---|---|
| Slug | `{slug}` |
| Deliverable kind | `{deliverable_kind}` |
| Verification verdict | `{verdict}` |
| First-delivery outcome | `{fdo}` |
| Architecture version | `{architecture_version}` |
| Build wall-clock | {wall_min} minutes |
| Ratified | {ratified_at} |
| Ratified by | {ratified_by} |

## Original prompt

```
{prompt}
```

## Telos (north star)

{telos}

## Where the deliverable lives

The production deliverable for this build is at `runs/{slug}/output/final/`. After promotion (an opt-in event distinct from ratification), this directory is forked verbatim to `mondrianaire/{slug}-AB` as a standalone repo for ongoing product life.

{live_url_line}

## Where to look next

- **Cat 3 (the actual deliverable):** `runs/{slug}/output/final/` — the working artifact this build produced.
- **Cat 2 (build byproduct data, for studying the AutoBuilder process itself):**
  - `runs/{slug}/run-report.md` — full narrative of how the build went
  - `runs/{slug}/audit/` — per-role audit logs
  - `runs/{slug}/decisions/` — decision records
  - `runs/{slug}/output/verification/report.json` — verification verdict + evidence
  - `runs/{slug}/root-cause-analysis.md` — present only if the build had a non-trivial failure-and-recovery path
- **Cross-corpus dashboard:** the Codex dashboard at `codex/` (or `https://mondrianaire.github.io/auto-builder/codex/` if Pages is enabled) shows this build alongside every other AutoBuilder build with comparable axes.

## What "ratified" means (briefly)

Ratification means three things were true at the moment of ratification:

1. **Gate 3 (verification):** the build's CV (Comprehensive Verification) verdict was `pass` or `pass_with_concerns`.
2. **Gate 1 (instructions):** the user confirmed install instructions are clear and followable.
3. **Gate 2 (access):** the user confirmed the deliverable is accessible as Discovery described.

Ratification freezes the corpus entry for this build. Subsequent work on this slug (if any) belongs in the promoted fork at `mondrianaire/{slug}-AB`, not in the corpus.

## What "promotion" means (briefly)

Promotion is a SEPARATE event from ratification — it's the user's opt-in decision that this build is worth standalone product life. Promotion forks `output/final/` (and only that) to a new repo, seeds it with this orientation material, and (for web_app builds) auto-enables GitHub Pages. The corpus entry remains frozen regardless.

See `architecture/build-lifecycle.md` for the full lifecycle spec.
