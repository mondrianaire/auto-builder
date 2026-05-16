@echo off
REM ===========================================================================
REM ratify-build.bat — User ratification of completion gates 1 + 2
REM
REM Usage:   ratify-build.bat ^<slug^> [--notes "free-text context"]
REM Example: ratify-build.bat earthquake-map
REM          ratify-build.bat earthquake-map --notes "Installed cleanly on first try"
REM
REM Per architecture/build-lifecycle.md, captures the user's explicit confirmation
REM that install instructions are clear (gate 1) and the deliverable is accessible
REM (gate 2). Gate 3 (verification) is asserted automatically by CV via report.json.
REM
REM Writer version: 0.3  (added inline wrap-up routine invocation as final
REM step before commit, per promotion-gate directive 2026-05-16 — every
REM newly-ratified build is promotion-eligible immediately because the
REM wrap-up artifacts and sentinel are written here.)
REM ===========================================================================

setlocal
cd /d "%~dp0"

set "SLUG=%~1"
set "WRITER_VERSION=0.3"

if "%SLUG%"=="" goto :usage

REM Parse optional --notes flag
set "NOTES="
if /i "%~2"=="--notes" set "NOTES=%~3"

REM ---------------------------------------------------------------------------
REM Validation phase
REM ---------------------------------------------------------------------------

if not exist "runs\%SLUG%" goto :err_no_slug

set "REPORT=runs\%SLUG%\output\verification\report.json"
if not exist "%REPORT%" goto :err_no_report

set "RATIFIED=runs\%SLUG%\completion-ratified.json"
if exist "%RATIFIED%" goto :err_already_ratified

where node >nul 2>&1
if errorlevel 1 goto :err_no_node

REM ---------------------------------------------------------------------------
REM Verdict check via temp file (avoids for /f + inline ternary parser issues)
REM ---------------------------------------------------------------------------

set "VTMP=%TEMP%\ratify-verdict-%RANDOM%.txt"
node -e "try{var r=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(r.verdict||'MISSING')}catch(e){process.stdout.write('PARSE_ERROR')}" "%REPORT%" > "%VTMP%" 2>nul
set "VERDICT="
set /p VERDICT=<"%VTMP%"
del /f /q "%VTMP%" 2>nul

if "%VERDICT%"=="" set "VERDICT=MISSING"
if "%VERDICT%"=="PARSE_ERROR" goto :err_parse
if "%VERDICT%"=="MISSING" goto :err_missing
if /i "%VERDICT%"=="fail" goto :err_failed
if /i "%VERDICT%"=="pass" goto :verify_ok_clean
if /i "%VERDICT%"=="pass_with_concerns" goto :verify_ok_concerns
goto :err_unknown

:verify_ok_clean
echo.
echo === Verification: PASS ===
goto :prompt_phase

:verify_ok_concerns
echo.
echo === Verification: PASS_WITH_CONCERNS ===
echo === Concerns are documented gaps per the report. ===
echo === Per build-lifecycle.md, these are ratifiable. ===
goto :prompt_phase

REM ---------------------------------------------------------------------------
REM Interactive prompts: gates 1 and 2
REM ---------------------------------------------------------------------------

:prompt_phase
echo.
echo === Ratifying %SLUG% ===
echo.
echo Verification ^(gate 3^): GREEN. The next two prompts are for the parts the
echo architecture cannot verify automatically. Read carefully. If you have not
echo actually tried to install and access the deliverable, exit now ^(Ctrl-C^)
echo and come back when you have.
echo.

set "G1="
set /p G1="Gate 1 -- Are the install instructions clear and followable? [y/N]: "
if /i "%G1%"=="y" goto :gate2_prompt
goto :err_gate1_no

:gate2_prompt
set "G2="
set /p G2="Gate 2 -- Can you access the deliverable as described by Discovery? [y/N]: "
if /i "%G2%"=="y" goto :write_phase
goto :err_gate2_no

REM ---------------------------------------------------------------------------
REM Write completion-ratified.json
REM ---------------------------------------------------------------------------

:write_phase
echo.
echo === Writing %RATIFIED% ===

REM Capture git user name to a temp file
set "UTMP=%TEMP%\ratify-user-%RANDOM%.txt"
git config user.name > "%UTMP%" 2>nul
set "RATIFIED_BY="
set /p RATIFIED_BY=<"%UTMP%"
del /f /q "%UTMP%" 2>nul
if "%RATIFIED_BY%"=="" set "RATIFIED_BY=unknown"

REM Pass NOTES via env var so cmd quoting doesn't fight us
set "NOTES_VALUE=%NOTES%"
node -e "var fs=require('fs');var n=process.env.NOTES_VALUE||'';var out={schema_version:'0.1',ratified_at:new Date().toISOString(),ratified_by:process.argv[1],instructions_followable:true,access_confirmed:true,writer_version:process.argv[2],notes:n?n:null};fs.writeFileSync(process.argv[3],JSON.stringify(out,null,2)+'\n')" "%RATIFIED_BY%" "%WRITER_VERSION%" "%RATIFIED%"

if not exist "%RATIFIED%" goto :err_write

REM ---------------------------------------------------------------------------
REM Wrap-up routine — inline as the final mechanical step of ratification.
REM Writes:
REM   - runs/{slug}/PROJECT-OVERVIEW.md      (Cat 1 wrap-up doc)
REM   - runs/{slug}/wrap-up-complete.json    (sentinel — required by
REM                                            promote-build.bat AND workflow #2)
REM This is what makes the build promotion-eligible. Failing here aborts
REM ratification (so we don't end up with completion-ratified.json without
REM the wrap-up artifacts — that state is the "older-build back-fill" case
REM that wrap-up-build.bat covers separately).
REM ---------------------------------------------------------------------------
echo.
echo === Running wrap-up routine (PROJECT-OVERVIEW.md + sentinel) ===
node architecture\scripts\wrap-up-build.mjs %SLUG% --invoked-by ratify-build.bat
if errorlevel 1 goto :err_wrapup

REM ---------------------------------------------------------------------------
REM Commit + push
REM ---------------------------------------------------------------------------

echo === Clearing any stuck git lock files ===
if exist .git\index.lock del /f /q .git\index.lock
if exist .git\config.lock del /f /q .git\config.lock

echo === Staging %RATIFIED% + wrap-up artifacts ===
git add "%RATIFIED%" "runs\%SLUG%\PROJECT-OVERVIEW.md" "runs\%SLUG%\wrap-up-complete.json" "runs\%SLUG%\decision-flowchart.html" "runs\%SLUG%\decision-flowchart.svg"
if errorlevel 1 goto :err_git

echo === Showing what will be committed ===
git status --short

echo.
echo === Committing ratification ===
git commit -m "[run:%SLUG%] ratify: instructions+access confirmed by user" -m "User ran ratify-build.bat %SLUG% and confirmed gates 1 + 2. Gate 3 verification verdict: %VERDICT%. Per architecture/build-lifecycle.md the build is now COMPLETE and ready for the fork-and-archive ceremony."
if errorlevel 1 goto :err_git

echo === Pushing to origin ===
git push origin main
if errorlevel 1 goto :err_push

echo.
echo ============================================================
echo === DONE — %SLUG% RATIFIED ===
echo ============================================================
echo.
echo Completion ratified. Next steps fire automatically via GitHub Actions:
echo   1. aggregator-on-push.yml will refresh codex/data on this push.
echo   2. completion-triggered-fork.yml will create mondrianaire/%SLUG%-AB
echo      and push the filtered history. Requires FORK_PAT secret set in
echo      Repo Settings ^> Secrets ^> Actions.
echo   3. Dashboard phase chip will flip to "Promoted" once #2 completes.
echo.
echo Watch progress at:
echo   https://github.com/mondrianaire/auto-builder/actions
echo.
echo The AutoBuilder repo retains runs/%SLUG%/ as the corpus snapshot.
echo Post-fork product life happens in the standalone repo.
echo.
echo ************************************************************
echo *  ARCHIVE THIS COWORK CHAT NOW                            *
echo ************************************************************
echo *                                                          *
echo *  This build is now SEALED. The chat that drove it has    *
echo *  served its purpose. Per architecture/build-lifecycle.md *
echo *  no further work on %SLUG% belongs in this chat or       *
echo *  in this repo.                                           *
echo *                                                          *
echo *  Manual steps (no programmatic archive API exists):      *
echo *  1. In the Cowork sidebar, RENAME this chat to prepend   *
echo *     the [ARCHIVED] indicator (e.g.,                      *
echo *     "[ARCHIVED] %SLUG% build").                          *
echo *  2. CLOSE this Cowork tab.                               *
echo *  3. If the build was promoted, open a Claude Code        *
echo *     session against the standalone repo for any future   *
echo *     product work.                                        *
echo *  4. If the build was not promoted, the corpus snapshot   *
echo *     under runs/%SLUG%/ is the final record.              *
echo *                                                          *
echo *  Continuing to extend this build inside this Cowork      *
echo *  chat is architecturally invalid -- future Claude        *
echo *  instances reading the corpus will treat the build as    *
echo *  sealed regardless of additional chat messages.          *
echo *                                                          *
echo ************************************************************
echo.
exit /b 0

REM ---------------------------------------------------------------------------
REM Error handlers
REM ---------------------------------------------------------------------------

:usage
echo Usage: ratify-build.bat ^<slug^> [--notes "free-text context"]
echo Example: ratify-build.bat earthquake-map
echo.
echo Pre-requisites:
echo   - Build at runs/^<slug^>/ exists
echo   - Verification verdict: pass or pass_with_concerns
echo   - completion-ratified.json does not already exist for this slug
echo   - Node.js on PATH
exit /b 1

:err_no_slug
echo *** runs\%SLUG% does not exist.
exit /b 1

:err_no_report
echo *** %REPORT% does not exist.
echo *** Verification has not run for this build. Cannot ratify.
exit /b 1

:err_already_ratified
echo *** %RATIFIED% already exists.
echo *** This build has already been ratified. To un-ratify, delete the file
echo *** locally and force-push. Rare event; see ratification-ui-proposal.
exit /b 1

:err_no_node
echo *** node was not found on PATH.
echo *** Install Node.js from https://nodejs.org and re-run.
exit /b 1

:err_parse
echo *** Could not parse %REPORT% as JSON.
echo *** Fix the report and re-run.
exit /b 1

:err_missing
echo *** Verification report has no verdict field.
echo *** Schema mismatch. Cannot determine state.
exit /b 1

:err_failed
echo *** Verification verdict is FAIL for %SLUG%.
echo *** Per build-lifecycle.md, gate 3 must be green before ratification.
echo *** Use commit-step.bat to enter Phase 2 rectification:
echo ***   commit-step.bat %SLUG% N "summary of rectification"
exit /b 1

:err_unknown
echo *** Unknown verdict value: %VERDICT%
echo *** Expected: pass / pass_with_concerns / fail. Refusing defensively.
exit /b 1

:err_gate1_no
echo.
echo Gate 1 not confirmed. Ratification aborted.
echo The build remains in Phase 1 ^(delivered but not yet ratified^).
echo If install instructions are unclear, enter Phase 2 rectification:
echo   commit-step.bat %SLUG% N "rectify install instructions"
exit /b 1

:err_gate2_no
echo.
echo Gate 2 not confirmed. Ratification aborted.
echo The build remains in Phase 1 ^(delivered but not yet ratified^).
echo If you cannot access the deliverable, enter Phase 2 rectification:
echo   commit-step.bat %SLUG% N "rectify access path"
exit /b 1

:err_write
echo *** Failed to write %RATIFIED%. Check node and filesystem permissions.
exit /b 1

:err_wrapup
echo *** Wrap-up routine failed. completion-ratified.json was written to disk
echo *** but PROJECT-OVERVIEW.md + wrap-up-complete.json were not produced.
echo *** This build is RATIFIED but NOT promotion-eligible.
echo ***
echo *** Recovery:
echo ***   1. See output above for the wrap-up failure reason.
echo ***   2. Fix the underlying issue (likely missing data in codex/data/index.json
echo ***      or a malformed runs/%SLUG%/output/verification/report.json).
echo ***   3. Re-run: wrap-up-build.bat %SLUG%
echo ***   4. Then: deploy-session.bat to ship.
exit /b 1

:err_git
echo *** Git stage or commit failed. See output above.
echo *** Note: %RATIFIED% may have been written but not committed.
echo *** Inspect the file and decide whether to commit manually or delete.
exit /b 1

:err_push
echo *** Git push failed. The commit landed locally but not on origin.
echo *** Try: git pull --rebase origin main, then git push origin main.
echo *** Or use deploy-session.bat for the safer commit+push path.
exit /b 1
