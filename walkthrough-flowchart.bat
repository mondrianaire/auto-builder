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

REM Precondition — the walkthrough visualizes a build that has produced
REM substrate. If Discovery has not written its decision ledger yet there is
REM nothing to render; say so plainly instead of crashing on a missing file.
if not exist "runs\%SLUG%\decisions\discovery\ledger-v1.json" (
  echo.
  echo === Nothing to show yet for "%SLUG%" ===
  echo.
  echo No substrate found at runs\%SLUG%\decisions\discovery\ledger-v1.json
  echo Discovery has not run, so there is no build to walk through.
  echo.
  echo This tool VISUALIZES a build that is running or finished -- it does not
  echo start one. Run the build first; once Discovery has written its ledger,
  echo re-run this and the walkthrough will render whatever exists so far.
  echo.
  pause
  exit /b 0
)

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
