# AutoBuilder coordination queue

**Meta-layer convention surface.** Both Codex and Maintenance write here. This is the only file that crosses the normal codex-vs-architecture write boundaries — kept tiny and structured so each side can update it without colliding.

**Purpose:** at a glance, "what's open, who owns it, what does it block." Replaces the user's manual mental queue with a static document both sides keep current.

**Update rule:** when you open / close / re-prioritize an item, edit this file in the same commit that touches the proposal. Stale queue entries are worse than no queue — both sides depend on it being a current snapshot.

---

## Active

Items that someone is or could be working on right now.

| Item | Owner | Priority | Depends on | Last touched | Status |
|---|---|---|---|---|---|
| `queue-md-drafted-if-B` (this file) | Maintenance | high | — | 2026-05-15 | **shipping** |
| `github-actions-on-push-proposal` | Maintenance | high | — | 2026-05-16 | **proposal accepted by Codex; workflows #1 + #3 YAML drafted at `.github/workflows/`; first real-run observability test pending** |
| `codex-polling-convention-adopted` | Codex | high | — | 2026-05-15 | awaiting Codex declaration of cadence |
| `ratification-ui-proposal` (filing) | Maintenance | medium | viz-proposal landed (done) | 2026-05-15 | drafted in TaskList #1; file as proposal next |
| `discovery-misalignment-data-model` | Maintenance | medium | — | 2026-05-15 | open question in `architecture/build-lifecycle.md` |
| `v1.10.1-sev4-cleanup` (Orchestrator charter) | Maintenance | medium | — | 2026-05-15 | **shipped** in `ad1f8c5` by parallel Maintenance window — Sev-4-to-user routing removed from Orchestrator + supporting docs |

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

**Last full sweep:** 2026-05-15 (Maintenance). Codex: please update on next pass.
