# {slug}

> {telos}

This standalone repository is the production deliverable from AutoBuilder run **`{slug}`**, forked here on {promoted_at} for ongoing product development.

## Original prompt

```
{prompt}
```

## Build provenance

| Field | Value |
|---|---|
| AutoBuilder verdict | `{verdict}` |
| First-delivery outcome | `{fdo}` |
| Ratified | {ratified_at} by **{ratified_by}** |
| Architecture version | `{architecture_version}` |
| Build wall-clock | {wall_min} minutes |

## What's here

This repository contains the production deliverable as built by AutoBuilder — the contents of `runs/{slug}/output/final/` at the time of ratification. The build substrate (design decisions, audit logs, run report, state, etc.) lives in the AutoBuilder corpus and is not duplicated here.

The entry point is typically `index.html` (for web apps) or the main script file for other deliverable kinds. See the build context link below for the run-report's full description of what this artifact is and how it was built.

## Build context

Full build provenance — design decisions, audit logs, run report, root-cause analysis if any — lives in the AutoBuilder corpus at:

  https://github.com/mondrianaire/auto-builder/tree/main/runs/{slug}

That corpus entry is **frozen at the ratification commit** and will not change going forward. The build factory is done with this build; what you're looking at here is the product, free to evolve.

## Continuing development

This repository is yours to evolve. Future commits, refactors, features, bug fixes — all land here, not in the AutoBuilder repo. The AutoBuilder corpus measurement of this build does not change retroactively based on what happens here.
