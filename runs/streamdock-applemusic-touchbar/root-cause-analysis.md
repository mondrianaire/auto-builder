# Root-Cause Analysis — streamdock-applemusic-touchbar

**Run verdict at delivery:** pass (CV verified PNV.1, 28/28 harness assertions, Critic v2 clean)
**Real-world verdict after user installation:** **FAIL** — the deliverable did not appear in the user's VSD Craft side panel because the user is on Windows and the plugin was built macOS-only.
**Failure class:** environmental-evidence blindness at IP-resolution time; Discovery default accepted by TD without quick-reasoning-rubric exercise; no "should we ask?" gate on high-importance IPs.
**Detected by:** the user, on their actual hardware, after the run was marked complete and verified.

## What the architecture verified vs. what the user actually got

CV's verdict was `pass`. The PNV.1 assertion exercised the plugin process and captured a `setFeedback` frame carrying the song and artist strings. By every gate the architecture defines, the build was correct.

Then the user installed it into `C:\Program Files (x86)\VSD Craft\plugins` and it didn't appear in the side panel. The deliverable is for an OS the user does not have. **No assertion in the verification regime is sensitive to "is this the OS the user actually runs."** PNV.1's production-fidelity check verified production fidelity *within the run's assumption set*, not *against the user's actual environment*. The two are not the same thing, and v1.5's "production-fidelity exercise" amendment did not close this gap because it assumed the OS choice was already correct.

This is the same root-cause class that v1.5 was created to close (the latex CDN failure: verifier ran in a substituted environment) — but one level up the stack. v1.5 fixed environmental fidelity *during verification*. The failure here is environmental fidelity *during decision-making*. Discovery picked an OS without consulting the OS it was running on.

## Three named failure modes

### 1. Environmental-evidence blindness

Discovery's charter: "*simplest-within-reason*: pick the simplest defensible interpretation that doesn't contradict the prompt."

What Discovery actually had access to:
- System prompt contains `C:\Users\mondr\AppData\Roaming\Claude\local-agent-mode-sessions\...` (Windows path separators)
- Workspace folder: `C:\Users\mondr\Documents\Claude\Projects\Auto Builder`
- `AppData\Roaming` is a Windows-only convention
- Shell access maps Windows paths into a Linux sandbox via mount

This is unambiguous evidence of a Windows host. Discovery treated "doesn't contradict the prompt" as "doesn't contradict the *literal prompt text*" rather than "doesn't contradict the *full available evidence*." The charter doesn't say to look at the execution context, so Discovery didn't.

**Pattern:** Discovery (and TD) read context_pointers but never read the system prompt they're being run with for environmental signals. Every sub-agent has those signals in its context and ignores them.

### 2. Discovery-default-accepted as a rubric bypass

TD's quick-reasoning rubric (all four must hold to skip Researcher dispatch):
- Well-known canonical answers in training data
- Both branches have similar implementation complexity
- Choice introduces no new external dependencies
- Choice is easily reversible

For IP1 (host OS for Apple Music), evaluated honestly:
- *Well-known canonical answers* — yes, both branches well-documented
- *Similar implementation complexity* — **NO**. macOS gets `osascript` for free; Windows needs SMTC/WinRT, a different language stack, and a different now-playing API surface entirely.
- *No new external dependencies* — **NO**. Windows path requires either a PowerShell/WinRT helper, a Swift-WinUI/.NET equivalent, or a third-party SMTC binary. macOS path has zero extras.
- *Easily reversible* — **NO**. Discovery's own `why_inflection` field literally said "the data-acquisition layer, the language/runtime helpers, and the install/packaging notes all change with OS." That is the textbook cascade-depth flag.

Three of four rubric conditions fail. The charter says "If any fails, dispatch a Researcher."

What actually happened: TD wrote `"resolution_method": "discovery_default_accepted"` for IP1 in sections-v1.json. The rubric was never exercised because Discovery's default was simply inherited. The architecture has no rule that says "applying a Discovery default still requires the rubric." This is a load-bearing oversight.

### 3. No "should we ask?" gate for high-importance IPs

Discovery flagged IP1 as `importance: high`. The architecture does nothing differential with that flag. There is no rule of the form:

> "If `importance == 'high'` AND the default branch is contradicted (or unsupported) by available evidence, dispatch a Researcher OR surface to the user before locking."

IP2 (album art) was `importance: medium`. IP3 (interactivity) was `importance: low`. All three were resolved identically: `discovery_default_accepted`. The importance tag is currently decorative metadata. It should be load-bearing — high-importance IPs should require an explicit pass through the rubric (and possibly through environmental-evidence inspection) before they can be locked.

## What this maps to architecturally

The principles file (`architecture/principles.md`) currently has:
- **A — Verification Fidelity:** verification matches user's actual environment
- **B — Audit Completeness:** every decision has a producer and a record
- **C — Spec-to-Test Coverage:** every textual claim has at least one structured assertion
- **D — Path Coverage:** every architectural path is exercised before its outputs are trusted

This failure is none of those exactly. It's adjacent to A but distinct: A is about *verification* fidelity to environment. The new failure is about *decision-making* fidelity to environment. Propose:

**Principle E — Decision Grounding:** every load-bearing decision (IP resolution, default-branch selection, technology choice) must be grounded in the strongest available evidence, including evidence visible in the execution context, not just evidence in the prompt's literal text. When the strongest available evidence is weak or contradicts the chosen default, the decision must be deferred (Researcher dispatch) or surfaced (user question), not locked silently.

## Proposed amendments (v1.9 candidates)

These are amendment proposals, not commitments. The architecture review can evaluate them.

1. **Discovery charter — environmental-evidence inspection step.**
   - Before locking any IP, walk a checklist of environment signals in the agent's own system prompt: host OS (from path separators, mount style, env data), workspace contents (is there a `Cargo.toml`? `package.json`? `.sln`?), explicit user metadata.
   - If any environment signal contradicts a candidate default branch, that IP is *evidence-contradicted* and cannot be locked at Discovery time.
   - Capture inspection result in ledger as `environmental_evidence_inspected: [{signal, observed_value, supports_default: bool, ...}]`.

2. **TD charter — discovery_default_accepted is NOT a rubric bypass.**
   - Even when adopting a Discovery default, TD must explicitly run the four-condition rubric.
   - `resolution_method: "discovery_default_accepted"` is permitted only when *all four* conditions also hold for the default. Otherwise: Researcher dispatch or surfaced inflection.
   - sections-v{N}.json schema gains `rubric_check` on every resolution entry (Discovery-defaulted or TD-introduced), not just TD-introduced.

3. **Importance-as-load-bearing.**
   - For any IP with `importance: high`, the rubric check is mandatory and a Researcher dispatch is the default unless every rubric condition explicitly passes with evidence.
   - `importance: high` + evidence-contradicted default → surface to user before locking (Sev 4-equivalent at planning time, not just at escalation time).

4. **PNV scope expansion.**
   - Current PNV exercises the verb against the *built* artifact, asking "does the artifact do the verb." It does not ask "would this artifact even run in the user's environment."
   - Add a sibling assertion (call it `prompt_environment_assertion`) that exercises the artifact's *installability* in the actual user environment. For an OS-locked plugin, that means manifest OS array compatibility + CodePath* presence for the user's OS. CV verifies this with the same severity as PNV — failure means run verdict is `fail`.

5. **Reaudit pattern: extend to "ran user-side after delivery" failures.**
   - The Re-Verification role currently audits prior runs against newer architecture versions. Add a reverse pattern: when a delivered run fails on the user's hardware/environment, the failure feeds back as a `runs/{name}/user-side-failure.json` that triggers a Re-Verification dispatch under the *current* architecture, asking "what gate should have caught this?"

## How this run should be classified

Per the v1.6 re-audit schema, this run's verdict should be `fail` retrospectively. Recovery options:
- **patch_artifact:** add Windows OS to manifest, write CodePathWin path + a Windows music source (SMTC). The macOS path stays. Effort ≈ rebuilding S5 + minor manifest amendment.
- **rebuild_under_v1.x:** discard prior outputs, re-run the prompt under amended architecture (v1.9 candidate) that would have caught the issue at Discovery time.

The user has chosen "Windows-only rebuild" — strictly speaking neither of the above, but a close cousin of `patch_artifact` where the macOS path is dropped rather than preserved. Tracked in the Discovery amendment and TD impact-analysis dispatches that follow this analysis.

## What worked despite the failure

It's worth saying — the architecture caught itself once the user surfaced the evidence. Within minutes of the user reporting "I see nothing in the side panel," the diagnosis chain went: side-panel empty → manifest OS array → IP1 default → Discovery's blind-spot → architectural amendment proposal. The reactive part of the system works. The proactive part (catching this *before* delivery) is what needs the v1.9 amendment.

The 28/28 harness, the production-fidelity PNV exercise, the Critic re-sweep — all of those were structurally valuable. They verified that the plugin we built was internally correct. They just didn't verify that we built the right plugin.
