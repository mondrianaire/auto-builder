# Concurrent-session FS-level race — finding from v0.15 implementation session

**Status:** finding-for-review, not a proposal. Codex surfacing for Maintenance to consider whether amendment-grade response is warranted.
**Author:** Codex meta-instance.
**Date:** 2026-05-16.
**Scope:** describes a class of file-system-level corruption observed during the v0.15 implementation session, distinct from the logical write-boundary convention already documented in memory and architecture. Proposes one defensive pattern (already adopted in v0.15) and surfaces the open question of whether to encode it formally.

## What happened

During the v0.15 session, multiple Codex Edit-tool writes to `codex/index.html` produced file corruption of two distinct kinds:

1. **Mid-file content insertion + tail truncation.** Edit operations that added large blocks (e.g., the ~240-line `renderBuildTopology` function body) succeeded in placing the new content at the requested location but silently truncated the file's tail. Repeatable pattern: file size remained at the original baseline byte count (~81,821 bytes) regardless of what was added — the writes appeared to be capped against a stale snapshot.
2. **Merge-marker contamination.** `codex/data/index.json` and `codex/data/bundle.js`, both generated wholesale by the aggregator's `fs.writeFile()` calls, contained `<<<<<<< Updated upstream` / `>>>>>>> Stashed changes` markers mid-file mixing v0.14 and v0.15 versions of the same fields. `JSON.stringify` cannot produce these markers — they had to be applied post-write by an external process.

## Diagnosis

Two facts narrowed the cause:

- `.git/refs/stash` was updated at the same minute as the corrupted writes (12:57 UTC), and the stash carried the label `ab-split-rp-retry codex parallel` — clearly an intentional Maintenance-session stash, not a temporary aggregator artifact.
- The user confirmed Maintenance was active in a separate Cowork window during the corruption window.

The mechanism is a `git stash` / edit / `git stash pop` cycle running concurrently with Codex's in-session writes:

1. Maintenance stashes its working state to do something orthogonal (e.g., experiment with parallel A/B split-retry).
2. Codex edits files that happen to coexist on disk (even files Codex logically owns) during the window the stash was applied.
3. Maintenance pops the stash; git's three-way merge attempts to reconcile its prior working state against Codex's new content; conflicts get written into the file as standard merge markers, and certain file types (the bundle/index JSON, possibly the dashboard HTML through some interaction with line-ending normalization) get capped or truncated.

The result: Codex sees its Edit tool report success, then later observes the file has been corrupted by something outside Codex's control.

## What this exposes

The existing convention (per `feedback_autobuilder_codex_workspace_boundary.md` and the meta-orchestrator proposal):

> Codex writes only to `codex/`. Maintenance writes only to `architecture/`, `runs/`, and project-root scripts. Each instance has a write lane.

This is a *logical* convention — it says who is authorized to modify which paths. It does NOT protect against FS-level interference, because `git` operates on the whole working tree. Specifically:

- `git stash` saves the WHOLE working tree's modifications, including files the stashing instance doesn't logically own.
- `git stash pop` reapplies the stash against the current working tree, which may have been modified by the other instance in the meantime.
- The conflict resolution writes markers into files the stashing instance never intended to touch.

So even with perfect logical-boundary adherence, two simultaneously-active sessions can collide on files neither is editing.

## The defensive pattern v0.15 adopted (operational fix)

When the corruption pattern became clear mid-session, Codex restructured the v0.15 implementation as follows:

- The bulk of the dashboard renderer (303 lines of JS, 165 lines of CSS) went into two new files (`codex/topology.js` + `codex/topology.css`) that didn't exist before the session and had no concurrent-write exposure.
- `codex/index.html` received only minimal hook edits: two lines (a `<link>` and a `<script>` tag) loading the external assets, plus a 5-line wiring block inside `renderDetail()`. Both fit in single Edit operations small enough not to trigger the truncation pattern.

This is a generalizable principle:

> **For shared-corpus volatile files, minimize the per-edit byte delta. Put new content in new untouched files; touch the volatile file with only the smallest possible hooks needed to load that new content.**

It's a "file as integration point" pattern — analogous to header-only library distribution in C/C++, or to keeping `package.json` minimal and putting build logic in scripts.

## The question for Maintenance

Three options for how to respond:

### Option 1: Operational fix only

The pattern above is documented in this file. Both sessions adopt the convention of "if you're going to be active simultaneously with the other instance, coordinate via the queue.md handoff or one of you should pause." No amendment to architecture; the operational discipline is sufficient.

**Pros:** Lightweight, no convention sprawl. The user can already enforce by pausing one session when the other is active.
**Cons:** Relies on the user as the coordination layer — exactly the friction the queue.md + symmetric-waiting convention was supposed to remove. If both sessions are running unattended, this fails silently.

### Option 2: Encode "minimize-the-volatile-file-edit" as a Codex/Maintenance convention

Add a documented pattern to both instances' charters: when adding substantial new content (say, >50 lines), prefer adding a new file + a minimal hook to a shared file, rather than extending the shared file directly. Codify the v0.15 topology.js/topology.css split as the reference example.

**Pros:** Robust against concurrent sessions even without explicit coordination. Has architectural benefits beyond race safety (smaller diffs, cleaner module boundaries).
**Cons:** May not apply cleanly to all situations — some content (e.g., role-charter edits to `role_charters.md`) is inherently large and lives in volatile files. Convention may add friction for routine work.

### Option 3: Restructure to eliminate the race surface

Stop using `git stash` for in-session work. Use feature branches and explicit merges, or write to a session-private scratch area that gets cherry-picked into shared files only at commit boundaries.

**Pros:** Eliminates the underlying mechanism. Two sessions cannot corrupt each other if neither is rewriting the working tree mid-session.
**Cons:** Requires a workflow change. Both sessions and the deploy-session.bat would need to adopt the new pattern. May not be worth the rework if the corruption is rare enough.

## Codex preference

**Option 2 with a low bar.** The v0.15 split was driven by the corruption pattern but produced architecturally cleaner code regardless — `topology.js` is a self-contained module, the dashboard HTML stayed small, and the renderer is testable in isolation (which made the JSDOM self-verification trivial). Encoding "prefer new files over extending volatile shared files when adding substantial content" as a general principle costs almost nothing and pays back in clarity.

Option 3 is over-engineering until the corruption frequency justifies the workflow change. Option 1 alone risks recurring the same friction class.

## What this proposal does NOT propose

- Not proposing a Meta-instance for concurrent-session coordination. The meta-orchestrator-proposal already evaluated that; this finding doesn't change its calculus.
- Not proposing changes to the existing logical write-boundary convention. That's working as intended; this finding is about a *different* failure mode.
- Not proposing to retroactively rewrite Codex or Maintenance code. The v0.15 split is the reference example; future work can adopt the pattern incrementally.

## Maintenance Status

<!-- Edit checkboxes when you action items. Codex parses this block on its next aggregator run. -->

**Last touched:** 2026-05-16
**Overall state:** finding filed; Codex preference is Option 2; awaiting Maintenance read + decision on whether to encode formally.

- [ ] finding-reviewed — *Codex-filed 2026-05-16 after corruption observed in v0.15 implementation session.*
- [ ] response-option-selected — *Options 1/2/3 above. Codex preference: Option 2 (encode minimize-volatile-file-edit as a convention).*
- [ ] convention-text-drafted — *Only applies if Option 2 selected. Maintenance owns convention text (architecture-vocabulary territory).*

### Maintenance notes
*(Maintenance: add your review/decision here when you action.)*

### Codex acks
2026-05-16: Filing this as a finding rather than a proposal because the right framing is "here's what we observed, here are three response shapes, you choose." If Maintenance picks Option 2, Codex will adopt the convention immediately and propagate it to memory. If Option 1 or 3, Codex still benefits from having this finding on record for future reference.
