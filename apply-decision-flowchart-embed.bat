@echo off
REM ============================================================
REM apply-decision-flowchart-embed.bat
REM
REM Implements decision-flowchart dashboard iframe embed per
REM codex/docs/maintenance-initiated/decision-flowchart-dashboard-embed.md.
REM
REM 1. Apply 3 in-place substitutions to codex/index.html via python.
REM 2. Run aggregator (which now also emits decision_flowchart_path
REM    on each per-run summary via the small aggregate.mjs change).
REM 3. Verify integrity.
REM ============================================================

cd /d "%~dp0"

REM Fix PATHEXT so bare `git`/`node`/`python3` resolve under DC-spawned cmd shells
set "PATHEXT=.COM;.EXE;.BAT;.CMD"

REM Defensive: clear any orphaned git lock
if exist .git\index.lock del /f /q .git\index.lock

echo.
echo === [1/3] Apply 3 substitutions to codex/index.html ===
python3 codex\scripts\_apply-decision-flowchart-embed.py
if errorlevel 1 (
  echo ERROR: python substitution failed.
  pause
  exit /b 1
)

echo.
echo === [2/3] Run aggregator (emits decision_flowchart_path per run) ===
node codex\scripts\aggregate.mjs

echo.
echo === [3/3] Verify integrity ===
for /f %%i in ('find /c /v "" ^< codex\index.html') do set LINES=%%i
echo codex/index.html line count: %LINES%
findstr /C:"renderDecisionFlowchart" codex\index.html >nul && echo OK: helper present || echo FAIL: helper missing
findstr /C:"flowchart-stub" codex\index.html >nul && echo OK: stub class present || echo FAIL: stub class missing
findstr /C:"decision_flowchart_path" codex\data\bundle.js >nul && echo OK: aggregator emitted path || echo FAIL: aggregator field missing

echo.
echo Done.
pause
