# AutoBuilder coordination queue

**Meta-layer convention surface.** Both Codex and Maintenance write here. This is the only file that crosses the normal codex-vs-architecture write boundaries — kept tiny and structured so each side can update it without colliding.

**Purpose:** at a glance, "what's open, who owns it, what does it block." Replaces the user's manual mental queue with a static document both sides keep current.

**Update rule:** when you open / close / re-prioritize an item, edit this file in the same commit that touches the proposal. Stale queue entries are worse than no queue — both sides depend on it being a current snapshot.

---

## Active

Items that someone is or could be working on right now.

| Item | Owner | Priority | Depends on | Last touched | Status |
|---|---|---|---|---|---|
| `queue-md-drafted-if-B` (this file) | Maintenance | high | — | 2026-05-16 | **shipped 2026-05-16** by Maintenance; Codex first-update on this same pass (added v0.10-v0.12 history, bat-rebase fix, ratification-ui ack) |
| `github-actions-on-push-proposal` | Maintenance | high | — | 2026-05-16 | **ALL THREE WORKFLOWS SHIPPED 2026-05-16**: #1 aggregator-on-push.yml (verified live, 5+ successful runs), #3 tag-driven-rederivation.yml (same structure as #1), #2 completion-triggered-fork.yml (just shipped, gated on FORK_PAT secret being set; will fire on first real ratification push). The full mechanical auto-dispatch layer is operational. |
| `codex-polling-convention-adopted` | Codex | high | — | 2026-05-16 | **adopted 2026-05-15** — declared in memory `feedback_codex_waiting_on_maintenance_surfacing.md`; cadence: session-start glob of `codex/docs/maintenance-initiated/*.md`, surface owed acks before other work. Should have been ticked closed in earlier queue.md revision. |
| `ratification-ui-proposal` | Codex | medium | viz-proposal landed (done) | 2026-05-16 | **ALL 9 ITEMS CLOSED 2026-05-16.** ratify-build.bat shipped at repo root; aggregator extension + ready_to_ratify chip sub-state + chip-on-roster + detail-panel ratification section + needs-your-action callout shipped in Codex v0.13; verdict-schema parser alignment shipped in Codex v0.14 (fixed v0.13 bug where `cv.passed === true` check never matched real reports — now checks verdict-string per Maintenance's flag); completion-triggered-fork.yml shipped by Maintenance. Operational pending `FORK_PAT` secret setup (user-owned, one-time) for first real ratification → fork. |
| `discovery-misalignment-data-model` | Maintenance | medium | — | 2026-05-15 | open question in `architecture/build-lifecycle.md` |
| `v1.10.1-sev4-cleanup` (Orchestrator charter) | Maintenance | medium | — | 2026-05-15 | **shipped** in `ad1f8c5` by parallel Maintenance window — Sev-4-to-user routing removed from Orchestrator + supporting docs |
| Codex v0.10-v0.12 (data + dashboard improvements) | Codex | low | — | 2026-05-16 | v0.10 (v1.X.Y amendment-regex bugfix) + v0.11 (sortable roster columns with 3-state cycle + localStorage) + v0.12 (lifecycle phase chip per build-lifecycle.md, with forward-looking promoted/ratified states wired in but no-op until data exists). All shipped + Pages-verified. |
| `deploy-session.bat` pull-rebase-before-push fix | Codex | high | — | 2026-05-16 | **shipped 2026-05-16** to address push-rejected case after aggregator-on-push starts bot commits. Added `git pull --rebase --autostash -X ours origin main` before push; removed early-exit on "no new staged changes" so unpushed local commits always reach origin. Memory updated at `reference_deploy_session_bat.md`. |
| Auto-deploy via Cowork scheduled task (zero clicks) | Codex | high | — | 2026-05-16 | **pending user approval 2026-05-16.** Initial attempt used Windows Task Scheduler (`auto-deploy-watcher.bat` + `setup-auto-deploy.bat`); user rejected: "no scheduled task on claude cowork for activation." Pivoted to `mcp__scheduled-tasks__create_scheduled_task` (in-Cowork) with `taskId: autobuilder-auto-deploy`, every-5-min cron, prompt invokes `deploy-session.bat --auto` via Desktop Commander after 2-min debounce. Tool creation requires user-side approval prompt; in unsupervised mode the call failed with "requires user interaction." Will re-call when user is back in the loop. Windows-Task-Scheduler files deleted. Memory updated at `reference_deploy_session_bat.md`. |

## Blocked / waiting on external

Items that can't progress until something outside our control happens.

| Item | Owner | Blocker | Notes |
|---|---|---|---|
| `first-going-forward-build-uses-convention` | Maintenance | next post-v1.10 build runs end-to-end | Closes naturally on first new build using commit-build.bat in C5 |
| Cowork archive + Claude Code handoff | Maintenance | Cowork/Claude Code product-side integration | Documented as TBD in `architecture/build-lifecycle.md` |

## Deferred by design

Intentionally not being worked on; listed here so neither side accidentally picks them up.

| Item | Owner | Reason |
|---|---|---|
| `codex-yml-created` (Path B backstop in github-pages-proposal) | Codex | Path A's manual discipline holding; backstop remains dormant unless that changes |

## Meta-Orchestrator escalation criteria

Per the converged meta-orchestrator-proposal: escalate to Option C (agentic Meta) only if **Codex's polling + this queue.md + GitHub Actions** together fail to reduce user routing turns by ≥60% in a representative session. Until that test fails, no agent.

---

**Last full sweep:** 2026-05-16 (Maintenance verified Codex's first update; ratify-build.bat shipped; ratification-ui-proposal row updated to reflect bat-side closed and remaining items as v0.13 Codex work; everything else Codex updated stands as-written).
