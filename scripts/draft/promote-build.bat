@echo off
REM ===========================================================================
REM promote-build.bat - Fork ceremony: promote a COMPLETED build to its own repo.
REM
REM Usage:   promote-build.bat ^<slug^> [^<new-repo-name^>]
REM Example: promote-build.bat earthquake-map
REM          -> creates mondrianaire/earthquake-map-AB
REM
REM If new-repo-name is omitted, defaults to ^<slug^>-AB per the
REM build-lifecycle.md convention (-AB suffix marks AutoBuilder heritage).
REM
REM This script is the fork-and-archive ceremony from architecture/build-lifecycle.md.
REM Run it ONLY when a build is COMPLETE (all three completion gates green:
REM instructions followable / access confirmed / verification passed).
REM Extracts a single build's history from AutoBuilder via git filter-repo
REM and pushes to a new standalone GitHub repo. The AutoBuilder repo is
REM UNCHANGED -- the build still lives in runs/^<slug^>/ here as the
REM corpus entry / architectural artifact.
REM
REM Pre-requisites:
REM   - git-filter-repo installed (`pip install git-filter-repo` -- note dash)
REM   - Empty GitHub repo created at https://github.com/mondrianaire/^<new-repo-name^>
REM     (use the GitHub UI or `gh repo create` -- DO NOT init with README,
REM     .gitignore, or license; the push needs a virgin remote)
REM
REM Per the git-integration-proposal §8 and architecture/build-lifecycle.md.
REM The build's [run:^<slug^>] commits, [step:^<slug^>:rev-N] commits, and
REM delivery/^<slug^>{,/rev-N} tags carry over into the standalone repo.
REM
REM STATUS: DRAFT. Lives in scripts\draft\ until first end-to-end test on a
REM real completion event.
REM ===========================================================================

setlocal
cd /d "%~dp0\..\.."
set "SLUG=%~1"
set "NEWNAME=%~2"

if "%SLUG%"=="" goto :usage
if "%NEWNAME%"=="" set "NEWNAME=%SLUG%-AB"
if not exist "runs\%SLUG%" (
    echo *** runs\%SLUG% does not exist. ***
    exit /b 1
)

echo === Promoting %SLUG% to mondrianaire/%NEWNAME% ===

REM Check git-filter-repo is installed
where git-filter-repo >nul 2>nul
if errorlevel 1 (
    echo *** git-filter-repo is not installed or not on PATH. ***
    echo Install with: pip install git-filter-repo
    echo Note: the package name uses a dash, not underscore.
    exit /b 1
)

set "EXTRACT_DIR=..\%NEWNAME%-extracted"

if exist "%EXTRACT_DIR%" (
    echo *** %EXTRACT_DIR% already exists. ***
    echo Remove it first if you want to re-run, or use a different new-repo-name.
    exit /b 1
)

echo === Cloning fresh copy of AutoBuilder into %EXTRACT_DIR% ===
git clone --no-local "file://%CD%" "%EXTRACT_DIR%" || goto :err

cd /d "%EXTRACT_DIR%"

echo === Filtering history to only runs/%SLUG%/output/final/ (the deliverable) ===
echo (This rewrites history; the build substrate stays in the AutoBuilder corpus)
git filter-repo --path "runs/%SLUG%/output/final/" --path-rename "runs/%SLUG%/output/final/:" || goto :err

echo === Removing AutoBuilder's origin (it was a local file:// clone) ===
git remote remove origin 2>nul

echo === Setting new origin to GitHub repo ===
git remote add origin "https://github.com/mondrianaire/%NEWNAME%.git" || goto :err

echo === Pushing main branch + all tags to new GitHub repo ===
git push -u origin main || goto :err
git push origin --tags || goto :err

echo.
echo === DONE -- %SLUG% promoted to https://github.com/mondrianaire/%NEWNAME% ===
echo.
echo The standalone repo lives at: %EXTRACT_DIR%
echo The AutoBuilder repo still contains runs\%SLUG%\ -- promotion does not remove it.
echo.
echo OPTIONAL: add a curation note in codex\data\curation\%SLUG%.json recording
echo the promotion (`promoted_to: "https://github.com/mondrianaire/%NEWNAME%"`). Codex's
echo dashboard can display a promotion badge on the build's card.
pause
exit /b 0

:usage
echo Usage: promote-build.bat ^<slug^> [^<new-repo-name^>]
echo   Example: promote-build.bat earthquake-map
echo            -^> creates mondrianaire/earthquake-map-AB
echo.
echo If new-repo-name is omitted, defaults to ^<slug^>-AB per the build-lifecycle
echo convention. The -AB suffix marks AutoBuilder heritage.
echo.
echo Pre-requisites:
echo   - Build must be COMPLETE per architecture/build-lifecycle.md (all three
echo     gates green: instructions / access / verification)
echo   - git-filter-repo installed (pip install git-filter-repo)
echo   - Empty GitHub repo created at https://github.com/mondrianaire/^<new-repo-name^>
exit /b 1

:err
echo.
echo *** A step failed. See output above. ***
pause
exit /b 1
