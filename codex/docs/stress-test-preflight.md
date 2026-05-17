# Stress-test pre-flight — what's changed since the last build, what we're measuring

**Filed:** 2026-05-16 by Codex.
**Companion to:** `codex/docs/stress-test-prompt-design.md` (the recommended prompt + rationale).
**Last build for reference:** `gto-poker-async-duel`, dated 2026-05-14, built under **architecture v1.9**. Everything below has landed since.

## Part 1 — What's been installed since the last build

### Architecture amendments

| Version | Headline | What it changes |
|---|---|---|
| **v1.10** | Git commit cadence | Orchestrator emits five scoped commits at phase boundaries (C1 discovery+TD complete · C2 editor pass · C3 build complete · C4 verification complete · C5 delivery + `delivery/{slug}` tag). All confined to `runs/{slug}/`. C5 is the only gating commit; C1–C4 failures log Sev 3 and proceed |
| **v1.10.1** | Sev-4-to-user cleanup | Purged residual "route to user" paths from six locations across `role_charters.md` + `principles.md`. The architecture's always-deliver contract is now structurally consistent — no role anywhere can punt back to the user mid-build. Sev 4 outcomes land in the run-report's Uncertainty Manifest instead |
| **v1.11** | Role-completion-reports + live-step pointer | Every role writes `state/reports/{role}-{instance_id}-v{N}.json` with plain-language blurbs on completion. `state/live/current-step.json` is an atomic-write pointer to the currently-active role(s). Substrate for the live narrative renderer |

### Codex dashboard versions

| Version | What it adds |
|---|---|
| v0.13 | Ratification UI section — copy-paste `ratify-build.bat` command, ratified-by/at + notes meta, blocked-state reasoning |
| v0.14 | CV verdict parser aligned to `verdict: string` axis (was checking the wrong field; verification_passed correctly lights up now) |
| v0.15 | Per-build dynamic SVG topology — inflection points, sections, contracts, waves, phase bands, per-deliverable-kind center materialization |
| v0.16a | A/B-pair visualization — roster forces pair members adjacent in v1 → v2 order; inline badges; left-side bracket; detail-panel cross-link to partner |
| **v0.16** | Live build narrative — vertical role-card timeline with plain-language blurbs, pulsing "active now" banner for current step, escalation tags, importance-weighted blurb treatment |

### Operational + coordination conventions

These are not in `architecture/` but are load-bearing for how this build will run:

- **Build lifecycle phases.** Phase 1 = Initial Delivery (the first build attempt). Phase 2 = In Limbo (rectification only — no scope changes). Completion = three gates green (verification asserted + user-ratified instructions + user-ratified access). Ratification is the natural end state; Promotion is opt-in fork-to-product-life.
- **Promotion = fork + active Claude Code guidance.** A promoted build gets a `mondrianaire/{slug}-AB` fork with seeded `README.md` + `.claude/CLAUDE.md` + `cc-launch-prompt.md` and Claude Code opens for product life. Promotion is never auto — it's user-opt-in only.
- **Workspace boundary.** Two meta-instances on this project — Codex (codex/ lane) + AutoBuilder-Maintenance (architecture/ + runs/ + project-root .bat lane). Cross-lane writes require user clearance.
- **Async coordination via `## Maintenance Status` sections in `codex/docs/*.md`.** Dated notes + acks; pending_ack surfaces on the dashboard. Maintenance-initiated items go under `codex/docs/maintenance-initiated/`.
- **"Currently waiting on X for: …"** symmetric surfacing at top of every Codex AND Maintenance response so the user always sees the bottleneck.
- **Codex-drives-bats via Desktop Commander.** No manual click-the-bat step for routine deploys. PATHEXT + `shell: cmd` workarounds settled.
- **Sandbox cache staleness defensive pattern.** Five rules: current-state reads via DC, cross-verify before alarm, trust Windows-side on disagreement, git mutations Windows-side, PowerShell mid-pipeline `.exe` gotcha workaround.
- **Shared Pages + shared BaaS (v1.10 candidate, not yet enacted).** Default web-app builds land at one AutoBuilder Pages instance + one shared Firebase project, slug-namespaced under `runs/{slug}/`. Not N repos + N Firebase projects.
- **Decision-flowchart iframe embed.** Detail panel renders `decision-flowchart.html` (canonical hand-crafted) or `-auto.html` (fallback) when present. Wrap-up routine generates the auto variant.
- **Promoted-row action buttons.** GH / Live / Launch icon triplet on promoted-row roster cells. Launch copies a Claude Code bootstrap command to clipboard.

### What's NOT new (already in v1.9, just naming for completeness)

- Principles E (atomic lexical anchors) / F (external authority discipline) / G (deliverability tier discipline — Tier 1 PNV, Tier 2 first-contact, Tier 3 sub-goal) / H (verification independence).
- Editor role between TD and Coordinator (six structural checks).
- Discovery Demotion Mode (five no-`block` outcomes).
- Production-fidelity exercise requirement on CV.
- North Star: always deliver an artifact; prompt specificity must not scale with the architecture's failure modes.

## Part 2 — Metrics we're testing (the scorecard)

Grouped by what you can observe live vs what requires post-delivery inspection. Each metric has a name, what evidence to look for, and where to find it.

### A. Live-observation metrics (watch the dashboard while the build runs)

Open the build's detail panel at https://mondrianaire.github.io/auto-builder/codex/ as it progresses.

| Metric | Pass signal | Fail signal | Where to look |
|---|---|---|---|
| **A1. v1.11 reports being emitted** | "Live build narrative" section appears above topology. Role cards materialize one-by-one as roles complete | Section never appears; only the v0.15 skeleton topology renders | Detail panel · "Live build narrative" header |
| **A2. Active-now indicator tracks reality** | Pulsing dot moves through the role timeline as the build progresses. Banner's `Active phase` field changes at phase boundaries | Banner shows a stale role, or banner never appears | Detail panel · blue banner at top of narrative section |
| **A3. Blurbs are plain-language** | Question/answer pairs read like a colleague explaining the build to you. No "IP", "Sev", "dispatch", "Principle X" vocabulary in `answer` text | Blurbs read like internal architecture jargon | Detail panel · role cards · italic question + body answer |
| **A4. Parallel wave dispatches multiple roles at once** | "Active now" banner shows multiple roles (e.g., 3 Builders) with separate pulsing dots simultaneously | Banner only ever shows one role at a time | Detail panel · banner's `lnv-active-roles` row |
| **A5. Phase chip updates as build progresses** | Roster row's phase chip (immediately right of slug) transitions through phases — kickoff → initial-discovery → … → complete | Phase chip stuck on early phase even as roles complete | Roster row · phase chip cell |
| **A6. Decision flowchart renders** | "Decision flowchart" section appears in detail panel with iframe | "Decision flowchart will appear here once the wrap-up routine generates it" stub remains | Detail panel · below topology |

### B. Post-delivery audit metrics (run these after the build completes)

| Metric | How to check | What pass looks like |
|---|---|---|
| **B1. Every role emitted a Completion Report** | `ls runs/{slug}/state/reports/` — count files; cross-reference against `history/log.jsonl` events | At least one report per role-instance that dispatched. Filename matches `{role}-{instance_id}-v{N}.json` |
| **B2. Reports validate against v1.11 schema** | Spot-check 3-4 reports — required fields: `role`, `instance_id`, `iteration`, `mode`, `completed_at`, `blurbs[]`, `raised_escalation`, `next_role` | All required fields present; `blurbs[]` entries have `question` + `answer` + `kind` + `importance` |
| **B3. Banned vocabulary absent from `answer` text** | grep across `state/reports/*.json` for "IP", "Sev ", "Principle ", "dispatch", "verdict", "Sev 4", "tier", "section " (as structural term), "escalation", "delegation" | No matches in `answer` strings (the field names themselves can use the vocabulary) |
| **B4. Conditional blurbs only fire when their condition holds** | Cross-check Discovery's conditional blurb "What couldn't you verify?" against `ledger-v1.proper_nouns[]` — only present if at least one PN is `unreachable` | No false-positive conditionals; no missed-true-positive conditionals |
| **B5. `current-step.json` stayed coherent through parallel waves** | Inspect `state/live/current-step.json` final state; cross-walk against events log for wave-start + wave-complete transitions | `build_complete: true` + `active_roles: []` + `current_phase: "complete"` at end |
| **B6. v1.10 git commit cadence — five scoped commits emitted** | `git log --oneline -- runs/{slug}/` between build start and `delivery/{slug}` tag | Five commits with C1/C2/C3/C4/C5 prefixes in messages, all touching only `runs/{slug}/` |
| **B7. v1.10.1 — no Sev-4-to-user surfaces fired** | grep `history/log.jsonl` for any `route_to_user` or sev-4-to-user events; check `run-report.md`'s Uncertainty Manifest for unresolved items | Zero `route_to_user` events. Sev-4-class outcomes appear in run-report Uncertainty Manifest, never as mid-build pauses |
| **B8. Principle G — first-contact ≥70% confidence required for PASS** | `output/verification/report.json` → check `first_contact_results[]` + verdict reasoning | If verdict = `pass`, first-contact confidence is ≥70% per CV's own reasoning |
| **B9. Principle G — research exhaustion before unreachable** | If any proper noun `verification_status: unreachable`, inspect `decisions/discovery/demotion-v{N}.json` for cited research attempts | Demotion record cites at least one GitHub sample + one community channel attempted before declaring unreachable |
| **B10. Principle E — execution-context evidence in Discovery** | `decisions/discovery/ledger-v1.json` → `execution_context_observed[]` | Field is non-empty; mentions Windows + browser context the prompt implies |
| **B11. CV production-fidelity environment with per-component tagging** | `output/verification/report.json` → `production_fidelity_environment.components[]` | Every component tagged `real` or `modeled`; modeled components cite external documentation |
| **B12. Always-deliver contract held under ambiguity** | `runs/{slug}/output/final/` exists with a deliverable; no architecture-side "build aborted" markers | Final deliverable present even if Uncertainty Manifest is non-empty |
| **B13. Shared Pages deploy lands at expected URL** | Click "View" / "Live" / "live ↗" on the new build's roster row | URL opens the artifact at a slug-namespaced path under the AutoBuilder Pages domain (or non-applicable for non-web-app deliverables) |
| **B14. Codex aggregator picks up reports on next pass** | Wait for bot:aggregator commit OR run `node codex/scripts/aggregate.mjs` locally; check `codex/data/runs/{slug}.json` → `live_narrative.reports[]` | Non-null array with one entry per emitted report |
| **B15. Live narrative renderer produces coherent output** | Open the new build's detail panel after delivery | Role cards render in completion order; banner shows "Build complete"; no console errors; no missing-field rendering glitches |

### C. Bonus / opt-in metrics (only if you act on the result)

| Metric | When relevant | What to look for |
|---|---|---|
| **C1. Ratification gates** | After delivery, before deciding promote-or-not | Three gates green per build-lifecycle.md: verification asserted (auto) + instructions ratified (user) + access ratified (user). `ratify-build.bat {slug}` walks the prompts |
| **C2. A/B-pair viz materializes on re-run** | If the v1 build misses and you launch a v2 with the same prompt under updated architecture | After Maintenance writes the curation overlay for both members, roster pair-brackets them; detail panel shows cross-link |
| **C3. Promotion ceremony — Tier 1 + Tier 2** | If you promote the result | Fork at `mondrianaire/{slug}-AB` contains README.md + `.claude/CLAUDE.md` (Tier 1) + `cc-launch-prompt.md` (Tier 2). Claude Code launches with the bootstrap prompt pre-loaded |

## Part 3 — Suggested launch flow

1. Open a new Cowork chat against the AutoBuilder-Maintenance instance on this project.
2. Paste the prompt from `stress-test-prompt-design.md` § "Recommended prompt" as your first message.
3. Once the build starts, open https://mondrianaire.github.io/auto-builder/codex/ in a separate browser tab. Click into the new build's row as soon as it appears in the roster.
4. Watch the **A-series metrics** live. The interesting ones are A1 (does the live narrative even show up?) and A4 (does parallel dispatch materialize multiple pulses?).
5. After delivery, walk the **B-series metrics**. The B1/B2/B3 trio tells you whether v1.11 actually landed in agent behavior; B5 tells you whether the atomic-write pattern held; B6 tells you whether the v1.10 commit cadence happened.
6. File the result in the new build's `run-report.md` "what worked / what broke" section per project convention, with one line per failing metric. That feeds the next round of refinements.

## Part 4 — What this doc deliberately does NOT include

- A pre-staged amendment for any predicted failure. The stress test's value is measuring where the seams are; pre-engineering around them defeats the measurement.
- A scoring script. If the metrics list stabilizes after a few runs, that's worth automating; not yet.
- The prompt itself — it's in the companion doc so this file can be re-used unchanged for the next stress test by swapping just the prompt.
