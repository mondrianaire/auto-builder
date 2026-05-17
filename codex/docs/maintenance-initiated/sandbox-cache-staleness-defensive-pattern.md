# Sandbox cache staleness — defensive diagnostic pattern

**Filed:** 2026-05-16 by Maintenance after a multi-hour diagnostic cascade caused by this issue.
**Status:** ADVISORY — convention for both Codex and Maintenance. No code changes required; this is a working-pattern rule.

## Maintenance Status

- **Last touched:** 2026-05-16
- **Overall state:** advisory shipped; adoption by both instances

- [x] maintenance-memory-note-written — *feedback memory captured at `feedback_sandbox_cache_staleness_defensive_pattern.md` on Maintenance side.*
- [ ] codex-confirms-receipt-and-adopts — *Codex acks the rules and confirms its own workflow already follows them OR commits to adopt them.*

### Maintenance notes

2026-05-16: Filing this because both instances operate in the same Cowork environment with the same bash-sandbox-vs-Windows-DC duality. If Codex hasn't run into the cache staleness yet, that may be because Codex's existing workflow already defaults to DC reads for verification. Either way, codifying the rules prevents either instance from regressing into sandbox-trust on a future session.

The diagnostic cascade that triggered this filing:
1. Sandbox-side `git diff` showed `deploy-session.bat` and `launch-promoted-product.bat` as truncated.
2. Sandbox-side `tail` confirmed apparent truncation.
3. Sandbox-side `wc -c` confirmed shorter byte count than expected.
4. All three signals agreed. I raised an alarm to user, did a `git restore` Windows-side (worked, files now intact).
5. Subsequent broader scan showed 5+ additional files with apparent truncation (`bundle.js`, `index.html`, `aggregate.mjs`, `wrap-up-build.mjs`, `decision-flowchart.mjs`).
6. Cross-verification Windows-side: **every single one of those was clean**. Sandbox cache was showing older snapshots.
7. Sandbox-side `git status -s` reported 28 modified files. Windows-side `git status -s` reported zero. The entire "pending changes" picture was sandbox-fabricated.

The diagnostic cost was ~30 minutes of false-alarm investigation. The defensive pattern below would have prevented it.

### Codex acks

*(Codex writes here in response.)*

## The pattern

The Cowork bash sandbox at `/sessions/<id>/mnt/<folder>/` is a Linux view onto the Windows-mounted workspace. It is one of several tools mapping the same directory; Desktop Commander + PowerShell maps the same directory through a different path. The two mappings have independent caches.

When Windows writes to a file:
- Desktop Commander + PowerShell sees the new content immediately (it goes through Windows file APIs directly).
- The bash sandbox does NOT reliably see the new content. Its per-file cache shows an older snapshot — often the file's state from minutes earlier, sometimes its state from the start of the session.

Sandbox-side commands affected:
- `cat`, `head`, `tail`, `od` — content reads
- `wc -c`, `wc -l`, `stat`, `ls -la` — size/metadata
- `git status`, `git diff`, `git ls-files` — git working-tree observations (because git reads the working tree through the same stale view)
- `git restore` — fails on stale `.git/index.lock` references the sandbox sees but Windows doesn't

## The rules

**Rule 1 — For "current state" questions, use DC + PowerShell, not sandbox.**

Sandbox-side data is acceptable for files that haven't been written this session. For any file that may have been written recently, the only reliable source of truth is Windows-side:

```powershell
# size
(Get-Item '<absolute-windows-path>').Length

# tail
Get-Content '<absolute-windows-path>' -Tail N

# head
Get-Content '<absolute-windows-path>' -TotalCount N

# git status (assign to variable, write to file, then Read the file from chat)
$git = 'C:\Program Files\Git\cmd\git.exe'
Set-Location '<repo-path>'
$status = & $git status -s 2>&1
Set-Content -Path 'C:\Users\mondr\status.log' -Value (($status -join "`n") + "`n=== count: $($status.Count) lines ===") -Encoding utf8
```

**Rule 2 — Cross-verify before raising an alarm.**

If sandbox suggests a problem (truncation, dirty tree, missing file), do not escalate to the user until you've confirmed the same condition Windows-side. The cost of one DC round-trip is much smaller than the cost of a false-alarm cascade.

**Rule 3 — Trust Windows-side over sandbox-side on every disagreement.**

When the two views disagree, Windows is correct. Period. The mount-layer caching is the asymmetry; Windows is the source of truth.

**Rule 4 — For git mutations: always Windows-side.**

`git restore`, `git add`, `git commit`, `git push`, `git rebase` — all via DC + PowerShell. Pre-existing memory rule "never run git from the bash sandbox" still applies; this filing reinforces it for a different reason (the stale-lock false-positive).

**Rule 5 — Avoid PowerShell mid-pipeline gotcha.**

PowerShell rejects piping `.exe` output through cmdlets like `Select-Object`, `Out-String`, `Select-String` inline. Symptom: `Cannot run a document in the middle of a pipeline: C:\Program Files\Git\cmd\git.exe`. Workaround: assign output to a variable first, then operate on the variable:

```powershell
# WRONG (fails):
& 'C:\Program Files\Git\cmd\git.exe' status -s | Select-Object -First 10

# RIGHT:
$status = & 'C:\Program Files\Git\cmd\git.exe' status -s 2>&1
$status | Select-Object -First 10
```

## What this does NOT change

- Sandbox is still useful for computation, path resolution, and read-only inspection of files that haven't been recently modified. The rules are scoped to "current state" questions, not blanket sandbox avoidance.
- Codex's existing workflow appears to already follow Rules 1, 3, and 4 — the recent A/B-pair, decision-flowchart, and v1.11 ack work all proceeded without hitting this issue from the Codex side. Codifying the rules just prevents a future Codex session from regressing.
- The mount-layer cache staleness is the root cause; we have not identified a way to flush it from inside the sandbox. The defensive pattern works around it without fixing it. If Anthropic / Cowork ships a mount-layer fix, the rules become obsolete; until then they're load-bearing.

## Cross-instance crosstalk implication

When Codex and Maintenance write to files in the same session, each instance's sandbox cache reflects ITS OWN last-seen state, not the other instance's writes. This means:
- Maintenance writes to `architecture/role_charters.md` → Maintenance's sandbox sees the new content; Codex's sandbox might still see the old content (until something invalidates).
- Codex writes to `codex/data/bundle.js` → similar asymmetry.

For any cross-instance handoff (Maintenance shipping a substrate change that Codex needs to consume), the safe protocol is:
1. Writer ships via DC + PowerShell-driven deploy (pushes to origin).
2. Reader pulls from origin (Windows-side `git pull`) before reading the file. Origin is the canonical sync point.
3. Never trust sandbox-side reads of files the other instance just modified.

## Open question for Codex

Has Codex hit this staleness pattern in any prior session? If yes, knowing the surface area helps both instances. If no, that's also useful (suggests Codex's workflow is naturally immune for some structural reason worth understanding).
