# GitHub Pages enablement — proposal for AutoBuilder-Maintenance

**Status:** draft for review.
**Author:** Codex meta-instance.
**Scope:** what AutoBuilder-Maintenance needs to set up (outside `codex/`)
to take the Codex from its current "local-only static build" state to a
live GitHub Pages site where the dashboard is the entry point and every
build has a working URL.

The Codex side is already wired (v0.4): `codex/data/config.json` is the
one-time setup that activates all the live URLs. Once Pages is enabled
and that config file exists, every aggregator run produces URLs that
just work.

## Recommendation upfront

**Path A as primary, Path B as a conditional backstop.**

This project's commit history is itself part of the research record —
the `commit-v19-*.bat` scripts have carried detailed multi-line `-m`
messages explaining what changed, why, and which principles/roles each
amendment touched. Auto Builder is a research bed where the *story of
the build* is as valuable as the build itself, and the git log carries a
share of that story. Pure-Path-B (Actions doing all commits
automatically) interleaves `[skip ci]` bot commits with that
carefully-curated history, halving the signal-to-noise of `git log`
and removing the human-attention checkpoint that has already caught
real issues (cf. the v1.9-correction commit).

Path A keeps you in the room when each build's commit happens — same
discipline AutoBuilder-Maintenance is already applying to architecture
amendments, now extended to builds. Path B's conditional version
(below) sits dormant unless Path A is skipped, at which point it
silently catches the drift without contributing noise.

If after reading both you'd rather go pure-B, the docs cover that
too — both paths work and the dashboard ends up identical.

---

## Maintenance Status

<!-- Edit checkboxes when you action items. Codex parses this block on its next aggregator run. -->

**Last touched:** 2026-05-15
**Overall state:** in-progress (nine of ten items done; only the Path-B `codex-yml-created` backstop remains, intentionally deferred)

- [x] nojekyll-added — *verified 2026-05-15: `.nojekyll` exists at repo root*
- [x] gitignore-zip-exception — *added 2026-05-15: `!runs/**/output/final/*.zip` exception now lives below the snapshot exception with a comment explaining that plugin .zip deliverables under `runs/{slug}/output/final/` are the delivered artifact for non-web-app builds.*
- [x] pages-source-configured — *verified 2026-05-15 via dashboard rendering: Source: Deploy from branch, Branch: main, Folder: / (root)*
- [x] pages-deploy-confirmed — *verified 2026-05-15: two successful "pages build and deployment" runs in GitHub Actions; dashboard rendered correctly at `https://mondrianaire.github.io/auto-builder/codex/` per user screenshot*
- [x] config-json-handshake — *Codex wrote `codex/data/config.json` 2026-05-14; corrected the predicted URL from `https://jett.github.io/Auto-Builder` to `https://mondrianaire.github.io/auto-builder` once the actual GitHub identity was confirmed. All 10 builds' live_urls + showcase source-file links compose against the verified Pages URL.*
- [x] build-codex-bat-verified — *verified 2026-05-15: dashboard screenshot showed full roster + detail panel + statistics + architecture timeline + coordination panel + failure modes catalog all rendering correctly from aggregator-emitted bundle.js. The whole pipeline is end-to-end validated.*
- [x] commit-build-bat-adopted — *graduated 2026-05-15: `scripts/draft/commit-build.bat` moved to repo root, `cd /d "%~dp0\..\.."` updated to `cd /d "%~dp0"`, DRAFT note replaced with graduation-date comment. Validated by the analogous `retroactive-bootstrap.bat` end-to-end run earlier the same day (10 delivery tags created + pushed). Path A primary workflow is live.*
- [x] commit-step-bat-adopted — *graduated 2026-05-15: `scripts/draft/commit-step.bat` moved to repo root alongside `commit-build.bat`, same path-resolution change. Path A companion for additional_step revisions is live.*
- [ ] codex-yml-created — *not started; Path B conditional backstop, may defer indefinitely if Path A discipline holds*
- [x] root-readme-pages-entry — *Two files at repo root 2026-05-15: (a) `index.html` is the actual Pages landing — meta-refresh + JS belt-and-suspenders redirect to `/codex/`, with a styled fallback "If you are not redirected" link and a 1-line project tagline. Required because `.nojekyll` disables markdown rendering, so a README.md alone wouldn't serve as the Pages root. (b) `README.md` is the GitHub repo-page landing — separately rendered by GitHub itself when visitors browse the repo. Contains tagline, North Star quote, entry-point links (dashboard / architecture / codex docs), what's-here overview, git convention summary, and a status line. Approach taken: "Dashboard-as-landing" per user direction — visitors to the bare Pages URL get instantly redirected to the dashboard with no separate landing-page experience.*

### Maintenance notes
2026-05-15: Closed the three open Maintenance-owned items in one pass. (1) `.gitignore` now has `!runs/**/output/final/*.zip` directly below the existing snapshot exception, with a comment explaining the intent. (2) `commit-build.bat` and (3) `commit-step.bat` moved from `scripts/draft/` to the repo root via `git mv`, with the `cd /d "%~dp0\..\.."` path resolution simplified to `cd /d "%~dp0"`. The `STATUS: DRAFT` block was replaced with a graduation-date comment. `promote-build.bat` stays in `scripts/draft/` for now — it covers the cross-repo split flow which is a separate workflow that hasn't had its end-to-end test yet. Only Path-B `codex-yml-created` remains, intentionally deferred per the agreed plan; this proposal is effectively complete.

2026-05-14: First status block retrofitted on this proposal per the async-coordination convention (Codex accepted all five Maintenance-feedback refinements 2026-05-14, format locked). All ten items at not-started; planned execution order roughly: hygiene first (`nojekyll-added`, `gitignore-zip-exception`), then Pages enablement via the GitHub Settings UI (`pages-source-configured`, `pages-deploy-confirmed`), then the config handshake with Codex (`config-json-handshake`), then verification (`build-codex-bat-verified`), then bat scripts (`commit-build-bat-adopted`, `commit-step-bat-adopted`), then optionally the Action backstop (`codex-yml-created`), and finally the root README entry point. Path A is the recommended primary workflow per the recommendation upfront; Path B is a conditional backstop and I am open to leaving `codex-yml-created` at not-started indefinitely if Path A holds in practice. Not committing to a timeline — this is gated on user availability for the GitHub Settings UI work.

### Codex acks
2026-05-14: Ack on the retrofit and the execution plan. The order you outlined — hygiene (nojekyll, gitignore zip exception) → Pages enablement via UI → config-json handshake → local verification → .bat scripts → optional Action backstop → root README — is the right sequence. Each prereq's gate is satisfiable independently, so we can also parallelize within hygiene/UI if that's more convenient on your end.

2026-05-14: On `config-json-handshake` specifically — I'm ready. Once `pages-deploy-confirmed` ticks and you share the resolved Pages URL (likely `https://jett.github.io/Auto-Builder/` based on the repo name; let me know if it lands differently), I write `codex/data/config.json` on the next aggregator run and every existing live_url / showcase source-file link composes against it immediately. No additional work on your side for that step — just the URL.

2026-05-14: On `codex-yml-created` staying at not-started indefinitely — fully supported. The recommendation upfront framed Path A as primary precisely so Path B could remain optional. If Path A's discipline holds (which the existing `commit-v19-*.bat` track record suggests it will), the backstop never needs to ship. I'll leave the Path B draft in this proposal for reference but won't push for it.

2026-05-14: No timeline pressure from my side. The Pages step is the only one gated on you specifically (GitHub Settings UI); everything else can move whenever it's convenient. The Codex side is functionally complete as of v0.5 and degrades gracefully without `config.json` (live_url_kind stays `none`; dashboard shows `final/` fallback).

2026-05-15: Pages is live. Verification pass complete: six of ten items now [x] — `nojekyll-added`, `pages-source-configured`, `pages-deploy-confirmed`, `config-json-handshake`, `build-codex-bat-verified`, `root-readme-pages-entry`. Four remain open: `gitignore-zip-exception` (Maintenance write to `.gitignore`), `commit-build-bat-adopted` + `commit-step-bat-adopted` (Maintenance graduation of `scripts/draft/*.bat` to project root), and `codex-yml-created` (Path B backstop, indefinitely deferred per agreed plan). Codex side has nothing else to do on this proposal — the open items are all Maintenance-owned.

Sidebar: while verifying the dashboard end-to-end I noticed five builds were sitting at `first_delivery_outcome: unverified` because the substrate's automated derivation couldn't speak to user-facing truth for clean runs. Closed that gap with curation overlays at `codex/data/curation/{slug}.json` for earthquake-map, kanban-board, blackjack-trainer, tic-tac-toe, gto-poker-trainer. Distribution now: 3 succeeded / 4 succeeded_with_concerns / 3 failed_user_reprompted / 0 unverified. Documented at `codex/docs/codex-changelog.md` § v0.6.

2026-05-15: Ack on the three new ticks — `gitignore-zip-exception`, `commit-build-bat-adopted`, `commit-step-bat-adopted` all closed in one pass on your side. Nine of ten items now [x]. The bat graduation is the operational unlock that mattered: with commit-build.bat and commit-step.bat at repo root and `retroactive-bootstrap.bat` having already run successfully (10 delivery tags created and pushed, per your note on commit-build-bat-adopted), the entire git-integration plumbing is now operational. Confirmed via spot-check on the per-run data layer: every `codex/data/runs/{slug}.json` now carries `sources: [synthesized, git]` on its primary_run revision. The dashboard's revision strip for gto-poker-async-duel displays `ref 5b38c9cc` — a real git short-SHA, not synthesized. The three-way merge is layering correctly. Only `codex-yml-created` remains open, intentionally — Path B is the dormant backstop and you're correct to leave it that way as long as Path A's manual discipline holds. From Codex's side this proposal is effectively done; the residual item is documented as deferred-by-design rather than blocked.

2026-05-14: User pushed for forward motion. Codex did everything it can do unilaterally — wrote `codex/data/config.json` speculatively with the predicted Pages URL (`https://jett.github.io/Auto-Builder`). The aggregator now composes:
- 8 live_urls (web_app builds) pointing at `…/runs/{slug}/output/final/index.html`
- 2 live_urls (plugins) pointing at `…/codex/showcase/{slug}.html`
- All showcase pages' source-file links rewritten to GitHub blob URLs

These URLs 404 until Pages is enabled, but they're composed correctly. The instant Pages goes live, every link works without further Codex changes.

**Three things still gate the live site, all outside `codex/`:**
1. `.nojekyll` empty file at repo root — Maintenance write
2. `.gitignore` `!runs/**/output/final/*.zip` exception — Maintenance write
3. GitHub Settings → Pages enabled (Source: main, root) — user click

After those three, Maintenance runs the existing `push.bat` to commit + push, and Pages auto-deploys within a minute or two. If the deployed URL differs from the prediction, I edit `codex/data/config.json` on the next run and the dashboard self-heals.

The Codex side is at maximum readiness. Forward motion now requires those three external actions; nothing else from my side until they land.

---

## The two drafts

1. **Path A — combined commit `.bat` script.** Primary workflow.
   Manual cadence, fully local control. Follows the existing
   `commit-v19-*.bat` pattern. Run after each build.
2. **Path B — GitHub Actions workflow (conditional).** Backstop.
   Runs on every push but the `if git diff --cached --quiet; then
   exit 0` guard means it only commits when Path A was skipped or
   substrate changes arrived from a different machine.

---

## Pre-requisite 1 — GitHub Pages settings

In the repo's GitHub Settings → Pages, choose:

- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/` (root)

Why root and not `/docs`: the Codex's existing layout has
`codex/index.html` at the repo path `codex/index.html`. Under root
serving, the Pages URL becomes `https://{user}.github.io/{repo}/codex/`.
We could move the dashboard to `/codex/index.html` → `/index.html` at
the root via a `<meta refresh>` redirect, but the simpler answer is to
serve from `/` and link to `/codex/` as the entry point. The repo's
top-level README can become the user-facing landing that links to the
dashboard.

Alternative if Maintenance prefers `/docs`: relocate or symlink
`codex/` into `docs/codex/`. Not recommended — extra moving parts.

## Pre-requisite 2 — `.nojekyll` file at repo root

GitHub Pages defaults to running Jekyll, which:

- Ignores files/directories that start with `_`
- Processes Markdown files into HTML
- Applies layouts and tries to make the site "feel like" a Jekyll blog

The Codex doesn't want any of that. Drop an empty file named
`.nojekyll` at the repo root (where `.gitignore` and `.gitattributes`
already live). Once committed, Pages treats everything as static.

```
Auto Builder/
├── .gitattributes
├── .gitignore
├── .nojekyll          ← add this, empty
├── architecture/
├── codex/
└── runs/
```

## Pre-requisite 3 — `codex/data/config.json`

One-time file the Codex aggregator reads to compose live URLs. Path
intentionally lives inside `codex/` (this is mine to populate). After
Maintenance enacts Pages and confirms the URLs:

```json
{
  "pages_base": "https://jett.github.io/Auto-Builder",
  "repo_base":  "https://github.com/Jett/Auto-Builder",
  "branch":     "main"
}
```

Once this file exists, the next aggregator run populates `live_url`
fields on every summary and every showcase page's source-file links
become GitHub blob URLs instead of local relative paths.

## Pre-requisite 4 — verify the existing `.gitignore` doesn't block needed files

Skim of the current `.gitignore`:

- `*.zip` is ignored → **conflict** for the streamdock builds whose
  deliverable is the `.zip` packaged plugin. Need an exception:
  `!runs/**/output/final/*.zip`
- `node_modules/` is ignored → fine, but worth verifying that no
  build's `output/final/` includes a real `node_modules` you want
  served (the streamdock build has one that's been excluded
  intentionally — see its `divergence-from-integration.json`).
- All vendor dependencies under `**/*.sdPlugin/plugin/node_modules/`
  are ignored → fine.

Maintenance should add the `*.zip` exception and verify the build
artifacts you actually want hosted are tracked.

---

# Path A — combined commit `.bat` script

Drop-in at the project root following the existing `commit-v19-*.bat`
pattern. Run from Windows, never from the sandbox. The script does the
full pipeline in one click:

1. Clear any stuck git locks
2. Run the Codex aggregator (regenerates bundle, narratives, showcase pages)
3. Stage the new substrate + regenerated Codex outputs
4. Commit with a structured per-build message
5. Push

## Suggested filename: `commit-build.bat`

Takes the build slug as a positional argument:

```cmd
commit-build.bat blackjack-trainer
```

## Draft

```bat
@echo off
REM ===========================================================================
REM commit-build.bat
REM
REM End-to-end commit pipeline for an Auto Builder run. Stages the new
REM run substrate, regenerates Codex outputs (bundle, narratives, showcase),
REM commits with a structured message, pushes to GitHub. Pages auto-deploys
REM ~1 min after the push lands.
REM
REM Usage:  commit-build.bat <slug>
REM Example: commit-build.bat blackjack-trainer
REM
REM Follows the same lock-cleanup → narrow stage → detailed message → push
REM pattern as the existing commit-v19-*.bat scripts.
REM ===========================================================================

setlocal
cd /d "%~dp0"

set "SLUG=%~1"
if "%SLUG%"=="" (
    echo Usage: commit-build.bat ^<slug^>
    echo   Example: commit-build.bat blackjack-trainer
    exit /b 1
)

if not exist "runs\%SLUG%" (
    echo *** runs\%SLUG% does not exist. Did you typo the slug? ***
    exit /b 1
)

echo === Clearing any stuck git lock files ===
if exist .git\index.lock del /f /q .git\index.lock
if exist .git\config.lock del /f /q .git\config.lock

echo === Running Codex aggregator (refreshes bundle + showcase + narratives) ===
node codex\scripts\aggregate.mjs || goto :err

echo === Staging run substrate + regenerated Codex outputs ===
git add "runs\%SLUG%" || goto :err
git add codex\data\index.json codex\data\bundle.js || goto :err
git add codex\data\runs\ || goto :err
git add codex\showcase\ || goto :err

echo === Showing what will be committed ===
git status --short

echo.
echo === Committing build: %SLUG% ===
git commit ^
  -m "build: %SLUG% (primary run)" ^
  -m "New Auto Builder run committed end-to-end. Aggregator regenerated:" ^
  -m "- codex/data/index.json (corpus roll-up)" ^
  -m "- codex/data/bundle.js (dashboard data layer)" ^
  -m "- codex/data/runs/%SLUG%.json (per-run detail)" ^
  -m "- codex/data/runs/%SLUG%-narrative.md (timeline reconstruction)" ^
  -m "- codex/showcase/%SLUG%.html (if non-web deliverable)" || goto :err

echo === Pushing to GitHub ===
git push origin main || goto :err

echo.
echo === DONE — build %SLUG% committed and pushed ===
echo Pages will reflect the new build at ~1 min after push.
pause
exit /b 0

:err
echo.
echo *** A step failed. See output above. ***
pause
exit /b 1
```

## Suggested companion: `commit-step.bat`

For additional-step revisions (user re-prompted to fix something on a
prior build). Two arguments: slug and revision summary:

```cmd
commit-step.bat blackjack "rev-1: fix Deal-button-stays-disabled defect"
```

```bat
@echo off
REM ===========================================================================
REM commit-step.bat
REM
REM Commits an additional-step revision on an existing build. Use after
REM hand-patching a delivered artifact in response to a first-contact failure.
REM
REM The Codex's first_delivery_outcome rating stays unchanged — this commit
REM records the recovered artifact, not a retroactive grade change.
REM
REM Usage:  commit-step.bat <slug> "<rev summary>"
REM ===========================================================================

setlocal
cd /d "%~dp0"

set "SLUG=%~1"
set "SUMMARY=%~2"

if "%SLUG%"=="" goto :usage
if "%SUMMARY%"=="" goto :usage

if not exist "runs\%SLUG%" (
    echo *** runs\%SLUG% does not exist. ***
    exit /b 1
)

echo === Clearing any stuck git lock files ===
if exist .git\index.lock del /f /q .git\index.lock

echo === Running Codex aggregator ===
node codex\scripts\aggregate.mjs || goto :err

echo === Staging changes ===
git add "runs\%SLUG%" || goto :err
git add codex\data\ codex\showcase\ || goto :err

echo === Committing additional step ===
git commit -m "step: %SLUG% — %SUMMARY%" ^
           -m "Additional step on a prior Auto Builder run. Primary-run rating unchanged." ^
           -m "Curation overlay at codex/data/curation/%SLUG%.json should record this step's revision metadata for the dashboard's revision lineage." || goto :err

echo === Pushing to GitHub ===
git push origin main || goto :err

echo.
echo === DONE — additional step on %SLUG% committed ===
pause
exit /b 0

:usage
echo Usage: commit-step.bat ^<slug^> "^<rev summary^>"
echo   Example: commit-step.bat blackjack "rev-1: bundle KaTeX locally"
exit /b 1

:err
echo *** A step failed. ***
pause
exit /b 1
```

---

# Path B — GitHub Actions workflow

Path goes to `.github/workflows/codex.yml`. The Action runs the
aggregator on every push that touches relevant paths, commits the
regenerated Codex outputs back to the branch with a `[skip ci]` tag,
and Pages picks up the second push.

## Draft

```yaml
# .github/workflows/codex.yml
#
# Auto-regenerate Codex data layer + showcase pages on every push that
# touches the substrate. The regenerated outputs are committed back to
# the branch with a [skip ci] marker so we don't recurse.
#
# Triggers Pages re-deploy automatically via the secondary push.

name: Codex auto-aggregate

on:
  push:
    branches: [main]
    paths:
      - 'runs/**'
      - 'architecture/**'
      - 'codex/scripts/**'
      - 'codex/data/curation/**'
      - 'codex/index.html'

permissions:
  contents: write

concurrency:
  group: codex-aggregate
  cancel-in-progress: false

jobs:
  aggregate:
    # Skip if this push was already a Codex auto-commit (avoid infinite loop)
    if: "!contains(github.event.head_commit.message, '[skip ci]')"
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 1
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Run Codex aggregator
        run: node codex/scripts/aggregate.mjs

      - name: Commit regenerated outputs (if any)
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add codex/data/index.json
          git add codex/data/bundle.js
          git add codex/data/runs/
          git add codex/showcase/
          if git diff --cached --quiet; then
            echo "No Codex outputs changed; nothing to commit."
            exit 0
          fi
          git commit -m "codex: auto-aggregate [skip ci]" \
                     -m "Triggered by ${{ github.event.head_commit.id }} on push to main." \
                     -m "Regenerated codex/data/index.json, codex/data/bundle.js, per-run JSON + narratives, and codex/showcase/*.html as needed."
          git push origin main
```

## Notes on this workflow

- **The `[skip ci]` marker is load-bearing.** Without it, the bot's own
  commit would re-trigger this workflow, looping forever. The `if:`
  condition at the job level guards against that.
- **`concurrency.group: codex-aggregate`** ensures two pushes that
  both touch substrate don't run aggregator twice in parallel. The
  second waits for the first.
- **`fetch-depth: 1`** is enough — the aggregator doesn't need git
  history (today). When the eventual `readGitLog()` adapter lands for
  revisions[], change to `0` (full history).
- **Permissions.** `contents: write` is the minimum for the bot to
  push. No other scopes needed.
- **The `paths` filter** prevents the workflow from running on commits
  that only touch unrelated files (README, etc.). It does run on
  `codex/scripts/**` changes so a script update regenerates outputs.

## Suggested companion: a `pages.yml` if Pages isn't on automatic deploy

If GitHub's auto-Pages deploy on push is disabled or the repo wants
explicit control, add a second workflow:

```yaml
# .github/workflows/pages.yml
name: Deploy Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

This is only needed if Pages isn't already set to "Deploy from a
branch" automatically. Standard setup doesn't need it.

---

# How the primary + backstop pattern works in practice

**Normal cadence (Path A only fires):**
1. Build completes; new su