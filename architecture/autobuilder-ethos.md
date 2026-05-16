# About AutoBuilder

*This document is the canonical AutoBuilder introduction for readers with no prior context. Its content is prepended verbatim to every `PROJECT-OVERVIEW.md` synthesized at ratification, so a fresh agent (or human) opening any build's corpus entry gets the same baseline orientation. The "About this build" sections that follow it are project-specific.*

---

## What AutoBuilder is

AutoBuilder is an autonomous build system. You give it a single prompt describing what you want, and it builds a deployable application — without further interaction during the build. The user prompts once, the system attempts to deliver once, and the build's outcome (success, partial success, recoverable failure, abandoned failure) becomes a measurement record in a corpus of past builds.

The system isn't trying to be a coding assistant. It's trying to be a one-shot builder: prompt-in, artifact-out, with the artifact's quality and the system's behavior both recorded as data.

## The North Star

Always deliver a working artifact, even when faced with uncertainty. Gaps in understanding are *documented* — not used as escape hatches for "I couldn't do this." A build that hits a true unknown produces an artifact plus an uncertainty manifest describing what it didn't know and why. The user always gets something.

This means: AutoBuilder never asks the user for clarification mid-build. It commits to its best-effort interpretation, documents that interpretation, ships, and lets the user judge whether the interpretation matched what they actually wanted. (When it didn't — when the artifact works but isn't what the user meant — that's a learning signal about the system's interpretation quality, captured in the corpus for future architecture amendments.)

## What a "build" is

A build is one attempt to satisfy one user prompt. It has a clear beginning (the prompt) and a clear end (the artifact, plus the records of how it was made).

Builds move through up to two phases inside AutoBuilder:

- **Phase 1 — Initial Delivery.** The system runs end-to-end and produces an artifact. If that artifact is functional, deployable, and accessible, the build's branch is *done* — it never gets appended to again.
- **Phase 2 — In Limbo (only if needed).** If the Phase-1 artifact is broken or unusable, the build enters a strictly-rectification phase where each commit chases one of three completion gates: install instructions are clear, the deliverable is accessible, and internal verification passes. Feature work is forbidden during Phase 2; only fixes that close the gates count.

When all three gates are green, the build is **RATIFIED** — the user has explicitly confirmed they can install and use the deliverable — and the build's corpus entry freezes. No further commits to the build's substrate in this repository after ratification.

## What "ratified" and "promoted" mean

**Ratified** = the build is complete. The corpus entry is sealed. This always happens to a build that closes its three gates.

**Promoted** (opt-in) = the user found the build interesting enough to keep developing as a product, so the deliverable is forked to its own standalone GitHub repository for ongoing product life. Most builds stay in the corpus and don't get promoted. A few get promoted and live on as independent applications, evolving under their own development process unrelated to AutoBuilder.

These are different events with different triggers. Ratification is universal (every successful build gets it). Promotion is a deliberate user decision after ratification.

## What lives in a build's corpus entry

Three categories of files (see `architecture/build-lifecycle.md` § Three categories of run substrate for the formal definition):

- **Category 1 — Project metadata.** What you're reading right now, plus the original prompt and the ratification record. Plain-language. Designed for readers like you who don't have AutoBuilder context yet.
- **Category 2 — Build byproduct data.** Heavy structured records of how AutoBuilder built this artifact — design decisions, audit logs, role outputs, verification reports, state files. Written in AutoBuilder's internal vocabulary. Read by the system measuring itself, not by general readers. If you find yourself in this directory, you're studying AutoBuilder's process, not the build's product.
- **Category 3 — The deliverable.** The actual production artifact, at `output/final/`. This is what the user installs and runs. If this build was promoted, the contents of `output/final/` were forked to a standalone repo and continued to evolve there.

## How to navigate from here

If you opened this `PROJECT-OVERVIEW.md` because you wanted to understand a specific build, the rest of this document is about that build.

If you're looking for the **actual product** — how to install it, what it does, how to use it — that's the Cat-3 README:
- If this build was promoted, the README lives at the promoted standalone repo (URL in the build-specific section below)
- If this build was not promoted, the README (or equivalent) lives at `output/final/` within this corpus entry

If you're looking for **AutoBuilder internals** — how the build's components were chosen, what verification said, what failed mid-build, why decisions were made the way they were — that lives in Cat 2 files of this corpus entry (`run-report.md`, `root-cause-analysis.md`, `audit/`, `decisions/`, `state/`, `output/verification/`). Be warned: those are written in AutoBuilder vocabulary, and they assume you already know how the system works.

If you're looking for **the AutoBuilder project itself** — its architecture, principles, role charters, lifecycle definitions, roadmap — that lives at the root of this repository: `architecture/` for canonical specs, `codex/docs/` for active coordination proposals between the meta-instances that maintain AutoBuilder.

---
