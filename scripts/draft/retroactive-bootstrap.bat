@echo off
REM ===========================================================================
REM retroactive-bootstrap.bat - One-time retrofit of all historical builds.
REM
REM For each historical build slug, applies a delivery/^<slug^> annotated tag
REM pointing to the most recent commit that touches runs/^<slug^>/.
REM
REM Idempotent: skips builds that already have a delivery/^<slug^> tag.
REM Safe to re-run if interrupted partway through.
REM
REM Pre-requisite: each build's substrate must already be committed to git
REM (either via the initial 6aa4d8f import or via a [retroactive] commit
REM for builds added later like gto-poker-async-duel). For builds that are
REM on disk but never committed, this script will refuse and instruct you
REM to commit them first.
REM
REM STATUS: DRAFT. Lives in scripts\draft\ until first end-to-end test.
REM ===========================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0\..\.."

echo === Clearing any stuck git lock files ===
if exist .git\index.lock del /f /q .git\index.lock
if exist .git\HEAD.lock del /f /q .git\HEAD.lock

REM Historical build slugs. Order is approximate delivery order, most recent first.
REM Currently 10 builds:
REM   1. streamdock-apple-music-touchbar (v1.9 retest, with hyphens)
REM   2. gto-poker-async-duel
REM   3. streamdock-applemusic-touchbar (v1.8 original, no hyphens)
REM   4. earthquake-map
REM   5. gto-poker-trainer
REM   6. latex-equation-renderer
REM   7. kanban-board
REM   8. blackjack-trainer
REM   9. blackjack
REM  10. tic-tac-toe
set "SLUGS=streamdock-apple-music-touchbar gto-poker-async-duel streamdock-applemusic-touchbar earthquake-map gto-poker-trainer latex-equation-renderer kanban-board blackjack-trainer blackjack tic-tac-toe"

set "TAGGED_COUNT=0"
set "SKIPPED_COUNT=0"
set "ABORT_FLAG="

for %%S in (%SLUGS%) do (
    echo.
    echo === Processing %%S ===
    if not exist "runs\%%S" (
        echo skipping %%S -- runs\%%S directory not found
        set /a SKIPPED_COUNT+=1
    ) else (
        git rev-parse "delivery/%%S" >nul 2>nul
        if not errorlevel 1 (
            echo skipping %%S -- delivery/%%S tag already exists
            set /a SKIPPED_COUNT+=1
        ) else (
            REM Find the most recent commit touching runs/%%S/
            set "LASTCOMMIT="
            for /f %%C in ('git log -1 --pretty^=format:%%H -- "runs/%%S/" 2^>nul') do (
                if not defined LASTCOMMIT set "LASTCOMMIT=%%C"
            )
            if defined LASTCOMMIT (
                git tag -a "delivery/%%S" "!LASTCOMMIT!" -m "Retroactive primary delivery: %%S (tagged at commit !LASTCOMMIT! which is the most recent commit touching runs/%%S/ at bootstrap time)" || goto :err
                echo tagged delivery/%%S at !LASTCOMMIT!
                set /a TAGGED_COUNT+=1
            ) else (
                echo *** %%S has files in runs\%%S\ but no commit touches them. ***
                echo Run: git add runs/%%S ^&^& git commit -m "[retroactive] %%S: imported primary delivery from pre-git substrate"
                echo Then re-run retroactive-bootstrap.bat to tag.
                set "ABORT_FLAG=1"
            )
        )
    )
)

echo.
if defined ABORT_FLAG (
    echo *** Some builds need committing before bootstrap can tag them. ***
    echo *** Run the commits above, then re-run this script. No tags pushed. ***
    pause
    exit /b 1
)

if "%TAGGED_COUNT%"=="0" (
    echo === No new tags applied -- everything was already done. ===
    pause
    exit /b 0
)

echo === Pushing %TAGGED_COUNT% new tag(s) (skipped %SKIPPED_COUNT%) ===
git push --tags origin main || goto :err

echo.
echo === DONE -- historical builds bootstrapped ===
echo Tagged: %TAGGED_COUNT% builds
echo Skipped (already tagged or missing): %SKIPPED_COUNT% builds
pause
exit /b 0

:err
echo.
echo *** A step failed. See output above. ***
pause
exit /b 1
