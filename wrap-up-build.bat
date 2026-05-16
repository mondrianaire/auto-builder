@echo off
REM ===========================================================================
REM wrap-up-build.bat — Standalone invocation of the wrap-up routine
REM
REM Usage:   wrap-up-build.bat ^<slug^>
REM Example: wrap-up-build.bat gto-poker-async-duel
REM
REM What it does:
REM   Runs architecture/scripts/wrap-up-build.mjs against the given slug.
REM   That script reads the build's corpus + index data and writes:
REM     - runs/{slug}/PROJECT-OVERVIEW.md      (Cat 1 wrap-up doc)
REM     - runs/{slug}/wrap-up-complete.json    (sentinel — required by
REM                                              promote-build.bat AND
REM                                              workflow #2 before promotion
REM                                              is allowed)
REM
REM When to use this standalone (vs. having ratify-build.bat invoke it):
REM   - Back-fill on an older ratified build that pre-dates the wrap-up
REM     routine (these have completion-ratified.json but no
REM     wrap-up-complete.json, so they're not promotable until this runs).
REM   - Re-generation after a project-overview-template.md change.
REM   - Recovery after a corrupted PROJECT-OVERVIEW.md.
REM
REM Pre-requisites:
REM   - runs/{slug}/ exists
REM   - runs/{slug}/completion-ratified.json exists (build must be ratified)
REM   - runs/{slug}/output/verification/report.json exists
REM   - Node.js on PATH
REM
REM Author: Maintenance, 2026-05-16
REM ===========================================================================

setlocal
cd /d "%~dp0"

REM Fix PATHEXT so bare `node` resolves under Desktop Commander shells
set "PATHEXT=.COM;.EXE;.BAT;.CMD"

set "SLUG=%~1"
if "%SLUG%"=="" goto :usage

where node >nul 2>&1
if errorlevel 1 goto :err_no_node

echo === Running wrap-up routine for %SLUG% ===
node architecture\scripts\wrap-up-build.mjs %SLUG% --invoked-by wrap-up-build.bat
if errorlevel 1 goto :err_node

REM ---------------------------------------------------------------------------
REM Commit + push the [run:{slug}] back-fill. We do this inline because the
REM runs/ tree is not covered by any of deploy-session.bat's three categories
REM (arch / codex / scripts) and per v1.10 commit conventions runs/ changes
REM must be namespaced as [run:{slug}]. Self-contained back-fill is simpler
REM than asking the user to do a separate manual commit + push.
REM ---------------------------------------------------------------------------

echo.
echo === Clearing any stuck git lock files ===
if exist .git\index.lock del /f /q .git\index.lock

echo === Staging wrap-up artifacts for %SLUG% ===
REM Include completion-ratified.json in the stage so retroactive binding
REM (where ratification itself happens out-of-band, e.g., for a build that
REM was manually uploaded before AutoBuilder's git infrastructure existed)
REM also gets shipped together in one [run:{slug}] commit. If
REM completion-ratified.json is already on origin, `git add` is a no-op
REM and the staged-changes check below handles it gracefully.
git add "runs/%SLUG%/completion-ratified.json" "runs/%SLUG%/PROJECT-OVERVIEW.md" "runs/%SLUG%/wrap-up-complete.json" "runs/%SLUG%/decision-flowchart.html" "runs/%SLUG%/decision-flowchart.svg"
if errorlevel 1 goto :err_git

git diff --cached --quiet -- "runs/%SLUG%/completion-ratified.json" "runs/%SLUG%/PROJECT-OVERVIEW.md" "runs/%SLUG%/wrap-up-complete.json" "runs/%SLUG%/decision-flowchart.html" "runs/%SLUG%/decision-flowchart.svg"
if errorlevel 1 (
    echo === Committing [run:%SLUG%] back-fill ===
    git commit -m "[run:%SLUG%] wrap-up back-fill: PROJECT-OVERVIEW.md + sentinel (+ completion-ratified.json if retroactive)" -m "Wrap-up routine run via wrap-up-build.bat (standalone back-fill of a build ratified before the wrap-up gate existed). Required by promote-build.bat + workflow #2 four-gate promotion model. See architecture/build-lifecycle.md § Promotion gates."
    if errorlevel 1 goto :err_git
    echo === Rebasing on top of origin/main ===
    git pull --rebase --autostash -X ours origin main
    if errorlevel 1 goto :err_git
    echo === Pushing to origin ===
    git push origin main
    if errorlevel 1 goto :err_push
) else (
    echo No staged wrap-up changes ^(artifacts already on origin^).
)

echo.
echo === Wrap-up complete for %SLUG% ===
echo Build is now promotion-eligible. Run promote-build.bat %SLUG% when ready.
echo.
exit /b 0

:usage
echo Usage: wrap-up-build.bat ^<slug^>
echo Example: wrap-up-build.bat gto-poker-async-duel
echo.
echo Pre-requisites:
echo   - Build at runs/^<slug^>/ exists AND is ratified
echo   - runs/^<slug^>/output/verification/report.json 