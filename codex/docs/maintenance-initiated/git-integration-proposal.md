# Git Integration — proposal for Codex

**Status:** draft for review.
**Author:** AutoBuilder-Maintenance meta-instance.
**Initiator:** Maintenance (first Maintenance-initiated coordination doc per option (a) of the async-coordination convention).
**Scope:** establish a single-repo git convention with per-build versioning, snapshot tags, and a promotion path — covering both retroactive integration of the 9 existing builds and the going-forward workflow for new builds.

---

## Compact summary — for Codex

**The problem.** Project-level git is active and architecture commits flow cleanly, but per-build git is not yet operationalized. The 9 historical builds sit as an undifferentiated mass under `6aa4d8f`'s import commit; new builds have no commit cadence; Codex's `readGitLog()` adapter has nothing to parse. The user has clarified two constraints that shape the answer: (a) they may want to promote select builds to standalone top-level GitHub repos in the future, and (b) they do NOT want a GitHub account cluttered with one repo per build (most builds will never be promoted).

**The decision.** Single repo throughout (Pattern 4 from the discussion). Each build's commits live in the parent repo, prefixed with `[run:{slug}]` so they're filter-greppable. Each first delivery is marked with an annotated tag `delivery/{slug}`. Additional-step revisions get tags `delivery/{slug}/rev-N`. Promotion of a select build to a standalone GitHub repo uses `git filter-repo --path runs/{slug}/` as a one-time per-promoted-build operation. GitHub footprint: 1 repo (AutoBuilder) + K (promoted builds only).

**Why not submodules.** Submodules with one GitHub repo per build creates clutter the user explicitly wants to avoid. Submodules with local bare-repo remotes solves the clutter problem but costs daily tooling complexity, retrofit complexity, and Pages-deploy complexity for an event (promotion) that happens occasionally. Single-repo solves the same clutter problem with `git filter-repo` paying the promotion cost once per promoted build instead of paying submodule overhead every day.

**What changes on Codex's side.** A small `readGitLog()` adapter (~50 lines) parsing the parent repo's tags and commits to populate `revisions[]`. The schema and dashboard panels already support the data shape; the adapter just needs to know what tags and prefixes to look for. Spec is in §6 below.

**What changes on Maintenance's side.** Four new `.bat` scripts at the project root (`commit-build.bat`, `commit-step.bat`, `retroactive-bootstrap.bat`, `promote-build.bat`), a one-time retroactive bootstrap pass on the 9 historical builds, and Orchestrator charter amendments to commit at phase boundaries during build runs. Specs in §3-5, §7, §9 below.

---

## Maintenance Status

<!-- Edit checkboxes when you action items. Codex parses this block on its next aggregator run. Convention from coordination-proposal.md, ratified 2026-05-14. -->

**Last touched:** 2026-05-14
**Overall state:** not-started

- [ ] proposal-reviewed-by-codex — *Codex has read this proposal*
- [ ] convention-agreed — *Codex accepts the convention as written, or amends with counter-proposal in Codex acks below*
- [ ] codex-implements-readgitlog — *Codex builds the readGitLog adapter against the spec in §6*
- [ ] codex-implements-revisions-rendering — *Codex's dashboard renders revisions[] correctly for parent-repo data*
- [ ] maintenance-writes-commit-build-bat — *commit-build.bat script written at project root*
- [ ] maintenance-writes-commit-step-bat — *commit-step.bat script written*
- [ ] maintenance-writes-retroactive-bootstrap-bat — *retroactive-bootstrap.bat script written*
- [ ] maintenance-writes-promote-build-bat — *promote-build.bat script written*
- [ ] orchestrator-charter-updated — *Orchestrator charter amended to include commit-at-phase-boundaries during build runs*
- [ ] retroactive-bootstrap-executed — *The 9 historical builds receive their bootstrap commits and delivery tags*
- [ ] first-going-forward-build-uses-convention — *First post-convention build uses commit-build.bat and lands as a clean per-build commit + tag in git*

### Maintenance notes
2026-05-14: Proposal authored. Decision is Pattern 4 (single-repo with prefix conventions + tags), arrived at after walking through three alternatives with the user. Key user constraints driving the decision: (1) they may promote select builds to standalone GitHub repos but only the ones they "genuinely like" — most builds stay within AutoBuilder; (2) they do not want GitHub account clutter from one-repo-per-build. Pattern 4 satisfies both. Ready for Codex review.

### Codex acks
(awaiting Codex review and convention agreement)

---

## §1 Decision and rationale

**Decision: Pattern 4 — Single repo throughout, with structured prefix conventions and annotated tags.**

The reasoning, in short:

1. **GitHub clutter is the deciding user-side constraint.** Patterns 2 (submodules with GitHub remote per build) and 3 (submodules with local-bare remotes) and 4 (single-repo) all interact with this constraint differently. Pattern 2 fails the constraint outright. Patterns 3 and 4 are equivalent in GitHub footprint (only promoted builds get GitHub presence). The choice between 3 and 4 collapses to "do you pay submodule complexity daily for an occasional benefit, or pay extraction complexity at promotion time?" The latter is the better tradeoff for a research bed where most builds are never promoted.

2. **`git filter-repo` is the right promotion mechanism** under Pattern 4. It produces a clean standalone repo with just the build's history, no parent-repo contamination, no submodule pointer dance. One-time cost per promoted build (~3 minutes of scripted work).

3. **Per-build "feel" is preserved by convention.** `git log --grep "\[run:{slug}\]"` shows that build's history. `git log -- runs/{slug}/` shows commits touching that path. `git checkout delivery/{slug}` restores the snapshot. The mental model "this build has its own version line" is supported even though the storage is unified.

4. **Pages deployment is native.** No Actions config needed beyond standard Pages setup. The flat-snapshot-on-deploy step that Pattern 3 would require is avoided.

5. **Retrofit is cheap.** 9 historical builds become 9 commits + 9 tags via a one-time bootstrap script. Not 9 `git init`s + 9 submodule entries.

---

## §2 Commit prefix convention

Every commit's first-line summary begins with a stream prefix in square brackets. The prefix identifies which stream the commit belongs to so `git log` filtering and `readGitLog()` parsing become trivial.

| Prefix | Stream | Example |
|---|---|---|
| `[run:{slug}]` | Build-run commits during a primary build | `[run:earthquake-map] phase: build complete (4 sections passed)` |
| `[step:{slug}:rev-N]` | Additional-step (refine) commits on an existing build | `[step:streamdock-applemusic-touchbar:rev-1] manifest: corrected Controllers token from TouchBar to Knob per canonical evidence` |
| `[arch] v1.X` | Architecture amendments | `[arch] v1.10: confidence-graded verdicts + research exhaustion criterion` |
| `[coordination]` | Coordination proposal status block edits | `[coordination] format-agreed + github-pages retrofit` |
| `[codex]` | Codex-side scripts, dashboard, parser changes (Codex's own commits, if they adopt the prefix) | `[codex] readGitLog adapter v1` |
| `[retroactive]` | One-time historical bootstrap commits during retrofit | `[retroactive] {slug}: imported primary delivery from pre-git substrate` |

**Scope rule:** `[run:{slug}]` commits MUST only touch files inside `runs/{slug}/`. Same for `[step:{slug}:...]`. This scope discipline is what makes `git filter-repo --path runs/{slug}/` produce a clean extraction at promotion time. Cross-scope commits would smear history during extraction and force manual surgery.

`[arch]`, `[coordination]`, `[codex]` commits never touch `runs/`. `[retroactive]` commits are scoped to one build's `runs/{slug}/` per commit.

---

## §3 Tag scheme

Every first delivery is marked with an annotated tag:
```
delivery/{slug}
```
pointing to the commit at which `output/final/` was populated and verified. This is the snapshot users restore to via `git checkout delivery/{slug}` (working tree returns to that exact build's first-delivery state).

Additional-step revisions get tags:
```
delivery/{slug}/rev-1
delivery/{slug}/rev-2
...
```
Annotated tags throughout (use `git tag -a -m "..."`). The annotation message carries:
- Verdict (`pass`, `pass_with_concerns`, `fail`)
- Codex's `first_delivery_outcome` for that revision
- Brief summary of what changed (for rev-N tags: what the refine fixed)

**Cardinal rule alignment.** The `delivery/{slug}` tag is structurally immutable — it always points to the first-delivery commit, no matter how many refines accumulate. This is the git-level encoding of Codex's "revisions never change `first_delivery_outcome`." Users querying the tag see the original delivery's state, even when rev-3 has surpassed it.

---

## §4 Build-time workflow (going forward)

**Orchestrator amendments** (§9 covers charter changes in detail). During a build run, the Orchestrator commits at six phase boundaries:

1. After Discovery completes — `[run:{slug}] phase: discovery complete`
2. After TD completes — `[run:{slug}] phase: td complete`
3. After Editor passes — `[run:{slug}] phase: editor pass`
4. After Coordinator's build phase completes — `[run:{slug}] phase: build complete`
5. After Integrator completes — `[run:{slug}] phase: integration complete`
6. At delivery (after CV passes, before `final/` copy) — `[run:{slug}] delivery: final artifact written`

The delivery commit is followed by:
- `git tag -a delivery/{slug} -m "Primary delivery of {slug}. Verdict: ..."`
- `git push --follow-tags origin main`

Commits 1-5 are optional in the strictest sense (the user could compress to just the delivery commit). But the per-phase cadence is what gives Codex's narrative reconstruction a real timeline to render. Recommended.

**Refine workflow (Reason 1: failed-but-close):**

1. User identifies refine candidates after a build's first delivery
2. Maintenance/Orchestrator patches the artifact in `runs/{slug}/output/final/` (and any upstream files that need to change)
3. Commit: `[step:{slug}:rev-1] description of what was fixed`
4. Tag: `git tag -a delivery/{slug}/rev-1 -m "Additional step rev-1: ..."`
5. Push with `--follow-tags`

**Promotion workflow (Reason 2: I genuinely like this):**

The `promote-build.bat` helper (§5.4) handles this. Manual sequence under the hood:

1. Create empty GitHub repo at `https://github.com/Jett/{new-name}`
2. From a fresh directory: `git clone --no-local file://[parent-repo-path] {new-name}-extracted`
3. `cd {new-name}-extracted && git filter-repo --path runs/{slug}/ --path-rename runs/{slug}/:`
4. `git remote remove origin && git remote add origin https://github.com/Jett/{new-name}.git`
5. `git push -u origin main --tags`
6. Optional: in the parent AutoBuilder repo, leave the build in place (it stays as part of the corpus) or add a curation note that it's been promoted.

---

## §5 Bat script drafts

### §5.1 `commit-build.bat`

Drop-in at project root. Run from Windows after a build's delivery is staged in `output/final/`. Argument is the build slug.

```bat
@echo off
REM commit-build.bat — Commit a primary build delivery and tag it.
REM Usage: commit-build.bat <slug>

setlocal
cd /d "%~dp0"
set "SLUG=%~1"

if "%SLUG%"=="" (
    echo Usage: commit-build.bat ^<slug^>
    exit /b 1
)
if not exist "runs\%SLUG%" (
    echo *** runs\%SLUG% does not exist. ***
    exit /b 1
)

echo === Clearing any stuck git lock files ===
if exist .git\index.lock del /f /q .git\index.lock
if exist .git\config.lock del /f /q .git\config.lock
if exist .git\HEAD.lock del /f /q .git\HEAD.lock

echo === Staging runs\%SLUG% ===
git add "runs\%SLUG%" || goto :err

echo === Committing delivery ===
git commit -F "scripts\msg-templates\delivery-%SLUG%.txt" 2>nul || git commit -m "[run:%SLUG%] delivery: final artifact written" -m "Primary delivery commit for %SLUG%. Generated by commit-build.bat; tag delivery/%SLUG% applied next." || goto :err

echo === Tagging delivery/%SLUG% ===
git tag -a "delivery/%SLUG%" -m "Primary delivery: %SLUG%" || goto :err

echo === Pushing commit and tag ===
git push --follow-tags origin main || goto :err

echo === DONE — %SLUG% delivered, tagged, pushed ===
pause
exit /b 0

:err
echo *** A step failed. See output above. ***
pause
exit /b 1
```

The script optionally reads a per-build message template from `scripts\msg-templates\delivery-{slug}.txt` if present (Orchestrator can write a richer multi-line commit message during the build); otherwise it falls back to a default.

### §5.2 `commit-step.bat`

For additional-step revisions on an existing build. Two arguments: slug and rev-number.

```bat
@echo off
REM commit-step.bat — Commit an additional-step revision on an existing build.
REM Usage: commit-step.bat <slug> <rev-number> "<summary>"
REM Example: commit-step.bat earthquake-map 1 "Fixed magnitude color scale rendering"

setlocal
cd /d "%~dp0"
set "SLUG=%~1"
set "REV=%~2"
set "SUMMARY=%~3"

if "%SLUG%"=="" goto :usage
if "%REV%"=="" goto :usage
if "%SUMMARY%"=="" goto :usage
if not exist "runs\%SLUG%" (
    echo *** runs\%SLUG% does not exist. ***
    exit /b 1
)

echo === Clearing locks ===
if exist .git\index.lock del /f /q .git\index.lock

echo === Staging runs\%SLUG% ===
git add "runs\%SLUG%" || goto :err

echo === Committing rev-%REV% ===
git commit -m "[step:%SLUG%:rev-%REV%] %SUMMARY%" -m "Additional-step revision on %SLUG%. Primary-delivery tag (delivery/%SLUG%) remains pinned to the original first-delivery commit per the cardinal rule." || goto :err

echo === Tagging delivery/%SLUG%/rev-%REV% ===
git tag -a "delivery/%SLUG%/rev-%REV%" -m "Additional step rev-%REV%: %SUMMARY%" || goto :err

echo === Pushing commit and tag ===
git push --follow-tags origin main || goto :err

echo === DONE — %SLUG% rev-%REV% committed, tagged, pushed ===
pause
exit /b 0

:usage
echo Usage: commit-step.bat ^<slug^> ^<rev-number^> "^<summary^>"
exit /b 1

:err
echo *** A step failed. ***
pause
exit /b 1
```

### §5.3 `retroactive-bootstrap.bat`

One-time script that bootstraps all existing builds. Walks each `runs/{slug}/` directory, makes one `[retroactive]` commit per build, applies a `delivery/{slug}` tag, and pushes everything.

```bat
@echo off
REM retroactive-bootstrap.bat — One-time retrofit of the 9 historical builds.
REM Each build gets a single [retroactive] commit and a delivery/{slug} tag.

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo === Clearing locks ===
if exist .git\index.lock del /f /q .git\index.lock

REM Hardcode the 9 historical slugs in delivery order (most recent first)
set "SLUGS=streamdock-applemusic-touchbar streamdock-apple-music-touchbar earthquake-map gto-poker-trainer latex-equation-renderer kanban-board blackjack-trainer blackjack tic-tac-toe"

for %%S in (%SLUGS%) do (
    echo.
    echo === Processing %%S ===
    if not exist "runs\%%S" (
        echo skipping %%S - directory not found
    ) else (
        git add "runs/%%S" || goto :err
        git commit -m "[retroactive] %%S: imported primary delivery from pre-git substrate" -m "Historical build, primary delivery only. This commit represents the as-shipped state of runs/%%S/ at the time per-build git was retrofit. The original build ran across multiple sessions before this convention existed; per-section timeline information is captured in the substrate (audit/, history/, state/) but not reconstructed as per-section commits." || goto :err
        git tag -a "delivery/%%S" -m "Retroactive primary delivery: %%S" || goto :err
        echo committed and tagged delivery/%%S
    )
)

echo === Pushing all commits and tags ===
git push --follow-tags origin main || goto :err

echo === DONE — historical builds bootstrapped ===
pause
exit /b 0

:err
echo *** A step failed. ***
pause
exit /b 1
```

**Note:** the script does ONE commit per build (Pattern A from the prior discussion). Per-section commit reconstruction was considered and rejected: the timestamp data isn't reliably captured in the existing substrate, and Codex's curation overlay is the right place for per-build narrative depth.

### §5.4 `promote-build.bat`

Promotion script for builds the user "genuinely likes." Extracts a single build's history into a standalone repo via `git filter-repo`, configures a new remote, pushes. Requires `git-filter-repo` to be installed (`pip install git-filter-repo` — note the dash). Two arguments: slug and new-repo-name (typically same as slug).

```bat
@echo off
REM promote-build.bat — Promote a build to a standalone GitHub repo.
REM Usage: promote-build.bat <slug> <new-repo-name>
REM Prereq: git-filter-repo installed; GitHub repo created at https://github.com/Jett/<new-repo-name>

setlocal
cd /d "%~dp0"
set "SLUG=%~1"
set "NEWNAME=%~2"

if "%SLUG%"=="" goto :usage
if "%NEWNAME%"=="" goto :usage
if not exist "runs\%SLUG%" (
    echo *** runs\%SLUG% does not exist. ***
    exit /b 1
)

set "EXTRACT_DIR=..\%NEWNAME%-extracted"

echo === Cloning fresh copy of repo into %EXTRACT_DIR% ===
if exist "%EXTRACT_DIR%" (
    echo *** %EXTRACT_DIR% already exists; aborting. Remove it first if you want to re-run. ***
    exit /b 1
)
git clone --no-local "file://%CD%" "%EXTRACT_DIR%" || goto :err

cd /d "%EXTRACT_DIR%"

echo === Filtering history to only runs/%SLUG%/ ===
git filter-repo --path "runs/%SLUG%/" --path-rename "runs/%SLUG%/:" || goto :err

echo === Setting new remote ===
git remote remove origin 2>nul
git remote add origin "https://github.com/Jett/%NEWNAME%.git" || goto :err

echo === Pushing to new GitHub repo ===
git push -u origin main --tags || goto :err

echo === DONE — %SLUG% promoted to https://github.com/Jett/%NEWNAME% ===
echo.
echo The original AutoBuilder repo still contains runs\%SLUG%\.
echo Add a curation note in codex\data\curation\%SLUG%.json if you want to record the promotion.
pause
exit /b 0

:usage
echo Usage: promote-build.bat ^<slug^> ^<new-repo-name^>
echo Example: promote-build.bat earthquake-map earthquake-map
echo Prereq: git-filter-repo installed; empty GitHub repo created at the target URL.
exit /b 1

:err
echo *** A step failed. ***
pause
exit /b 1
```

The extracted repo lives outside the AutoBuilder workspace, so it doesn't accidentally get picked up by the AutoBuilder aggregator. The user can clone it from GitHub into wherever they want afterward.

---

## §6 Codex `readGitLog()` adapter spec

The adapter populates `revisions[]` per build by reading the parent repo's tags and commits.

**Input:** the parent repo path, a build slug.

**Output:** an array of revision objects matching the existing Codex schema.

**Algorithm:**

```javascript
// codex/scripts/readGitLog.mjs (proposed location)
import { execSync } from 'node:child_process';

function git(repoPath, args) {
  return execSync(`git -C "${repoPath}" ${args}`, { encoding: 'utf8' }).trim();
}

export function readGitLog(repoPath, slug) {
  // 1. Find all delivery tags for this slug
  const tagFormat = '%(refname:short)|%(objectname)|%(creatordate:iso)|%(contents:subject)';
  const tagsRaw = git(repoPath, `tag -l "delivery/${slug}*" --format='${tagFormat}'`);
  if (!tagsRaw) return [];

  const tags = tagsRaw.split('\n').filter(Boolean).map(line => {
    const [tagname, sha, date, subject] = line.split('|');
    const isRev0 = tagname === `delivery/${slug}`;
    const revLabel = isRev0 ? 'rev-0' : tagname.split('/').pop(); // e.g., 'rev-1'
    return {
      rev: revLabel,
      type: isRev0 ? 'primary_run' : 'additional_step',
      tag: tagname,
      commit: sha,
      date: date,
      subject: subject
    };
  });

  // 2. Sort: rev-0 first, then rev-1, rev-2, ...
  tags.sort((a, b) => {
    if (a.rev === 'rev-0') return -1;
    if (b.rev === 'rev-0') return 1;
    const aN = parseInt(a.rev.split('-')[1], 10);
    const bN = parseInt(b.rev.split('-')[1], 10);
    return aN - bN;
  });

  // 3. For each tag, also fetch the contributing commits (between previous tag and this tag, scoped to runs/{slug}/)
  for (let i = 0; i < tags.length; i++) {
    const fromRef = i === 0 ? '' : tags[i - 1].tag;
    const toRef = tags[i].tag;
    const range = fromRef ? `${fromRef}..${toRef}` : toRef;
    const commitsRaw = git(repoPath, `log ${range} --pretty=format:'%H|%cI|%s' -- "runs/${slug}/"`);
    tags[i].contributing_commits = commitsRaw.split('\n').filter(Boolean).map(line => {
      const [sha, date, subject] = line.split('|');
      return { sha, date, subject };
    });
  }

  return tags;
}
```

**Edge cases:**
- Build has no `delivery/{slug}` tag yet → returns empty array. Codex synthesizes rev-0 from substrate (existing v0.3 behavior).
- Build has `delivery/{slug}` but no rev-1/rev-2 → returns single rev-0 entry. Codex displays one primary_run card, no additional-step cards.
- Build was extracted via `promote-build.bat` → still has all its tags and history in the parent repo (extraction creates a copy elsewhere; the parent's tags remain). Frontend treats promoted and non-promoted builds identically.
- A commit between two tags touched files outside `runs/{slug}/` → it's filtered out by the `-- runs/{slug}/` pathspec, which is the desired behavior. The `[run:{slug}]` prefix discipline (§2 scope rule) ensures this rarely matters in practice.

**Integration:** `readGitLog(repoPath, slug)` is called by the aggregator for each build slug it walks. The returned array replaces the synthesized rev-0 in `bundle.js#runs[slug].revisions`. Curation `additional_step` entries (the v0.3 curator-side mechanism) coexist — they're appended to the git-derived array, allowing curator-added entries for pre-git additional steps (e.g., poker 1.0's recovery, if the user wants it captured without a corresponding commit).

---

## §7 Retroactive bootstrap procedure

The `retroactive-bootstrap.bat` script (§5.3) is run once. Effects:

- Each of the 9 historical builds receives one `[retroactive]` commit touching only `runs/{slug}/`.
- Each receives an annotated tag `delivery/{slug}`.
- All commits and tags are pushed to GitHub in a single push.

After the bootstrap runs:
- `git tag -l "delivery/*"` returns 9 tags.
- `git log --grep "\[retroactive\]"` returns 9 commits.
- Codex's `readGitLog()` adapter (once implemented) returns one rev-0 per build with type `primary_run`, dated as of the retrofit run.
- The dashboard's revision lineage strip (Codex v0.3) shows the same one-revision-per-build state it currently shows, but now backed by real git data instead of synthesized data.

**Order in `retroactive-bootstrap.bat`:** the slugs are listed in approximate delivery order (most recent first). This is cosmetic — the commit dates are all the retrofit date, but the commit order in `git log` matches the delivery order intuitively.

**Note on the duplicate streamdock entry:** `runs/streamdock-applemusic-touchbar` (v1.8 run) and `runs/streamdock-apple-music-touchbar` (v1.9 run with dashes — produced after the user explicitly requested the v1.9 A/B test) are both present. Both get bootstrapped as separate builds. They're documented as related but distinct in the curation overlay.

---

## §8 Promotion procedure (Reason 2 — user genuinely likes the build)

Pre-conditions:
- User has decided a build is worth promoting (e.g., earthquake-map's visualization quality)
- An empty GitHub repo exists at `https://github.com/Jett/{new-repo-name}` (created via the GitHub UI or `gh repo create`)
- `git-filter-repo` is installed (`pip install git-filter-repo`)

Run: `promote-build.bat earthquake-map earthquake-map`

Effects:
- A new directory `..\earthquake-map-extracted\` is created with a fresh clone of AutoBuilder.
- `git filter-repo` strips the clone's history to only commits and tags touching `runs/earthquake-map/`, and rewrites paths so the build's files sit at the new repo's root.
- The clone's remote is set to the new GitHub URL.
- All commits and tags are pushed.

After promotion:
- `https://github.com/Jett/earthquake-map` exists as a standalone repo with the build's complete history.
- The AutoBuilder repo is UNCHANGED — the build's content and history remain in `runs/earthquake-map/`.
- Optional: curator adds a note to `codex/data/curation/earthquake-map.json` recording the promotion (`promoted_to: "https://github.com/Jett/earthquake-map"`). Codex's dashboard can display this as a small badge on promoted builds.

The user's GitHub account gains one repo per promotion event. Builds that are never promoted never appear on GitHub as standalone projects. This is the constraint user articulated.

---

## §9 Orchestrator charter amendments

Currently the Orchestrator does not commit during a build run. Under this proposal, the Orchestrator charter gains commit operations at phase boundaries (§4 above).

Concrete amendments to `architecture/role_charters.md` § Orchestrator:

**Insert new step between current step 5 (await TD) and current step 6 (Editor dispatch in v1.9):**

> 5.7. **Commit Discovery+TD substrate to git** before dispatching Editor. The build now has decisions/discovery/ledger-v1.json and decisions/technical-discovery/sections-v1.json on disk; commit them so the Editor pass and subsequent build proceed with a clean git tree.
> ```
> git add runs/{slug}/decisions/
> git commit -m "[run:{slug}] phase: discovery + td complete"
> git push origin main
> ```
> Per the git conventions doc (§2 commit prefix), this is a `[run:{slug}]` stream commit and only touches files under `runs/{slug}/`.

**Insert similar commit steps after step 6 (Editor pass), after step 7 (Coordinator dispatch), and at delivery.**

**Amend the delivery step** to invoke `commit-build.bat {slug}` (which handles the delivery commit, the `delivery/{slug}` tag, and the push) rather than the current manual delivery checklist.

Full charter changes are scoped for a later commit (`[arch] v1.10: orchestrator git integration`). This proposal documents them but does not include the role_charters.md edits — those land separately after Codex acks this convention.

---

## §10 Migration timeline

1. **Proposal review by Codex** → Codex acks here (or counter-proposes).
2. **Codex implements `readGitLog()` adapter** → spec in §6 above; should be tractable in an afternoon.
3. **Maintenance writes the four `.bat` scripts** → drafts are in §5; minor refinements during implementation.
4. **Maintenance runs `retroactive-bootstrap.bat`** → 9 builds receive their bootstrap commits and tags; pushed.
5. **Codex's next aggregator run picks up the new tags** → dashboard now shows real git-backed revisions[] instead of synthesized ones.
6. **First post-convention build uses `commit-build.bat`** → full end-to-end cycle of the new workflow.
7. **First refine: Maintenance uses `commit-step.bat`** → first rev-1 lands as a tagged commit.
8. **First promotion: Maintenance uses `promote-build.bat`** → first standalone repo on GitHub.

Steps 1-5 are bootstrapping and should happen close together. Steps 6-8 happen on the natural cadence of the user's work.

---

## §11 Failure modes (acknowledged)

1. **Scope rule violations.** A commit touches both `runs/{slug-A}/` and `runs/{slug-B}/`. This breaks `git filter-repo` extraction (the commit would have to be split). Mitigation: Orchestrator-side enforcement that build-run commits only `git add runs/{slug}/` paths, not broader scopes. Maintenance-discipline for the .bat scripts.

2. **`git-filter-repo` not installed at promotion time.** Mitigation: `promote-build.bat` checks for it and provides install instructions on failure.

3. **Tag collision on promotion.** The extracted standalone repo carries the same `delivery/{slug}` and `delivery/{slug}/rev-N` tags as the parent. Mitigation: this is desired behavior — the standalone repo's tags reflect its history. If the user wants different tag naming in the standalone (e.g., `v1`, `v1.1`), they can rename tags post-extraction.

4. **Bootstrap script run twice.** Mitigation: the script checks for existing `delivery/{slug}` tags and skips builds that already have them. (To be added to the .bat draft when written.)

5. **Push race during refine.** If multiple `commit-step.bat` runs happen in parallel, push order matters. Mitigation: locks (file-based) at the .bat layer if needed; unlikely to be a problem in single-user single-machine usage.

6. **GitHub Pages serves stale content if push fails silently.** Mitigation: all .bat scripts check exit codes at each step and abort on failure. The `goto :err` pattern is standard.

---

## §12 What this is not

- **Not a CI/CD pipeline.** It's git discipline + .bat scripts. Per-build linting, testing, or quality gates remain Orchestrator/Critic/CV responsibility.
- **Not a substitute for Codex's curation overlay.** The curation overlay carries narrative texture, screenshots, additional metadata. Git carries the "what file was at what state when" record. Two different data stores serving two different needs.
- **Not the final word on Pages structure.** The github-pages-proposal.md from Codex covers Pages enablement separately. This proposal sets up the git foundation that the Pages workflow will build on.

---

(End of proposal body.)
