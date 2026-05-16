# Role Completion Reports — substrate amendment for telos-anchored visualization

**Status:** Codex-filed 2026-05-16; Maintenance-owned substrate amendment (v1.11 candidate).
**Author:** Codex meta-instance, after design dialogue with the user 2026-05-16.
**Scope:** amend `architecture/role_charters.md` to require each role emit a small structured "Completion Report" when it finishes its purpose. Reports carry plain-language blurbs answering preset questions per role, written for the user (not the system). These reports are the substrate the live-build visualization populates from. Without this amendment, the visualization is stuck rendering technical metadata (dispatch counts, section counts) rather than telos-anchored narrative ("what did this just do to advance your goal?").

This amendment is the gating dependency for the corrected live-build-visualization direction (see § "Background" below for why the prior direction missed).

## Background — why this amendment exists

The original `live-build-visualization-proposal.md` (filed 2026-05-16, v0.15 shipped the same day) aimed at rendering build *topology* from existing substrate — phase bands, role nodes, deliverable in center. Mid-session the user surfaced a decision-flowchart SVG from the earthquake-map build that exposed the v0.15 work was at the wrong altitude:

- v0.15 shows what KINDS of agents exist (skeleton)
- The user wants what the system is DOING for them right now (narrative)
- v0.15 uses technical-speak ("5 sections · 4 contracts · 4 waves"); the user wants real-world-speak anchored to the prompt's goal
- v0.15 is static; the user wants live progression — cells filling in as roles complete

The substrate to drive the corrected vision doesn't fully exist. The current substrate captures dispatches, section structure, audit flags, verification verdicts — but nothing surfaces the per-role *narrative* of "what I just figured out for the user." That's what Completion Reports provide.

This amendment is purely additive to existing role charters: every role keeps doing what it does, and also emits a small report file at completion.

## The blurb questions per role (initial draft)

Each role answers **1-3 questions** baseline, with **conditional expansion questions** when something noteworthy happened (more inflection points surfaced, demotion triggered, exception raised, etc.). The principle is: *flexibility based on perceived importance, not a fixed count*. A routine Discovery pass gets 2 blurbs; a Discovery pass that surfaced 5 IPs + a demotion gets 4-5 blurbs. Roles use judgment.

### Always-active roles

| Role | Always-blurb questions | Conditional expansion questions |
|---|---|---|
| **Discovery (Initial)** | 1. *"What did you understand the user wants?"* (2-3 sentence plain-language restatement, telos-anchored) <br> 2. *"What choices did you make on their behalf, and why?"* (one bullet per IP: default + plain reason, ≤25 words each) | 3. *"What did you explicitly NOT do?"* (only if non-trivial out-of-scope list) <br> 4. *"What couldn't you verify?"* (only if proper nouns demoted — see Demotion Mode role) |
| **Technical Discovery (Initial)** | 1. *"How are you breaking this into pieces?"* (section list, one plain sentence per section's purpose) <br> 2. *"What tech choices did you make, and why?"* (library / data-source picks with real-world rationale, ≤2 sentences each) | 3. *"What handoffs exist between pieces?"* (only if non-trivial contract graph) <br> 4. *"What did you defer or note as risky?"* (only if production-fidelity caveats or similar) |
| **Coordinator** | 1. *"How are you sequencing the work?"* (wave structure + brief plain rationale) | 2. *"What's running in parallel?"* (only if multi-section waves exist — otherwise skip) <br> 3. *"What dispatch mode and why?"* (only if non-default) |
| **Overseer (per section, on dispatch)** | 1. *"What does this piece need to do for the user's goal?"* (1-2 sentences plain language; this is THE per-section blurb the user explicitly asked for) | 2. *"How will we know it's done?"* (only if acceptance criteria are non-obvious) |
| **Builder (per section, on completion)** | 1. *"What did you build, and what does it do?"* (1-2 sentences, plain) | 2. *"What's notable about how?"* (only if a meaningful design choice was made during build — e.g., "used X library because Y") |
| **Critic** | 1. *"What kinds of problems did you check for?"* (2-4 categories in plain language) <br> 2. *"What did you find?"* (severity-grouped findings; empty if nothing — "nothing of concern" is itself a valid blurb) | 3. *"Did anything need escalation?"* (only if Sev-2+ raised — feeds the escalation flow) |
| **Editor** | 1. *"Did the build stay true to what was asked?"* (verdict + 1-2 sentence plain rationale) | 2. *"Anything the user should know about?"* (only if recommendations exist) |
| **Convergence Verifier** | 1. *"Does the artifact actually work?"* (verdict + first-contact result in plain language) | 2. *"Any caveats?"* (only if pass-with-concerns) |
| **Integrator** | 1. *"What did you produce?"* (artifact description + where to find it — the user-facing close) | 2. *"Anything to know before using it?"* (only if usage notes / live URL / etc.) |

### Conditional roles (only emit if their condition fires)

| Role | Always-blurb questions | Conditional expansion questions |
|---|---|---|
| **Discovery (Amendment Mode)** | 1. *"What changed in the plan, and why?"* (delta from initial, plain) | 2. *"What stays the same?"* (only if explicit list useful) |
| **Discovery (Demotion Mode)** | 1. *"What couldn't be verified?"* (proper noun(s) demoted, plain) <br> 2. *"What's the system going to do instead?"* (graceful degradation plan, plain) | — |
| **Technical Discovery (Impact-Analysis Mode)** | 1. *"After re-examining, what changes?"* (delta summary, plain) <br> 2. *"What stays the same?"* (unaffected pieces — like earthquake-map's "all 4 sections marked unaffected, no rebuild") | 3. *"Why was the original gap there?"* (only if root-cause analysis worth surfacing) |
| **Arbiter** (escalation) | 1. *"What exception came up?"* (1-sentence problem in plain language) <br> 2. *"Where are you routing it, and why?"* (destination + reason) | — |
| **Re-Verification** (Phase 2 only) | 1. *"After the fixes, does it work now?"* (verdict, plain) <br> 2. *"What changed since the previous attempt?"* (rectification summary, plain) | — |
| **Researcher (Planning Mode)** | 1. *"What did you go look up, and what did you find?"* (1-2 sentences per probed IP, plain) | 2. *"Did anything contradict an assumption?"* (only if findings disagreed with Discovery's defaults) |
| **Researcher (Escalation Mode)** | 1. *"What blind spot were you sent to chase?"* (1 sentence) <br> 2. *"What did you find?"* (1-2 sentences plain) | — |

**Roles intentionally excluded from blurb emission:**

- **Orchestrator** — it's the wrapper; the user-facing restatement comes from Discovery's first blurb. Surfacing a separate Orchestrator blurb adds noise without adding signal.
- **Historian** — background role with no user-facing decision content. Its writes are state, not narrative.

## File schema

Each role writes its Completion Report to:

```
runs/{slug}/state/reports/{role}-{instance_id}-v{N}.json
```

Where `{instance_id}` distinguishes sections-of-the-same-role (e.g., `overseer-data-fetcher-v1.json`, `overseer-map-renderer-v1.json`) and `{N}` allows for re-engagement (e.g., `td-v1.json` initial, `td-v2.json` impact mode).

Schema (proposed):

```json
{
  "role": "Discovery",
  "instance_id": "discovery-initial",
  "iteration": 1,
  "mode": "initial",
  "completed_at": "2026-05-16T12:38:47.123Z",
  "blurbs": [
    {
      "question": "What did you understand the user wants?",
      "answer": "Reading what you want, it's a tool to view recent earthquake activity on a map you can pan and zoom. Going to assume **global scope** (not regional) and **recent** activity (not historical archive) since you didn't specify either.",
      "kind": "always",
      "importance": "high"
    },
    {
      "question": "What choices did you make on their behalf, and why?",
      "answer": "Three things you didn't specify, with my defaults: (1) **snapshot, not live updates** — easier to wish you had refresh than to wish you didn't; (2) **past 24 hours** — recent enough to be useful, no setup; (3) **no filters** — get something working first, filters can come later.",
      "kind": "always",
      "importance": "high"
    },
    {
      "question": "What couldn't you verify?",
      "answer": "Could not reach the USGS feed during planning to confirm the schema. Going to assume the documented `FeatureCollection` shape and ship with a graceful error message if it's wrong.",
      "kind": "conditional",
      "importance": "medium"
    }
  ],
  "raised_escalation": false,
  "next_role": "TechnicalDiscovery"
}
```

Notes on schema:

- `kind: "always" | "conditional"` lets the renderer style differently (e.g., conditional blurbs slightly more muted, or grouped under a "details" expander when many appear).
- `importance: "high" | "medium" | "low"` controls how much canvas space each blurb gets in the renderer (high-importance gets full-width; low can be compact).
- `raised_escalation` is the trigger for the escalation flow visual element — if any role's report has this `true`, the visualization grows a new row + animates the journey through Arbiter to the rectifier.
- `next_role` is informational; helps the renderer pre-position the next cell so transitions read smoothly.

## Escalation flow rows

Escalations are first-class additions to the visualization, modeled on the red vertical channel in the earthquake-map decision-flowchart. When `raised_escalation: true` appears in any role's report:

1. **A new escalation row materializes** in the visualization (vertically below or beside the raising role, depending on layout)
2. **Arbiter's report appears next** with its 2 blurbs ("what exception came up", "where routing")
3. **Rectifier's report appears** in the row (TD impact mode / Discovery amendment / Coordinator re-engage) with its blurbs
4. **Per-section impact blurbs appear inline** if the rectifier's delta plan touches them (e.g., "Section 3 — unaffected, no rebuild"; "Section 5 — contract amended, rebuild")
5. **Resolution closes back at the original raiser** with its second-pass report ("Did the fix resolve it?")

Each escalation that fires adds its own row. A build with 3 escalations grows the visualization by 3 rows over time. Routine builds with 0 escalations show only the always-active and conditional role reports.

This matches what the user explicitly called out: *"ideally we will be able to fully visualize the integrator/critic exception raising process as well as we focused heavily on integrating that into the schematic I recently sent."*

## What changes for each role (charter amendments)

Each role's existing charter gets a new section appended:

> ### Completion Report
>
> When this role completes its purpose, write a Completion Report to
> `runs/{slug}/state/reports/{role}-{instance_id}-v{N}.json` containing
> answers to the always-blurb questions below in plain user-facing
> language. Add conditional-blurb answers when the corresponding
> condition fires. Reports are read by the live-build visualization
> renderer to populate the build's narrative trace.
>
> Always blurbs:
> [role-specific list]
>
> Conditional blurbs:
> [role-specific list]
>
> Style guidance:
> - Write FOR THE USER, not for the system. The reader is the person
>   who ran the prompt and doesn't speak the AutoBuilder vocabulary.
> - Anchor to the user's goal: every blurb should advance the user's
>   understanding of "what's this getting me toward?"
> - Real-world language, not technical jargon. "Picked Leaflet because
>   it works offline" not "TD-IP1 resolved: Map library = Leaflet
>   (vendored)."
> - Length: blurb answers are 1-3 sentences typically. Lists of choices
>   can be longer if each item is one short bullet.
> - Tone: matter-of-fact, slightly conversational. Avoid jargon, avoid
>   ceremony, avoid hype.

## What this unblocks Codex to build

Once the substrate amendment lands, Codex builds the live narrative renderer (v0.16+ of the visualization). Approximate scope:

- **Live polling layer** — watches `runs/{slug}/state/reports/` for new files; appends to the rendering as they land
- **Per-role cell rendering** — each role becomes a container; cell fills in with blurb cards as the role's report lands; blurbs animate in with a brief fade-up
- **Telos anchor at top** — the user's prompt verbatim sits at the top of the canvas; every subsequent blurb visually traces back to it (faint line, subtle but persistent)
- **Escalation row choreography** — the red-channel-style animation for any escalation that fires; uses the existing audit/flags.jsonl as the trigger source
- **Real-world-speak enforcement at the renderer level** — the renderer trusts the reports' blurb content as already user-facing; no further translation needed

The v0.15 plumbing (build_shape.mjs + topology.js + topology.css + dashboard hooks) stays as reusable infrastructure. The phase bands become structural skeleton; cells fill with blurb content instead of role-counter metadata. The v0.15 widget can stay live as a "build skeleton" overview fallback while the live narrative renderer is the headline.

## Maintenance Status

<!-- Edit checkboxes when you action items. Codex parses this block on its next aggregator run. -->

**Last touched:** 2026-05-16
**Overall state:** v1.11 amendment shipped 2026-05-16 by Maintenance. Codex v0.16 unblocked.

- [x] proposal-reviewed — *Codex's draft is sound. Blurb question lists kept ~95% intact; refinements documented in Maintenance notes below.*
- [x] blurb-questions-refined — *Per-role question lists tightened for style-contract compliance and second-event semantics on Overseer.*
- [x] charter-amendments-drafted — *13 roles amended in `architecture/role_charters.md` (Discovery x3 modes, TD x2 modes, Editor, Coordinator, Critic, Arbiter, Researcher x2 modes, Overseer, Builder, Integrator, CV, Re-Verification). Orchestrator + Historian explicitly excluded per Codex's rationale. Canonical mechanics live in a single "§ Completion Reports (v1.11)" subsection of "Notes for All Roles"; per-role charter sections carry only the role-specific blurb questions to avoid 13-way duplication.*
- [x] file-schema-finalized — *`state/reports/{role}-{instance_id}-v{N}.json` schema landed in `architecture/file_schemas.md` § Schemas. Directory layout + permission table updated.*
- [x] amendment-shipped — *Shipped in this commit; see Codex acks below for the file-by-file change manifest.*
- [ ] codex-v0.16-shipped — *Codex-owned, gated on this amendment landing. Now unblocked.*

### Maintenance notes

2026-05-16: Amendment shipped. Notable refinements from Codex's draft:

**On the style contract.** Codex framed style guidance as a per-role addendum to each charter. I consolidated it into the canonical "§ Completion Reports (v1.11)" subsection of "Notes for All Roles" — single source of truth — and added an explicit **banned vocabulary list** for the `answer` field text. Banned: `IP`, `dispatch`, `section` (in the structural sense), `verdict`, `Sev N`, `Principle X`, `phase`, `tier`, `delegation`, `escalation`. The renderer trusts blurb text as already user-facing; the banned list is what makes that trust honest. Critic audits will fire Sev-1 flags on banned-vocabulary appearances and request a re-write. This is load-bearing: without the ban, charters tend to drift back to AutoBuilder-vocabulary blurbs that pass the syntactic schema but fail the actual "written for the user" promise.

**On Overseer's two events.** Codex's draft had Overseer emitting one blurb on dispatch ("what does this piece need to do for the user's goal?"). I made it two events: (a) intent blurb on dispatch (Codex's original), (b) outcome blurb on section verification ("did this piece come out as planned?"). The intent-without-outcome pattern leaves the renderer with a dangling "what was supposed to happen" with no resolution — the user's eye-track hits the intent card and then has nowhere to go. Adding the outcome blurb closes the loop. File-naming: same `instance_id`, incremented `iteration` (so v1 is intent, v2 is outcome).

**On the `current-step.json` write protocol.** Codex left this as an open question gating v0.16. I settled it: single-writer-at-a-time, atomic temp-then-rename per the FS-race finding's prescription. Sequential phases use whichever role just completed; parallel waves are owned by Coordinator (which already serializes through its dispatch-log writes). Documented the write pattern with concrete `os.replace` / `MoveFileEx` references. Renderer pollers see coherent prior or new state, never torn writes.

**On Critic audit hooks.** Codex's draft mentioned Critic auditing reports but didn't specify the audit checks. I added four explicit hooks: (1) every role completion produces exactly one report per iteration (missing reports = flag), (2) banned-vocabulary screen on `answer` text (Sev-1 + re-write), (3) conditional blurbs only appear when their documented condition fires (Sev-2: role exceeded emission contract), (4) `current-step.json` is never absent during an active build (Sev-2 for torn writes). This makes the substrate auditable, not just documented.

**On future-proofing.** The schema includes `iteration` (1-indexed) so re-engaged role-instances cleanly version their reports without overwriting. The `instance_id` encoding supports per-section, per-escalation, and single-instance variants in a uniform shape. Renderer can group by `instance_id` to show "this role engaged 3 times" without parsing filenames.

**On scope discipline (per Codex's filing rationale).** This amendment is purely additive: every existing role keeps doing what it does and also emits a small report file. Existing role outputs (ledgers, section plans, contracts, verdicts) retain their current schemas, audiences, and Cat 2 status. Completion Reports are a NEW Cat 2 surface specifically for the live narrative renderer; they do not replace any existing output.

### Codex acks
2026-05-16: Filing this as the corrected substrate dependency for the live-build-visualization direction after user feedback exposed v0.15 was aimed at the wrong altitude. The substrate amendment is the gating dependency; once it lands, Codex can build a renderer that produces visualizations close to what the user has in mind (modeled after the earthquake-map decision-flowchart they uploaded — see live-build-visualization-proposal.md for the design-dialogue trail).

Filed as a separate proposal rather than folded into the visualization proposal because: (1) substrate amendments are architecture territory and benefit from their own thread per the codex-vs-architecture boundary, (2) the visualization proposal's existing Maintenance-Status checkboxes are scoped to the renderer work and shouldn't be confused with the substrate prerequisite, (3) per the FS-race finding (`concurrent-session-fs-race-finding.md`), large new content lands cleaner in new untouched files than as extensions to volatile shared files.

The earthquake-map decision-flowchart the user uploaded (`uploads/decision-flowchart.svg`) is the visual reference target; the user's framing — "preset blurb questions per role, dynamically expanded with escalation rows, 1-3 baseline scaling with perceived importance" — is the design constraint this amendment encodes into substrate.

---

2026-05-16 (later, Maintenance): v1.11 shipped end-to-end. File-by-file change manifest for Codex's v0.16 implementation reference:

**`architecture/file_schemas.md`:**
- Directory Layout extended with `state/reports/` and `state/live/`.
- Permission Table extended with two rows (reports, current-step.json).
- New schema section `state/reports/{role}-{instance_id}-v{N}.json` — full field list, file-name encoding rules, style contract reproduction, lifecycle, audit hooks.
- New schema section `state/live/current-step.json` — schema, write coordination patterns, mandatory atomic-write pattern with pseudo-code, lifecycle.

**`architecture/role_charters.md`:**
- New `### Completion Reports (v1.11)` subsection in "Notes for All Roles" carrying the canonical mechanics + banned vocabulary list + audit hooks.
- `### Completion Report (v1.11)` subsections added to 13 role charters: Discovery (Initial / Amendment / Demotion), TD (Initial / Impact), Editor, Coordinator, Critic, Arbiter, Researcher (Planning / Escalation), Overseer (two-event variant), Builder, Integrator, CV, Re-Verification. Each carries only the role-specific blurb question list; mechanics reference the canonical section.

**No changes needed elsewhere.** PROJECT-OVERVIEW.md templates, wrap-up scripts, and the workflow #2 fork ceremony are all upstream of the report-emission events — they see the reports only as `state/reports/*.json` files in the corpus.

**Codex implementation notes for v0.16:**

1. **Polling pattern.** Watch `state/live/current-step.json` for changes (its `updated_at` or `last_completed_report` fields flip on every dispatch event). On change, scan `state/reports/` for any file not yet rendered. The watch-then-scan pattern is O(1) for the steady-state case where nothing changed, O(N) only when something did.

2. **Renderer cell allocation.** Use `importance: high` blurbs for full-width cards, `medium` for half-width, `low` for compact footnote-style. Each role's cell can grow as more blurbs land for that role's iteration.

3. **Style trust.** The renderer can trust blurb `answer` text as already user-facing. If Critic ever flags banned vocabulary, that's a Sev-1 audit issue back to the role — the renderer never tries to "translate" mid-render.

4. **Escalation row materialization.** When any report has `raised_escalation: true`, materialize a new escalation row per the earthquake-map decision-flowchart's red-channel pattern. The escalation flows through Arbiter → rectifier role(s) → original raiser's re-engagement report, all retrievable by `escalation_id` filtering across the reports directory.

5. **`build_complete: true` transition.** The renderer freezes the live trace when `current-step.json.build_complete` flips true. The post-build static view is the build-skeleton fallback (v0.15) by default; the user can toggle back to the narrative trace for review.

Codex v0.16 work is unblocked. The substrate-shape changes are stable; refinements to specific blurb questions are still in-charter scope and can land later via routine charter amendments without breaking the renderer.

### Codex acks
2026-05-16: Filing this as the corrected substrate dependency for the live-build-visualization direction after user feedback exposed v0.15 was aimed at the wrong altitude. The substrate amendment is the gating dependency; once it lands, Codex can build a renderer that produces visualizations close to what the user has in mind (modeled after the earthquake-map decision-flowchart they uploaded — see live-build-visualization-proposal.md for the design-dialogue trail).

Filed as a separate proposal rather than folded into the visualization proposal because: (1) substrate amendments are architecture territory and benefit from their own thread per the codex-vs-architecture boundary, (2) the visualization proposal's existing Maintenance-Status checkboxes are scoped to the renderer work and shouldn't be confused with the substrate prerequisite, (3) per the FS-race finding (`concurrent-session-fs-race-finding.md`), large new content lands cleaner in new untouched files than as extensions to volatile shared files.

The earthquake-map decision-flowchart the user uploaded (`uploads/decision-flowchart.svg`) is the visual reference target; the user's framing — "preset blurb questions per role, dynamically expanded with escalation rows, 1-3 baseline scaling with perceived importance" — is the design constraint this amendment encodes into substrate.
