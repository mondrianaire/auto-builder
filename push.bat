@echo off
setlocal
cd /d "%~dp0"

echo === Cleaning up any partial .git folder ===
if exist .git (
    rmdir /s /q .git
    if exist .git (
        echo Could not remove .git folder. Close any program using it and re-run.
        pause
        exit /b 1
    )
)

echo === Initializing git repo ===
git init -b main || goto :err
git config user.email "mondrianaire@gmail.com" || goto :err
git config user.name "Jett" || goto :err

echo === Staging all files ===
git add -A || goto :err

echo === Creating initial commit ===
git commit -m "Initial commit" || goto :err

echo === Setting remote origin ===
git remote add origin https://github.com/mondrianaire/auto-builder.git || goto :err

echo === Pushing to GitHub (may prompt for sign-in) ===
git push -u origin main
if errorlevel 1 goto :err

echo.
echo === DONE — repo pushed to https://github.com/mondrianaire/auto-builder ===
pause
exit /b 0

:err
echo.
echo *** A step failed. See output above. ***
pause
exit /b 1
