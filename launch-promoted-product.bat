@echo off
REM ===========================================================================
REM launch-promoted-product.bat
REM
REM One-click launcher for a promoted AutoBuilder fork:
REM   1. Ensures the local clone exists at Documents/Claude/Projects/{slug}-AB
REM      (clones from GitHub if missing, pulls if already present)
REM   2. Pre-loads cc-launch-prompt.md content into the Windows clipboard
REM   3. Launches Claude Code CLI in the clone directory; user pastes
REM      with Ctrl-V as the first message
REM
REM Usage: launch-promoted-product.bat ^<slug^>
REM Example: launch-promoted-product.bat gto-poker-async-duel
REM
REM Pre-requisites:
REM   - mondrianaire/{slug}-AB exists on GitHub (i.e., build was promoted)
REM   - Git is on PATH (or under PATHEXT-fixed shell)
REM   - Claude Code CLI (claude.exe) is on PATH
REM
REM Author: Maintenance, 2026-05-16 per user direction for a one-click
REM product-life kickoff that orients the new Claude Code instance via
REM the cc-launch-prompt.md Tier 2 bootstrap.
REM ===========================================================================

setlocal
set "PATHEXT=.COM;.EXE;.BAT;.CMD"

set "SLUG=%~1"
if "%SLUG%"=="" goto :usage

set "REPO_NAME=%SLUG%-AB"
set "PROJECTS_ROOT=C:\Users\mondr\Documents\Claude\Projects"
set "LOCAL_PATH=%PROJECTS_ROOT%\%REPO_NAME%"
set "GITHUB_URL=https://github.com/mondrianaire/%REPO_NAME%.git"

echo === Launching promoted product: %SLUG% ===
echo Local path: %LOCAL_PATH%
echo Remote:     %GITHUB_URL%
echo.

REM Ensure parent dir exists
if not exist "%PROJECTS_ROOT%" mkdir "%PROJECTS_ROOT%"

REM Clone or pull
if exist "%LOCAL_PATH%\.git" (
    echo === Pulling latest from origin ===
    cd /d "%LOCAL_PATH%"
    git pull
    if errorlevel 1 (
        echo *** git pull failed — see output above. ***
        echo *** Fix manually then re-run this bat. ***
        pause
        exit /b 1
    )
) else (
    echo === Cloning %GITHUB_URL% ===
    cd /d "%PROJECTS_ROOT%"
    git clone "%GITHUB_URL%"
    if errorlevel 1 (
        echo *** git clone failed — see output above. ***
        echo *** Check that mondrianaire/%REPO_NAME% exists on GitHub. ***
        pause
        exit /b 1
    )
    cd /d "%LOCAL_PATH%"
)

REM Verify cc-launch-prompt.md exists in the fork
if not exist "cc-launch-prompt.md" (
    echo *** cc-launch-prompt.md missing in the fork. ***
    echo *** This fork was likely created before Tier 2 shipped. ***
    echo *** Recovery: workflow_dispatch the Promotion-Triggered Fork on %SLUG% ***
    echo *** to refresh the fork. Set overwrite_user_commits=true if needed. ***
    pause
    exit /b 1
)

REM Pre-load the bootstrap prompt into the clipboard
type "cc-launch-prompt.md" | clip
echo === Bootstrap prompt copied to clipboard ===
echo Paste it (Ctrl-V) as your first message in Claude Code, then press Enter.
echo The Claude Code instance will auto-load .claude\CLAUDE.md for ambient context.
echo.

REM Verify Claude Code CLI is available
where claude >nul 2>&1
if errorlevel 1 (
    echo *** Claude Code CLI ^(claude.exe^) not found on PATH. ***
    echo *** Manual fallback: ***
    echo ***   1. Open Claude Code yourself ^(however you normally invoke it^) ***
    echo ***   2. Point it at: %LOCAL_PATH% ***
    echo ***   3. Press Ctrl-V to paste the bootstrap prompt ^(already in your clipboard^) ***
    echo ***   4. Press Enter to send ***
    echo.
    pause
    exit /b 0
)

REM Launch Claude Code in the project dir
echo === Launching Claude Code CLI in %LOCAL_PATH% ===
echo Press Ctrl-V to paste the bootstrap prompt, then Enter to send.
echo.
claude

echo.
echo === Claude Code session ended ===
exit /b 0

:usage
echo Usage: launch-promoted-product.bat ^<slug^>
echo Example: launch-promoted-product.bat gto-poker-async-duel
echo.
echo This bat does three things:
echo   1. Clones (or pulls) mondrianaire/^<slug^>-AB into Documents\Claude\Projects\^<slug^>-AB
echo   2. Copies cc-launch-prompt.md contents into your clipboard
echo   3. Launches Claude Code CLI in the project folder
echo.
echo Pre-requisites:
echo   - The build has been promoted (mondrianaire/^<slug^>-AB exists on GitHub)
echo   - Git on PATH
echo   - Claude Code CLI ^(claude.exe^) on PATH ^(non-fatal: falls back to clipboard-only mode^)
exit /b 1
