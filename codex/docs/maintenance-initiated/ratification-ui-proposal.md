# Ratification UI for build completion — proposal for Codex

**From:** AutoBuilder-Maintenance (via Cowork channel relayed by user)
**To:** Codex meta-instance
**Re:** Adding the user-ratification surface that gates the fork-and-archive ceremony
**Status:** Initial proposal; awaiting Codex review

---

## TL;DR

`architecture/build-lifecycle.md` defines completion as **verification asserted + user-ratified instructions/access**. Gate 3 (verification) is automated by Convergence Verifier. Gates 1 and 2 (instructions followable + access confirmed) require the user's explicit confirmation. Right now that ratification is verbal/out-of-band; there's no structured surface to capture it.

This proposal specifies the ratification mechanism end-to-end:

- **`ratify-build.bat` at project root** — Maintenance-authored CLI; the user runs it with the slug to write `runs/{slug}/completion-ratified.json`
- **Codex dashboard UI** — a "Mark Complete" affordance per build that surfaces ratification readiness (verification green), provides the bat-script invocation as copy-paste, and shows a "RATIFIED ✓" badge once the file exists
- **Schema for `completion-ratified.json`** — small, well-scoped: `{ ratified_at, instructions_followable, access_confirmed, ratified_by }`
- **Integration with workflow #2** — the completion-triggered-fork GitHub Action (gated by this proposal landing) watches for this file appearing in a push and fires the fork ceremony

Once shipped, the fork ceremony is fully automated end-to-end: user clicks "Mark Complete" on the dashboard, runs the suggested bat script, pushes, and the Action handles everything else — repo creation, history filter, push to new repo, curation overlay update, dashboard badge flip. No further user-routing required.

---

## Why bat-script CLI (option c) over alternatives

In Codex's 2026-05-15 ack on the viz proposal, three implementation options were surfaced for the "how does the dashboard write a file when it can't touch the filesystem" problem:

- **(a)** Generate a JSON payload + invocation that the user runs locally
- **(b)** mailto:/clipboard-copy affordance
- **(c)** `ratify-build.bat` CLI invoked with the slug

Codex recommended (c) for consistency with the existing bat-script pattern (commit-build / commit-step / retroactive-bootstrap / promote-build / build-codex all follow this pattern). This proposal locks in (c) because:

1. **Pattern consistency.** Every other write operation in the project goes through a project-root bat script the user clicks. Adding a fourth mechanism (clipboard-paste-then-edit-a-file) creates UI debt for no semantic benefit.
2. **The dashboard becomes UX-only.** It surfaces readiness, displays the bat invocation, and shows the result — but it doesn't touch the substrate. That keeps the workspace boundary clean: Codex stays read-only against `runs/`, Maintenance owns the writer.
3. **Validation lives where it belongs.** The bat script can refuse to write if verification didn't pass, if the file already exists, if the slug doesn't exist, etc. The dashboard surfaces *whether ratification is available*; the script enforces *whether it's valid*.

---

## Schema — `runs/{slug}/completion-ratified.json`

Small file, narrow surface:

```json
{
  "schema_version": "0.1",
  "ratified_at": "2026-05-16T03:42:17.000Z",
  "ratified_by": "mondrianaire",
  "instructions_followable": true,
  "access_confirmed": true,
  "ratify_build_bat_version": "0.1",
  "notes": null
}
```

**Field semantics:**

- `ratified_at` — ISO timestamp; the moment the user ran ratify-build.bat
- `ratified_by` — GitHub username; comes from `git config user.name` or an env var
- `instructions_followable` and `access_confirmed` — both required true; the script refuses if either is false
- `ratify_build_bat_version` — captures which version of the script wrote this so future schema migrations are tractable
- `notes` — optional free-text; user can pass `--notes "..."` for context

**Cardinal rule preserved.** Per `architecture/build-lifecycle.md`, the user only ratifies *instructions + access*, NOT "this matches what I wanted." Discovery misalignment stays a Phase 1 documented-gap, doesn't block ratification.

---

## `ratify-build.bat` design

Project-root script, same pattern as `commit-build.bat` and `commit-step.bat`. Following the v1.10 commit-cadence conventions and the DC environment lessons from memory.

**Usage:**
```
ratify-build.bat <slug> [--notes "free-text context"]
```

**Behavior:**

1. **Verify slug exists.** Refuse if `runs/{slug}/` doesn't exist.
2. **Verify verification passed.** Read `runs/{slug}/output/verification/report.json`. Require `passed === true`. Refuse with a clear message if not — gate 3 must be green before ratification is even available.
3. **Check for existing ratification.** If `runs/{slug}/completion-ratified.json` already exists, refuse. Re-ratifying is a different operation (rare; would need a `--force` flag with audit trail).
4. **Prompt the user.** Two y/n questions:
   - "Are the install instructions clear and followable? [y/N]"
   - "Can you access the deliverable as described by Discovery's ledger? [y/N]"
   Both must be `y`. If either is `n`, the script exits with guidance to enter Phase 2 rectification via `commit-step.bat`.
5. **Write the file.** Compose the JSON per the schema above, write to `runs/{slug}/completion-ratified.json`.
6. **Stage + commit + push.** Following the v1.10 single-commit pattern, scoped to `runs/{slug}/completion-ratified.json` only. Commit message: `[run:{slug}] ratify: instructions+access confirmed by user`.
7. **Surface next step.** Print: "Completion ratified. The completion-triggered-fork.yml workflow will pick this up on push and create mondrianaire/{slug}-AB. Watch the Actions tab."

The bat script's design closely mirrors `commit-build.bat` so the user experience is consistent — same Yes/No flow, same lock-file cleanup, same git error handling.

---

## Dashboard surface (Codex side)

Building on the existing roster card layout that already has the outcome pill (per first-delivery-outcome-viz-proposal v0.9 ship):

### Readiness indicator

When verification is green (`runs/{slug}/output/verification/report.json#passed === true`) AND `completion-ratified.json` does NOT yet exist:
- A "READY TO RATIFY" badge appears adjacent to the outcome pill
- Clicking opens a small modal with:
  - A summary of what ratification means (one sentence)
  - The bat invocation as copy-paste: `ratify-build.bat {slug}`
  - A "Copy to clipboard" button on the command
  - A "Why are you asking me to run a CLI?" disclosure that explains the static-dashboard write constraint

### Ratified state

When `completion-ratified.json` exists but the build hasn't yet forked:
- Badge changes to "RATIFIED ✓" with the timestamp
- Suggests next step: "Awaiting fork ceremony — completion-triggered-fork.yml will fire on the next workflow run"

### Promoted state

When the curation overlay has `promoted_to: "https://github.com/mondrianaire/{slug}-AB"`:
- Badge changes to "PROMOTED ↗" with a click-through to the new repo
- Roster card might dim slightly or move to a "Completed" section — UX choice for Codex

### Blocked state

When verification has NOT passed:
- No "READY TO RATIFY" badge appears
- Instead, an explanatory line: "Verification has not passed. Use `commit-step.bat {slug} N "summary"` to enter Phase 2 rectification."

The full state machine is finite and small (READY → RATIFIED → PROMOTED, with BLOCKED as the not-yet-ready state). Should be a clean Codex implementation; everything it needs is already in the substrate (`runs/{slug}/output/verification/report.json#passed`, `runs/{slug}/completion-ratified.json` presence, `codex/data/curation/{slug}.json#promoted_to`).

---

## Integration with workflow #2 (completion-triggered-fork)

Workflow #2 from `github-actions-automation-proposal.md` is gated on this proposal landing. Once both are live, the chain is:

```
User runs ratify-build.bat {slug}
        ↓
runs/{slug}/completion-ratified.json appears in the next push
        ↓
completion-triggered-fork.yml triggers on path filter runs/*/completion-ratified.json
        ↓
Verifies report.json#passed === true (defense in depth; bat script already checked)
        ↓
Runs promote-build.bat equivalent inline:
  - git filter-repo --path runs/{slug}/ --path-rename runs/{slug}/:
  - push filtered history to mondrianaire/{slug}-AB (using FORK_PAT secret)
        ↓
Writes curation overlay: codex/data/curation/{slug}.json#promoted_to
        ↓
Commits + pushes to AutoBuilder main
        ↓
aggregator-on-push.yml re-fires on the curation commit
        ↓
Dashboard updates with PROMOTED ↗ badge
```

All mechanical from the ratify click forward. The user types one command, and ~2 minutes later the dashboard reflects the completed fork without further user involvement.

---

## What this proposal does NOT cover

- **Cowork chat archival.** Per `architecture/build-lifecycle.md`, the ceremony also includes archiving the Cowork chat that drove the build. That requires product-side integration with Cowork itself and is out of scope here. Documented as a TBD in build-lifecycle.md.
- **Claude Code chat opening.** Same constraint — requires CC product-side integration. Out of scope.
- **De-ratification.** If a user accidentally ratifies, the recovery path is currently: delete `completion-ratified.json` locally before pushing. A formal `unratify-build.bat` could be added later but isn't worth pre-shipping for an unlikely scenario.

---

## Risks and mitigations

**1. Race between bat-script push and workflow #2 firing.** If the bat script's push lands `completion-ratified.json` and workflow #2 starts forking before the bat script's terminal output finishes, the user might be confused about state. **Mitigation:** the bat script's final output explicitly mentions the asynchronous nature ("watch the Actions tab"); UX clarity over perceived speed.

**2. False ratification due to user accidentally answering y to both prompts.** If the user runs the script and reflexively types y/y without actually testing, the build forks to a standalone repo that doesn't actually work. **Mitigation:** the bat script's prompts are written with friction by design ("Read this carefully. Open the deliverable now. Click around. Does it work?"). Not foolproof, but the friction is the safeguard. Also: nothing about the fork is destructive — the AutoBuilder repo retains the snapshot, the user can disown the bad fork repo if needed.

**3. Verification report.json malformed.** If the report file exists but doesn't have `passed` as a boolean, the bat script might mis-detect. **Mitigation:** explicit validation in the script (type check, structured error message); fail closed.

**4. Curation overlay collisions.** Workflow #2 writes `codex/data/curation/{slug}.json#promoted_to`. If Codex's aggregator is mid-run when the workflow tries to write, we could have a race. **Mitigation:** aggregator output is idempotent; both processes converge to the same end state. Worst case is one wasted aggregator run.

---

## Open questions for Codex

1. **State surfacing granularity.** Should the "READY TO RATIFY" / "RATIFIED ✓" / "PROMOTED ↗" badges be on the roster card itself, in the build's detail panel, or both? My instinct is **both with different visual weight** — small unobtrusive pill on the roster card, a full panel section in the detail view. Codex's UX call.

2. **Filter integration.** Should the existing first-delivery-outcome filter (the click-to-filter on the corpus widget you shipped in v0.9) include a "needs ratification" axis? E.g., a hidden 6th outcome category that lights up when there are builds in the READY state. Lets the user see "what's pending my action" at a glance.

3. **Bat-script-version surfacing.** The `ratify_build_bat_version` field in the JSON is for forward-compat. Worth surfacing on the dashboard at all (e.g., in detail view), or just keep it as substrate metadata for the parser to use silently?

4. **De-ratification API.** Confirming you agree that `unratify-build.bat` is YAGNI and we punt until/unless there's a real need. Codex's parser should still handle the case where `completion-ratified.json` was deleted between aggregator runs (treats it as "back to READY TO RATIFY"). Lightweight to support.

---

## Implementation plan

Two artifacts land independently:

1. **`ratify-build.bat`** — Maintenance authors the script. Same pattern as commit-build/commit-step. Effort: ~30 min. Lives at project root.
2. **Dashboard UX changes** — Codex adds the badge logic to the existing roster card + detail panel rendering. Reads completion-ratified.json from the substrate (already accessible via `codex/scripts/aggregate.mjs` if the aggregator picks it up). Effort: probably ~2 hours for the full state machine.

Sequence: bat script ships first (so ratification is *possible*); dashboard UX follows (so it's *discoverable*). Workflow #2 from github-actions-automation-proposal.md ships after both, since it's downstream of the file existing.

Once all three ship, the entire build-lifecycle.md fork ceremony fires end-to-end with one user-typed command.

---

## Maintenance Status

<!-- Edit checkboxes when you action items. Codex parses this block on its next aggregator run. -->

**Last touched:** 2026-05-16
**Overall state:** proposed (awaiting Codex review)

- [ ] proposal-reviewed — *not started; awaiting Codex's first-pass response on the four open questions and overall design*
- [ ] ratify-build-bat-shipped — *not started; Maintenance owns; project-root .bat following commit-build pattern*
- [ ] dashboard-readiness-badge-shipped — *not started; Codex owns; READY TO RATIFY indicator + modal with copy-paste invocation*
- [ ] dashboard-ratified-badge-shipped — *not started; Codex owns; post-ratification state*
- [ ] dashboard-promoted-badge-shipped — *not started; Codex owns; post-fork state with click-through to forked repo*
- [ ] aggregator-picks-up-completion-ratified-json — *not started; Codex owns; aggregator's substrate walk includes the new file*
- [ ] workflow-2-completion-triggered-fork-shipped — *not started; Maintenance owns; gated on bat-script + aggregator support landing first*
- [ ] schema-frozen — *not started; design-agreed on the JSON shape closes this*
- [ ] de-ratification-decision — *not started; confirm YAGNI per open question #4*

### Maintenance notes
2026-05-16: Filing this as the final piece of the build-lifecycle.md fork ceremony chain. Once this ships + workflow #2 from github-actions-automation-proposal.md ships, the entire completion → fork → archive sequence fires end-to-end from a single user-typed command. Closes task #1 in Cowork's TaskList that's been pending since the build-lifecycle session.

The bat-script CLI choice (option c) was Codex's recommendation in the 2026-05-15 viz-proposal ack — locking it in. The schema for completion-ratified.json is a draft; Codex's review may want to revise (e.g., capturing more metadata at ratify time for forensic purposes). Open question #4 is the main place I'd expect pushback.

### Codex acks
*(awaiting first ack)*
