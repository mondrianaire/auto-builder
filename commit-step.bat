@echo off
REM ===========================================================================
REM commit-step.bat - Commit an additional-step revision on an existing build.
REM
REM Usage:   commit-step.bat ^<slug^> ^<rev-number^> "^<summary^>"
REM Example: commit-step.bat earthquake-map 1 "Fixed magnitude color scale rendering"
REM
REM Stages runs\^<slug^>\, commits with [step:^<slug^>:rev-N] prefix,
REM tags delivery/^<slug^>/rev-N, and pushes commit + tag to origin/main.
REM
REM The original delivery/^<slug^> tag remains pinned to the first-delivery
REM commit per the cardinal rule (revisions never change first_delivery_outcome).
REM Codex's revision lineage display will show both as separate cards.
REM
REM STATUS: DRAFT. Lives in scripts\draft\ until first end-to-end test.
REM ===========================================================================

setlocal
cd /d "%~dp0\..\.."
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

REM Verify primary delivery tag exists - can't have rev-N without rev-0.
git rev-parse "delivery/%SLUG%" >nul 2>nul
if errorlevel 1 (
    echo *** delivery/%SLUG% does not exist. ***
    echo Run commit-build.bat %SLUG% first to establish the primary delivery,
    echo or retroactive-bootstrap.bat if this is a historical build.
    exit /b 1
)

REM Refuse if this rev tag already exists.
git rev-parse "delivery/%SLUG%/rev-%REV%" >nul 2>nul
if not errorlevel 1 (
    echo *** delivery/%SLUG%/rev-%REV% already exists. ***
    echo If you want to overwrite, delete the tag first: git tag -d delivery/%SLUG%/rev-%REV%
    echo Or use a different rev number.
    exit /b 1
)

echo === Clearing any stuck git lock files ===
if exist .git\index.lock del /f /q .git\index.lock

echo === Staging runs\%SLUG% ===
git add "runs\%SLUG%" || goto :err

echo === Showing what will be committed ===
git status --short

echo.
echo === Committing rev-%REV% ===
git commit -m "[step:%SLUG%:rev-%REV%] %SUMMARY%" -m "Additional-step revision on %SLUG%. Primary-delivery tag (delivery/%SLUG%) remains pinned to the original first-delivery commit per the cardinal rule. This commit's tag is delivery/%SLUG%/rev-%REV%." || goto :err

echo === Tagging delivery/%SLUG%/rev-%REV% ===
git tag -a "delivery/%SLUG%/rev-%REV%" -m "Additional step rev-%REV%: %SUMMARY%" || goto :err

echo === Pushing commit and tag ===
git push --follow-tags origin main || goto :err

echo.
echo === DONE -- %SLUG% rev-%REV% committed, tagged, pushed ===
pause
exit /b 0

:usage
echo Usage: commit-step.bat ^<slug^> ^<rev-number^> "^<summary^>"
echo   Example: commit-step.bat earthquake-map 1 "Fixed magnitude color scale rendering"
exit /b 1

:err
echo.
echo *** A step failed. See output above. ***
pause
exit /b 1
