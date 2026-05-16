# gto-poker-async-duel

> Build a GitHub-Pages-hostable web application that lets two users play an asynchronous head-to-head GTO poker quiz, submit per-decision confidence ratings, and receive a post-game summary highlighting their highest-confidence disagreements.

This is the Cat 1 (project metadata) wrap-up overview for AutoBuilder build **`gto-poker-async-duel`**, ratified on 2026-05-16T10:17:18.869Z by **Jett**. It is written automatically by the wrap-up routine that runs as the final step of `ratify-build.bat`.

The purpose of this document is to orient a brand-new reader — including a fresh Claude instance with no prior context on AutoBuilder — to what this build is, what it produced, and where to look next. It is intentionally lightweight; for full build provenance see Cat 2 documents listed at the end.

---

## What this build is

| Field | Value |
|---|---|
| Slug | `gto-poker-async-duel` |
| Deliverable kind | `web_app` |
| Verification verdict | `pass_with_concerns` |
| First-delivery outcome | `succeeded_with_concerns` |
| Architecture version | `unknown` |
| Build wall-clock | 135 minutes |
| Ratified | 2026-05-16T10:17:18.869Z |
| Ratified by | Jett |

## Original prompt

```
Previously you created an application called "GTO Poker Training" that was a proof of concept and a mini research and analysis project for creating a web application that allows a user to play poker, track useful GTO orientated poker stats and had an almost "quiz like" application relating to presenting various "edge cases" that highlight specific GTO philosophies and presenting the user with various choices and ranking them and providing feedback based on interpretation of GTO research.

I introduced my mom to this application and she loved it. We would read through the hand descriptions, and guess to each other what the correct answer was. When we entered it and saw the actual data, it was so much fun and so informative to be able to read the GTO description and defense of "optimal" plays while identifying plays where confidence may be lower and the answer may not be as clear cut.

I do not live physically near my mom and I was thinking how easy it would be to extrapolate on this GTO build and attempt to create an asynchronous multiplayer GTO Poker head to head quiz game where users are presented with identical GTO "gotchas" and there is some type of communication either direct or in game to discuss or diagree with the GTO verified action.

In addition to a selection of a correct answer, it would be neat to implement a "confidence" function where users indicate how sure they are of their decisions. This would allow a post-game wrap up screen that highlighted the GTO gotchas that showed the highest confidence gap between differing answers.

It is imperative that this application fully can be hosted on github pages, that the game fully functions asynchronsly, and users can "build up" a handful of answers before they must wait for the other user to submit their answers and then create more for the opposing player. This rotation goes for a set number of rounds and then statistics regarding player performance and player agreement is shown to both users. If possible implement an opt in notification function that will use mobile or desktop notification libraries to notify the opposing player that it is their turn.

```

## Telos (north star)

Build a GitHub-Pages-hostable web application that lets two users play an asynchronous head-to-head GTO poker quiz, submit per-decision confidence ratings, and receive a post-game summary highlighting their highest-confidence disagreements.

## Where the deliverable lives

The production deliverable for this build is at `runs/gto-poker-async-duel/output/final/`. After promotion (an opt-in event distinct from ratification), this directory is forked verbatim to `mondrianaire/gto-poker-async-duel-AB` as a standalone repo for ongoing product life.

**Live URL:** https://mondrianaire.github.io/auto-builder/runs/gto-poker-async-duel/output/final/index.html (set by promotion / Pages auto-enable, or via curation overlay).

## Where to look next

- **Cat 3 (the actual deliverable):** `runs/gto-poker-async-duel/output/final/` — the working artifact this build produced.
- **Cat 2 (build byproduct data, for studying the AutoBuilder process itself):**
  - `runs/gto-poker-async-duel/run-report.md` — full narrative of how the build went
  - `runs/gto-poker-async-duel/audit/` — per-role audit logs
  - `runs/gto-poker-async-duel/decisions/` — decision records
  - `runs/gto-poker-async-duel/output/verification/report.json` — verification verdict + evidence
  - `runs/gto-poker-async-duel/root-cause-analysis.md` — present only if the build had a non-trivial failure-and-recovery path
- **Cross-corpus dashboard:** the Codex dashboard at `codex/` (or `https://mondrianaire.github.io/auto-builder/codex/` if Pages is enabled) shows this build alongside every other AutoBuilder build with comparable axes.

## What "ratified" means (briefly)

Ratification means three things were true at the moment of ratification:

1. **Gate 3 (verification):** the build's CV (Comprehensive Verification) verdict was `pass` or `pass_with_concerns`.
2. **Gate 1 (instructions):** the user confirmed install instructions are clear and followable.
3. **Gate 2 (access):** the user confirmed the deliverable is accessible as Discovery described.

Ratification freezes the corpus entry for this build. Subsequent work on this slug (if any) belongs in the promoted fork at `mondrianaire/gto-poker-async-duel-AB`, not in the corpus.

## What "promotion" means (briefly)

Promotion is a SEPARATE event from ratification — it's the user's opt-in decision that this build is worth standalone product life. Promotion forks `output/final/` (and only that) to a new repo, seeds it with this orientation material, and (for web_app builds) auto-enables GitHub Pages. The corpus entry remains frozen regardless.

See `architecture/build-lifecycle.md` for the full lifecycle spec.
