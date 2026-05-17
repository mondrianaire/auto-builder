@echo off
REM ===========================================================================
REM deploy-pages.bat -- github-profile-card delivery + Pages URL opener.
REM
REM Replaces the original (wrong) version of this script. The original tried
REM to create a sister repo at mondrianaire/github-profile-card, which fought
REM the architecture twice over: (1) skipped the v1.10 C5 commit cadence that
REM lives at repo-root commit-build.bat, and (2) ignored that the parent
REM AutoBuilder repo (mondrianaire/auto-builder) already has Pages enabled and
REM serves every runs/<slug>/ path automatically.
REM
REM Corrected flow:
REM   1. Invoke the canonical commit-build.bat <slug> at repo root.
REM      That stages runs/github-profile-card/, commits with the v1.10 message
REM      prefix, tags delivery/github-profile-card, and pushes to origin/main.
REM   2. Open the Pages URL in the default browser. Pages typically reflects
REM      the new content within ~60 seconds.
REM
REM If you want to redeploy after edits, prefer commit-step.bat over re-running
REM commit-build.bat (which refuses if the delivery tag already exists).
REM ===========================================================================

setlocal
set "PATHEXT=.COM;.EXE;.BAT;.CMD"
set "SLUG=github-profile-card"
set "PAGES_URL=https://mondrianaire.github.io/auto-builder/runs/%SLUG%/output/final/"

echo === Deploying %SLUG% via canonical commit-build.bat ===
echo.
echo This calls the v1.10 C5 commit cadence script at the AutoBuilder repo root.
echo It stages runs\%SLUG%\, commits, tags delivery/%SLUG%, and pushes.
echo.

REM cd to AutoBuilder repo root (this .bat lives at runs/<slug>/, so ..\..\ )
pushd "%~dp0..\.."

if not exist "commit-build.bat" (
    echo *** commit-build.bat not found at AutoBuilder repo root. ***
    echo Expected: %CD%\commit-build.bat
    popd
    pause
    exit /b 1
)

call commit-build.bat %SLUG%
if errorlevel 1 (
    echo.
    echo *** commit-build.bat reported an error. ***
    echo If the message says "delivery/%SLUG% already exists", this build has already
    echo been pushed. Use commit-step.bat for revision commits, or visit the Pages URL
    echo below to view what is already live.
    popd
    pause
    exit /b 1
)

popd

echo.
echo === Push complete. Pages serves the new content in ~30-60 seconds. ===
echo.
echo Live URL: %PAGES_URL%
echo.
echo Opening in your default browser...
start "" "%PAGES_URL%"
echo.
pause
exit /b 0
