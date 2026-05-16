# Build Lifecycle — Phases, Completion, and the Fork Ceremony

**Settled 2026-05-15.** Defines the two phases a build moves through inside AutoBuilder, the completion criteria that closes the loop, and the mandatory fork-and-archive handoff that separates AutoBuilder from post-build product life.

This document is the architectural boundary between **AutoBuilder as a build factory** (the corpus this repo measures) and **the build as an evolving product** (which lives in its own standalone repo after completion). Mixing the two would contaminate the corpus.

---

## Phase 1 — Initial Delivery

The artifact AutoBuilder returns from the original user prompt, after the full Discovery → Technical Discovery → Coordinator → Builders → Integrator → Convergence Verifier pipeline has run end-to-end.

**Git anchor.** Phase 1 ends with a single primary-delivery commit tagged `delivery/{slug}`, produced by `commit-build.bat`. This tag is the canonical "AutoBuilder shipped" marker — it is the rev-0 anchor in the Codex `revisions[]` lineage and the source-of-truth for every downstream measurement (first-delivery outcome, principle compliance, role attribution, corpus statistics).

**Phase 1 closes immediately when the artifact is functional + deployable + satisfies AutoBuilder's interpretation of the prompt.** This branch is then complete and *never appended to*. Any further work on this build either moves to Phase 2 (if the deliverable is broken) or to a separate forked repo (if the deliverable works and the user wants to evolve it as a product).

### The Discovery-misalignment carve-out

A subtle but load-bearing case: AutoBuilder's *interpretation* of the prompt may diverge from the user's *actual* want, even after the artifact passes Convergence Verification and the user can install + access it. The build literally works; it just doesn't do what the user wanted.

This case is still Phase 1 complete. The architecture's contract is "build what I understood" — it cannot be held to "build what the user really wanted" without an oracle. The misalignment is a Discovery / Technical Discovery failure mode, documented in the wrap-up phase as a gap entry, and fed into the architecture-amendment loop (e.g., the v1.9 Principles E/F/G/H — atomic lexical anchors, external authority discipline, deliverability tier discipline, verification independence — were added precisely to make this case rarer).

**Critically: Discovery misalignment does NOT trigger Phase 2.** Phase 2 is for artifacts that don't work, not for artifacts that work but missed the user's true intent. Conflating the two would mean Phase 2 becomes a feature-request channel, which contaminates the corpus measurement of "did AutoBuilder satisfy its own contract."

### Phase 1 closure outcomes

The dimension that captures Phase 1 closure is `first_delivery_outcome` (see Codex schema). Values:

- `succeeded` — Phase 1 closed cleanly; artifact works and the user can access it on first contact
- `succeeded_with_concerns` — Phase 1 closed but with documented gaps (severity-high concerns recorded in wrap-up)
- `failed_user_reprompted` — Phase 1 closed broken; entered Phase 2; eventually rectified
- `failed_unrecoverable` — Phase 1 closed broken; entered Phase 2; rectification abandoned
- `unverified` — outcome unknown (legacy state; v0.6 curation pass closed all 10 historical builds out of this state)

**The cardinal rule:** Phase 2 rectification commits and any post-fork product work *can never* change Phase 1's `first_delivery_outcome`. A successful rectification doesn't make the original failure-to-deliver go away. The user's first prompt either produced something working, or it didn't — that's the axis the corpus measures.

---

## Phase 2 — In Limbo

The artifact was returned as deployable but is actually broken: unusable, not implementable, or fails to satisfy AutoBuilder's own understood requirements. The user surfaces this by reporting they cannot follow the install instructions or cannot access the deliverable.

**Git anchor.** Phase 2 work is committed as `[step:{slug}:rev-N]` and tagged `delivery/{slug}/rev-N` via `commit-step.bat`. The original `delivery/{slug}` tag stays pinned to the Phase 1 commit and is never moved. The Codex `revisions[]` schema represents these as `additional_step` entries, distinct from the rev-0 `primary_run`.

### Phase 2 is strictly rectification

Every Phase 2 commit chases one of the three completion gates (see below). Feature work, polish, optimization, "wouldn't it be nice if…" — all of that is **forbidden** during Phase 2. The boundary is enforced by the orchestrator's wrap-up phase verifying the commit message stays in the `[step:...]` namespace and the rectification rationale references one of the three gates.

Why this boundary matters: if Phase 2 accepts feature work, it becomes a slow-rolling product-development channel inside the corpus. The architecture loses the ability to measure "did we deliver from first prompt" because every build's lineage eventually accumulates features the user came up with later. The corpus needs Phase 2 to be a finite, scoped rectification arc, not an open-ended improvement channel.

---

## The Three Completion Gates

A build is COMPLETE when all three gates are green:

1. **Instructions** — install and build instructions in the deliverable are clear, accurate, and followable. *User-ratified.*
2. **Access** — the user can access all required aspects of the deliverable as defined by Discovery's ledger. *User-ratified.*
3. **Verification** — all built-in wrap-up checks pass (CV's tier-1 PNV, tier-2 first-contact, tier-3 sub-goal; Critic's scope-and-charter compliance; the six required delivery artifacts present). *AutoBuilder-asserted via Convergence Verifier.*

### How ratification works

Verification (gate 3) is asserted automatically by Convergence Verifier in the wrap-up phase. Its result lives in `runs/{slug}/output/verification/report.json` with `passed: true | false`.

Instructions and Access (gates 1 and 2) require the user's explicit confirmation. The confirmation is the act: "I can follow the install instructions, and I can access the deliverable." The user does NOT need to confirm that the deliverable matches their wishes — only that they can install and access it. (Misalignment between AutoBuilder's interpretation and the user's wishes is the Phase 1 documented-gap case, handled separately.)

The ratification mechanism is currently TBD in implementation. Likely shape: a Codex dashboard button per build that writes `runs/{slug}/completion-ratified.json` with `{ ratified_at, instructions_followable: true, access_confirmed: true }`. The fork ceremony is gated on this file existing AND `verification/report.json#passed === true`.

---

## The Fork-and-Archive Ceremony

When all three gates are green, the build is COMPLETE. **At this instant, no further work on this build happens in the AutoBuilder repo.** The handoff fires:

1. **Fork.** The build is promoted to its own GitHub repository at `mondrianaire/{slug}-AB` (the `-AB` suffix marks AutoBuilder heritage). Implemented by `promote-build.bat` at the project root and the `.github/workflows/completion-triggered-fork.yml` Action. The mechanism: `git filter-repo --path runs/{slug}/output/final/ --path-rename runs/{slug}/output/final/:` extracts **only the production deliverable** (the contents of `output/final/`) and pushes them to the new GitHub repo, with an auto-generated `README.md` at the root containing the original prompt, build provenance fields (verdict, ratified-by, ratified-at, architecture version, wall-clock minutes), and a link back to the AutoBuilder corpus entry for full build context. The new repo's root *is* the build's deliverable — not the corpus metadata. The build substrate (audit, decisions, history, state, contracts, research, run-report, root-cause-analysis) stays in the AutoBuilder corpus and is not duplicated in the standalone repo.

2. **AutoBuilder repo unchanged.** `runs/{slug}/` stays here, frozen at the completion commit, as the architectural artifact / corpus entry. Codex's dashboard records the promotion (a `promoted_to: "https://github.com/mondrianaire/{slug}-AB"` field in the build's curation overlay) and surfaces a promotion badge on the build's roster card.

3. **Cowork chat archived.** The conversation that drove the build is closed. *Mechanism TBD — requires Cowork product-side work to support automatic archival on completion event.*

4. **Claude Code chat opened.** A new Claude Code session is opened, scoped to the standalone `mondrianaire/{slug}-AB` repo, dedicated to the build's post-completion product life: feature additions, bug fixes that surface in real-world use, dependency upgrades, etc. *Mechanism TBD — requires Cowork/CC integration.*

### Why this separation is non-negotiable

The corpus this repo measures is "AutoBuilder's ability to deliver from a first prompt." If completed builds keep accumulating feature commits in `runs/{slug}/`, the corpus becomes:
- **Statistically muddy** — every build's lineage eventually has 50 commits, only 1 of which was the actual Phase 1 delivery
- **Architecturally muddy** — Phase 2's rectification boundary blurs into ongoing product work
- **Re-audit muddy** — the v1.6+ re-audit reclassification mechanism can't distinguish "the original build was unprincipled" from "the build accumulated 6 months of post-completion feature work that drifted"

The fork is what keeps the corpus measurable. A completed build's `runs/{slug}/` directory is a museum exhibit: this is what AutoBuilder produced, in this state, at this architecture version. Anything after that lives somewhere else.

---

## State Machine Summary

```
              ┌──────────────────────────┐
              │  Initial Prompt          │
              │  (Orchestrator entry)    │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │  Phase 1 build pipeline  │
              │  Discovery → TD → ...    │
              │  → Integrator → CV       │
              └────────────┬─────────────┘
                           │
                  commit-build.bat
                  tag delivery/{slug}
                           │
                           ▼
              ┌──────────────────────────┐
              │  Phase 1 delivered       │
              │  Awaiting user contact   │
              └────────────┬─────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │ (works + access) │ (broken)         │
        ▼                  │                  ▼
┌────────────────┐         │       ┌────────────────────┐
│ Awaiting       │         │       │  Phase 2: In Limbo │
│ ratification   │◄────────┼───────┤  Rectification     │
└───────┬────────┘         │       │  commits +         │
        │                  │       │  delivery/{slug}/  │
        │ user confirms    │       │  rev-N tags        │
        │ gates 1 & 2      │       └─────────┬──────────┘
        ▼                  │                 │
┌────────────────┐         │                 │
│  COMPLETE      │◄────────┴─────────────────┘
└───────┬────────┘
        │
        ▼
┌──────────────────────────┐
│  Fork ceremony           │
│  - promote-build.bat     │
│  - mondrianaire/{slug}-AB│
│  - Cowork archive        │
│  - Claude Code opens     │
└──────────────────────────┘
```

---

## How This Maps to Existing Infrastructure

| Concept                | Implementation                                              |
|------------------------|-------------------------------------------------------------|
| Phase 1 commit         | `commit-build.bat` (project root)                           |
| Phase 1 git anchor     | `delivery/{slug}` annotated tag                             |
| Phase 1 outcome        | `runs/{slug}.json#first_delivery.outcome` (Codex schema)    |
| Phase 2 commit         | `commit-step.bat` (project root)                            |
| Phase 2 git anchors    | `delivery/{slug}/rev-N` annotated tags                      |
| Phase 2 lineage view   | `runs/{slug}.json#revisions[]` (Codex schema)               |
| Verification (gate 3)  | `runs/{slug}/output/verification/report.json#passed`        |
| Instructions (gate 1)  | TBD — `completion-ratified.json#instructions_followable`    |
| Access (gate 2)        | TBD — `completion-ratified.json#access_confirmed`           |
| Fork ceremony          | `promote-build.bat` (currently in `scripts/draft/`)         |
| Post-fork product life | Standalone `mondrianaire/{slug}-AB` repo + Claude Code chat |

---

## Still Open — Implementation Gaps

1. **Ratification UI.** Codex dashboard needs a "Mark Complete" affordance per build that writes `completion-ratified.json`. Currently the ratification is verbal / out-of-band. Tracked in the maintenance-initiated proposals queue.

2. **Discovery-misalignment data model.** Pre-v1.10 builds carry this case via `re_audit_reclassified_verdict: fail` even when `first_delivery_outcome: succeeded` — three of the ten historical builds show this divergence. Post-v1.10 the case is expected to be rare due to Principles E/F/G/H. The exact schema for surfacing the divergence at corpus level is TBD; candidates discussed in `codex/docs/maintenance-initiated/first-delivery-outcome-viz-proposal.md`.

3. **Promote-build.bat polish.** Currently in `scripts/draft/`. Needs:
   - Username fix (hardcoded `Jett`, should be `mondrianaire`)
   - Default new-repo name suggestion changed from `{slug}` to `{slug}-AB` per the AutoBuilder-heritage convention
   - End-to-end test pass on a real completion event before graduating to project root

4. **Cowork archive + Claude Code handoff.** Product-side tooling required; not pure-git work. Document the requirement; implementation deferred until first real fork event.
