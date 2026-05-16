@echo off
REM ===========================================================================
REM ratify-build.bat — User ratification of completion gates 1 + 2
REM
REM Usage:   ratify-build.bat ^<slug^> [--notes "free-text context"]
REM Example: ratify-build.bat earthquake-map
REM          ratify-build.bat earthquake-map --notes "Installed cleanly on first try"
REM
REM Per architecture/build-lifecycle.md § Three Completion Gates, this script
REM captures the user's explicit confirmation that:
REM   (gate 1) Install instructions are clear and followable
REM   (gate 2) The deliverable is accessible as described by Discovery's ledger
REM
REM Gate 3 (verification) is asserted automatically by Convergence Verifier
REM and lives in runs/{slug}/output/verification/report.json#passed. This
REM script REFUSES to run if gate 3 isn't already green — you can't ratify a
REM build whose internal verification failed.
REM
REM Output: writes runs/{slug}/completion-ratified.json per the schema in
REM codex/docs/maintenance-initiated/ratification-ui-proposal.md § Schema.
REM
REM Once committed and pushed, the completion-triggered-fork.yml workflow
REM (when shipped — gated on this proposal) will fire the fork ceremony per
REM build-lifecycle.md § Fork-and-Archive Ceremony.
REM
REM Author: Maintenance, per ratification-ui-proposal.md.
REM Writer version: 0.1
REM ===========================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

set "SLUG=%~1"
set "NOTES="
set "WRITER_VERSION=0.1"

if "%SLUG%"=="" goto :usage

REM Parse optional --notes flag
if "%~2"=="--notes" (
    if "%~3"=="" (
        echo *** --notes requires a value. ***
        exit /b 1
    )
    set "NOTES=%~3"
)

REM ---------------------------------------------------------------------------
REM Validation phase: refuse early if anything is wrong.
REM ---------------------------------------------------------------------------

if not exist "runs\%SLUG%" (
    echo *** runs\%SLUG% does not exist. ***
    exit /b 1
)

set "REPORT=runs\%SLUG%\output\verification\report.json"
if not exist "%REPORT%" (
    echo *** %REPORT% does not exist.
    echo *** Verification has not run for this build. Cannot ratify.
    exit /b 1
)

set "RATIFIED=runs\%SLUG%\completion-ratified.json"
if exist "%RATIFIED%" (
    echo *** %RATIFIED% already exists.
    echo *** This build has already been ratified. To un-ratify, delete the
    echo *** file locally and force-push (rare event; see ratification-ui-proposal
    echo *** § Open question 4 for context).
    exit /b 1
)

REM Use node to parse the verification report and check passed === true.
REM Requires node on PATH. Same node version the aggregator and the Action use.
where node >nul 2>&1
if errorlevel 1 (
    echo *** node was not found on PATH. node is required to parse %REPORT%.
    echo *** Install Node.js from https://nodejs.org and re-run.
    exit /b 1
)

for /f "usebackq tokens=*" %%v in (`node -e "try{const r=JSON.parse(require('fs').readFileSync('%REPORT:\=/%','utf8'));process.stdout.write(r.passed===true?'PASS':'FAIL')}catch(e){process.stdout.write('PARSE_ERROR')}"`) do (
    set "VERIFY_STATE=%%v"
)

if "%VERIFY_STATE%"=="PARSE_ERROR" (
    echo *** Could not parse %REPORT% as JSON, or it's missing the `passed` field.
    echo *** Cannot determine verification state. Fix the report and re-run.
    exit /b 1
)

if not "%VERIFY_STATE%"=="PASS" (
    echo *** Verification has not passed for %SLUG%.
    echo *** runs/%SLUG%/output/verification/report.json shows passed=false.
    echo ***
    echo *** Per architecture/build-lifecycle.md, gate 3 ^(verification^) must be
    echo *** green before ratification. The build is in Phase 2 ^(In Limbo^).
    echo *** Use commit-step.bat to enter rectification:
    echo ***   commit-step.bat %SLUG% N "summary of rectification"
    exit /b 1
)

REM ---------------------------------------------------------------------------
REM Interactive phase: the user confirms gates 1 and 2.
REM ---------------------------------------------------------------------------

echo.
echo === Ratifying %SLUG% ===
echo.
echo Verification ^(gate 3^): PASSED
echo.
echo The next two prompts ask about gates 1 and 2 — the parts the architecture
echo cannot verify automatically. Please read each carefully. If you have not
echo actually tried to install and access the deliverable yet, exit ^(Ctrl-C^)
echo and come back when you have.
echo.

set "G1="
set /p G1="Gate 1 -- Are the install instructions clear and followable? [y/N]: "
if /i not "%G1%"=="y" (
    echo.
    echo Gate 1 not confirmed. Ratification aborted.
    echo The build remains in Phase 1 ^(delivered but not yet ratified^).
    echo If you can't follow the instructions, that is a Phase 2 trigger:
    echo   commit-step.bat %SLUG% N "rectify install instructions"
    exit /b 1
)

set "G2="
set /p G2="Gate 2 -- Can you access the deliverable as described by Discovery? [y/N]: "
if /i not "%G2%"=="y" (
    echo.
    echo Gate 2 not confirmed. Ratification aborted.
    echo The build remains in Phase 1 ^(delivered but not yet ratified^).
    echo If you can't access the deliverable, that is a Phase 2 trigger:
    echo   commit-step.bat %SLUG% N "rectify access path"
    exit /b 1
)

REM ---------------------------------------------------------------------------
REM Write phase: compose JSON via node + git config user.name.
REM ---------------------------------------------------------------------------

for /f "usebackq tokens=*" %%u in (`git config user.name`) do set "RATIFIED_BY=%%u"
if "%RATIFIED_BY%"=="" set "RATIFIED_BY=unknown"

echo.
echo === Writing %RATIFIED% ===
node -e "const fs=require('fs');const out={schema_version:'0.1',ratified_at:new Date().toISOString(),ratified_by:'%RATIFIED_BY%',instructions_followable:true,access_confirmed:true,writer_version:'%WRITER_VERSION%',notes:%NOTES_JSON%};fs.writeFileSync('%RATIFIED:\=/%',JSON.stringify(out,null,2)+'\n');" 2>nul

REM Fallback if the inline NOTES interpolation glitches (cmd quoting is fragile)
if not exist "%RATIFIED%" (
    if "%NOTES%"=="" (
        node -e "const fs=require('fs');const out={schema_version:'0.1',ratified_at:new Date().toISOString(),ratified_by:'%RATIFIED_BY%',instructions_followable:true,access_confirmed:true,writer_version:'%WRITER_VERSION%',notes:null};fs.writeFileSync('%RATIFIED:\=/%',JSON.stringify(out,null,2)+'\n');"
    ) else (
        node -e "const fs=require('fs');const out={schema_version:'0.1',ratified_at:new Date().toISOString(),ratified_by:'%RATIFIED_BY%',instructions_followable:true,access_confirmed:true,writer_version:'%WRITER_VERSION%',notes:process.env.NOTES_VALUE};fs.writeFileSync('%RATIFIED:\=/%',JSON.stringify(out,null,2)+'\n');"
    )
)

if not exist "%RATIFIED%" (
    echo *** Failed to write %RATIFIED%. Check node + filesystem permissions.
    exit /b 1
)

REM ---------------------------------------------------------------------------
REM Commit + push phase.
REM ---------------------------------------------------------------------------

echo === Clearing any stuck git lock files ===
if exist .git\index.lock del /f /q .git\index.lock
if exist .git\config.lock del /f /q .git\config.lock

echo === Staging %RATIFIED% ===
git add "%RATIFIED%" || goto :err

echo === Showing what will be committed ===
git status --short

echo.
echo === Committing ratification ===
git commit -m "[run:%SLUG%] ratify: instructions+access confirmed by user" -m "User ran ratify-build.bat %SLUG% and confirmed both completion gates 1 (instructions followable) and 2 (access confirmed). Gate 3 (verification) was already PASSED per runs/%SLUG%/output/verification/report.json. Per architecture/build-lifecycle.md, this build is now COMPLETE and ready for the fork-and-archive ceremony. The completion-triggered-fork.yml workflow (when shipped) will pick this up on push and create mondrianaire/%SLUG%-AB." || goto :err

echo === Pushing to origin ===
git push origin main || goto :err

echo.
echo ============================================================
echo === DONE — %SLUG% RATIFIED ===
echo ============================================================
echo.
echo Completion ratified. Next steps fire automatically:
echo.
echo   1. aggregator-on-push.yml will refresh codex/data on this push,
echo      surfacing the new completion-ratified.json in the per-run summary.
echo   2. The Codex dashboard will flip this build's phase chip to
echo      "Complete · awaiting fork".
echo   3. When completion-triggered-fork.yml ships and fires on this same
echo      push, it will create mondrianaire/%SLUG%-AB and push the filtered
echo      history. Watch the Actions tab:
echo      https://github.com/mondrianaire/auto-builder/actions
echo.
echo The AutoBuilder repo retains runs/%SLUG%/ as the corpus snapshot.
echo Post-fork product life happens in the standalone repo.
echo.
exit /b 0

:usage
echo Usage: ratify-build.bat ^<slug^> [--notes "free-text context"]
echo   Example: ratify-build.bat earthquake-map
echo            ratify-build.bat earthquake-map --notes "Installed cleanly first try"
echo.
echo Pre-requisites:
echo   - Build must exist at runs/^<slug^>/
echo   - Verification must have passed (runs/^<slug^>/output/verification/report.json#passed = true)
echo   - completion-ratified.json must not already exist for this slug
echo   - Node.js on PATH (used to parse the verification report)
echo.
echo See codex/docs/maintenance-initiated/ratification-ui-proposal.md and
echo architecture/build-lifecycle.md for the full lifecycle context.
exit /b 1

:err
echo.
echo *** A step failed. See output above. ***
echo *** Note: completion-ratified.json may have been written but not committed.
echo *** Inspect %RATIFIED% and decide whether to commit manually or delete.
exit /b 1
