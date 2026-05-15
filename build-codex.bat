@echo off
REM ===========================================================================
REM build-codex.bat
REM
REM Refreshes the Codex data layer by running the aggregator over runs/ and
REM architecture/. Safe to run any time; the aggregator is read-only against
REM the substrate (it only writes under codex/data/).
REM
REM Run from this directory (the Auto Builder project root) by double-clicking
REM or executing:  build-codex.bat
REM
REM Requires Node.js on PATH. Tested against Node 22.
REM ===========================================================================

setlocal
pushd "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [build-codex] ERROR: node was not found on PATH.
    echo [build-codex] Install Node.js from https://nodejs.org and re-run.
    popd
    endlocal
    exit /b 1
)

echo [build-codex] Running aggregator...
node codex\scripts\aggregate.mjs
set "AGG_EXIT=%ERRORLEVEL%"

if not "%AGG_EXIT%"=="0" (
    echo [build-codex] Aggregator exited with code %AGG_EXIT%.
    popd
    endlocal
    exit /b %AGG_EXIT%
)

echo [build-codex] Done. Open codex\index.html in a browser to view.

popd
endlocal
exit /b 0
