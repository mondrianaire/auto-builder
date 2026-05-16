@echo off
REM ===========================================================================
REM launch-promoted-product.bat
REM
REM One-click launcher for a promoted AutoBuilder fork:
REM   1. Ensures the local clone exists at Documents/Claude/Projects/{slug}-AB
REM      (clones from GitHub if missing, pulls if already present)
REM   2. Launches Claude Code CLI with the cc-launch-prompt.md content
REM      passed directly as the initial query
REM
REM Usage: launch-promoted-product.bat ^<slug^>
REM Example: launch-promoted-product.bat gto-poker-async-duel
REM
REM Pre-requisites:
REM   - mondrianaire/{slug}-AB exists on GitHub (i.e., build was promoted)
REM   - Git is on PATH
REM   - Claude Code CLI (claude.exe) is on PATH — supports `claude "query"`
REM     per https://code.claude.com/docs/en/cli-reference
REM
REM Author: Maintenance, 2026-05-16 (v0.2 — switched from clipboard-paste
REM to direct query argument per Claude CLI `claude "query"` support).
REM ===========================================================================

setlocal EnableDelayedExpansion
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
        pause
        exit /b 1
    )
) else (
    echo === Cloning %GITHUB_URL% ===
    cd /d "%PROJECTS_ROOT%"
    git clone "%GITHUB_URL%"
    if errorlevel 1 (
        echo *** git clone failed — check that mondrianaire/%REPO_NAME% exists. ***
        pause
        exit /b 1
    )
    cd /d "%LOCAL_PATH%"
)

REM Verify cc-launch-prompt.md exists in the fork
if not exist "cc-launch-prompt.md" (
    echo *** cc-launch-prompt.md missing in the fork. ***
    echo *** Fork was likely created before Tier 2 shipped. ***
    echo *** Recovery: workflow_dispatch the Promotion-Triggered Fork on %SLUG% ***
    echo *** to refresh. Set overwrite_user_commits=true if guard blocks. ***
    pause
    exit /b 1
)

REM Verify Claude Code CLI is available
where claude >nul 2>&1
if errorlevel 1 (
    echo *** Claude Code CLI ^(claude.exe^) not found on PATH. ***
    echo *** Install or alias claude.exe, then re-run. ***
    echo *** Local clone is ready at: %LOCAL_PATH% ***
    pause
    exit /b 1
)

REM Read cc-launch-prompt.md into a single string for the query argument.
REM cmd's variable size limit is ~8KB which fits any reasonable bootstrap prompt.
set "PROMPT="
for /f "usebackq delims=" %%L in ("cc-launch-prompt.md") do (
    if defined PROMPT (
        set "PROMPT=!PROMPT! %%L"
    ) else (
        set "PROMPT=%%L"
    )
)

if not defined PROMPT (
    echo *** cc-launch-prompt.md is empty. Falling back to interactive open. ***
    claude
    exit /b 0
)

echo === Launching Claude Code CLI with bootstrap prompt as initial query ===
echo Working directory: %LOCAL_PATH%
echo.

claude "!PROMPT!"

echo.
echo === Claude Code session ended ===
exit /b 0

:usage
echo Usage: launch-promoted-product.bat ^<slug^>
echo Example: launch-promoted-product.bat gto-poker-async-duel
echo.
echo This bat:
echo   1. Clones (or pulls) mondrianaire/^<slug^>-AB into Documents\Claude\Projects\^<slug^>-AB
echo   2. Reads cc-launch-prompt.md content
echo   3. Launches Claude Code CLI with that content as the initial query
echo      ^(uses `claude "query"` per Claude CLI reference^)
echo.
echo Pre-requisites:
echo   - mondrianaire/^<slug^>-AB exists on GitHub
echo   - Git on PATH
echo   - Claude Code CLI ^(claude.exe^) on PATH
exit /b 1
