@echo off
REM ===========================================================================
REM recover-earthquake-map-ratify.bat
REM
REM One-shot recovery for the 2026-05-16 ratify-build.bat earthquake-map run
REM that overwrote the canonical hand-drawn decision-flowchart.{svg,html} with
REM the v0.1 auto-generator output.
REM
REM Plan:
REM   1. Undo the local commit 43a9e89 (mixed reset — unstages too).
REM   2. Restore decision-flowchart.{svg,html} for earthquake-map from origin.
REM   3. Regenerate using the patched generator that writes to -auto suffix.
REM   4. Stage ONLY the 5 ratify-artifact files (canonical reference untouched).
REM   5. Recommit with same ratify message + a note about Option A choice.
REM   6. Rebase + push.
REM
REM This is a one-shot. Delete after running successfully.
REM ===========================================================================

setlocal
cd /d "%~dp0"
set "PATHEXT=.COM;.EXE;.BAT;.CMD"

echo === Step 1: undo local commit 43a9e89 ===
git reset HEAD~1
if errorlevel 1 goto :err

echo.
echo === Step 2: restore canonical decision-flowchart.{svg,html} from origin ===
git checkout HEAD -- "runs/earthquake-map/decision-flowchart.svg" "runs/earthquake-map/decision-flowchart.html"
if errorlevel 1 goto :err

echo.
echo === Step 3: regenerate to -auto suffix ===
node architecture\scripts\decision-flowchart.mjs earthquake-map
if errorlevel 1 goto :err

echo.
echo === Step 4: stage the 5 clean ratify artifacts ===
git add "runs/earthquake-map/completion-ratified.json" "runs/earthquake-map/PROJECT-OVERVIEW.md" "runs/earthquake-map/wrap-up-complete.json" "runs/earthquake-map/decision-flowchart-auto.html" "runs/earthquake-map/decision-flowchart-auto.svg"
if errorlevel 1 goto :err

echo.
echo === Stage summary (should NOT include decision-flowchart.svg/html — only -auto): ===
git diff --cached --name-only

echo.
echo === Step 5: recommit with same message + Option A note ===
git commit -m "[run:earthquake-map] ratify: instructions+access confirmed by user" -m "User ran ratify-build.bat earthquake-map and confirmed gates 1 + 2. Gate 3 verification verdict: pass. Per architecture/build-lifecycle.md the build is now COMPLETE and ready for the fork-and-archive ceremony. Note: v0.1 auto-flowchart written to decision-flowchart-auto.{svg,html}; canonical hand-drawn decision-flowchart.{svg,html} preserved unchanged (Option A 2026-05-16 — generator output coexists with reference until generator matches reference quality)."
if errorlevel 1 goto :err

echo.
echo === Step 6: rebase + push ===
git pull --rebase --autostash -X ours origin main
if errorlevel 1 goto :err
git push origin main
if errorlevel 1 goto :err_push

echo.
echo ============================================================
echo === earthquake-map ratification RECOVERED + PUSHED ===
echo ============================================================
echo.
echo Canonical decision-flowchart.{svg,html} on origin is unchanged
echo (still the hand-drawn reference). New decision-flowchart-auto.
echo {svg,html} sit alongside as the v0.1 generator output.
echo.
echo You can delete this recovery bat now.
exit /b 0

:err
echo *** Recovery failed at some step. See output above.
echo *** No push happened; nothing changed on origin.
echo *** Inspect with `git status` and reach out for help.
exit /b 1

:err_push
echo *** Push failed AFTER local recovery succeeded.
echo *** Your local repo is clean; just retry: git pull --rebase --autostash origin main, then git push origin main.
exit /b 1
