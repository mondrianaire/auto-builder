@echo off
cd /d "%~dp0"
set "PATHEXT=.COM;.EXE;.BAT;.CMD"
if exist .git\index.lock del /f /q .git\index.lock

echo === staging runs/github-profile-card/ ===
git add runs/github-profile-card/
echo.
echo === preview what's staged ===
git diff --cached --stat -- runs/github-profile-card/
echo.
echo === committing snapshot ===
git commit -F .commit-msg-snapshot.txt
echo.
echo === re-running aggregator + staging codex/ ===
node codex\scripts\aggregate.mjs
git add codex/
git diff --cached --quiet
if errorlevel 1 (
    git commit -F .commit-msg-codex.txt
)
echo.
echo === rebase + push ===
git pull --rebase --autostash -X ours origin main
git push origin main --follow-tags
echo.
echo === final log ===
git log --oneline -5
