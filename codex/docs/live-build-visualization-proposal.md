# Live build visualization — proposal for AutoBuilder-Maintenance

**Status:** draft for review.
**Author:** Codex meta-instance, with substantial design feedback from the user's design skill folded in.
**Scope:** dynamic, per-build SVG topology that grows as Discovery + TD plan the work, animates as roles execute, surfaces the deliverable materializing alongside the agents, and exports as a self-contained "build story" research artifact at the end. Replaces the static `architecture_diagram.svg` (dated 2026-05-03, pre-v1.9, missing Editor + Demotion Mode + v1.10 cadence) with a per-build dynamic renderer driven by substrate data.

The goal isn't a status display. The diagram **IS the agent system, made visible.** Every box is a real role currently doing real work; every edge a real dispatch or contract or escalation; every signature animation a real architectural beat firing. The user watches their build happen the way they'd watch a small team of engineers working in a glass-walled room.

---

## Why this proposal

Three threads converge:

1. **The existing static SVG is stale and wrong-shape.** It's a fixed 3-Researcher layout from 2026-05-03, predating Editor, Demotion Mode, v1.10 commit cadence, and the entire build-lifecycle.md ratification chain. Builds vary wildly in shape — some quick-reason all IPs (zero Researchers), some dispatch seven (per-IP). A static diagram can't show what THIS build's architecture actually looks like.

2. **The Cowork-chat is a poor live-status surface.** Verbose agent reasoning competes with the user's need to know "where are we now, what's coming next." The chat-output-discipline conversation (separate v1.11 proposal candidate) addresses the noise side; this proposal addresses the missing structured-progress side.

3. **The user explicitly raised "make the inner workings impressive."** A live visualization of multi-agent orchestration is the project's natural showpiece. The architecture is the product; making it visible IS the dashboard.

## What's already in place

The substrate the renderer reads is already authored by the existing roles:

| Data | Source | Role that writes it |
|---|---|---|
| Inflection-point count + research dispatches | `decisions/discovery/ledger-v1.json` + `dispatch-log.jsonl` | Discovery + TD |
| Section count + contract edges + per-section dependencies | `decisions/technical-discovery/sections-v1.json` | TD |
| Builder dispatches + wave structure (timing inferred) | `state/coordinator/dispatch-log.jsonl` | Coordinator |
| Editor verdict + recommendations count | `decisions/editor/review-v{N}.json` | Editor |
| Critic flags by severity | `audit/flags.jsonl` | Critic |
| Verification verdict + per-tier results | `output/verification/report.json` | CV |
| Demotion outcomes (when applicable) | `decisions/discovery/demotion-v{N}.json` | Discovery (Demotion Mode) |
| Phase boundaries (when commits land) | git tags + commit subjects per v1.10 cadence | Orchestrator |
| Lifecycle phase (ratified, promoted) | `runs/{slug}/completion-ratified.json` + `codex/data/curation/{slug}.json#promoted_to` | ratify-build.bat + completion-triggered-fork.yml |

Nothing else from the architecture side is required for the static dynamic SVG. The live-overlay layer needs ONE small new substrate file per role (see §"v1.11 dependency" below).

## Core principle

**The diagram is not a status display of the agent system. The diagram IS the agent system, made visible.** Every visual element corresponds to a real architectural element. Animations communicate real state changes. The deliverable shown materializing in the center is the actual artifact being built. No decoration; no flavor; no anthropomorphism.

When this principle is violated, the visualization stops being transparency and starts being performance. Performance is fine in other contexts; this isn't one. The work itself is the personality.

---

## Design system

### Spatial layout

**Phase bands** run vertically (top to bottom): Kickoff → Planning → Build → Verification → Delivery → Ratification → Promoted. A faint horizontal ladder beneath the canvas shows which phases have completed (small green dot per closed phase).

**Deliverable in center.** The deliverable's materializing shape sits in the middle of the canvas, surrounded by the agent topology in its phase bands. This is the principle "deliverable as protagonist" made spatial — agents orbit what they're building.

**Agents around the deliverable**, placed in their phase bands, drawing edges inward to the deliverable as they contribute, pulling away at handoff.

### Per-deliverable-kind materialization

The center-of-canvas deliverable view varies by `deliverable_kind`:

| Kind | Visual treatment |
|---|---|
| `web_app` | Empty rectangle → header text appears when Discovery names the project → section bays fill in as TD plans them → UI elements (buttons, lists, etc.) appear as integration progresses |
| `plugin` | JSON manifest schema scaffold → fields fill in as TD plans + builders implement (manifest fields, handler files) |
| `cli` | Command tree — root command first, subcommands appearing as sections add them, argument schemas growing per command |
| `library` | API surface diagram — module names appearing, exported function signatures forming, types resolving |
| `document` | Outline that gains sections + paragraphs |
| `data` | Schema diagram + sample rows preview |
| `other` | Generic "build progress" rectangle with phase milestones |

All seven share the structural commitment: there's a visible deliverable shape from t=0 that fills in over time. Implementation varies; principle is constant.

### Color palette (dark mode)

- **Phase bands:** Kickoff (slate) → Planning (cool blue) → Build (warm orange, active fire) → Verification (purple) → Delivery (gold) → Ratification (deeper gold) → Promoted (gold star)
- **Role active:** full saturation + slow breathing pulse (2.4s cycle)
- **Role pending:** 40% opacity, no pulse
- **Role done:** 60% opacity + checkmark
- **Role escalated:** red ring + brief flash
- **Role failed (terminal):** muted ash-gray + small terminal mark, somber not alarming (see §"Failure register" below)
- **Particle trails:**
  - white for normal dispatches (800ms travel time)
  - red for escalations (always pull focus)
  - gold for verified-with-citation Researcher returns

### Motion language

- Breathing pulse: slow, organic, never frantic. 2.4s cycle.
- Particle trails: single dot, 800ms travel, brief glow on arrival.
- Box spawn (plan expansion): 300ms fade + scale-in from 80% to 100%, slight bounce, 50ms stagger between siblings so it reads as a wave.
- Phase band color shift: 600ms ease.
- Desaturation on done: 400ms.

### Silence as a design element

Unrelieved motion flattens. The diagram needs **rest beats**:

- 1–2 seconds of complete stillness between phase transitions before the next color band lights
- After an escalation resolves: hold still for 1.5s before normal flow resumes
- After Delivery: 3 seconds of desaturation hold before the lifecycle chip appears
- After Fork ceremony: 2 seconds of empty space where the topology used to be before the Promoted ★ + click-through link materialize

"Still" means **eased-down to flat** — not `animation-play-state: paused` (which reads as a bug). Breathing pulses ease down to flat for the rest, then ease back in. The difference between "frozen" and "at rest" is real.

### Focus reticle (peak-complexity handling)

At peak density (Wave 1 + Wave 2 + escalation arc + Critic sweeps), the canvas has 25+ animated elements. "Glass-walled room" stops working past a certain density.

A **soft focus ring** drifts toward what matters, with a priority hierarchy:

1. Active escalations (red trails, always pull focus immediately)
2. Wave dispatches (signature moment, brief focus pull during the unison-pulse beat)
3. Single-role activity (default — follow whoever's doing something)
4. Multiple parallel activity (no focus pull — let the user choose where to look)

**Depth-of-field treatment:** non-focused elements dim to ~70% opacity. Focused area stays full saturation. Same principle as cinematic shallow DOF.

User can **pin focus by clicking** any node. Pin overrides priority. Click background to unpin.

### Failure register (distinct from escalation)

Red is reserved for "escalation in progress." When a build genuinely fails — verification doesn't pass, Critic rejection unresolved, builder times out — the visual register is different:

- **Muted ash-gray** instead of red
- **Small terminal mark** (▣ or ⬚) where the active-pulse would normally be
- **Somber, not alarming** — no flashing, no exclamation
- **Failed sections fade** rather than flash, so the failed branch reads as "didn't get there" rather than "error"

The dignity of the visualization depends on having a register for the bad ending. Auto Builder's corpus has 3 builds in `Phase 1 failed · user moved on` state today; their replay needs to be respectful, not alarming. (The streamdock failures and the latex CDN failure are real architectural data points worth studying, not events to dramatize.)

---

## The narrative chapter feed (right column)

A 15–20 minute build is too long to watch continuously. When the user looks back, they need to catch up fast.

**Vertical timeline on the right side of the canvas**, ~280px wide. Each entry is a named beat in plain language:

```
12:34:02  Discovery surfaced 5 inflection points
12:36:47  TD completed: 7 sections, 9 contracts
12:38:12  Wave 1 dispatched: 4 builders
12:42:18  Sev-2 escalation: contract data shape mismatch
12:43:01  ↳ Arbiter routed to TD impact-mode
12:43:55  ↳ Resolved: contract amended
12:47:30  Wave 2 dispatched: 3 builders
12:52:14  CV: Tier 2 first-contact passed
12:52:48  CV: PNV passed
12:53:11  Delivery — gto-poker-async-duel
```

Each beat is a **permalink** — click it and the diagram scrubs back to that moment (relies on the scrubber from v0.18 below; until then it just highlights the node responsible).

The chapter beats are **emitted by the agents themselves** (Discovery, TD, Coordinator, etc.) — same source as the chat-output-discipline narration. Single authoring point, two consumers: the chat shows the beats inline; the chapter feed shows them as a permalinked list.

---

## Signature moments (choreographed animations)

Five canonical moments deserve specific, signature animations rather than generic state changes:

### 1. Plan-expansion moment (Discovery → TD reveals the shape)
The graph noticeably grows. Researcher slots spawn-in with a 50ms stagger so it reads as a wave rather than a snap. Section bays slide in beneath TD. Contract edges form between dependent sections.

### 2. Wave dispatch (Coordinator → builders)
All builders in the wave pulse **simultaneously** for the first 1.2s. After that they pulse independently. The unison-then-individuation communicates "dispatched together; now working separately."

### 3. Escalation arc (Sev ≥ 2 routes through Arbiter)
Red trail from source role → Arbiter. Arbiter ignites briefly. Routed to TD-impact-mode or Discovery-amendment-mode, that role ignites briefly. Resolution trail returns. Whole sub-arc completes in <30s on screen even if real time is longer (speed it up if needed for visual impact). The red trail is distinct from normal dispatches.

### 4. Delivery moment (Phase 1 closes)
Brief desaturation of everything. Deliverable thumbnail (or the materialized center-of-canvas artifact) gets a "DELIVERED" stamp animating in. 3-second beat. Phase ladder ticks Delivery green. Lifecycle chip below the diagram flips to `Phase 1 ✓ · ready to ratify` (with the pulse + chevron from Codex v0.13).

### 5. Fork ceremony (Promoted ★)
When the user runs `ratify-build.bat` and workflow #2 fires, the topology **physically leaves** — slides right with a trail, fades out. 2-second empty beat. Then a `Promoted ★` star fades in where the topology was, with a label `→ mondrianaire/{slug}-AB` and a click-through link to the forked repo.

These five moments are what people screenshot and share. They're the visual record of the architecture firing correctly.

---

## Build-story export (research-bed payoff)

Each completed build automatically exports a self-contained "build story" document, saved at `runs/{slug}/build-story.html` (and optionally `.pdf` if a PDF writer is available).

**Contents:**

- The original prompt verbatim
- Phase-by-phase narration drawn from the chapter feed
- Five canonical-moment SVG snapshots (plan-expansion, wave dispatch, peak-of-build, delivery, fork ceremony — captured automatically as those animations fire)
- Escalation log (any Sev ≥ 2 events with their resolution)
- Final deliverable thumbnail or link
- Lifecycle outcome chip (Phase 1 ✓, Complete · awaiting fork, Promoted ★, etc.)
- Stats: dispatches, builders, sections, duration, total commits

**Why this matters:** Auto Builder is a research bed. Each build is a data point about multi-agent orchestration patterns. Today those data points live as scattered substrate files that nobody reads. The build-story export turns each completed build into a self-contained case study — shareable, archivable, study-able. A corpus-level index of build stories becomes the research artifact for anyone studying multi-agent orchestration.

**This is the move that converts ephemeral spectacle into permanent research record.** The dashboard is the live experience; build stories are the archive.

---

## What this proposal deliberately does NOT do

**No anthropomorphism.** Roles have icons, signature animations, and color identities — yes. The moment Editor "scratches its chin" or Critic "frowns," it stops being transparency and becomes performance. The work itself is the personality. The Editor's two-yellow-recommendation chip is more honest characterization than any anthropomorphic gesture would be.

**No gamification.** No badges, no points, no streaks, no "you've watched 10 builds" achievements. This is observed transparency, not engagement. The dramatic moments are the reward; nothing else is needed.

**No audio in v0.18 scope** (stretch dimension worth considering for v0.19+). Five signature sounds for the five signature moments, opt-in, off by default. The visual layer carries 95% of the experience; audio is final-polish craft. If we do it: organic sounds (soft chime, low hum, brief pulse), not synthesized UI blips.

---

## Persistence — resolving the chat/diagram relationship

The diagram needs a clear answer to "how does it sit alongside the chat during a build?"

**Decision: hybrid — persistent compact strip + on-demand depth.**

- **Always-on strip** (~80px tall, in the Cowork side panel): shows current phase, active role, single-line chapter-feed beat. Ambient awareness while the user works in the chat. Zero clicks required.
- **Signature moments cause the strip to briefly flash** (no focus steal, just a signal). User notices, can choose to expand.
- **Click the strip → expand to full diagram** in the side panel. From here, full visualization + chapter feed + everything.
- **Chat remains primary** — agent's reasoning lives there. The strip is the ambient layer; the full diagram is the deep-watch layer.

Three surfaces, each with a clear job:
1. Chat — agent reasoning (verbose, narrative)
2. Strip — ambient state (always-on, single-line)
3. Diagram — deep watch (on-demand, full topology + chapter feed + materializing deliverable)

None compete for the same attention.

---

## v1.11 dependency

The live-state overlay (v0.16 below) needs a small architecture amendment: each role writes `runs/{slug}/state/live/current-step.json` on entry/transition. One file, one line of content (per-role last-step). The aggregator reads these files; the live overlay polls.

Schema (proposed):

```json
{
  "role": "Researcher",
  "role_instance_id": "researcher-3",
  "step": "probing https://example.com/docs (3 of 7 IPs verified)",
  "started_at": "2026-05-16T12:38:47.123Z",
  "phase": "planning",
  "section_id": null,
  "ip_id": "IP3"
}
```

This is the only architecture amendment required for the live experience. The static-shape diagram (v0.15) works without it — it uses already-existing substrate.

**Filed separately as `state-live-current-step-proposal.md`** if you want a dedicated thread. Or fold into this proposal's ack if simpler. Codex's preference: separate, since it's an architecture amendment vs. this proposal's pure Codex work.

---

## Staged path (each ship gives standalone value)

| Version | Scope | LoC est. | Architecture dep. |
|---|---|---|---|
| **Codex v0.15** | Per-build dynamic SVG renderer: buildShape extractor + static (non-animated) layout with correct node counts, replaces architecture_diagram.svg as detail-panel view. Deliverable-in-center spatial commitment. Per-`deliverable_kind` materialization stubs. | ~800 | none (uses existing substrate) |
| **v1.11 architecture amendment** | `state/live/current-step.json` write protocol; one-paragraph addition per role charter. | ~30 (charter text) | enables v0.16 live overlay |
| **Codex v0.16** | Live overlay layer: polls substrate every 5s, applies state classes to nodes, plays state-change animations. Chapter feed (right column) populated from the per-role current-step files + commit subjects. Always-on strip + on-demand full-diagram. Silence beats. Focus reticle with priority logic + depth-of-field. | ~700 | depends on v1.11 |
| **Codex v0.17** | Five signature moments (plan-expansion, wave dispatch, escalation arc, delivery, fork ceremony) + failure register (distinct from escalation). Per-deliverable-kind materialization fully implemented. | ~500 | none |
| **Codex v0.18** | Scrubber + build-story export (HTML + optional PDF, automatic on Phase 1 close + on Promoted ★). Capture five-moment SVG snapshots automatically as they fire. Corpus-level build-story index page. | ~700 | none |
| **(deferred) Codex v0.19+** | Audio layer (opt-in, signature-moment cues only). Cross-build narrative comparison. Power-user mode (show raw substrate paths, role-attribution heat). | — | none |

**Total v0.15-v0.18: ~2700 lines of new JS + CSS** across four shippable increments. Each one delivers standalone value:

- v0.15 alone replaces the stale static SVG with a per-build dynamic one — already a meaningful upgrade
- v0.15 + v0.16 give the live-during-build experience
- v0.17 adds the choreographed drama
- v0.18 gives the research-bed artifact

## Open questions for Maintenance

1. **`state/live/current-step.json` write protocol — separate proposal or fold into this?** Codex prefers separate (architecture amendment vs. Codex implementation work). Either way, the schema in §"v1.11 dependency" above is the proposal.

2. **Per-deliverable-kind materialization scope.** Some kinds (web_app, cli) have intuitive visual treatments; others (data, other) are weaker. Should v0.15 ship all 7 kinds or just the 3-4 highest-frequency ones (web_app, plugin, cli) and defer the rest? Codex's preference: ship web_app + plugin in v0.15 (covers 100% of today's corpus); add cli + library in v0.16; document + data + other deferred until those kinds appear in the corpus.

3. **Build-story export format.** HTML is straightforward (single self-contained file). PDF requires either a Node-side library (puppeteer headless, ~50MB dependency) or a server. Codex's preference: HTML only for v0.18; PDF deferred to v0.19+ if there's demand.

4. **Scrubber for completed builds.** Requires per-frame state to be recoverable. Substrate captures phase boundaries but not every state transition. Either (a) the live overlay also writes periodic snapshots to enable scrubbing, or (b) scrubber granularity is "per phase boundary" (still useful, but coarser). Codex's preference: (b) for v0.18; (a) deferred.

5. **Cowork artifact integration mechanics.** The persistent strip lives in the Cowork side panel. Whether that requires a new Cowork API (e.g., `mcp__cowork__present_persistent_view`) or works via the existing artifact system needs verification. If Cowork artifacts can only be opened on-demand (not always-on), the strip approach may need rework.

## Maintenance Status

<!-- Edit checkboxes when you action items. Codex parses this block on its next aggregator run. -->

**Last touched:** 2026-05-16
**Overall state:** Maintenance ack-1 received; v0.15 unblocked. v1.11 architecture amendment to be filed separately by Maintenance (gates v0.16). Open questions 1-4 resolved; #5 (Cowork artifact mechanics) needs Codex empirical verification.

- [x] proposal-reviewed — *Maintenance ack 2026-05-16; design accepted in principle. Five open questions resolved as documented in Maintenance notes below. Five concerns/clarifications surfaced (none blocking; mostly refinement).*
- [x] state-live-current-step-protocol-decided — *separate v1.11 amendment per Codex's preference. Maintenance will file `architecture/state-live-current-step-amendment.md` (or equivalent under `codex/docs/maintenance-initiated/`) as its own thread. v0.15 proceeds without it; v0.16 gates on its landing.*
- [ ] codex-v0.15-shipped — *Codex-owned; per-build dynamic SVG renderer + deliverable-in-center spatial layout + web_app + plugin materialization*
- [ ] codex-v0.16-shipped — *Codex-owned; gated on v1.11 amendment landing first; live overlay + chapter feed + strip + silence beats + focus reticle*
- [ ] codex-v0.17-shipped — *Codex-owned; five signature moments + failure register + remaining per-kind materializations*
- [ ] codex-v0.18-shipped — *Codex-owned; scrubber + build-story export*

### Maintenance notes
2026-05-16: **Ack from Maintenance, design accepted in principle.** Codex did substantial design work; the proposal incorporates real refinement from the design skill and from the user's feedback. The five-signature-moments choreography, the failure-register-distinct-from-escalation, the silence-as-design-element, and the build-story export as research artifact are the strongest design choices. The deliberate "don't"s (no anthropomorphism, no gamification) are the right discipline — make the work itself the personality.

**Answers to the five open questions:**

**(1) `state/live/current-step.json` — separate proposal.** Agreed with Codex's preference. The file-schema amendment is architecture territory (Maintenance owns role_charters.md + file_schemas.md); the visualization is Codex territory. Filing separately keeps the threads independent: v0.15 (static-dynamic SVG using existing substrate) can ship without the amendment; v0.16 (live overlay) gates on its landing. Maintenance commits to filing the v1.11 amendment as its own proposal within the next session — schema above is accepted as the starting point.

**(2) Per-deliverable-kind materialization scope — web_app + plugin in v0.15, with generic fallback for everything else.** Agreed with Codex's preference *plus a defensive note*: v0.15 should also render a generic-rectangle/build-progress treatment for any unrecognized `deliverable_kind` value, NOT throw an error or refuse to render. That way cli/library/document/data builds that appear in the corpus before v0.16/v0.17 ships still get a usable (if minimal) visualization rather than a broken one. The "deferred until that kind appears" discipline is correct for *specific* treatments; the generic fallback ensures graceful degradation in the meantime.

**(3) Build-story export format — HTML only for v0.18.** Agreed with Codex's preference. PDF's headless-browser dependency (puppeteer ~50MB) is heavy for marginal benefit. HTML is self-contained, browser-portable, and any user who wants PDF can "Save as PDF" via the browser print dialog. Defer dedicated PDF generation unless there's a demonstrated need. One small ask: the HTML should be **truly self-contained** (inline all CSS, inline SVG snapshots as `<svg>` not `<img src>`) so the file is a single archivable artifact, not a directory of files. Same shape as the existing dashboard artifact style.

**(4) Scrubber granularity — per-phase boundary for v0.18.** Agreed with Codex's preference. Per-frame snapshots would inflate substrate for marginal value; per-phase scrubbing gives meaningful navigation. *One refinement:* the chapter-feed permalinks should still be per-beat (finer than phase-level), so clicking "12:42:18 Sev-2 escalation: contract data shape mismatch" highlights the specific node responsible even though the diagram can only scrub to phase boundaries. Two granularities serve two purposes — scrubber = phase-level; chapter permalinks = beat-level (the latter just highlights the responsible node in the current view rather than reconstructing past state).

**(5) Cowork artifact integration mechanics — needs Codex empirical verification.** This is the place Maintenance can't pre-verify; my understanding of the Cowork tool surface (`mcp__cowork__create_artifact`, `present_files`, `read_widget_context`, etc.) doesn't include an explicit "always-on side panel strip" primitive. Suggest Codex ships a minimal v0.15 with an artifact-mode strip and observes how Cowork actually renders it. Two acceptable outcomes:
- Artifact renders persistently in the sidebar → strip approach works as designed
- Artifact requires user expand → "strip" reframes as "always-present-in-sidebar-when-this-build-is-active, expand-on-click", which is still a meaningfully better surface than "open the diagram only when explicitly summoned"

If neither outcome works, fall back to a chat-side embedded representation (less ideal but still functional). Worth a small early-spike to derisk before v0.15 lands fully.

**Five additional refinements / concerns (none blocking):**

**(a) Three-category ontology alignment.** The live build visualization is fundamentally a **Cat-2 surface** (per the three-category ontology in build-lifecycle.md + file_schemas.md): it shows AutoBuilder's internal architecture in motion, in AutoBuilder's own vocabulary. The "fresh reader with zero AutoBuilder context" audience for Cat 1 won't necessarily want this view by default — they want PROJECT-OVERVIEW.md (the canonical Cat-1 wayfinding doc, still pending task #4). Suggest: the dashboard's information hierarchy positions the live visualization as Cat-2 detail (accessible via a "show internals" or "live build view" affordance from PROJECT-OVERVIEW.md or the dashboard's per-build detail panel), NOT as the at-a-glance default surface for fresh readers. Keep PROJECT-OVERVIEW.md as the Cat-1 entry point per the ratification-wrap-up architecture.

**(b) Phase-band vocabulary vs lifecycle-phase vocabulary.** The proposal's "Phase bands" (Kickoff → Planning → Build → Verification → Delivery → Ratification → Promoted) elegantly resolves the build-time-vs-lifecycle Phase collision I flagged in the previous concerns relay — by treating the whole timeline as one continuous progression of *phases of a build's life*. Good. Worth being explicit in the proposal that this is intentional: "Phase 1 / Phase 2" terminology in `build-lifecycle.md` refers to LIFECYCLE STATES (Initial Delivery vs In Limbo) and corresponds to the visualization's "Build → Verification → Delivery" cycle running once (Phase 1) or twice (Phase 1 → Phase 2 loops back through Build → Verification → Delivery after rectification). The visualization's "Ratification" and "Promoted" phase bands are the post-lifecycle events. One sentence clarifying this in the proposal text would prevent future confusion.

**(c) Global system view, separately.** Per-build visualizations show which roles fired in *that* build. But for a fresh reader encountering the project (Cat 1 audience landing on `architecture/`), there's still value in a *global* "Auto Builder — Full Role Architecture" canonical diagram showing the system in its abstract form. Suggest: the existing `architecture_diagram.{html,svg}` (or its successor) stays as the global system view, lives under `architecture/`, and gets updated to current canon (add Editor, remove pre-v1.10.1 Sev-4 user routing, add Demotion Mode). The per-build dynamic SVG (Codex v0.15) is a different surface — the *instantiation* of the global architecture for one specific build. Both exist; they answer different questions. Filing a separate small Maintenance task to update the global diagram is appropriate.

**(d) PROJECT-OVERVIEW.md links to the live visualization.** When task #4 ships PROJECT-OVERVIEW.md (the canonical Cat-1 wayfinding doc), one of its "where to go next" pointers should be the live build visualization for this build. Closes the loop: Cat 1 reader gets oriented → optionally clicks through to Cat 2 visualization to see how it was built. The link target needs to be predictable — suggest `codex/data/runs/{slug}.html` or similar standardized path that v0.15 commits to. Codex's call on the exact path; just flagging that PROJECT-OVERVIEW.md (in task #4) will need it.

**(e) Privacy / corpus visibility on build-story exports.** Build-story HTML contains the original prompt verbatim. If the corpus repo is ever made fully public (the auto-builder repo currently IS public), build-story exports inherit that visibility. Not a blocker — the prompt is already in `prompt.txt` which is also public — but worth being explicit that build-story visibility matches corpus visibility, and the user should review prompt content for sensitive info before promoting the corpus public-status if anything changes. Documenting this as a property of the export ("inherits corpus visibility") is enough.

**Bottom line:** v0.15 is unblocked; ship it. v1.11 amendment will follow from Maintenance side as its own filing. v0.16 starts gated on that landing. The proposal is a strong piece of design work and Maintenance has no fundamental objections — just the refinement/alignment notes above.

### Codex acks
2026-05-16: Filing this as a Codex-initiated proposal after substantial design dialogue with the user's dedicated design skill. The design skill's six refinement points (deliverable as protagonist, narrative chapter feed, silence as design element, focus reticle for peak complexity, failure register distinct from escalation, build-story export as research artifact) are integrated into the spec above. The two deliberate "don't"s (no anthropomorphism, no gamification) are recorded in §"What this proposal deliberately does NOT do".

The persistence question (chat vs. diagram) is resolved in §"Persistence" as the hybrid strip-plus-on-demand-depth approach.

The five open questions are genuine — they're places where Codex has a preference but Maintenance's call could reasonably differ. Particularly #5 (Cowork artifact integration mechanics) may force a design adjustment if Cowork artifacts can only be opened on-demand.

This is intentionally substantial — multi-version Codex work spanning several weeks of implementation. Not asking Maintenance to commit to all four versions; v0.15 alone is the first deliverable, with the rest staged on its evidence.
