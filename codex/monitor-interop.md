# Codex — Monitor interop

Codex observes Auto Builder build runs and now also publishes shared statistics that the Claude Instance Monitor consumes. This doc describes Codex's side of the contract; the monitor's side lives at `C:\Users\mondr\Documents\Claude\Projects\Claude Instance Monitor\scanner\connectors-tracking.md`.

## What Codex publishes

`Documents\Claude\Projects\Auto Builder\codex\stats\connector-usage.json` — schema in connectors-tracking.md.

`Documents\Claude\Projects\Auto Builder\codex\stats\last-updated.txt` — single-line ISO8601 timestamp of the most recent write. Cheap freshness check for consumers.

Both files are append-tolerant (atomic write to .tmp then rename). Consumers may read at any moment without locking.

## What Codex consumes

`C:\Users\mondr\Documents\Claude\Projects\Claude Instance Monitor\runs\latest.json` — the monitor's current view. Read on Codex startup and any time Codex needs to know which sessions are pinned, active, or stale. Schema in the monitor's `runs/README.md`.

## When Codex updates connector-usage.json

`End of build` — at the terminal commit of every observed Auto Builder run, recompute and rewrite. This is the canonical update point.

`Mid-build refresh` — during long-running builds, refresh every ~30 minutes. Lets the monitor's standard tier see growing stats without waiting for build completion.

`User request` — when the user says "update connector stats" or similar, regenerate fully from all available data.

Codex MUST NOT update on every tool call. The file is a periodically-refreshed digest, not a live stream. Pulse cadence on a stats file is over-instrumentation.

## How to count

For each Cowork sub-instance Codex observes (or whose audit.jsonl Codex can read):

1. Walk the audit.jsonl entries with `type: "assistant"` containing a `tool_use` block.
2. Inspect the tool's name. If it matches `mcp__<server>__<tool>`, increment `calls_by_server[<server>]`. Otherwise skip per the inclusion/exclusion list in connectors-tracking.md.
3. Aggregate per-session counts into the top-level `aggregate` block.

For live observation during builds (without re-walking the file), Codex maintains in-memory counters per session and serializes on each refresh.

## What "external" means here

The user wants to know which non-Claude connectors are doing real work, so the right boundary is: would the user configure this externally if they had to? MCP servers count — they live in `claude_desktop_config.json` and require user setup. Native Claude tools don't count. Orchestration primitives don't count. The full inclusion list is in connectors-tracking.md.

## Why this matters

Knowing which connectors get heavy usage informs whether a connector-preconfiguration dashboard would reduce user friction. See connectors-tracking.md "Dashboard-utility hypothesis test" for the decision framework. After 7+ days of accumulated stats, the data can answer "yes, build the dashboard" or "no, current per-session config is fine" with evidence.

## Failure handling

If Codex can't access a session's audit.jsonl (permission denied, file in use, etc.), record the session in `connector-usage.json` under a `partial_sessions` field with the reason. Don't omit silently — the monitor needs to know coverage is incomplete.

If Codex's own observability is degraded (mid-build crash, snapshot interrupted), write a `degraded: true` flag at the top level of the next `connector-usage.json`. The monitor surfaces this as a system-issue indicator until cleared.
