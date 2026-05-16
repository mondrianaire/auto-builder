@echo off
REM ============================================================
REM apply-ratification-rewording.bat
REM
REM Restores codex/index.html from HEAD (the Edit tool just
REM truncated it losing ~12 lines including closing tags), then
REM re-applies the 4 ratification-section wording fixes via
REM python in-place substitutions (same defensive pattern as
REM apply-v0.15-dashboard.bat from earlier in the session).
REM
REM Wording shift: promotion is no longer framed as a guaranteed
REM "awaiting fork" next step. Ratification is the natural endpoint;
REM promotion is an opt-in user decision to extend functionality.
REM ============================================================

cd /d "%~dp0"
setlocal enabledelayedexpansion

echo.
echo === [1/4] Restoring codex/index.html from HEAD ===
git checkout HEAD -- codex/index.html
if errorlevel 1 (
  echo ERROR: git checkout failed. Aborting.
  pause
  exit /b 1
)
for /f %%i in ('find /c /v "" ^< codex\index.html') do set BASE_LINES=%%i
echo Baseline line count: !BASE_LINES! (expected ^~1843)

echo.
echo === [2/4] Applying 4 wording substitutions via python ===
python -c "p='codex/index.html'; s=open(p,encoding='utf-8').read(); count=0; pairs=[(\"label: 'Complete \xb7 awaiting fork', title: 'Ratified ' + ratifiedAt + ' by ' + (sum.ratified_by || 'unknown') + '; fork ceremony pending'\", \"label: 'Ratified', title: 'Ratified ' + ratifiedAt + ' by ' + (sum.ratified_by || 'unknown') + '. Corpus entry sealed. Promotion is opt-in and only relevant if extending functionality.'\"), (\"to mark complete and trigger fork ceremony\", \"to seal the corpus entry. Promotion is a separate opt-in step if you want to extend functionality beyond what Discovery surfaced.\"), (\"text: 'Ratification & fork ceremony' \", \"text: 'Ratification' \"), (\"text: 'Awaiting fork ceremony \xe2\x80\x94 the completion-triggered-fork.yml workflow (when shipped) fires on this push and creates mondrianaire/' + sum.slug + '-AB.'\", \"text: 'Build complete \xe2\x80\x94 corpus entry is sealed. Promotion (forking to a standalone product-life repo) is an opt-in next step, only relevant if you want to extend functionality beyond what Discovery surfaced. Run `promote-build.bat ' + sum.slug + '` if and when that\\'s the case.'\"), (\"Run the command below from the project root to ratify and trigger the fork ceremony.\", \"Run the command below from the project root to ratify \xe2\x80\x94 this seals the corpus entry and marks the build complete. Promotion (forking to a standalone product-life repo) is a separate opt-in step.\")]; [s := s.replace(a,b,1) or s for a,b in pairs]; open(p,'w',encoding='utf-8',newline='').write(s); print('done')"
if errorlevel 1 (
  echo ERROR: python substitution failed.
  pause
  exit /b 2
)

echo.
echo === [3/4] Verifying file integrity ===
for /f %%i in ('find /c /v "" ^< codex\index.html') do set NEW_LINES=%%i
echo Post-edit line count: !NEW_LINES! (expected very close to !BASE_LINES!)
findstr /C:"'Ratified', title" codex\index.html >nul && echo OK: chip label rewording present || echo FAIL: chip label rewording missing
findstr /C:"corpus entry is sealed" codex\index.html >nul && echo OK: ratified-branch rewording present || echo FAIL: ratified-branch rewording missing
findstr /C:"Build complete" codex\index.html >nul && echo OK: build-complete framing present || echo FAIL: build-complete framing missing
REM Closing tag check using a temp file to avoid cmd's redirection issues with ^<
echo ^</html^> > "%temp%\codex-closetag.txt"
findstr /G:"%temp%\codex-closetag.txt" codex\index.html >nul && echo OK: closing tag present || echo FAIL: closing tag missing
del "%temp%\codex-closetag.txt"

echo.
echo === [4/4] Running aggregator to regenerate data/bundle.js ===
node codex\scripts\aggregate.mjs

echo.
echo Done. Reload the dashboard to see the corrected ratification rhetoric.
pause
