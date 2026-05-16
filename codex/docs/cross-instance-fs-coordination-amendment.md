# Cross-instance FS coordination — v1.12-candidate amendment

**Status:** Codex-filed 2026-05-16; Maintenance-owned (it's a workspace-boundary convention, which is architecture territory). v1.12-candidate.
**Author:** Codex meta-instance.
**Scope:** add an explicit cross-instance file-system coordination convention to the existing workspace-boundary memory (`feedback_autobuilder_codex_workspace_boundary.md`) so that Codex and Maintenance sessions running concurrently can detect each other's activity and avoid the corruption modes documented in `codex/docs/concurrent-session-fs-race-finding.md`. Builds on the free signal `.git/index.lock` provides + adds a small custom heartbeat marker for the cases the lock doesn't catch.

## Motivation — three observed corruption events + one live case

**Observed corruptions (from v0.15 implementation session 2026-05-16, all clustered around 12:53–12:57 UTC, confirmed concurrent Maintenance session):**

1. `codex/data/index.json` + `codex/data/bundle.js` got `<<<<<<< Updated upstream` / `>>>>>>> Stashed changes` merge markers mid-file mixing v0.14 + v0.15 versions. Mechanism: `git stash pop` conflict against in-flight Codex aggregator writes.
2. `codex/scripts/build_shape.mjs` got NUL-padded at the tail (verified via `od -c`), confirmed real (not stale-cache) via `node --check` syntax failure.
3. `codex/index.html` got truncated mid-statement, losing the final ~150 lines of script + closing tags. Bash `head`-based fix via `restore-index-html.bat` recovered it.

**Live case (this session, 2026-05-16 ~16:00–16:30 UTC):**

Maintenance is actively writing into Codex's lane (`codex/data/curation/gto-poker-trainer.json`) and into a Codex-owned proposal file (`codex/docs/live-build-visualization-proposal.md`) — under explicit user clearance for the Option A retroactive lifecycle binding. The `.commit-msg-codex.txt` at root has been rewritten by Maintenance to describe a [codex] commit containing this cross-lane work. No corruption observed THIS session — but the lane crossing without a coordination protocol is exactly the setup that produced the v0.15 corruptions, and the next aggregator run or batch edit could collide.

The point: lane-crossing happens legitimately (user clearance, cross-references, opportunistic batching). What's missing is a **lightweight signal so the OTHER instance knows the lane is currently being crossed.**

## The proposed convention

### Layer 1: `.git/index.lock` as a soft-signal check (free)

Before any of these operations, check for `.git/index.lock`. If present, defer 5s and recheck; if still present after 30s of waiting, surface to user with "Deferring: another git operation in progress" and wait for explicit clearance:

- Any `git stash`, `git stash pop`, `git rebase`, `git pull --rebase`, `git push`
- Aggregator runs that write to `codex/data/*` (because they batch many writes)
- Multi-file Edit batches (>2 files)

Catches the merge-marker class of corruption cleanly — `git stash`/pop holds the lock for its full duration.

### Layer 2: `.cowork-active.{instance}` heartbeat marker

Each Cowork session writes a marker file at repo root:

- `codex` session: `.cowork-active.codex`
- `maintenance` session: `.cowork-active.maintenance`

**Lifecycle:**

- On session start: `touch .cowork-active.{instance}`
- Every 30 seconds while active: `touch .cowork-active.{instance}` (refresh mtime as heartbeat)
- On graceful session end: `rm .cowork-active.{instance}`
- Stale after 2 minutes (120 seconds) with no mtime refresh

**Check protocol:**

Before any of the Layer 1 operations OR before any Edit-tool batch that touches files in the OTHER instance's logical lane:

```
for f in .cowork-active.*; do
    [ "$f" = ".cowork-active.{my-instance}" ] && continue
    if [ -f "$f" ] && [ $(($(date +%s) - $(stat -c %Y "$f"))) -lt 120 ]; then
        # Other instance is active; defer
        echo "Deferring to $(basename $f .cowork-active.); retry in 30s"
        sleep 30
        # Recheck (loop)
    fi
done
```

After 5 minutes of waiting, surface to user with "Deferring to {other instance}; user, please confirm we should proceed or wait."

### Layer 3 (optional, can be deferred): structured "currently editing" annotations

Optionally extend the marker file to carry richer metadata:

```
.cowork-active.codex:
{
  "session_started_at": "2026-05-16T16:00:00Z",
  "last_heartbeat_at": "2026-05-16T16:29:30Z",
  "currently_editing": ["codex/docs/cross-instance-fs-coordination-amendment.md"],
  "next_planned_batch": "aggregator run after this file commits"
}
```

Lets the other side know specifically what's being touched. Useful for the Edit-tool batch case where the lock alone doesn't help. Adds complexity; can be deferred to v1.13 if Layer 2 alone proves sufficient.

## How this would have prevented each documented corruption

| Event | Layer that catches it |
|---|---|
| Merge markers in bundle.js + index.json (12:57) | **Layer 1** — Maintenance's `git stash pop` would have held `.git/index.lock`; Codex aggregator would have deferred. |
| NUL-padded build_shape.mjs (12:53) | **Layer 2** — Maintenance's session marker would have been fresh; Codex would have deferred the Edit-tool write. (Lock alone wouldn't help — Edit doesn't check it.) |
| Truncated index.html (12:53–12:57 window) | **Layer 1 or 2** — depending on whether truncation was git-mediated or pure-FS. Either layer would catch the corresponding case. |
| Today's `.commit-msg-codex.txt` rewrite + cross-lane file editing | **Layer 2** — Codex would see Maintenance's fresh marker, defer queue.md commit + aggregator run until Maintenance settles. |

So Layer 1 alone catches 2 of 4; Layer 1 + Layer 2 catches all 4.

## Implementation cost

**Codex side (~15 lines):**

- Session-start hook in Codex bootstrap: `touch .cowork-active.codex`
- Periodic refresh (every 30s) during long sessions: simple cron-style tick from the conversation loop or `setInterval`-equivalent
- Session-end hook: `rm .cowork-active.codex`
- Check helper invoked before aggregator + before Edit batches

**Maintenance side (~15 lines):**

- Same pattern, with `.cowork-active.maintenance`
- `deploy-session.bat` extension: check both `.git/index.lock` and the OTHER instance's marker before the rebase/push step. Defer with retry if present.

**`.gitignore` addition (1 line):**

```
# Cross-instance coordination markers (Layer 2 of cross-instance-fs-coordination-amendment)
/.cowork-active.*
```

(Markers are local-only, not committed. Their mtime is the data; their content is currently empty in Layer 2, JSON in optional Layer 3.)

**Total: ~30 lines split across both instances + 1 .gitignore line + the documented convention.**

## What this proposal does NOT propose

- **Does not propose an enforcement layer.** Both instances must opt in. Neither can force the other to wait. The convention is advisory + visible — but visible coordination is itself the main improvement.
- **Does not propose changing the existing logical write-boundary convention.** Codex still writes only to `codex/`, Maintenance still writes only to `architecture/` + `runs/` + project-root scripts. Lane crossings still require explicit user clearance. This amendment is purely about coordination DURING active sessions, regardless of whether the writes stay in-lane or cross with clearance.
- **Does not propose a Meta-instance.** Per the existing meta-orchestrator-proposal analysis, the user routing burden test (≥60% reduction) determines whether to escalate to agentic Meta. This amendment is in the same family as Option B (queue.md) — cheap, structural, doesn't require new agentic infrastructure.

## Open questions for Maintenance

1. **Layer 3 — defer or include in v1.12?** Codex preference: defer to v1.13 to keep the v1.12 amendment minimal. The Layer 2 marker mtime carries the "is this session fresh" signal; the Layer 3 "what specifically is being touched" only matters if we observe cases where mtime-presence-alone causes too many false-positive defers. Until then, simpler is better.

2. **Heartbeat refresh cadence — 30s as proposed, or finer/coarser?** 30s is cheap (one `touch` call) and gives 2-minute stale-out which is small enough to not block too long when a session ends gracelessly. Finer (10s) is more responsive but noisier. Coarser (60s) might miss short sessions. Maintenance's call.

3. **What about the user-themselves-editing case?** If the user manually edits a file outside either Cowork session, no marker would be active. Neither instance would defer. The marker only coordinates between Codex and Maintenance sessions. Worth being explicit that this is the scope.

4. **Marker file location.** Codex's preference: repo root (matches `.commit-msg-{arch,codex,scripts}.txt` precedent and is easy to detect with one glob). Alternative: under `.git/` directory (already git-ignored by default). Maintenance's call.

5. **What about three concurrent sessions** (e.g., Codex + Maintenance + a separate Cowork window doing something else)? The pattern generalizes — each session writes its own marker, each checks all OTHER markers. No additional protocol changes needed. Codex's draft above already supports this via the glob loop.

## Maintenance Status

<!-- Edit checkboxes when you action items. Codex parses this block on its next aggregator run. -->

**Last touched:** 2026-05-16
**Overall state:** Codex-filed; Maintenance-owned (workspace-boundary convention is architecture territory); v1.12-candidate.

- [ ] proposal-reviewed — *Maintenance reads + acks the two-layer protocol + the cost analysis.*
- [ ] decision-on-layer-3 — *Maintenance picks: include Layer 3 metadata in v1.12, or defer to v1.13 per Codex preference.*
- [ ] cadence-decision — *Maintenance picks heartbeat refresh cadence (Codex's draft: 30s).*
- [ ] marker-location-decision — *Codex's draft: repo root. Maintenance confirms or moves to `.git/`.*
- [ ] convention-text-drafted — *Maintenance writes the canonical convention text into either `feedback_autobuilder_codex_workspace_boundary.md` memory or a new architecture file (workspace coordination is borderline architecture vs convention; Maintenance's call on which surface owns it).*
- [ ] codex-side-shipped — *Codex implements the marker write + check helpers; ~15 lines.*
- [ ] maintenance-side-shipped — *Maintenance extends `deploy-session.bat` with the check; ~15 lines.*
- [ ] .gitignore-updated — *One-line addition for `/.cowork-active.*`.*
- [ ] first-two-session-test — *Validate by running both Codex + Maintenance sessions concurrently and observing the defer behavior.*

### Maintenance notes
*(Maintenance: add your review + decisions here.)*

### Codex acks
2026-05-16: Filing per user direction after a focused thread on whether `.git/index.lock` alone could solve the cross-instance race. Conclusion: it solves ~half the cases (the git-stash-pop class) for free; the other half (Edit-tool batches in the other lane) needs a custom marker. The proposed two-layer protocol is cheap (~30 LoC total) and would have prevented all three v0.15 corruptions documented in `concurrent-session-fs-race-finding.md`.

The amendment is filed as a NEW file under `codex/docs/` rather than as an extension to the existing `concurrent-session-fs-race-finding.md` because: (a) finding-vs-proposal separation matches Codex's prior pattern, (b) per the FS-race-finding's own defensive pattern, large new content lands cleaner in untouched files than as extensions to volatile shared files (the very pattern this proposal would formalize). Cross-reference link from the finding to this amendment will be added once Maintenance has confirmed the proposal direction.

Live evidence collected during the active Maintenance session that produced this filing (Maintenance writing into `codex/data/curation/gto-poker-trainer.json` + adding cross-references to `codex/docs/live-build-visualization-proposal.md` under user clearance) is precisely the kind of lane-crossing the Layer 2 marker would have made visible to Codex without requiring a user-side message: a single glob check on session-active markers would have shown Maintenance was mid-edit, Codex would have deferred its own queue.md commit + aggregator run until Maintenance's session settled.
