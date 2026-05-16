@echo off
REM ===========================================================================
REM deploy-session.bat
REM
REM One-click deploy for a Cowork session's local changes. Designed to be the
REM user's only required interaction for routine Codex + architecture pushes.
REM
REM What it does:
REM   1. Refreshes the Codex data layer (runs the aggregator) so codex/data/*
REM      reflects current source files + curation overlays.
REM   2. Makes up to three scoped commits, only emitting those that have
REM      staged changes (the v1.10 scope rule: one stream prefix per commit):
REM        - [arch] commit for architecture/ changes
REM        - [codex] commit for codex/ changes (+ aggregator)
REM        - [scripts] commit for any new/changed repo-root .bat files
REM   3. Pushes all commits to origin/main with --follow-tags.
REM
REM Commit messages come from .commit-msg-{arch,codex,scripts}.txt files at
REM repo root if present (so Codex/Maintenance can stage the message text
REM before invocation), with safe defaults otherwise. Message files self-
REM delete after a successful commit so subsequent runs don't reuse them.
REM
REM Authored 2026-05-15 by Codex under user clearance for the cross-instance
REM workspace boundary. Per v1.10 commit conventions: `git commit -F <file>`
REM is used everywhere to avoid PowerShell `-m` tokenization issues.
REM ===========================================================================

setlocal
cd /d "%~dp0"

REM Fix PATHEXT so bare `git`, `node`, etc. resolve under Desktop Commander shells
set "PATHEXT=.COM;.EXE;.BAT;.CMD"

REM --auto flag: invoked by auto-deploy-watcher.bat; suppresses interactive
REM prompts (pause) and exits silently if nothing to do. Manual invocations
REM (no --auto) keep the pauses + echoes for visibility.
set "AUTO_MODE="
if /i "%~1"=="--auto" set "AUTO_MODE=1"

REM In auto mode, fast-path exit if nothing to do (avoid noisy log entries)
if defined AUTO_MODE (
    git status --porcelain > "%temp%\_codex_status.tmp" 2>nul
    for %%I in ("%temp%\_codex_status.tmp") do set "_STAT_SIZE=%%~zI"
    git rev-list "@{u}..HEAD" --count 2>nul > "%temp%\_codex_ahead.tmp"
    set /p _AHEAD=<"%temp%\_codex_ahead.tmp"
    if "%_AHEAD%"=="" set "_AHEAD=0"
    del "%temp%\_codex_status.tmp" 2>nul
    del "%temp%\_codex_ahead.tmp" 2>nul
    if "%_STAT_SIZE%"=="0" if "%_AHEAD%"=="0" (
        echo [auto] Nothing to commit or push. Working tree clean and up-to-date.
        exit /b 0
    )
)

echo === Refreshing Codex data layer (aggregator) ===
node codex\scripts\aggregate.mjs
if errorlevel 1 (
    echo *** Aggregator failed. Aborting before any commits. ***
    if not defined AUTO_MODE pause
    exit /b 1
)

echo === Clearing any stuck git locks ===
if exist .git\index.lock del /f /q .git\index.lock
if exist .git\config.lock del /f /q .git\config.lock
if exist .git\HEAD.lock  del /f /q .git\HEAD.lock

set "COMMITTED_ANY="

REM ---- Commit 1 of 3: [arch] ----
echo.
echo === Checking for architecture/ changes ===
git add architecture/ 2>nul
git diff --cached --quiet -- architecture/
if errorlevel 1 (
    echo Staged architecture/ changes. Committing [arch]...
    if exist .commit-msg-arch.txt (
        git commit -F .commit-msg-arch.txt || goto :err
        del /f /q .commit-msg-arch.txt
    ) else (
        echo [arch] amendment > .tmp-msg-arch.txt
        echo. >> .tmp-msg-arch.txt
        echo Architecture amendment committed via deploy-session.bat fallback. >> .tmp-msg-arch.txt
        echo No .commit-msg-arch.txt was staged so this default message was used. >> .tmp-msg-arch.txt
        git commit -F .tmp-msg-arch.txt || goto :err
        del /f /q .tmp-msg-arch.txt
    )
    set "COMMITTED_ANY=1"
) else (
    echo No architecture/ changes; skipping arch commit.
)

REM ---- Commit 2 of 3: [codex] ----
echo.
echo === Checking for codex/ changes ===
git add codex/ 2>nul
git diff --cached --quiet -- codex/
if errorlevel 1 (
    echo Staged codex/ changes. Committing [codex]...
    if exist .commit-msg-codex.txt (
        git commit -F .commit-msg-codex.txt || goto :err
        del /f /q .commit-msg-codex.txt
    ) else (
        echo [codex] dashboard + data refresh > .tmp-msg-codex.txt
        echo. >> .tmp-msg-codex.txt
        echo Codex content committed via deploy-session.bat fallback. >> .tmp-msg-codex.txt
        echo No .commit-msg-codex.txt was staged so this default message was used. >> .tmp-msg-codex.txt
        git commit -F .tmp-msg-codex.txt || goto :err
        del /f /q .tmp-msg-codex.txt
    )
    set "COMMITTED_ANY=1"
) else (
    echo No codex/ changes; skipping codex commit.
)

REM ---- Commit 3 of 3: [scripts] ----
echo.
echo === Checking for repo-root .bat / scripts/ changes ===
git add *.bat scripts/ 2>nul
git diff --cached --quiet
if errorlevel 1 (
    echo Staged scripts/.bat changes. Committing [scripts]...
    if exist .commit-msg-scripts.txt (
        git commit -F .commit-msg-scripts.txt || goto :err
        del /f /q .commit-msg-scripts.txt
    ) else (
        echo [scripts] repo-root tooling update > .tmp-msg-scripts.txt
        echo. >> .tmp-msg-scripts.txt
        echo Repo-root scripts updated via deploy-session.bat fallback. >> .tmp-msg-scripts.txt
        echo No .commit-msg-scripts.txt was staged so this default message was used. >> .tmp-msg-scripts.txt
        git commit -F .tmp-msg-scripts.txt || goto :err
        del /f /q .tmp-msg-scripts.txt
    )
    set "COMMITTED_ANY=1"
) else (
    echo No scripts/.bat changes; skipping scripts commit.
)

REM ---- Push ----
REM Always reach the push step (don't early-exit on "no new staged changes")
REM because the working tree being clean doesn't mean origin is caught up —
REM local could have unpushed commits from a prior failed push. Let
REM `git push` itself decide whether there's anything to send.

echo.
echo === Rebasing on top of origin/main (picks up bot's auto-aggregator commits) ===
REM Pull --rebase --autostash so local commits replay on top of any bot commits
REM that landed since our last fetch. -X ours prefers the upstream (bot's)
REM version of any regenerated file on conflict — during rebase, "ours" is the
REM branch we're rebasing onto, NOT our local commits. The bot's aggregator
REM output is canonical for codex/data/*, so when there's a conflict we want
REM the upstream version to win.
REM This is the fix for the 2026-05-16 push-rejected case where deploy-session.bat
REM ran after aggregator-on-push had already advanced origin.
git pull --rebase --autostash -X ours origin main
if errorlevel 1 (
    echo *** Rebase failed. Resolve manually then retry. ***
    echo Hint: try `git rebase --abort` and inspect with `git status`.
    if not defined AUTO_MODE pause
    exit /b 1
)

echo.
echo === Pushing to origin/main with --follow-tags ===
git push origin main --follow-tags || goto :err

echo.
echo === DONE — committed and pushed. Pages will reflect new state in ~1 min. ===
echo Live dashboard: https://mondrianaire.github.io/auto-builder/codex/
if not defined AUTO_MODE pause
exit /b 0

:err
echo.
echo *** A step failed. See output above. ***
echo The working tree may have partial stages. Run `git status` to inspect.
if not defined AUTO_MODE pause
exit /b 1
