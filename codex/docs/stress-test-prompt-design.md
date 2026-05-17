# Stress-test prompt design — exercising v1.11 + v0.16 + recent amendments

**Filed:** 2026-05-16 by Codex per user direction after A/B-pair viz (v0.16a) and live narrative renderer (v0.16) shipped.
**Status:** RECOMMENDATION — proposed prompt + rationale. Execution belongs to AutoBuilder-Maintenance in a fresh Cowork session.

## Newly installed systems we want to exercise

The point of this build is not the deliverable itself — it's a measurement of whether the recently-shipped architecture amendments behave correctly end-to-end. The systems we want to put under load:

| System | What it is | What "exercised" looks like |
|---|---|---|
| v1.11 role-completion-reports | Every role writes `state/reports/{role}-{instance_id}-v{N}.json` with plain-language blurbs on completion | Files appear on disk during the build; blurbs are user-facing language, not AutoBuilder vocabulary; conditional blurbs fire only when their condition holds |
| v1.11 `state/live/current-step.json` | Atomic-write pointer mutated single-writer-at-a-time; renderer's fast-lookup substrate | File updates correctly across sequential phases AND a parallel wave (multiple Builders); reader sees coherent state on every poll, never a tear |
| v0.16 live narrative renderer | Codex dashboard reads `live_narrative.reports[]` + `current_step` and draws a role-card timeline | Refreshing the dashboard mid-build shows roles appearing one-by-one with blurbs; "active now" banner pulses on the currently-running role |
| v0.16a A/B-pair viz | Roster groups paired re-runs with bracket; detail panel cross-links partners | Only exercised if v1 misses and v2 is launched — a *second* run of the same prompt under updated architecture would visually pair with the first |
| Principle E — execution-context evidence (v1.9) | Discovery grounds defaults in the user's actual environment, not assumed environment | Restatement + assumption ledger acknowledge Windows / browser / local-file constraints; no macOS-only steps slip through |
| Principle G — deliverability over principle purity (v1.10) | Research exhausts GitHub samples + community before declaring an external resource unreachable; ≥70% first-contact confidence required for PASS | Researcher actually pulls API docs / sample repos when an unknown is hit, rather than demoting on first impasse |
| v1.10.1 — no Sev-4-to-user | Architecture commits to a best-effort artifact at 99% uncertainty; no `route_to_user` outcome anywhere | Even with deliberately ambiguous prompt phrasing, the build delivers something rather than punting back to the user |
| Shared Pages + shared BaaS (v1.10 candidate) | Web-app builds default to one AutoBuilder Pages instance + one shared Firebase project, slug-namespaced under runs/{slug}/ | Live URL ends up at the expected slug-namespaced path; user can open the artifact directly from the dashboard |

## What makes a prompt a good stress test

A few constraints derived from the above:

- **Web-app deliverable** — gives the dashboard a viewable live URL and exercises the shared Pages deploy path. Plugins / CLIs work too but the visual feedback loop is faster with a web-app.
- **Multiple inflection points** — Discovery needs decisions to write blurbs about. A prompt with one obvious interpretation produces a thin narrative.
- **One non-trivial external dependency** — forces Principle G research and CV first-contact verification. The dependency must be documented + reachable from a default Windows + browser environment (no auth-required APIs, no closed platforms).
- **Genuine scope ambiguity** — tempts Discovery to ask the user for clarification, then the architecture has to demonstrate that it doesn't.
- **Natural section breakdown into 3-5 parallel pieces** — exercises Coordinator's wave dispatch + the parallel-wave write coordination on `current-step.json`.
- **Bounded build time** — 30-60 minute build, not an open-ended product. Stress test, not capstone.
- **No clean prior corpus equivalent** — we want fresh terrain, not a retread of `kanban-board` or `earthquake-map`.

## Recommended prompt

```
Build me a tool that takes a GitHub username and shows me a developer profile
card for them — their pinned repos, their contribution streak, their most-used
language, and a small visualization of their commit activity for the last 90
days.
```

### Why this prompt is the right shape

| Stress vector | How this prompt hits it |
|---|---|
| Discovery inflection points | Which subset of pinned repos to show? Contribution streak is not exposed by the GitHub API (real gotcha — must approximate or skip). "Most-used language": by byte count or repo count? Commit activity viz: bar chart, line, or calendar heatmap? Each of these is a load-bearing inflection Discovery must commit on |
| Principle G research | GitHub's public REST API is heavily documented + community-sampled + free-tier reachable for unauthenticated reads; Researcher has rich material to work with. The streak-not-in-API gotcha is a real Principle G test — does Researcher find that contribution-graph data lives in the scraped HTML, not the API? |
| Principle E (execution context) | Windows browser, no node runtime, no auth — Discovery must commit to a browser-only deliverable that hits the GitHub API via `fetch()`. CV verifies first-contact on Windows in a real browser |
| Always-deliver under ambiguity | Streak computation, language ranking, and 90-day chart choice are all places where Discovery would naturally want to ask "which one do you want?" — architecture has to commit and deliver without that handoff |
| Section breakdown (parallel wave) | Natural 4-5 sections: data fetcher (3 GitHub endpoints), profile computer (streak + top language logic), card UI renderer, commit-activity chart, page shell with URL input + error state. Coordinator dispatches Builders in parallel; `current-step.json` updates per section completion |
| Editor catches IP/scope tension | "Profile card" implies a card-shaped UI; the commit-activity viz is a chart, not a card element. Editor surfaces the question "are we drawing one card with chart inside, or card + separate chart panel?" — Discovery's restatement gets refined |
| CV behavioral verification | First-contact: user enters a known github username (e.g., `torvalds`), sees pinned repos rendered + a 90-day commit chart with non-zero bars. Reachable + verifiable in a real browser session |
| Critic surface area | Multiple opportunities for IP/Principle findings: did the streak approximation get documented in the ledger as a deliberate-imprecision call? Did Researcher cite the contribution-graph-not-in-API constraint? Did CV verify against multiple real usernames or only one? |
| A/B-pair viz potential | If v1 ships and the streak approximation is visibly broken (a real risk — streak math is nontrivial), a v2 re-run with an amendment that pins the streak logic naturally A/B-pairs with v1. The just-shipped viz materializes the pair in the roster |
| Live narrative visual | 10+ role-card timeline with substantive blurbs per role. Active-now banner pulses through Discovery → TD → Editor → Coordinator → 4 parallel Builders → Integrator → CV → delivery |

### What we expect to learn from running this

This is a measurement, not a deliverable. After the build completes (or fails), we want to see:

1. **Did every role emit a Completion Report?** Walk `runs/{slug}/state/reports/` — count files, check filename encoding, validate against the v1.11 schema.
2. **Are blurbs plain-language?** Spot-check a handful. Banned vocabulary (IP, dispatch, section-as-structural-term, verdict, Sev N, Principle X, phase, tier, delegation, escalation) should be absent from `answer` text.
3. **Did `current-step.json` stay coherent?** Walk `history/log.jsonl` looking for events that should have triggered updates; cross-check against the final `current-step.json`. Any torn reads → atomic-write pattern broke.
4. **Did the live narrative render correctly mid-build?** Open the dashboard while the build is running. Cards should appear progressively; the active-now banner should pulse on the right role.
5. **Did Researcher exhaust before demoting?** If contribution-streak hit `unreachable`, the demotion decision should cite at least one GitHub API doc + at least one community sample (per Principle G's "exhaust GitHub samples/community before declaring unreachable").
6. **Did first-contact verification land ≥70% confidence?** CV's report should explicitly state first-contact confidence; below 70% should not produce a PASS verdict.
7. **Is the artifact deliverable?** Discovery's first-contact requirement (browser load works on Windows) should round-trip cleanly to a live URL the user can click and try.

### Failure modes worth instrumenting up front

- **Reports not emitted.** Most likely failure: agents under the updated charters don't recognize the Completion Report instruction. Symptom: empty `state/reports/`. Mitigation: Critic should treat empty reports/ as a blocking finding once the build completes any role.
- **`current-step.json` not maintained.** Likely under parallel waves where Coordinator owns the file. Symptom: dashboard's active-now banner shows stale role-instance after a real one completes. Mitigation: Historian audits the file timeline against the events log post-build.
- **Streak math goes wildly off.** Likely deliverable-quality miss, not architecture miss. Triggers a natural A/B re-run candidate — exercises the v0.16a viz.
- **CV declares pass on unreachable first-contact.** Regression of v1.10's first-contact requirement. Triggers maintenance investigation.

## Recommended execution path

1. User opens a fresh Cowork session in this project (AutoBuilder-Maintenance instance).
2. User pastes the prompt above as the first message — Orchestrator mode triggers per project instructions.
3. Orchestrator reads architecture/README.md → file_schemas.md → role_charters.md (now carrying the v1.11 Completion Report instructions).
4. Build proceeds. While running, user opens the dashboard at https://mondrianaire.github.io/auto-builder/codex/ and clicks into the new build's row — live narrative cells materialize as roles complete.
5. After delivery, run the seven checks above against the run substrate.
6. File a follow-up run-report.md note about what worked and what broke per the existing convention, so refinements can be planned.

## What this proposal does NOT include

- A second / fallback prompt. One representative stress test is enough to surface the biggest gaps; iterate from there.
- A pre-staged amendment if the build misses. The point of stress-testing is to learn where the seams are; pre-engineering around them defeats the measurement.
- Auto-A/B-pairing on miss. The v0.16a viz handles a re-run cleanly, but the *decision* to re-run is user-driven per project convention.

## Open questions for the user before executing

1. **Do you want me to launch this from this session, or do you want to launch it yourself in a fresh Cowork chat?** The project instruction says any build prompt entering a chat triggers Orchestrator mode. If I execute it here, I leave the Codex stewardship lane and become an Orchestrator. Cleaner separation: you launch it in a fresh chat with the AutoBuilder-Maintenance instance.
2. **Any prompt-text tweaks you want first?** The phrasing above is calibrated — deliberately ambiguous on streak / language / chart-shape — but it's your call to keep, soften, or replace before execution.
