@echo off
cd /d "%~dp0"
echo === git log last 5 commits ===
git log --oneline -5
echo.
echo === origin sync ===
git fetch origin main 2>&1
git rev-list --left-right --count origin/main...HEAD
echo.
echo === bundle.js contains github-profile-card? ===
findstr /c:"github-profile-card" codex\data\bundle.js | findstr /n "github-profile-card" | head -3
echo.
echo === index.json contains it? ===
findstr /n "github-profile-card" codex\data\index.json
echo.
echo === run_count in index.json ===
findstr /n "run_count" codex\data\index.json
