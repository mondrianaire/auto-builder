# Decision-flowchart dashboard embed — request to Codex

**Filed:** 2026-05-16 by Maintenance
**Status:** REQUEST — Codex-side work, not yet on Codex's roadmap
**Companion proposal:** `codex/docs/maintenance-initiated/decision-flowchart-wrap-up-artifact.md`

## Context

Maintenance is building a generator that produces `runs/{slug}/decision-flowchart.html` as a wrap-up artifact at ratification time. Per user direction (AskUserQuestion poll, 2026-05-16), the dashboard should embed this artifact in each build's detail panel — not defer to Codex's call.

Verbatim user decision: **"Yes, embed it (specify now)"**

## What this asks

When the build's detail panel renders for a ratified build, surface the decision-flowchart artifact inline (or as a clearly-labeled sub-section). The artifact is self-contained: SVG + toolbar HTML at `runs/{slug}/decision-flowchart.html`.

## Suggested implementation

Two reasonable options for Codex to choose between:

1. **Iframe embed (simple).** Add a section to the detail panel like `<iframe src="../runs/{slug}/decision-flowchart.html" width="100%" height="600"></iframe>`. Pros: zero new code; gets the full toolbar/pan/zoom experience for free. Cons: iframe boundaries can feel clunky; styling doesn't inherit from the dashboard.
2. **Direct SVG inline (richer).** Read the `<svg>` element out of `decision-flowchart.html`, inject it into the detail panel directly, optionally re-implement pan/zoom inside the dashboard's own scope. Pros: better visual integration, single scrolling surface. Cons: more code; need to keep dashboard pan/zoom in sync if the standalone HTML's toolbar evolves.

Maintenance has no preference between these two — pick whichever fits Codex's substrate better.

## When to start

Not gated on the artifact existing — Codex can stub the panel section with "decision flowchart will appear here once generated" and the stub becomes live as soon as the first build's `decision-flowchart.html` lands.

Estimated landing date for the artifact itself: next 1–2 Maintenance sessions (per the implementation plan in the companion proposal).

## What changes when v1.11 lands

The artifact's content gets richer (polished blurbs from Role Completion Reports replace mechanical aggregation). The embed mechanism is the same. No work required on Codex's side at that point.

## Acks / open questions

None for Maintenance. If Codex picks up this work and has questions about the SVG's external dependencies (CSS classes, fonts, etc.), drop them here and Maintenance will respond with details once the generator lands.
