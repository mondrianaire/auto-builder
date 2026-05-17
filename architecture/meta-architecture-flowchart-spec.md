# Meta-Architecture Flowchart — spec

**Filed:** 2026-05-16 by Maintenance per user direction.
**Status:** SPEC — third flowchart in the project's flowchart family. Build-agnostic. Generator implementation TBD; this doc locks scope, content, and connection topology.

## The three-flowchart family

The project now has three distinct flowchart artifacts, each with a different audience and purpose:

| Artifact | Audience | Specificity | Mode | Source |
|---|---|---|---|---|
| **Live build-view** | The user who wrote the prompt | Build-specific (current build only) | Live — updates as roles complete | v1.11 Completion Reports, `state/live/current-step.json` |
| **Post-build detail flowchart** | The user reviewing a finished build, plus future corpus researchers | Build-specific (one per build) | Static — emitted at wrap-up | Full Cat-2 substrate + v1.11 reports |
| **Meta-architecture flowchart** *(this spec)* | Anyone outside the project who wants to understand AutoBuilder; also internal documentation reference + intra-role-communication anchor | Build-agnostic — describes the system itself | Static — versioned with the architecture | Role charters + dispatch patterns from `role_charters.md` |

The three are complementary, not redundant. The Live and Post-build are *measurements* (what happened on a specific build). The Meta is a *model* (what AutoBuilder is, regardless of any build).

The Meta replaces the stale `architecture/architecture_diagram.svg` and goes deeper than it ever did — it's not a system block diagram, it's an executable-spec-style topology that doubles as the canonical reference for "how does AutoBuilder work?"

## Purpose (load-bearing — affects every design choice)

The Meta flowchart serves four use cases simultaneously, and each constrains the design:

1. **Explanation to outsiders.** Someone new to AutoBuilder should be able to read this single artifact and understand the role graph, the dispatch flow, the escalation paths, and what each role actually does. This rules out cryptic codes without legends and pushes toward plain-language role descriptions.

2. **Internal documentation anchor.** When the architecture itself changes (new role, new principle, new escalation path), the Meta is the canonical "current state of the system" artifact — the diff between Meta vN and Meta vN+1 is the visual record of an architecture amendment. This means version-stamping the SVG with the architecture version it depicts.

3. **Intra-role-communication reference.** Roles consult this artifact (mentally if not literally) to know who they dispatch to, who can dispatch them, and what's expected at each hop. This means the connections in the graph have to match the actual dispatch contracts in `role_charters.md` — Critic should not show an arrow into Discovery if no charter says Critic ever dispatches Discovery.

4. **Progress-marker reference for the user.** When the user sees the Live build-view say "Coordinator → Wave 2 dispatch," they should be able to glance at the Meta flowchart and locate Coordinator in the topology to understand what's coming next. This means the Meta and Live use the same role-name vocabulary and similar visual grammar.

## Content per role

Every role in `role_charters.md` is represented as a single bordered box (except multi-mode roles — see below). Each box contains:

### Title

The canonical role name as it appears in the charter heading: `Discovery (Initial Mode)`, `Technical Discovery (Initial Mode)`, `Convergence Verifier`, etc. Multi-mode roles get a single wrapper box with mode sub-panels (see Multi-mode rendering below).

### Brief description

One sentence stating the role's purpose, sourced from the charter's opening "You are…" paragraph. Examples (verbatim from charters):

- **Orchestrator** — "The only role with direct user contact during the build. Kickoff, escalation handling at the highest tier, final delivery."
- **Discovery (Initial)** — "Translates a one-line user prompt into a structured assumption ledger. Keeper of the user's atomic intent for the entire build."
- **Discovery (Demotion)** — "Invoked when a proper noun whose canonical source was required cannot be verified. Authoritative ruling on whether the build can proceed."
- **TD (Initial)** — "Translates Discovery's product spec into sections + interface contracts + technical decisions."
- **Editor** — "Audits TD's output against the user's literal prompt and Discovery's atomic intent. Structural, not substantive."
- **Coordinator** — "Flow control. Builds the dependency DAG, dispatches sections in waves, monitors progress, enacts delta plans on re-evaluation. Makes no architectural or product decisions."
- **Critic** — "Detects drift and inconsistency. Scheduled audits during build + final sweep before CV."
- **Arbiter** — "Event-driven. Classifies escalations and routes. Makes no content decisions."
- **Historian** — "Maintains `history/log.jsonl` as canonical causal record with rationale captured."
- **Researcher (Planning)** — "Dispatched by TD to investigate inflection points. Returns canonical evidence."
- **Researcher (Escalation)** — "Dispatched by Arbiter to investigate problems that escaped a section's Overseer. Optimization criterion: blast radius minimization."
- **Overseer** — "Per-section. Decomposes into builder tasks, dispatches Builders, verifies output, updates section state."
- **Builder** — "Narrow scope, one output file (or small handful) per dispatch. Completes one specific task."
- **Integrator** — "Assembles section outputs into a single artifact. Single-pass, no agent collaboration."
- **Convergence Verifier** — "Exercises the artifact under production fidelity. Multi-tier verification: first-contact, prompt-named-verb, then assumptions and edge cases."
- **Re-Verification** — "Audits a prior run under a newer architecture version. Recommends recovery action; does not enact."

### Atomic steps (the build-invariant process)

Each role's charter has a numbered "Process" section. The Meta extracts those steps verbatim or near-verbatim, formatted as a numbered list inside the role box. These are the steps the role takes on every dispatch, regardless of build journey.

Example for **Discovery (Initial)**:

```
1. Read the prompt. Identify what's explicit vs. silent.
2. Enumerate proper nouns (Principle E).
3. Use execution-context evidence (Principle E, Decision Grounding).
4. Capture explicit assumptions.
5. Apply simplest-within-reason to silent items.
6. Author the explicit telos (Principle G).
7. Log inflection points where multiple simple interpretations fork the build.
8. Enumerate first-contact requirements (Principle G Tier 2).
9. List explicit out-of-scope items.
10. Write the ledger.
```

Example for **Coordinator**:

```
1. Read sections plan + contracts.
2. Build the dependency DAG.
3. Pick dispatch_mode (inline vs. nested vs. sub-agent) per ≤8 / >8 / explicit threshold.
4. Dispatch Wave 1; verify each section against contract.
5. Advance to Wave 2; same.
6. On delta plan from TD: enact (no-op / re-dispatch / new-section / contract amendment).
7. On all sections verified: write build-complete.json.
```

Steps are framed in 1-line plain language. Acronyms or principle references (Principle G Tier 2) are allowed because the audience may include people learning the architecture — the Meta is also the place a reader follows the principle reference to its source. Tooltips or inline footnote markers can resolve these.

### Boundaries (optional, on certain roles)

For roles where boundaries are themselves illuminating (Critic vs. Editor distinction, Arbiter as content-decision-free), include a brief "Boundaries" line in the box. Example for **Critic**: "Detects drift — does NOT decide what's correct. Routes findings to Arbiter."

## Multi-mode rendering

Discovery (3 modes), Technical Discovery (2 modes), Researcher (2 modes) get **single wrapper boxes** with internal mode sub-panels, mirroring the Detail Full convention. The wrapper has the role title; each sub-panel has the mode name + that mode's brief description + that mode's atomic steps.

This makes it visually obvious that "the same agent enters this box with different mode-flags," which is structurally important for understanding the dispatch graph (e.g., demotion-mode Discovery is the same agent identity as initial-mode Discovery — escalations route to "Discovery the role," not "Discovery the initial-mode dispatch").

## Connection topology

Connections are the load-bearing structural content. They must match `role_charters.md` exactly — every charter-documented dispatch path appears as an arrow in the Meta; no extra arrows that don't have charter backing.

### Linear dispatch path (the happy path)

```
User Prompt → Orchestrator → Discovery (Initial) → TD (Initial) → Editor → Coordinator
  → [for each section: Overseer → Builder(s)] → Integrator → Critic (final sweep) → CV
  → Orchestrator (delivery)
```

This is the spine. Render with solid black arrows, ~3px wide.

### Cross-cutting roles

Some roles operate orthogonally to the spine:

- **Historian** receives every state-changing event from every other role. Render as a single role box on the side with dotted lines fanning in from every spine box. Or, since the dotted fan-in would clutter the diagram, render Historian as a "underneath" lane with a single label "Historian observes all state changes" and a single representative dotted arrow.
- **Critic (scheduled mode)** audits during the build, not in the spine sequence. Render as a side box with dashed lines into Coordinator and into per-section Overseers.

### Escalation paths

When an Overseer, Critic, or Integrator encounters an issue they can't resolve:

```
[raising role] → Arbiter → {classification routing}
  ↓ depending on classification:
    → Researcher (Escalation Mode) — for missing canonical evidence
    → Discovery (Demotion Mode) — for unverifiable proper nouns
    → TD (Impact Mode) — for plan-level issues
    → Coordinator (re-engaged) — for dispatch-level issues
```

Render these with the red dashed-arrow convention from the Detail Full SVG. Each escalation target loops back: TD impact → Coordinator → original raiser for re-verification.

### Mode transitions within a role

Discovery (Initial) → Discovery (Amendment): triggered by new evidence post-TD. Render as a curved arrow inside the Discovery wrapper from the Initial sub-panel to the Amendment sub-panel.

Discovery (Initial) → Discovery (Demotion): triggered by a proper noun's verification_status becoming `unreachable`. Curved arrow within wrapper.

TD (Initial) → TD (Impact): triggered by Arbiter routing back. Curved arrow within wrapper.

Researcher (Planning) → Researcher (Escalation): NOT a transition — these are separate dispatches from separate originators. The Researcher wrapper just shows both modes as parallel sub-panels.

### Re-Verification

Re-Verification is a meta-mode role that runs against prior runs, not within a current build. Render as a separate "audit" box outside the main spine, with a dashed arrow from `Orchestrator` (re-audit dispatch) and a returning dashed arrow showing the recommendation (`patch_artifact / rebuild`). Make explicit that this is post-build audit, distinct from CV which is in-build verification.

## Layout

Reading order: top-to-bottom for the spine (Discovery at top, CV near the bottom).
Horizontal: side roles (Critic in scheduled mode, Historian, Arbiter, Researcher) flank the spine on left and right.
Multi-mode wrappers are wide enough horizontally to accommodate 2-3 sub-panels side-by-side without crowding.

Estimated canvas size: ~2400x3600 (roughly two-thirds the height of Detail Full's earthquake-map specific flowchart, since the Meta is build-agnostic and doesn't have section-specific detail rows).

## Versioning

The Meta is **stamped with the architecture version** it depicts. Title block top-of-canvas: `AutoBuilder Architecture v1.11 — Role Topology`. The version is sourced from `architecture/versions.md` or equivalent.

When the architecture amends, the Meta is regenerated. Old versions stay in the corpus at `architecture/meta-flowcharts/v{N}.svg` so the diff is browseable.

## Generation approach

The Meta is **template-driven** and read-once-write-once, unlike the Live or Post-build flowcharts which are data-driven extractions.

A single `architecture/scripts/meta-flowchart.mjs` (~600-800 LoC estimated) reads:

- `architecture/role_charters.md` — for titles, brief descriptions (first paragraph), atomic steps (Process numbered lists), boundaries
- `architecture/principles.md` — for principle references in atomic steps (resolves them in tooltips)
- `architecture/build-lifecycle.md` — for phase ordering
- Optional: a hand-curated `architecture/meta-flowchart-layout.json` for layout overrides if auto-layout produces awkward placement

Output: `architecture/meta-flowcharts/v{architecture_version}.svg` + a stable `architecture/meta-flowcharts/latest.svg` symlink-or-copy.

The script auto-runs on architecture changes (could be hooked into a pre-commit or a GitHub Action) so the SVG and the charters stay in lockstep.

## Audit hooks

- Every role in `role_charters.md` (excluding "Notes for All Roles") must appear in the Meta. Missing role = build failure.
- Every dispatch arrow in the Meta must trace to at least one charter sentence describing that dispatch. Untraced arrow = build failure (forces the script to drop spurious arrows).
- Every charter-documented dispatch pattern must appear as an arrow. Missing arrow = build failure (forces script to add it).

These checks make the Meta self-validating against the charters. Drift between Meta and charters is structurally impossible.

## What the Meta is NOT

- **Not the Live view.** Live view shows a specific build in progress.
- **Not the Post-build detail flowchart.** Post-build shows what one specific build's run actually did, with verbatim assumption lists, OOS items, per-section role instances.
- **Not a system block diagram.** It's a process topology with atomic steps inside boxes — closer to a state-machine diagram than a layered architecture diagram.
- **Not informal.** Every box must trace to a charter; every arrow must trace to a dispatch contract. The Meta is auditable.

## Open questions

1. **Where do principles appear?** The atomic-step text references "Principle E," "Principle G Tier 2," etc. Should the Meta show a Principles panel on the side with the canonical list, or rely on tooltips/external references? Recommend a small principles legend at the bottom-right with one-line summaries; full text stays in `principles.md`.

2. **Is dispatch-mode (inline vs. nested vs. sub-agent) visible?** Coordinator picks this per build, so it's not build-invariant. Probably surface it as a Coordinator-box footnote: "Picks dispatch_mode per ≤8/>8/explicit threshold; affects rendering granularity in downstream flowcharts."

3. **Where does the v1.11 Completion-Report layer appear?** Every dispatchable role has a `### Completion Report` subsection in its charter. Should the Meta show "writes Completion Report → renderer" arrows from every role to a single "Live narrative renderer" target, or omit this to keep the Meta focused on the build-execution graph? Recommend omitting from main spine; add as a footer note: "Every role also emits a Completion Report consumed by the live narrative renderer (v1.11)."

4. **Hosted artifact?** Should the Meta SVG be embedded in the Codex dashboard or live as a standalone reference link from `architecture/README.md`? Recommend both: link from architecture README as the canonical reference; Codex dashboard has a small "Architecture topology" link in the footer that opens the latest Meta in a new tab.

## Next step

Implementation is its own workstream. The generator (~600-800 LoC) is roughly the same magnitude as the post-build decision-flowchart generator's Phase 2 work. Recommend sequencing it after Phase 2 of the bridge plan lands, so the rendering primitives (preamble blocks, multi-mode wrappers, agent boxes with body text) developed for post-build can be reused.

If you want to land the Meta sooner, it can be hand-authored as a one-time SVG (matching this spec) and then auto-generation added later. The hand-authored version still satisfies use cases 1-4; the auto-generation just keeps it in lockstep with charter changes going forward.
