@echo off
REM ===========================================================================
REM deploy-pages.bat - One-click deploy of github-profile-card to GitHub Pages.
REM
REM What this does:
REM   1. Stages a clean copy of output/final/ (deliverable + README + divergence
REM      record) in a sibling directory OUTSIDE the AutoBuilder repo.
REM   2. Adds a .nojekyll file so Pages serves the files as-is.
REM   3. Creates the GitHub repo mondrianaire/github-profile-card via gh CLI
REM      (public, no init) if it doesn't exist; pushes the initial commit.
REM   4. Enables GitHub Pages on the repo (source: main branch / root).
REM   5. Opens the Pages URL in the default browser.
REM
REM Requirements (one-time setup if missing):
REM   - gh CLI installed: https://cli.github.com/  (winget install GitHub.cli)
REM   - gh logged in: run `gh auth login` once and follow prompts.
REM   - git installed and on PATH (you already have this).
REM
REM Idempotent: re-running pushes new commits without recreating the repo.
REM Pages provisioning takes ~30-60 seconds the first time. Subsequent pushes
REM publish within ~10-20 seconds.
REM ===========================================================================

setlocal enabledelayedexpansion

REM Fix DC-environment PATHEXT so .EXE resolves bare without specifying extension
set "PATHEXT=.COM;.EXE;.BAT;.CMD"

set "SLUG=github-profile-card"
set "OWNER=mondrianaire"
set "REPO=%OWNER%/%SLUG%"
set "PAGES_URL=https://%OWNER%.github.io/%SLUG%/"

REM Source = output/final/ of this build
set "SOURCE_DIR=%~dp0output\final"

REM Deploy staging = ..\..\..\<slug>-deploy (sibling to the AutoBuilder repo,
REM outside it so we never nest .git directories).
set "DEPLOY_DIR=%~dp0..\..\..\..\%SLUG%-deploy"

echo === GitHub Profile Card -- Pages deploy ===
echo.
echo Source:      %SOURCE_DIR%
echo Staging:     %DEPLOY_DIR%
echo Repo:        https://github.com/%REPO%
echo Pages URL:   %PAGES_URL%
echo.

REM -- Step 1: verify prerequisites -----------------------------------------

where gh >nul 2>nul
if errorlevel 1 (
    echo *** gh CLI not found on PATH. ***
    echo Install it: winget install GitHub.cli   (or download from https://cli.github.com/^)
    echo Then run: gh auth login
    pause
    exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
    echo *** git not found on PATH. ***
    pause
    exit /b 1
)

gh auth status >nul 2>nul
if errorlevel 1 (
    echo *** gh is not authenticated. Run: gh auth login ***
    pause
    exit /b 1
)

if not exist "%SOURCE_DIR%\index.html" (
    echo *** Source missing: %SOURCE_DIR%\index.html ***
    pause
    exit /b 1
)

REM -- Step 2: stage clean deploy directory ---------------------------------

echo === Staging clean deploy directory ===
if exist "%DEPLOY_DIR%" (
    echo Removing prior staging at %DEPLOY_DIR%
    rmdir /s /q "%DEPLOY_DIR%" || goto :err
)
mkdir "%DEPLOY_DIR%" || goto :err

REM Copy deliverable. /E recurses, /I assumes dir, /Y silent overwrite, /Q quiet
xcopy "%SOURCE_DIR%\*" "%DEPLOY_DIR%\" /E /I /Y /Q >nul || goto :err

REM Add .nojekyll so GitHub Pages skips Jekyll processing and serves files as-is
type nul > "%DEPLOY_DIR%\.nojekyll"

REM Add a small .gitignore for cleanliness
(
    echo # No build artifacts to ignore -- this is a static deliverable.
    echo # The whole folder is the published site.
    echo Thumbs.db
    echo .DS_Store
) > "%DEPLOY_DIR%\.gitignore"

REM -- Step 3: git init + initial commit ------------------------------------

echo === Initializing git in deploy staging ===
pushd "%DEPLOY_DIR%" || goto :err

git init -b main >nul || goto :err
git add . || goto :err

REM Write commit message to a temp file (avoids PowerShell tokenization issues)
set "MSG_FILE=%TEMP%\github-profile-card-deploy-msg.txt"
(
    echo Deploy github-profile-card to GitHub Pages
    echo.
    echo Single-file static tool for viewing a GitHub developer profile card:
    echo pinned repos, current contribution streak, most-used language, and
    echo a 90-day contribution-activity heatmap.
    echo.
    echo Built by AutoBuilder. Original deliverable at:
    echo Auto Builder/runs/github-profile-card/output/final/
    echo.
    echo Requires a GitHub Personal Access Token ^(read:user scope^) pasted into
    echo the page; the token is held in memory only and sent only to api.github.com.
) > "%MSG_FILE%"

git commit -F "%MSG_FILE%" || goto :err
del "%MSG_FILE%" >nul 2>nul

REM -- Step 4: create repo (if missing) and push -----------------------------

echo === Checking if repo %REPO% exists ===
gh repo view %REPO% >nul 2>nul
if errorlevel 1 (
    echo Repo does not exist. Creating mondrianaire/%SLUG% as PUBLIC...
    gh repo create %REPO% --public --description "GitHub developer profile card: pinned repos, contribution streak, most-used language, 90-day activity heatmap. Built by AutoBuilder." --homepage "%PAGES_URL%" --source=. --remote=origin --push || goto :err
) else (
    echo Repo already exists. Pushing to existing remote.
    git remote add origin "https://github.com/%REPO%.git" 2>nul
    git branch -M main
    git push -u origin main --force || goto :err
)

REM -- Step 5: enable GitHub Pages ------------------------------------------

echo === Enabling GitHub Pages ^(source: main branch / root^) ===

REM Check if Pages is already enabled
gh api repos/%REPO%/pages >nul 2>nul
if errorlevel 1 (
    echo Pages not yet enabled; enabling now...
    gh api -X POST repos/%REPO%/pages -f "source[branch]=main" -f "source[path]=/" >nul
    if errorlevel 1 (
        echo *** Pages enable via API failed. Fall back: enable manually at: ***
        echo https://github.com/%REPO%/settings/pages
    ) else (
        echo Pages enabled.
    )
) else (
    echo Pages already enabled.
)

popd

REM -- Step 6: open the URL --------------------------------------------------

echo.
echo === DONE ===
echo.
echo Repo:   https://github.com/%REPO%
echo Pages:  %PAGES_URL%
echo.
echo Pages provisioning typically takes 30-60 seconds on first deploy.
echo If the URL 404s, wait a minute and refresh.
echo.
echo Opening the Pages URL in your default browser...
start "" "%PAGES_URL%"
echo.
pause
exit /b 0

:err
echo.
echo *** A step failed. See output above. ***
popd 2>nul
pause
exit /b 1
