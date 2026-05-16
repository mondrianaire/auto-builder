@echo off
REM ===========================================================================
REM promote-build.bat — User-initiated promotion of a ratified build
REM
REM Usage:   promote-build.bat ^<slug^> [--notes "free-text reason"]
REM Example: promote-build.bat gto-poker-async-duel
REM          promote-build.bat earthquake-map --notes "USGS data integration worth productizing"
REM
REM Per architecture/build-lifecycle.md, promotion is a DISTINCT EVENT from
REM ratification. Ratification (gates 1+2 confirmed via ratify-build.bat)
REM closes the build's lifecycle in the corpus. Promotion is an OPT-IN
REM user decision, made at any time AFTER ratification, that this build
REM is worth standalone product life — fork the deliverable to its own
REM GitHub repo for ongoing development.
REM
REM What this script does:
REM   1. Verifies the slug exists and is ratified (completion-ratified.json present)
REM   2. Verifies the build hasn't already been promoted (no existing promoted.json)
REM   3. Writes runs/{slug}/promoted.json with timestamp + identity + optional notes
REM   4. Stages, commits, pushes
REM
REM What this script does NOT do:
REM   - It does NOT do the actual fork (filter-repo + push to standalone repo).
REM     That's the Promotion-Triggered Fork GitHub Action's job. The Action
REM     fires when promoted.json appears in a push, creates mondrianaire/{slug}-AB
REM     via GitHub API (using FORK_PAT), filter-repos output/final/ into it,
REM     generates the README, and writes the curation overlay.
REM
REM Writer version: 0.2 (rewritten 2026-05-16 for the ratify/promote split per
REM build-lifecycle.md)
REM ===========================================================================

setlocal
cd /d "%~dp0"

set "SLUG=%~1"
set "WRITER_VERSION=0.2"

if "%SLUG%"=="" goto :usage

REM Parse optional --notes flag
set "NOTES="
if /i "%~2"=="--notes" set "NOTES=%~3"

REM ---------------------------------------------------------------------------
REM Validation
REM ---------------------------------------------------------------------------

if not exist "runs\%SLUG%" goto :err_no_slug

set "RATIFIED=runs\%SLUG%\completion-ratified.json"
if not exist "%RATIFIED%" goto :err_not_ratified

set "PROMOTED=runs\%SLUG%\promoted.json"
if exist "%PROMOTED%" goto :err_already_promoted

where node >nul 2>&1
if errorlevel 1 goto :err_no_node

REM ---------------------------------------------------------------------------
REM Confirmation
REM ---------------------------------------------------------------------------

echo.
echo === Promoting %SLUG% ===
echo.
echo This will trigger the fork ceremony:
echo   1. Write runs/%SLUG%/promoted.json + commit + push
echo   2. The Promotion-Triggered Fork workflow fires automatically
echo   3. mondrianaire/%SLUG%-AB gets created with the deliverable + README
echo   4. Dashboard chip flips to "Promoted *"
echo.
echo Promotion is OPT-IN per build-lifecycle.md. This build will fork to
echo a standalone repo for ongoing product life. The AutoBuilder corpus
echo entry under runs/%SLUG%/ remains frozen.
echo.

set "G="
set /p G="Proceed with promotion? [y/N]: "
if /i not "%G%"=="y" goto :err_user_aborted

REM ---------------------------------------------------------------------------
REM Write promoted.json
REM ---------------------------------------------------------------------------

for /f "usebackq tokens=*" %%u in (`git config user.name`) do set "PROMOTED_BY=%%u"
if "%PROMOTED_BY%"=="" set "PROMOTED_BY=unknown"

set "NOTES_VALUE=%NOTES%"
echo.
echo === Writing %PROMOTED% ===
node -e "var fs=require('fs');var n=process.env.NOTES_VALUE||'';var out={schema_version:'0.1',promoted_at:new Date().toISOString(),promoted_by:process.argv[1],writer_version:process.argv[2],notes:n?n:null};fs.writeFileSync(process.argv[3],JSON.stringify(out,null,2)+'\n')" "%PROMOTED_BY%" "%WRITER_VERSION%" "%PROMOTED%"

if not exist "%PROMOTED%" goto :err_write

REM ---------------------------------------------------------------------------
REM Commit + push
REM ---------------------------------------------------------------------------

echo === Clearing any stuck git lock files ===
if exist .git\index.lock del /f /q .git\index.lock

echo === Staging %PROMOTED% ===
git add "%PROMOTED%"
if errorlevel 1 goto :err_git

echo === Committing promotion intent ===
git commit -m "[run:%SLUG%] promote: user elected standalone product life" -m "User ran promote-build.bat %SLUG%. Promotion-Triggered Fork workflow will fire on this push, create mondrianaire/%SLUG%-AB, and fork the deliverable. The corpus entry remains frozen."
if errorlevel 1 goto :err_git

echo === Pushing to origin ===
git push origin main
if errorlevel 1 goto :err_push

echo.
echo ============================================================
echo === DONE — %SLUG% PROMOTION INITIATED ===
echo ============================================================
echo.
echo The Promotion-Triggered Fork workflow is now firing. Watch:
echo   https://github.com/mondrianaire/auto-builder/actions
echo.
echo Expected outcome in ~60-90 seconds:
echo   - mondrianaire/%SLUG%-AB created on GitHub
echo   - Deliverable (output/final/) forked + README generated at the new repo root
echo   - codex/data/curation/%SLUG%.json gets promoted_to + promoted_at fields
echo   - Dashboard chip flips to "Promoted *" after aggregator-on-push fires
echo.
echo Open Claude Code on the new repo when ready to start product development.
echo.
exit /b 0

REM ---------------------------------------------------------------------------
REM Error handlers
REM ---------------------------------------------------------------------------

:usage
echo Usage: promote-build.bat ^<slug^> [--notes "free-text reason"]
echo   Example: promote-build.bat gto-poker-async-duel
echo            promote-build.bat earthquake-map --notes "USGS data worth productizing"
echo.
echo Pre-requisites:
echo   - Build at runs/^<slug^>/ exists AND is ratified (completion-ratified.json present)
echo   - runs/^<slug^>/promoted.json does NOT already exist
echo   - Node.js on PATH
echo   - FORK_PAT secret set in Repo Settings (for the Action to create the fork repo)
exit /b 1

:err_no_slug
echo *** runs\%SLUG% does not exist.
exit /b 1

:err_not_ratified
echo *** Build is not ratified. runs\%SLUG%\completion-ratified.json missing.
echo *** Promotion requires the build to be ratified first.
echo *** Run: ratify-build.bat %SLUG%
exit /b 1

:err_already_promoted
echo *** Build is already promoted. runs\%SLUG%\promoted.json exists.
echo *** To re-promote (rare), delete the file locally and force-push.
exit /b 1

:err_no_node
echo *** node was not found on PATH.
echo *** Install Node.js from https://nodejs.org and re-run.
exit /b 1

:err_user_aborted
echo.
echo Promotion aborted. Build remains in the corpus only.
exit /b 1

:err_write
echo *** Failed to write %PROMOTED%. Check node and filesystem permissions.
exit /b 1

:err_git
echo *** Git stage or commit failed. See output above.
exit /b 1

:err_push
echo *** Git push failed. The commit landed locally but not on origin.
echo *** Try: git pull --rebase origin main, then git push origin main.
echo *** Or use deploy-session.bat for the safer commit+push path.
exit /b 1
