@echo off
cd /d "%~dp0"
git pull --rebase origin main 2>&1
echo.
echo === post-pull bundle check ===
git log --oneline -3
