@echo off
cd /d "%~dp0"
set "PATHEXT=.COM;.EXE;.BAT;.CMD"

REM Codex wake-up audit. Pass the SHA of the last Codex-authored commit
REM as %1; defaults to looking back 25 commits if not provided.
set "SINCE=%~1"
if "%SINCE%"=="" set "SINCE=HEAD~25"

echo === git log since %SINCE% (all authors, all prefixes) ===
git log %SINCE%..HEAD --oneline
echo.
echo === substantive commits only (excludes bot:aggregator) ===
git log %SINCE%..HEAD --oneline | findstr /v "bot:aggregator"
echo.
echo === files added since %SINCE% ===
git diff --name-status %SINCE%..HEAD --diff-filter=A
echo.
echo === architecture/ diff stat since %SINCE% ===
git diff --stat %SINCE%..HEAD -- architecture/
echo.
echo === codex/docs/maintenance-initiated/ activity ===
git log %SINCE%..HEAD --oneline -- codex/docs/maintenance-initiated/
echo.
echo === outstanding pending_ack count (from latest bundle) ===
findstr /c:"pending_ack" codex\data\index.json | findstr /c:"true"
