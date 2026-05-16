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
REM Author: Maintenance, 2026-05-16
REM   v0.1 — clipboard-paste pattern (type ... | clip + interactive open)
REM   v0.2 — switched to `claude "query"` per CLI reference (direct argv)
REM   v0.3 — smart pull strategy: hard-reset against origin/main when local
REM          fork has only [bot:fork] seed commits (no user product-life work
REM          yet), falls back to `git pull` once real product-life commits
REM          exist. Closes the merge-commit-on-force-push hole introduced by
REM          workflow #2 re-derivation.
REM   v0.4 — spawn Claude Code CLI in a NEW visible cmd window via `start`,
REM          so the bat is invokable from Desktop Commander (or any hidden
REM          shell) while still giving the user a visible interactive Claude
REM          Code session. Working directory of the new window is set to the
REM          fork root so Claude Code orients there.
REM ===========================================================================

setlocal EnableDelayedExpansion
set "PATHEXT=.COM;.EXE;.BAT;.CMD"

REM Parse args. First non-flag positional is the slug. --auto suppresses
REM `pause` calls on error paths so the bat can be invoked from a non-
REM interactive shell (e.g., Desktop Commander) without hanging.
set "AUTO_MODE=0"
set "SLUG="
:argloop
if "%~1"=="" goto :argdone
if /I "%~1"=="--auto" (
    set "AUTO_MODE=1"
    shift
    goto :argloop
)
if not defined SLUG (
    set "SLUG=%~1"
    shift
    goto :argloop
)
shift
goto :argloop
:argdone

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

REM Clone or sync
if exist "%LOCAL_PATH%\.git" (
    cd /d "%LOCAL_PATH%"
    echo === Fetching origin ===
    git fetch
    if errorlevel 1 (
        echo *** git fetch failed — see output above. ***
        if "!AUTO_MODE!"=="0" pause
        exit /b 1
    )

    REM Detect product-life commits via TIMESTAMP, not subject.
    REM
    REM Workflow #2 creates the fork via filter-repo, which REPLAYS the
    REM original AutoBuilder build commits into the fork's history. Those
    REM replayed commits have author identities from the original build
    REM (not github-actions[bot]) and subjects like "fix(...)", "Update X",
    REM etc. — they look exactly like product-life work but they're not.
    REM
    REM The distinguishing fact is the timestamp: filter-repo preserves the
    REM original author/committer timestamps, so build-replayed commits all
    REM have timestamps BEFORE the [bot:fork] seed commits. Real product-life
    REM commits will have timestamps AFTER. So we find the most-recent
    REM [bot:fork] committer-timestamp and count any commit whose committer-
    REM timestamp is strictly greater than that.
    set "FORK_TS=0"
    for /f "usebackq delims=" %%T in (`git log --pretty^=format:"%%ct %%s"`) do (
        set "LINE=%%T"
        for /f "tokens=1,*" %%A in ("!LINE!") do (
            echo %%B | findstr /b /c:"[bot:fork]" >nul
            if not errorlevel 1 (
                if %%A GTR !FORK_TS! set "FORK_TS=%%A"
            )
        )
    )

    set "PRODUCT_LIFE_COUNT=0"
    if !FORK_TS! GTR 0 (
        for /f "usebackq delims=" %%C in (`git log --pretty^=format:"%%ct"`) do (
            if %%C GTR !FORK_TS! set /a PRODUCT_LIFE_COUNT+=1
        )
    ) else (
        REM No [bot:fork] commits found — treat every commit as product-life
        REM (safer default; we'd rather do a merge-pull than nuke unknown work).
        for /f "usebackq delims=" %%C in (`git log --pretty^=format:"%%h"`) do (
            set /a PRODUCT_LIFE_COUNT+=1
        )
    )

    if !PRODUCT_LIFE_COUNT! GTR 0 (
        echo === !PRODUCT_LIFE_COUNT! product-life commit(s) detected — using safe pull ===
        git pull
        if errorlevel 1 (
            echo *** git pull failed — fork has divergent product-life work. ***
            echo *** Resolve manually, then re-run. ***
            pause
            exit /b 1
        )
    ) else (
        echo === Only [bot:fork] seed commits locally — hard-resetting to origin/main ===
        git reset --hard origin/main
        if errorlevel 1 (
            echo *** git reset --hard failed — see output above. ***
            pause
            exit /b 1
        )
    )
) else (
    echo === Cloning %GITHUB_URL% ===
    cd /d "%PROJECTS_ROOT%"
    git clone "%GITHUB_URL%"
    if errorlevel 1 (
        echo *** git clone failed — check that mondrianaire/%REPO_NAME% exists. ***
        if "!AUTO_MODE!"=="0" pause
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
    if "!AUTO_MODE!"=="0" pause
    exit /b 1
)

REM Verify Claude Code CLI is available
where claude >nul 2>&1
if errorlevel 1 (
    echo *** Claude Code CLI ^(claude.exe^) not found on PATH. ***
    echo *** Install or alias claude.exe, then re-run. ***
    echo *** Local clone is ready at: %LOCAL_PATH% ***
    if "!AUTO_MODE!"=="0" pause
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

echo === Launching Claude Code CLI in a new window ===
echo Working directory: %LOCAL_PATH%
echo Window title:      Claude Code: %SLUG%
echo.

REM `start` opens a new visible cmd window so the bat is invokable from
REM Desktop Commander (or any hidden shell) while still giving the user a
REM real interactive Claude Code session. `/D` sets the new window's working
REM directory; `/K` keeps the cmd shell open after claude exits so the user
REM can see any final output and re-invoke if needed.
start "Claude Code: %SLUG%" /D "%LOCAL_PATH%" cmd /K claude "!PROMPT!"

echo === Spawned Claude Code window ===
echo This launcher exits now; the new window will run independently.
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
