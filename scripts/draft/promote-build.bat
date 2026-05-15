@echo off
REM ===========================================================================
REM promote-build.bat - Promote a build to a standalone GitHub repo.
REM
REM Usage:   promote-build.bat ^<slug^> ^<new-repo-name^>
REM Example: promote-build.bat earthquake-map earthquake-map
REM
REM Extracts a single build's history from AutoBuilder via git filter-repo
REM and pushes to a new standalone GitHub repo. The AutoBuilder repo is
REM UNCHANGED -- the build still lives in runs/^<slug^>/ here.
REM
REM Pre-requisites:
REM   - git-filter-repo installed (`pip install git-filter-repo` -- note dash)
REM   - Empty GitHub repo created at https://github.com/Jett/^<new-repo-name^>
REM     (use the GitHub UI or `gh repo create` -- DO NOT init with README,
REM     .gitignore, or license; the push needs a virgin remote)
REM
REM Per the git-integration-proposal §8. The build's [run:^<slug^>] commits
REM and delivery/^<slug^> tags carry over into the standalone repo.
REM
REM STATUS: DRAFT. Lives in scripts\draft\ until first end-to-end test.
REM ===========================================================================

setlocal
cd /d "%~dp0\..\.."
set "SLUG=%~1"
set "NEWNAME=%~2"

if "%SLUG%"=="" goto :usage
if "%NEWNAME%"=="" goto :usage
if not exist "runs\%SLUG%" (
    echo *** runs\%SLUG% does not exist. ***
    exit /b 1
)

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

echo === Filtering history to only runs/%SLUG%/ ===
echo (This rewrites history; only the build's commits and tags survive)
git filter-repo --path "runs/%SLUG%/" --path-rename "runs/%SLUG%/:" || goto :err

echo === Removing AutoBuilder's origin (it was a local file:// clone) ===
git remote remove origin 2>nul

echo === Setting new origin to GitHub repo ===
git remote add origin "https://github.com/Jett/%NEWNAME%.git" || goto :err

echo === Pushing main branch + all tags to new GitHub repo ===
git push -u origin main || goto :err
git push origin --tags || goto :err

echo.
echo === DONE -- %SLUG% promoted to https://github.com/Jett/%NEWNAME% ===
echo.
echo The standalone repo lives at: %EXTRACT_DIR%
echo The AutoBuilder repo still contains runs\%SLUG%\ -- promotion does not remove it.
echo.
echo OPTIONAL: add a curation note in codex\data\curation\%SLUG%.json recording
echo the promotion (`promoted_to: "https://github.com/Jett/%NEWNAME%"`). Codex's
echo dashboard can display a promotion badge on the build's card.
pause
exit /b 0

:usage
echo Usage: promote-build.bat ^<slug^> ^<new-repo-name^>
echo   Example: promote-build.bat earthquake-map earthquake-map
echo.
echo Pre-requisites:
echo   - git-filter-repo installed (pip install git-filter-repo)
echo   - Empty GitHub repo created at https://github.com/Jett/^<new-repo-name^>
exit /b 1

:err
echo.
echo *** A step failed. See output above. ***
pause
exit /b 1
