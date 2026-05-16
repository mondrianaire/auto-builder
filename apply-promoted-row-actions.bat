@echo off
REM ============================================================
REM apply-promoted-row-actions.bat
REM
REM Implements promoted-row-action-buttons per
REM codex/docs/maintenance-initiated/promoted-row-action-buttons.md.
REM
REM 1. Sync 7 stale files from origin (same wrap-clean recipe as
REM    earlier today — bot:aggregator + Maintenance commits left
REM    the working tree diverged after the rebase autostash).
REM 2. Apply 4 in-place substitutions to codex/index.html via
REM    python heredoc (defensive pattern; Edit-tool truncated
REM    this file earlier today).
REM 3. Run aggregator to refresh data/bundle.js.
REM 4. Verify integrity.
REM ============================================================

cd /d "%~dp0"

REM Fix PATHEXT so bare `git`/`node`/`python3` resolve under DC-spawned cmd shells
set "PATHEXT=.COM;.EXE;.BAT;.CMD"

echo.
echo === [1/4] Sync stale files from origin ===
git fetch origin main
if errorlevel 1 (
  echo ERROR: git fetch failed. Aborting.
  pause
  exit /b 1
)
git checkout origin/main -- ^
  codex/index.html ^
  codex/data/bundle.js ^
  codex/data/index.json ^
  codex/data/curation/blackjack.json ^
  codex/data/curation/blackjack-trainer.json ^
  codex/data/curation/latex-equation-renderer.json ^
  codex/data/curation/streamdock-apple-music-touchbar.json ^
  codex/data/curation/streamdock-applemusic-touchbar.json ^
  architecture/scripts/wrap-up-build.mjs

echo.
echo === [2/4] Apply 4 substitutions to codex/index.html ===
python3 codex/scripts/_apply-promoted-row-actions.py
if errorlevel 1 (
  echo ERROR: python substitution failed. Aborting.
  pause
  exit /b 2
)

echo.
echo === [3/4] Run aggregator to refresh data/bundle.js ===
node codex/scripts/aggregate.mjs

echo.
echo === [4/4] Verify integrity ===
for /f %%i in ('find /c /v "" ^< codex\index.html') do set LINES=%%i
echo codex/index.html line count: %LINES%
findstr /C:"renderRowActions" codex\index.html >nul && echo OK: helper present || echo FAIL: helper missing
findstr /C:"row-actions-header" codex\index.html >nul && echo OK: header class present || echo FAIL: header class missing
findstr /C:"launch-promoted-product.bat" codex\index.html >nul && echo OK: launch command present || echo FAIL: launch command missing
echo ^</html^> > "%temp%\codex-close.txt"
findstr /G:"%temp%\codex-close.txt" codex\index.html >nul && echo OK: closing tag present || echo FAIL: closing tag missing
del "%temp%\codex-close.txt"

echo.
echo Done. If all four "OK" lines printed, dashboard will reflect the new layout after deploy.
pause
