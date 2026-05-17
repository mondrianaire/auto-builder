# Session handoff — pre-first-v1.11-build state

**Filed:** 2026-05-16 by Maintenance immediately before the user kicks the first new build under v1.11 substrate.
**Status:** HANDOFF — Maintenance going zzz. Codex is the active observer during the build.

## Maintenance Status

- **Last touched:** 2026-05-16
- **Overall state:** zzz; awaiting wake on v0.16 unblock-ack OR Meta v0.2 polish OR new directive

- [x] v1.11-substrate-shipped — *role_charters.md + file_schemas.md amendments on origin; 13 role charters carry Completion Report subsections; 2 new schemas (state/reports + state/live/current-step).*
- [x] meta-flowchart-v0.1-shipped — *architecture/scripts/meta-flowchart*.mjs + flowchart-primitives.mjs + meta-flowcharts/v1.11.{svg,html}. Self-validating against role_charters.md.*
- [x] decision-flowchart-detail-full-bridge-plan-amended — *exhaustive-enumeration scope locked. 8-phase roadmap; ~1800-1950 LoC remaining.*
- [x] sandbox-cache-staleness-defensive-pattern-codified — *both instances acked; cross-instance handoff protocol defined.*
- [x] repo-root-bats-verified-clean — *deploy-session.bat, launch-promoted-product.bat post-restore intact; wrap-up-build.bat as untracked stray (does not affect deploy).*
- [x] first-v1.11-build-emission-verified — *Build completed PASS_WITH_CONCERNS 2026-05-16 (github-profile-card). Watch-point findings: WP1 PARTIAL (top-level reports emitted, per-section NOT emitted under inline mode), WP2 FAIL (current-step.json never written, Critic didn't catch), WP3 PARTIAL (3 of 6 reports leaked banned vocab — Coordinator/Critic/CV — others clean), WP4 N/A this run (decision-flowchart-auto generation deferred — wrap-up routine timing TBD). Full observations in Codex acks of available-build-resources-registry-proposal.md.*

### Maintenance notes

2026-05-16 (handoff): Going zzz before the user kicks the first new build under v1.11. Codex is the active instance during the build window. Filing this so Codex has a clear picture of what's already shipped, what state I'm leaving things in, and what to watch for during the build.

**Substrate state going into the build:**

- `architecture/role_charters.md` v1.11 — every dispatchable role carries a `### Completion Report (v1.11)` subsection with role-specific blurb questions. Canonical mechanics + banned-vocabulary list + Critic audit hooks in `§ Notes for All Roles`. Orchestrator + Historian explicitly excluded from emission.
- `architecture/file_schemas.md` v1.11 — `state/reports/{role}-{instance_id}-v{N}.json` (per-completion blurbs) + `state/live/current-step.json` (live-renderer pointer with mandatory atomic temp-then-rename). Directory layout + permission table updated.
- `architecture/scripts/wrap-up-build.mjs` — integrates v0.1 decision-flowchart generator (extract → layout → render → orchestrator → SVG + HTML wrapper at runs/{slug}/decision-flowchart-auto.{svg,html}).
- `architecture/scripts/meta-flowchart.mjs` — build-agnostic role topology generator. Latest output at `architecture/meta-flowcharts/v1.11.{svg,html}`. Templates the rendering primitives reused by future post-build flowchart phases.

**Build-readiness watch-points (Codex side during the build):**

1. **State/reports emission.** Watch `runs/{slug}/state/reports/` early — after Discovery completes, expect to see `discovery-initial-v1.json` with the two always-blurbs (`What did you understand the user wants?` + `What choices did you make on their behalf?`). If empty after Discovery, that's a substrate-not-yet-internalized signal — flag to Maintenance via queue.md row so v1.12 can add explicit dispatcher hooks rather than relying on the LLM to follow the charter section.

2. **State/live/current-step.json.** Required-written, but unread until v0.16 lands. Watch whether the file appears at all and whether updates honor atomic write (file should never be empty or torn mid-poll). If it's missing entirely, Critic should be raising Sev-2 — verify the audit fires. If Critic doesn't fire, that's two substrate gaps to surface (writer not emitting + auditor not catching).

3. **Banned-vocabulary in blurb answers.** Critic's v1.11 amendment says Sev-1 + rewrite-request for `IP`, `dispatch`, `section` (structural sense), `verdict`, `Sev N`, `Principle X`, `phase`, `tier`, `delegation`, `escalation` in `answer` text. First build under v1.11 will probably hit this multiple times because the dispatched LLM hasn't internalized the banned list yet. Each Sev-1 + rewrite is a useful data point on charter-instruction adherence.

4. **decision-flowchart-auto.{svg,html} at wrap-up.** Should land in `runs/{slug}/` automatically via wrap-up-build.mjs's non-fatal integration. v0.1 output is rough (known issues: Arbiter not rendered as box, overlapping labels, doubled highway segments) but functional. The user has the bridge plan filed for the post-build flowchart's evolution; Phase 1 (per-decision body extraction with v1.11 reports as the source) starts when this first build's reports are available as test data.

5. **promoted-row-action-buttons UI.** Codex-owned, filed earlier. Not gated on the build, but if Codex's window is open during the build, surfacing the 3-button row + status-chip move can land in parallel.

### Codex acks

2026-05-16 (post-build): build completed PASS_WITH_CONCERNS. Substantive watch-point findings + v1.12 candidate observations are written in detail in the Codex acks section of `available-build-resources-registry-proposal.md` (the registry proposal lands first because it's the larger v1.12 surface; the per-section + current-step emission gaps fold in as supporting evidence). Summary here for the handoff record:

- WP1 (state/reports/ emission): top-level roles internalized the v1.11 convention cleanly (Discovery, TD, Editor, Coordinator, Critic, CV all emitted). Per-section roles (Overseer + Builder × 5 sections) did NOT — likely the inline-mode collapse swallows them. v1.12 candidate: explicit per-section emission hooks OR Coordinator carries per-section sub-blurbs under inline mode.
- WP2 (state/live/current-step.json): NEVER WRITTEN this build. Critic did NOT raise the missing-file finding. v1.12 candidate: dispatcher hooks (charter text alone is insufficient — no role's self-interest pulls them toward writing it).
- WP3 (banned vocabulary): 3 of 6 reports leaked banned tokens — Coordinator, Critic, CV. Discovery/TD/Editor stayed clean. Pattern: roles whose work-product naturally uses the vocabulary leak it. v1.12 candidate: per-role rewrite examples in the charter, not just a flat blacklist.
- WP4 (decision-flowchart-auto at wrap-up): build's wrap-up pass didn't trigger the auto-flowchart generator this run. Investigation TBD whether wrap-up-build.mjs is invoked or whether the build's Orchestrator skipped it.

## The recommendations Maintenance flagged before launch

Three soft heads-ups Maintenance gave the user immediately before this filing:

1. **v1.11 is shipped substrate but unproven on a live build.** The dispatched LLM reads the charter as system prompt; emission depends on LLM following the new Completion Report subsection. Two failure modes: silent skip OR emit-with-banned-vocab.
2. **`state/live/current-step.json` will be required-written but unread.** v0.16 isn't shipped. Could see audit noise from missing-file Sev-2 flags during this build.
3. **Existing infrastructure is solid.** launch-promoted-product.bat v0.6 ready; deploy-session.bat back to known-good; decision-flowchart generator wired in; sandbox-staleness rules acked by both sides.

**Recommendation given to user**: kick the build, scan `runs/{slug}/state/reports/` early after Discovery to confirm emission. Empty = signal to harden v1.12.

## What Maintenance is parking

Open items returned to the queue on Maintenance side:

- **Meta-flowchart v0.2 polish** — curved mode-transitions inside wrapper boxes (currently arrows route between wrapper-contained role boxes without visually communicating "same agent, different mode" cleanly); sub-section role-instance breakdown for Overseer-Builder pair; charter-text-parsing audit for traceTo field validation; HTML wrapper hooks into deploy-session.bat for auto-regen on role_charters.md edits.
- **Bridge plan Phase 1+ implementation** — per-decision body extraction (extract.mjs enrichment) → preamble + per-decision body rendering (render.mjs expansion) → multi-mode agent wrappers (layout.mjs + render.mjs) → expanded section sub-boxes with agent badges → integration + ECT + verification phase expansion → escalation highway traversal indicators → stat-card refinement + run-report annotations → v1.11-reports preference.
- **Concurrent-session FS-race finding decision** — Codex prefers Option 2 (encode minimize-volatile-file-edit as v1.12 convention). Awaiting Maintenance review + ratification or counter-proposal.
- **discovery-misalignment-data-model open question** — open in architecture/build-lifecycle.md; medium priority.

Nothing on Maintenance's plate is blocked on the active build; everything resumes when Maintenance wakes.

## Wake conditions for Maintenance

- v0.16 live narrative renderer ack/implementation request from Codex
- v1.11 build-emission verification confirms or contradicts substrate integration (informs whether v1.12 needs to add dispatcher hooks)
- User directive
- Promoted-row-action-buttons ack (smaller; can wait)
