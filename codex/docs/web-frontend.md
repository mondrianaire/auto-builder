# Deferred #1 — Web frontend for prompt input

The first deferred Codex roadmap item: a web UI where the user types a build
prompt, hits go, and watches the system run. Promoted here as a real
deliverable so the design conversations have a place to live.

This document is a stub and a holding pen for design notes — not a spec.

## Why this is deferred (not v0.1)

The aggregator + dashboard pattern in v0.1 is a snapshot view of work already
completed. Spawning Claude sub-agents from a web UI is a different
problem class: it requires a server process, a queue, a way to hand off
to the Agent tool (or its API equivalent), and a way to stream phase
transitions back to the browser. None of those exist yet in this project,
and the architecture v1.x amendments have correctly prioritized the build
pipeline itself over the user-facing entry to it.

When v0.5 (Chart.js + live monitor) and v0.6 (tail-based live dispatch view)
ship, the Codex will have the observability primitives needed for this
deliverable to dock onto cleanly.

## Sketch of the eventual shape

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Auto Builder — Codex                              [build] [history]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Build prompt:                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Build me a ___________________________________________________    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                          [ run with arch v1.9 ▾ ] [go] │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Active run: pomodoro-timer (started 14:23 UTC)                         │
│                                                                         │
│  ◉ Discovery        12 assumptions, 2 IPs, 4 proper nouns               │
│  ◉ Editor           pass_with_recommendations · 1 iter                  │
│  ● TD (running)     3/5 sections charted...                             │
│  ○ Coordinator                                                          │
│  ○ Integrator                                                           │
│  ○ CV                                                                   │
│                                                                         │
│  history/log.jsonl tail:                                                │
│  > 14:25:33 td_section_complete   rules-engine    acceptance: 4 asserts │
│  > 14:25:48 td_section_complete   ui-render       acceptance: 6 asserts │
│  > 14:26:01 researcher_dispatched probe-ip3       canonical-source...   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Past runs roster (same as v0.1 home page)                              │
└─────────────────────────────────────────────────────────────────────────┘
```

## Hard problems to solve before this is real

- **Spawning sub-agents from a server process.** Today, builds are triggered
  by Cowork's project conversation where the Agent tool is exposed. A web
  frontend running on the user's localhost has no inherent path to that
  tool. Options: (a) a custom Agent-tool wrapper that the API-key holder
  fronts on their machine; (b) the Cowork local agent CLI as a backend
  invoked by the frontend; (c) wait for an official Auto Builder REST API.
- **Streaming progress.** The architecture's progress signal lives in
  `state/coordinator/dispatch-log.jsonl` + `history/log.jsonl`. A
  server-sent-events endpoint that tails these files is the obvious
  pattern. Polling would also work for v1.
- **Run-cancellation from the UI.** The architecture has
  `state/coordinator/cancellations.json` (cooperative cancellation polled
  by Builders). The web UI's cancel button writes to this file; the
  running build picks it up at the next poll boundary. Mechanism is
  already in the architecture — needs a thin wrapper.
- **Multi-run scheduling.** Two builds at once → two `runs/{slug}-N/`
  roots. The aggregator already handles numeric suffix collisions on slug;
  this is the policy that needs nailing down.

## Acceptance properties (when this eventually ships)

1. The user can submit a one-line build prompt from a web form and a real
   `runs/{slug}/` directory appears with all the expected substrate.
2. The phase strip in the UI tracks the 6 architecture phases (Discovery,
   TD, Build, Integration, Verification, Delivery) plus the Editor gate.
3. The user can open the artifact directly from the UI when the build
   completes — same `output/final/` link the Codex's run-detail panel
   already shows.
4. The user can cancel an in-flight build, and the architecture's
   cooperative-cancellation pathway is honored without leaving the
   substrate in a torn state.
5. The system can run two builds in parallel without their substrates
   interfering. Each run is independently reportable via the Codex roster.

## What v0.1 already supports for free

Once the spawn-from-web path exists, the v0.1 aggregator + dashboard can
already serve the run-history view in the lower pane of the sketch above
with zero changes. Build the spawn-and-stream pieces; reuse the rest.
