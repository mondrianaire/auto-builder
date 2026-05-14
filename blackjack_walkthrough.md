# Auto Builder — End-to-End Walkthrough

**Scenario:** User submits the prompt *"build me a web app to play blackjack"*. This document traces every role activation, every file written, and every briefing passed, from prompt to delivered system. Pseudo-code style — actual code is omitted; data flow is what matters.

---

## Phase 0 — Prompt Arrives

**Orchestrator** receives:

```
"build me a web app to play blackjack"
```

Orchestrator's only job at kickoff: create the file substrate and dispatch Discovery. It does not interpret the prompt itself.

**Files initialized** (empty, with permission charters defined):

```
/decisions/discovery/         (writer: Discovery)
/decisions/technical-discovery/ (writer: TD)
/state/sections/              (writer: each section's Overseer)
/state/coordinator/           (writer: Coordinator)
/state/escalations/queue/     (writer: Overseers)
/state/escalations/routed/    (writer: Arbiter)
/contracts/                   (writer: TD)
/research/probes/             (writer: each probe's Researcher)
/history/log.jsonl            (writer: Historian)
/audit/flags.jsonl            (writer: Critic)
/output/                      (per-role subdirs)
```

**Orchestrator dispatches Discovery** with this briefing:

```json
{
  "role": "discovery",
  "phase": "initial",
  "prompt": "build me a web app to play blackjack",
  "context_pointers": [],
  "write_target": "/decisions/discovery/ledger-v1.json"
}
```

---

## Phase 1 — Discovery (initial)

Discovery walks the prompt, applies *simplest-within-reason* defaults, and identifies inflection points (places where simplicity ambiguates).

**Discovery's reasoning:**
- "web app" → browser-based, no native, no mobile app
- "to play blackjack" → standard rules unless told otherwise
- "for me" (implicit from singular framing) → single user, no auth, no multiplayer
- "to play" (no further context) → casual, no career mode, no statistics over time
- Prompt silent on: persistence, betting, chip system, visual style, animations

**Discovery writes `/decisions/discovery/ledger-v1.json`:**

```json
{
  "version": 1,
  "project": "blackjack web app",
  "restatement": "A web-based single-player blackjack game where one user plays against an automated dealer. No persistence between sessions, no real-money mechanics, no multiplayer.",
  "assumption_ledger": [
    { "id": "A1", "assumption": "single player", "confidence": "high", "rationale": "prompt's singular framing", "what_breaks_if_wrong": "entire architecture — would need backend, sessions, networking" },
    { "id": "A2", "assumption": "no auth", "confidence": "high", "rationale": "single user implies no account model", "what_breaks_if_wrong": "needs identity layer + session storage" },
    { "id": "A3", "assumption": "browser-only, no native app", "confidence": "high", "rationale": "'web app' explicit", "what_breaks_if_wrong": "platform target changes entirely" },
    { "id": "A4", "assumption": "no persistence between sessions", "confidence": "medium", "rationale": "prompt silent; simplest = stateless", "what_breaks_if_wrong": "needs storage layer (localStorage at minimum)" },
    { "id": "A5", "assumption": "standard blackjack rules", "confidence": "high", "rationale": "no rule variants mentioned", "what_breaks_if_wrong": "rules engine needs configuration" },
    { "id": "A6", "assumption": "desktop-first; mobile not required", "confidence": "low", "rationale": "prompt silent; modern web defaults to mobile-friendly but adds complexity", "what_breaks_if_wrong": "responsive layout work" }
  ],
  "inflection_points": [
    { "id": "IP1", "topic": "betting / chip system", "choices": ["no chips, just hand outcomes", "chip-based betting with bankroll"], "default_branch": "no chips", "importance": "medium", "why_inflection": "both interpretations of 'play blackjack' are simple; chips changes UI surface and game loop" },
    { "id": "IP2", "topic": "card visual style", "choices": ["CSS-only cards", "SVG card library", "image asset cards"], "default_branch": "CSS-only cards", "importance": "low", "why_inflection": "all are simple; visual taste matters but doesn't fork architecture" }
  ],
  "out_of_scope": [
    "multiplayer / online play",
    "real money or simulated currency systems beyond chips",
    "card counting trainer / strategy hints",
    "statistics across sessions",
    "themes or skins",
    "sound / audio",
    "accessibility beyond standard semantic HTML"
  ]
}
```

**Historian receives a state-change event** and appends to `/history/log.jsonl`:

```json
{ "ts": "2026-05-02T10:00:01Z", "actor": "Discovery", "action": "wrote ledger-v1", "rationale": "initial pass on prompt" }
```

Discovery returns to Orchestrator. Orchestrator dispatches TD next.

---

## Phase 2 — Technical Discovery (initial mode)

**TD's briefing:**

```json
{
  "role": "technical_discovery",
  "phase": "initial",
  "context_pointers": ["/decisions/discovery/ledger-v1.json"],
  "write_targets": [
    "/decisions/technical-discovery/sections-v1.json",
    "/contracts/"
  ]
}
```

**TD reads the ledger.** Walks each inflection point, decides whether it warrants research:

- **IP1 (betting / chips)** — importance medium. Default branch is "no chips." TD decides this needs *no research* because the default is defensible and doesn't fork the build catastrophically. Locks default.
- **IP2 (card visual style)** — importance low. Default is CSS-only. No research, lock default.

For this prompt, TD ends up with no research probes. (For a prompt like *"build me a fitness tracker that maps my runs"*, TD would dispatch Researchers for mapping libraries, geolocation strategies, etc.)

**TD identifies sections:**

```
section-1: game-rules-engine    — pure logic, no UI
section-2: dealer-ai            — strategy logic for the dealer
section-3: state-management     — game state machine, transitions
section-4: ui-rendering         — DOM layout, card rendering, interactions
section-5: edge-case-testing    — enumeration + execution
```

**TD writes `/decisions/technical-discovery/sections-v1.json`:**

```json
{
  "version": 1,
  "sections": [
    {
      "id": "section-1",
      "name": "game-rules-engine",
      "charter": "Pure JS module implementing standard blackjack rules: deck construction, shuffling, hand scoring (including ace handling), bust/blackjack detection. No UI, no state persistence.",
      "acceptance": "Given any sequence of hands, returns correct scores and outcomes per standard rules. Unit-testable in isolation.",
      "depends_on": []
    },
    {
      "id": "section-2",
      "name": "dealer-ai",
      "charter": "Implements dealer strategy: stand on 17+, hit on 16-. Returns next action given a dealer hand and visible player hand.",
      "acceptance": "Returns correct action for every possible dealer hand under standard rules.",
      "depends_on": ["section-1"]
    },
    {
      "id": "section-3",
      "name": "state-management",
      "charter": "Game state machine. States: idle, dealing, player-turn, dealer-turn, resolving, complete. Transitions driven by player action and rules engine output. Holds: deck, player hand, dealer hand, status.",
      "acceptance": "State transitions match game flow. Exposes a subscribe interface for UI.",
      "depends_on": ["section-1"]
    },
    {
      "id": "section-4",
      "name": "ui-rendering",
      "charter": "Single HTML page with CSS-styled card rendering and player action buttons (hit, stand, deal). Subscribes to state-management for updates.",
      "acceptance": "Visually renders the game state correctly; buttons dispatch correct actions; dealer cards reveal at the right moment.",
      "depends_on": ["section-3"]
    },
    {
      "id": "section-5",
      "name": "edge-case-testing",
      "charter": "Enumerate edge cases (split-aces, multiple aces, blackjack on deal, dealer-blackjack, push, bust). Execute against integrated system at convergence.",
      "acceptance": "All enumerated cases produce expected outcomes when run against final system.",
      "depends_on": ["section-1", "section-2", "section-3", "section-4"]
    }
  ]
}
```

**TD writes interface contracts to `/contracts/`:**

`/contracts/section-1--section-3.json`:
```json
{
  "from": "game-rules-engine",
  "to": "state-management",
  "interface": {
    "scoreHand(cards) -> { value: int, isBlackjack: bool, isBust: bool, soft: bool }",
    "shuffle(deck) -> deck",
    "dealCard(deck) -> { card, remainingDeck }"
  }
}
```

`/contracts/section-3--section-4.json`:
```json
{
  "from": "state-management",
  "to": "ui-rendering",
  "interface": {
    "subscribe(callback) -> unsubscribe",
    "currentState() -> { status, playerHand, dealerHand, dealerVisible }",
    "dispatch(action) -> void  // actions: 'deal', 'hit', 'stand'"
  }
}
```

(Other contracts omitted for brevity.)

**TD returns. Orchestrator now boots long-running roles.**

---

## Phase 3 — Long-Running Roles Boot

Orchestrator dispatches Coordinator, Critic, Arbiter, Historian. Each receives a charter pointing at the schemas and permission boundaries.

**Coordinator's first action:** read `sections-v1.json` and build the DAG.

**Coordinator writes `/state/coordinator/dag.json`:**

```json
{
  "nodes": ["section-1", "section-2", "section-3", "section-4", "section-5"],
  "edges": [
    { "from": "section-1", "to": "section-2" },
    { "from": "section-1", "to": "section-3" },
    { "from": "section-3", "to": "section-4" },
    { "from": "section-1", "to": "section-5" },
    { "from": "section-2", "to": "section-5" },
    { "from": "section-3", "to": "section-5" },
    { "from": "section-4", "to": "section-5" }
  ],
  "waves": [
    { "wave": 1, "sections": ["section-1", "section-5-enumeration"] },
    { "wave": 2, "sections": ["section-2", "section-3"] },
    { "wave": 3, "sections": ["section-4"] },
    { "wave": 4, "sections": ["section-5-execution"] }
  ]
}
```

(Note: Coordinator special-cased section-5 into two phases — enumeration can run early in parallel with section-1; execution waits for everything.)

---

## Phase 4 — Wave 1: game-rules-engine + edge-case enumeration

**Coordinator dispatches Overseer for section-1** with this briefing:

```json
{
  "role": "overseer",
  "section_id": "section-1",
  "context_pointers": [
    "/decisions/technical-discovery/sections-v1.json",
    "/contracts/section-1--section-3.json",
    "/contracts/section-1--section-2.json"
  ],
  "write_targets": [
    "/state/sections/section-1.json",
    "/state/escalations/queue/",
    "/output/builders/section-1/"
  ]
}
```

**Overseer for game-rules-engine reads charter, decomposes into builders:**

```
builder-1a: deck construction + shuffle
builder-1b: hand scoring (including ace handling)
builder-1c: deal mechanics
```

Overseer writes `/state/sections/section-1.json`:

```json
{
  "section_id": "section-1",
  "status": "active",
  "owner": "overseer-1",
  "sub_goals": [
    { "id": "1a", "description": "deck + shuffle", "status": "in_progress", "builder": "builder-1a", "output": null },
    { "id": "1b", "description": "hand scoring", "status": "in_progress", "builder": "builder-1b", "output": null },
    { "id": "1c", "description": "deal mechanics", "status": "in_progress", "builder": "builder-1c", "output": null }
  ]
}
```

**Overseer dispatches three Builders in parallel.** Each Builder gets a tight briefing:

```json
{
  "role": "builder",
  "task_id": "1b",
  "task": "Implement scoreHand(cards) per /contracts/section-1--section-3.json. Cards are {rank, suit}. Aces count as 11 unless that busts the hand, then 1. Return { value, isBlackjack, isBust, soft }.",
  "context_pointers": ["/contracts/section-1--section-3.json"],
  "write_target": "/output/builders/section-1/builder-1b/scoring.js",
  "cancellation_check": "/state/coordinator/cancellations.json"
}
```

**Builders complete, write outputs.** Overseer verifies each against the contract:

```json
{
  "section_id": "section-1",
  "status": "verified",
  "owner": "overseer-1",
  "sub_goals": [
    { "id": "1a", "status": "verified", "output": "/output/builders/section-1/builder-1a/deck.js" },
    { "id": "1b", "status": "verified", "output": "/output/builders/section-1/builder-1b/scoring.js" },
    { "id": "1c", "status": "verified", "output": "/output/builders/section-1/builder-1c/deal.js" }
  ]
}
```

**Coordinator polls section state**, sees section-1 verified, **unblocks wave 2** (sections 2 and 3).

Meanwhile, Overseer for section-5-enumeration has been working in parallel, producing `/output/builders/section-5-enumeration/edge-cases.json`:

```json
{
  "cases": [
    { "id": "EC1", "scenario": "player blackjack on deal" },
    { "id": "EC2", "scenario": "dealer blackjack on deal" },
    { "id": "EC3", "scenario": "both blackjack (push)" },
    { "id": "EC4", "scenario": "player splits aces" },
    { "id": "EC5", "scenario": "soft 17 dealer behavior" },
    { "id": "EC6", "scenario": "player bust" },
    { "id": "EC7", "scenario": "dealer bust" },
    { "id": "EC8", "scenario": "five-card charlie (if rule active)" }
  ]
}
```

**Critic wakes (scheduled tick), audits.** Sees both wave-1 sections marked verified, flags nothing. Appends to `/audit/flags.jsonl`: `{ ts, actor: "Critic", action: "audit pass", flagged: 0 }`.

---

## Phase 5 — Wave 2: dealer-ai + state-management

Coordinator dispatches Overseers for sections 2 and 3 in parallel. Each goes through the same decompose→dispatch→verify cycle. Builders complete; Overseers verify; Coordinator unblocks wave 3.

(Skipping the routine details — same shape as Phase 4.)

---

## Phase 6 — Wave 3: ui-rendering, AND an escalation

**Coordinator dispatches Overseer for section-4 (ui-rendering).**

Overseer decomposes:
```
builder-4a: HTML structure + CSS card styling
builder-4b: action buttons + event wiring
builder-4c: state subscription + render loop
```

Builders dispatch in parallel.

**Builder-4c hits a problem.** It's wiring up the subscription to state-management (per the contract), but discovers the contract specifies `currentState() -> { status, playerHand, dealerHand, dealerVisible }` — and "dealerVisible" is a single boolean. But blackjack rules need to reveal the dealer's *hole card* specifically, while the up-card is always visible. The contract's boolean is too coarse.

Builder-4c reports this to Overseer-4 in its output: `{ status: "blocked", reason: "contract-incompatibility-with-rendering-requirement" }`.

**Overseer-4 evaluates:** this isn't a bug in builder-4c, and it isn't fixable within section-4's scope (the contract belongs to TD, the data shape belongs to section-3). It's a cross-section interface issue.

**Overseer-4 writes an escalation** to `/state/escalations/queue/esc-001.json`:

```json
{
  "id": "esc-001",
  "from": "overseer-4",
  "section": "section-4",
  "severity_estimate": "cross-section",
  "summary": "Contract /contracts/section-3--section-4.json specifies dealerVisible as a single boolean, but rendering needs to distinguish hole-card-hidden vs. hole-card-revealed states. Cannot resolve within section-4.",
  "blocked_work": ["builder-4c"],
  "evidence": {
    "contract_pointer": "/contracts/section-3--section-4.json",
    "render_requirement": "must show one card face-down during dealing/player-turn, then flip face-up during dealer-turn"
  }
}
```

**Arbiter wakes** (event-driven on `/state/escalations/queue/` write).

Arbiter classifies: *cross-section* (severity 2). Doesn't need Discovery — assumption ledger is intact. Just needs research + TD impact analysis.

**Arbiter dispatches a Researcher** with escalation-mode briefing:

```json
{
  "role": "researcher",
  "phase": "escalation",
  "probe_id": "probe-esc-001",
  "question": "Find approaches to representing dealer card visibility that distinguish hole-card-hidden from hole-card-revealed, while minimizing changes to the existing contract and state-management implementation.",
  "context_pointers": [
    "/contracts/section-3--section-4.json",
    "/state/sections/section-3.json",
    "/state/sections/section-4.json",
    "/state/escalations/queue/esc-001.json",
    "/output/builders/section-3/builder-3a/state-machine.js"
  ],
  "constraints": ["preserve existing state machine transitions", "no new dependencies"],
  "optimization_criterion": "blast_radius_minimization",
  "preserve_sections": ["section-1", "section-2", "section-3"],
  "questioning_authority": true,
  "budget_minutes": 5
}
```

**Researcher returns findings** at `/research/probes/probe-esc-001/findings.json`:

```json
{
  "probe_id": "probe-esc-001",
  "options": [
    {
      "id": "opt-A",
      "summary": "Replace dealerVisible boolean with dealerHand structure including per-card visibility flags",
      "impact": {
        "section-3": "salvageable — small change to state shape and currentState() output",
        "section-4": "no change to in-progress builders; clean to wire",
        "contract": "amended"
      },
      "tradeoffs": "cleanest semantically; requires re-running builder-3 verification"
    },
    {
      "id": "opt-B",
      "summary": "Add a separate revealHoleCard() method to state-management; UI uses absence of reveal as 'hide hole card' signal",
      "impact": {
        "section-3": "salvageable — append-only API addition",
        "section-4": "no change",
        "contract": "additive amendment"
      },
      "tradeoffs": "smaller change but couples UI to method-call semantics; 'absence' reasoning is fragile"
    },
    {
      "id": "opt-C",
      "summary": "Compute hole-card visibility entirely in UI layer based on game status",
      "impact": {
        "section-3": "no change",
        "section-4": "builder-4c does extra logic; couples UI to game-status semantics",
        "contract": "no change"
      },
      "tradeoffs": "zero impact on section-3 but spreads game-rule logic into UI layer (anti-pattern)"
    }
  ],
  "recommended": "opt-A",
  "rationale": "Cleanest separation of concerns; salvage cost is small (one builder re-run); avoids UI taking on game-state interpretation that belongs in the state layer."
}
```

**Arbiter routes findings to TD-impact-mode** with this briefing:

```json
{
  "role": "technical_discovery",
  "phase": "impact_analysis",
  "trigger": "esc-001",
  "context_pointers": [
    "/research/probes/probe-esc-001/findings.json",
    "/state/sections/section-3.json",
    "/state/sections/section-4.json",
    "/state/coordinator/dag.json"
  ],
  "write_target": "/decisions/technical-discovery/impact-analysis-v2.json"
}
```

**TD-impact-mode writes:**

```json
{
  "version": 2,
  "trigger_escalation": "esc-001",
  "chosen_option": "opt-A",
  "delta_plan": {
    "section-1": "unaffected",
    "section-2": "unaffected",
    "section-3": "salvageable — Overseer re-dispatch builder-3a (state-machine) with amended currentState() shape; other builders in section-3 unaffected",
    "section-4": "salvageable — pause builder-4c only; resume after section-3 update; builder-4a and builder-4b unaffected",
    "section-5-enumeration": "unaffected",
    "section-5-execution": "unaffected (still gated on convergence)"
  },
  "contract_amendments": [
    {
      "file": "/contracts/section-3--section-4.json",
      "change": "currentState() returns { status, playerHand, dealerHand: [{ card, visible }], status }"
    }
  ]
}
```

**Coordinator reads the delta plan, enacts it:**

1. Pauses builder-4c (writes a cancellation flag at `/state/coordinator/cancellations.json` for that builder ID).
2. Updates `/contracts/section-3--section-4.json` per TD's amendment (TD writes the amended contract; Coordinator just orchestrates).
3. Re-dispatches Overseer-3 with a re-run charter for builder-3a only. Overseer-3 re-dispatches builder-3a, verifies, updates section state.
4. Resumes section-4 by re-dispatching builder-4c with the new contract.

Builder-4c re-runs with the amended contract, completes successfully. Overseer-4 verifies the section.

**Throughout the escalation:** Historian appended an entry for every state-changing action — the escalation creation, the research dispatch, the research findings, the impact analysis, the contract amendment, the cancellations, the re-dispatches. The full causal chain is in `/history/log.jsonl`.

The user saw none of this.

---

## Phase 7 — Wave 4: edge-case execution

Coordinator dispatches Overseer for section-5-execution. Overseer reads the enumerated cases, dispatches builders to run each case against the integrated system (which exists at this point as the union of all section outputs). Builders return pass/fail per case. Overseer verifies all pass.

If any failed: would escalate to Arbiter as a cross-section issue → research → TD impact analysis. (Doesn't happen in this scenario — the rules engine is correct.)

---

## Phase 8 — Convergence

Coordinator sees all sections marked verified. Dispatches Integrator.

**Integrator's briefing:**

```json
{
  "role": "integrator",
  "context_pointers": [
    "/decisions/technical-discovery/sections-v1.json",
    "/contracts/",
    "/output/builders/"
  ],
  "write_target": "/output/integration/"
}
```

**Integrator stitches:** wires the modules together into a single `index.html` + `app.js` + `styles.css`. Writes glue code that imports each section's output. Resolves a couple of small import-path issues (the kind of seam work no Overseer would have caught).

Writes `/output/integration/blackjack/{index.html, app.js, styles.css}`.

**Integrator dispatches Convergence Verifier.**

**CV's briefing:**

```json
{
  "role": "convergence_verifier",
  "context_pointers": [
    "/decisions/discovery/ledger-v1.json",
    "/output/integration/blackjack/"
  ],
  "write_target": "/output/verification/"
}
```

CV reads the *original* ledger (v1) — the user's stated goals. Walks each assumption and verifies the integrated system honors it:

- A1 (single player) → ✓ no multiplayer code
- A2 (no auth) → ✓ no login screen
- A3 (browser-only) → ✓ runs in browser
- A4 (no persistence) → ✓ no localStorage usage
- A5 (standard rules) → ✓ rules engine confirmed by section-5 tests
- A6 (desktop-first) → ✓ no responsive media queries; flagged as "honored, but trivial to extend"

CV writes `/output/verification/report.json`:

```json
{
  "verdict": "pass",
  "checks": [...as above...],
  "summary": "Integrated system delivers a working single-player blackjack web app per the original product spec. Out-of-scope items confirmed absent. Ready for delivery."
}
```

---

## Phase 9 — Delivery

CV's pass triggers Orchestrator's final action. Orchestrator copies `/output/integration/blackjack/` to `/output/final/`, plus the verification report and a one-paragraph summary.

**Orchestrator returns to user:**

> Built a single-player blackjack web app per your prompt. Open `index.html` in a browser to play. Standard rules, no chips/betting, no persistence between sessions. If you want to extend (mobile-friendly layout, betting system, multiplayer), let me know — I've kept notes on what would need to change.

Behind the scenes: **Historian writes the decision log to project memory** so any future re-build, extension, or amendment of this project can read why each choice was made.

---

## Cast Recap — Who Did What

| Role | Activations | Files Written |
|---|---|---|
| Orchestrator | Once at start, once at end | `/output/final/` |
| Discovery | Once (initial) | `ledger-v1.json` |
| Technical Discovery | Twice (initial, then impact-analysis on esc-001) | `sections-v1.json`, `contracts/*`, `impact-analysis-v2.json` |
| Coordinator | Continuous | `dag.json`, dispatch logs, cancellation flags |
| Critic | Scheduled ticks throughout | `/audit/flags.jsonl` (one entry per tick) |
| Arbiter | Once (esc-001 routing) | `/state/escalations/routed/esc-001.json` |
| Historian | Subscriber to every state change | `/history/log.jsonl` (~30 entries by end) |
| Researcher | Once (escalation-mode for esc-001) | `/research/probes/probe-esc-001/findings.json` |
| Overseer | 6 (one per section, plus extras for the section-5 split + section-3 re-run) | `/state/sections/*.json` |
| Builder | ~12 (3 per section average) | `/output/builders/{section}/{builder}/` |
| Integrator | Once at convergence | `/output/integration/` |
| Convergence Verifier | Once at convergence | `/output/verification/report.json` |

---

## What This Walkthrough Surfaced

A few things that became clearer by tracing the flow:

**The escalation cycle is the most architecturally interesting part.** Phase 6 — esc-001 from contract incompatibility through research to TD-impact to Coordinator-enacts — is the part that justifies the whole twelve-role model. A simpler architecture would have either failed silently here (contract bug undiscovered until integration failure) or required user involvement. This system caught it inside section-4, researched alternatives, picked the minimum-impact one, and resumed — without surfacing.

**The Critic's role was light in this scenario.** That's normal — Critic is insurance against the cases the Overseers don't catch on their own. In a smoother build, Critic logs a bunch of clean-pass entries. In a build going off the rails, Critic is the early-warning system. Worth not eliding it just because it didn't have much to do this time.

**Builder-4c's escalation needed a contract change AND a salvage of in-progress work.** TD-impact-mode's salvage classification (build-3a re-run, builders 4a/4b unaffected, builder-4c paused-then-resumed) is the exact decision-fidelity that justifies the role split. A simpler model would have either redone too much work (scrap-and-restart) or too little (silently amend the contract and hope downstream consumers cope).

**Discovery never re-ran in this scenario.** The escalation didn't shake any assumption. If the same project had hit "we need to persist game history" mid-build, Discovery would have re-run with the new evidence, walked the ledger entry-by-entry, and amended A4 (no persistence). Then TD would have seen a Discovery diff and triggered a much larger impact analysis. The fact that Discovery *didn't* re-run is itself information — it tells us the build stayed within the original product hypothesis.

**The Researcher-questioning-authority flag wasn't exercised.** The escalation question was well-formed; no need to push back on framing. In a different scenario — say, an escalation that misdiagnoses a symptom as a different problem — the Researcher would have flagged "the framing of this question may be wrong because the actual issue is X." Worth keeping the mechanism even though it didn't fire here.

**Open questions surfaced by this walkthrough:**
- Builder cancellation in Phase 6: the Coordinator wrote a cancellation flag, but how does the Builder *check* for it? Polling? Cooperative-cancellation needs a concrete mechanism. (Already in open-questions memory as #3.)
- The contract amendment in Phase 6: TD wrote an amended `section-3--section-4.json`. But the file was supposed to be versioned-by-file (per the substrate rules). Should it have been `section-3--section-4-v2.json` instead? Probably yes — preserves history. Worth firming up the versioning rule.
- The DAG showed section-5 split into "enumeration" and "execution" sub-phases. That's a Coordinator-level decomposition not present in TD's section list. Either the DAG should support sub-phases natively, or this kind of phased section should be modeled differently in TD's output.
