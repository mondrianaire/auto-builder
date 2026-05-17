@echo off
REM ===========================================================================
REM cleanup-sister-repo.bat
REM
REM Probes for any orphaned artifacts from the broken initial deploy-pages.bat
REM (which tried to create mondrianaire/github-profile-card as a sister repo
REM instead of using the canonical commit-build.bat → auto-builder repo flow).
REM
REM Checks:
REM   1. Does the GitHub repo mondrianaire/github-profile-card exist?
REM      If yes: prompts to delete it (gh repo delete is destructive; confirms first).
REM   2. Does a local staging dir exist at ..\..\..\..\github-profile-card-deploy\?
REM      If yes: prompts to remove it.
REM
REM Safe to run even if nothing is orphaned — it just reports "nothing to clean".
REM ===========================================================================

setlocal
set "PATHEXT=.COM;.EXE;.BAT;.CMD"
set "REPO=mondrianaire/github-profile-card"
set "STAGE_DIR=%~dp0..\..\..\..\github-profile-card-deploy"

echo === Cleanup probe for the orphaned sister-repo deploy attempt ===
echo.

REM ---- Check 1: GitHub repo ----
where gh >nul 2>nul
if errorlevel 1 (
    echo gh CLI not installed; cannot probe GitHub side. To check manually, visit:
    echo   https://github.com/%REPO%
    echo If that page 404s, there's nothing to delete on GitHub.
    echo If it exists, delete it via the web UI: Settings -^> Danger zone -^> Delete this repository.
    goto :check_local
)

gh auth status >nul 2>nul
if errorlevel 1 (
    echo gh CLI installed but not authenticated; cannot probe GitHub side.
    echo Run `gh auth login` then re-run this script, OR visit:
    echo   https://github.com/%REPO%
    goto :check_local
)

echo === Probing GitHub for %REPO% ===
gh repo view %REPO% >nul 2>nul
if errorlevel 1 (
    echo No repo at %REPO%. Nothing to clean up on GitHub side.
) else (
    echo *** Repo EXISTS at https://github.com/%REPO% ***
    echo.
    echo This is the orphaned sister-repo from the broken initial deploy attempt.
    echo The architectural-correct deploy uses mondrianaire/auto-builder + Pages,
    echo so this sister repo is unwanted.
    echo.
    set /p "CONFIRM=Type DELETE to delete %REPO% permanently (anything else cancels): "
    if /i "!CONFIRM!"=="DELETE" (
        echo Deleting %REPO% ...
        gh repo delete %REPO% --yes
        if errorlevel 1 (
            echo *** Delete failed. You may need to grant `delete_repo` scope: ***
            echo   gh auth refresh -h github.com -s delete_repo
            echo Then re-run this script.
        ) else (
            echo Deleted.
        )
    ) else (
        echo Cancelled. Repo NOT deleted. Re-run this script to retry, or delete via web UI.
    )
)

:check_local
echo.
echo === Checking for orphaned local staging directory ===
if exist "%STAGE_DIR%" (
    echo *** Local staging dir EXISTS at: ***
    echo   %STAGE_DIR%
    echo.
    set /p "CONFIRM2=Type REMOVE to delete this directory (anything else cancels): "
    if /i "!CONFIRM2!"=="REMOVE" (
        rmdir /s /q "%STAGE_DIR%"
        if errorlevel 1 (
            echo *** Removal failed. ***
        ) else (
            echo Removed.
        )
    ) else (
        echo Cancelled. Directory NOT removed.
    )
) else (
    echo No local staging dir at %STAGE_DIR%. Nothing to clean up locally.
)

echo.
echo === Cleanup probe complete ===
pause
exit /b 0
