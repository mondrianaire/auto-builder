# Claude Code post-promotion handoff — Tier 1 (seeded `.claude/CLAUDE.md` in forked repo)

**Status:** user-greenlit 2026-05-16 — "tier 1 on the seed claude state in forked repo is go". Awaiting Maintenance implementation.
**Author:** Codex meta-instance (relaying user go-ahead).
**Scope:** amend `.github/workflows/completion-triggered-fork.yml` to seed a `.claude/CLAUDE.md` file inside the newly-created `mondrianaire/{slug}-AB` repo at promotion time, so that when the user opens the forked repo in Claude Code, the instance lands with full context about what was built, who built it, and where the product life starts.

## Why this is Tier 1

The post-promotion handoff problem (recorded in conversation 2026-05-16): once `ratify-build.bat` fires workflow #2 and the forked repo is created, the user must open Claude Code against that fork to continue product life. Today there's no hand-off mechanism — a fresh Claude Code instance would have zero context about what AutoBuilder produced, why, or what's already shipped. The mitigation hierarchy was:

- **Tier 1:** seed `.claude/CLAUDE.md` in the forked repo at promotion time. Zero extra clicks for the user; instant context on first Claude Code open.
- **Tier 2:** dashboard "open in Claude Code" affordance that copies a pre-built bootstrap prompt to clipboard.
- **Tier 3:** full hand-off via a Claude Code MCP if/when that surface lands.

Tier 1 is the highest-leverage piece — it works the moment the user opens the fork, requires no Cowork-side tooling, and is purely additive to the existing workflow #2.

## Maintenance Status

<!-- Edit checkboxes when you action items. Codex parses this block on its next aggregator run. -->

**Last touched:** 2026-05-16
**Overall state:** user-greenlit, Maintenance-owned, not started.

- [ ] tier1-claude-md-template-drafted — *Maintenance owns the canonical content of the seeded CLAUDE.md (per architecture's authority over role/lifecycle vocabulary). Template content spec below; Maintenance should treat it as a starting point and refine.*
- [ ] workflow2-amended — *add a step to `.github/workflows/completion-triggered-fork.yml` that writes the templated CLAUDE.md into the new repo before the final push. Substitutions: {slug}, {prompt}, {delivered_at}, {deliverable_kind}, {live_url_if_present}, {verdict}.*
- [ ] tested-on-next-promotion — *first new ratification → fork after this lands should produce a fork with `.claude/CLAUDE.md` at root. Verify visually by opening the new repo.*

## Suggested template content

```markdown
# {slug} — promoted from AutoBuilder

This repo was auto-built by [AutoBuilder](https://github.com/mondrianaire/auto-builder)
and promoted to its own home on {delivered_at} after the user ratified the
initial delivery as followable + accessible.

## Original prompt

{prompt}

## What was built

- **Deliverable kind:** {deliverable_kind}
- **Verification verdict:** {verdict}
- **Live URL (if web_app):** {live_url_if_present}
- **Build report:** see `runs/{slug}/run-report.md` for the full architecture
  trace (Discovery ledger, TD sections, wave structure, escalations,
  CV verdict, lifecycle outcome).

## Where you are now

You are Claude Code running against the **product life** of this artifact —
not the build life. The build life happened upstream in
[AutoBuilder](https://github.com/mondrianaire/auto-builder); this repo is
the working home where the user evolves the artifact going forward.

The AutoBuilder run-report.md is your single best source for "how did this
get here" context. Read it before making structural changes.

## What's safe to edit

Everything. This is the user's repo now. AutoBuilder's role ends at
promotion; from here forward, treat this like any normal Claude Code
project. If the user re-runs the upstream prompt verbatim in AutoBuilder,
that produces a new fork at `mondrianaire/{slug}-AB-N` — it does not
overwrite this one.

## Conventions inherited

- The user's preference for commit hygiene and the project's commit-message
  style come from the user's broader workspace conventions, not from this
  repo specifically. Defer to existing patterns in this repo's git log.
- If this is a `web_app` build with a live deployment, the user's
  deployment target is their own concern — AutoBuilder's shared-Pages
  deployment ends at promotion.

## Lifecycle pointer

For the full AutoBuilder lifecycle vocabulary (Phase 1 / Phase 2 / Three
Completion Gates / Fork Ceremony), see
[`architecture/build-lifecycle.md`](https://github.com/mondrianaire/auto-builder/blob/main/architecture/build-lifecycle.md)
in the upstream repo. You are now post-fork — those terms no longer apply
to ongoing work in this repo.
```

## Substitution mechanics (suggested)

Workflow #2 already extracts `{slug}` from the changed `completion-ratified.json` path. The additional substitutions:

| Variable | Source |
|---|---|
| `{slug}` | already in workflow #2 (from changed file path) |
| `{prompt}` | `runs/{slug}/prompt.txt` (read in workflow) |
| `{delivered_at}` | `runs/{slug}/completion-ratified.json#ratified_at` |
| `{deliverable_kind}` | `runs/{slug}/output/final/deliverable_kind.txt` if exists, else parse from `decisions/discovery/ledger-v1.json#deliverable_kind`, else fallback `other` |
| `{live_url_if_present}` | `codex/data/curation/{slug}.json#live_url` if exists, else empty (template should conditionally render the line) |
| `{verdict}` | `output/verification/report.json#verdict` |

All substitutions are read-only against existing substrate; no new files to author.

## Open questions for Maintenance

1. **Template wording is a first-draft suggestion.** Maintenance owns architecture-side vocabulary (Phase 1/2, lifecycle states, role names) and should adjust the language to match canonical phrasing. Codex's draft above leans toward "minimal correct" rather than "polished" — please refine.

2. **`.claude/CLAUDE.md` vs `.claude/claude.md`** — case matters on Linux but not on Windows/macOS. Suggest stick with `CLAUDE.md` to match the existing convention used in the user's broader workspace (the AutoBuilder repo itself uses `CLAUDE.md` in subprojects). Confirm preference.

3. **Should the seeded CLAUDE.md link back to AutoBuilder's role_charters.md / file_schemas.md?** Codex's draft above intentionally limits the upstream reference to `build-lifecycle.md` (the most user-facing artifact). Maintenance may want to widen or narrow this — your call.

4. **Conditional rendering of `{live_url_if_present}`.** If the deliverable kind is `web_app` and the live_url exists, render the line; otherwise omit it entirely (better than printing a blank value). Suggest the workflow handle this via a small `if [ -n "$LIVE_URL" ]; then ...` block rather than always-render-with-empty-string.

5. **Future Tiers 2/3.** Not blocking Tier 1. When the dashboard's per-build detail panel gains an "open in Claude Code" affordance (Tier 2), the bootstrap prompt should mirror the seeded CLAUDE.md content for consistency. Tier 3 (full MCP handoff) is product-side, currently TBD.

## Why this lands well alongside the rest of v0.15+ work

This is a workflow-yml amendment with no Codex-side dependency. Maintenance can ship it independently of Codex's live-build-visualization work. The first new ratification after this lands validates it; no separate verification scaffolding needed.

---

### Codex acks
2026-05-16: User explicitly greenlit Tier 1 in chat — "tier 1 on the seed claude state in forked repo is go". Filing as Maintenance-owned because workflow #2 + architecture vocabulary both fall on Maintenance's side of the boundary. Codex's contribution ends at this proposal; will not implement.
