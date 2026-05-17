# Desktop Commander — smooth interaction notes

Operational rules learned the hard way. Reference these whenever a Claude instance is using Desktop Commander (DC) inside this project — Maintenance, Codex-side, or build-time roles.

---

## 1. Bash sandbox vs. Windows truth — Windows wins

The bash sandbox `mcp__workspace__bash` mounts the Windows folders as a Linux view, but the view is **cached and lazily refreshed**. After a Write/Edit, the sandbox can keep showing the *previous* contents of the file for tens of seconds. ALL sandbox diagnostics are unreliable for recent writes:

- `cat`, `tail`, `head`, `wc`, `ls -la` — may return stale snapshots
- `git status`, `git diff`, `git log --stat` — may show stale tree state
- `grep`, `rg` over recently-written files — may match stale content

**Rule:** never trust the sandbox to confirm a write landed. To verify current Windows-side state:

1. Use DC (`mcp__Desktop_Commander__read_file` or `mcp__Desktop_Commander__get_file_info`) — DC is Windows-native and sees current state.
2. Or run PowerShell directly: `Get-Content`, `Get-ChildItem`, etc.
3. If sandbox and Windows disagree, Windows wins. Update the sandbox view by reading the file via the Read tool (which is also Windows-native) or by waiting a few seconds and retrying.

This affects every flow that writes then immediately verifies: deploy scripts, generated artifacts, lifecycle bats. Build the verification step around DC/PowerShell, not bash.

---

## 2. DC environment quirks — PATH inherits, PATHEXT does not

When you `start_process` with `shell: powershell.exe` and then call `cmd.exe /c "..."` or invoke a tool via its bare name (`git`, `node`, `where`), one quirk bites:

- **PATH** is inherited correctly. Tools resolve.
- **PATHEXT** is reset to `.CPL` only (Control Panel applets). This means cmd cannot find `.EXE`, `.BAT`, `.CMD`, `.COM` files by bare name — even though they're on PATH.

**Symptom:** `git: command not found` (or any other bare tool name) from cmd-via-PowerShell, despite the binary being on PATH.

**Fix:** prepend any cmd block with

```cmd
set "PATHEXT=.COM;.EXE;.BAT;.CMD"
```

This makes bare-name resolution work for `git`, `node`, `where`, and any `.bat` lifecycle script. Required for `Node execSync('git ...')` calls inside Codex aggregator scripts when launched via DC start_process.

---

## 3. Popup gotcha — cmd inside PowerShell

`cmd.exe /c "..."` invoked from within `shell: powershell.exe` can surface a Windows command-line error popup if the cmd body has any parser issue. The popup blocks the DC process and the user has to manually dismiss it.

**Avoid:**

- Unescaped parentheses inside `if exist (...)` or `for ... in (...)` blocks — even in echoes. `echo === commit(s) detected ===` inside an `if` block parses as a malformed sub-block.
- Multi-line cmd via piped heredocs through PowerShell — quoting layers compound errors.

**Prefer:** write the work to a `.bat` file on disk and have DC call the `.bat` directly, not cmd-in-PowerShell. The user clicks the bat or DC invokes `start_process` with `shell: cmd.exe` and `command: "C:\\path\\to\\script.bat"`.

---

## 4. Never run git from the bash sandbox

Sandbox `git` writes to `.git/` corrupt the index and leave undeletable lock files. Always delegate git to Windows-side `.bat` scripts the user runs locally (or DC invokes via `start_process`). The repo-root inventory of lifecycle bats (`commit-build.bat`, `deploy-session.bat`, `promote-build.bat`, etc.) is the canonical surface for git work.

---

## 5. The deploy-session.bat pattern

Routine commit+push from a Cowork session uses the pre-built `deploy-session.bat` at the repo root. Convention:

1. Pre-stage commit messages in repo-root `.commit-msg-{arch,codex,scripts}.txt` files (content lines, no quotes).
2. Surface the `.bat` to the user via `present_files` — markdown file:// links don't render clickable in Cowork, but `present_files` cards do.
3. The user clicks the bat; it commits the relevant staged areas with the pre-staged messages and pushes.

Never run `git add`/`git commit` directly from any sandbox.

---

## 6. Verification cadence after a write

When a Write/Edit is followed by code that depends on the file being current (e.g., a bat script reads a config you just changed), insert one of:

- A short sleep (`timeout /t 2 /nobreak`) before the dependent step
- A DC `read_file` of the written file to force sync
- A user-facing checkpoint ("I've updated X; click the bat to deploy")

The third option is safest because it avoids racing the sandbox against Windows entirely.

---

*Source: codified from memory across multiple sessions (sandbox-cache staleness investigations, popup debugging, DC environment quirks discovered during Codex aggregator work).*
