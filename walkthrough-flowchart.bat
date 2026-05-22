@echo off
setlocal
REM Canonical DC-safe env (from reference_dc_environment_git_path.md, verified 2026-05-15)
set "PATHEXT=.COM;.EXE;.BAT;.CMD"
set "PATH=C:\Program Files\Git\cmd;C:\Program Files\nodejs;%PATH%"

REM walkthrough-flowchart.bat — generates the animated step-through HTML for a run.
REM Usage: walkthrough-flowchart.bat <slug>
REM        walkthrough-flowchart.bat               (defaults to earthquake-map)

cd /d "%~dp0"

set "SLUG=%~1"
if "%SLUG%"=="" set "SLUG=earthquake-map"

echo === Generating walkthrough-flowchart for %SLUG% ===
echo.

REM Step 1 - derive walkthrough labels from raw substrate. Safe to always run:
REM if a hand-authored walkthrough-labels.json exists it is NOT overwritten
REM (the derived output goes to walkthrough-labels.auto.json instead). A build
REM with no labels file gets one here, so any run is checkpoint-refreshable.
echo --- Step 1/2: deriving walkthrough labels from substrate ---
node architecture\scripts\walkthrough-labels-derive.mjs %SLUG%
echo.

echo --- Step 2/2: rendering walkthrough flowchart ---
node architecture\scripts\walkthrough-flowchart.mjs %SLUG%

if errorlevel 1 (
  echo.
  echo === FAILED ===
  pause
  exit /b 1
)

echo.
echo === DONE ===
echo Output: runs\%SLUG%\walkthrough-flowchart.html
echo.
pause
