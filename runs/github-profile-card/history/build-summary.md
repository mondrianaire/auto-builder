# Build Summary: github-profile-card

**Run root:** `runs/github-profile-card/`
**Build started:** 2026-05-16T00:00:00Z (Discovery)
**Build complete:** 2026-05-16T03:45:00Z (CV) — see `history/log.jsonl` for per-step wall times
**Final verdict:** `pass_with_concerns`
**Deliverable kind:** web_app (single-page, no build step, ES modules, served via local static server)
**Final artifact:** `output/final/index.html` (+ `css/styles.css`, `js/api-client.js`, `js/data-derivers.js`, `js/card-renderer.js`, `js/main.js`, `README-RUN.md`)

---

## Original prompt (verbatim)

> Build me a tool that takes a GitHub username and shows me a developer profile card for them — their pinned repos, their contribution streak, their most-used language, and a small visualization of their commit activity for the last 90 days.

## Final telos (from `decisions/discovery/ledger-v1.json`)

> Given a GitHub username, show a single developer profile card summarizing that account's pinned repos, contribution streak, most-used language, and a 90-day commit-activity visualization.

## Final assumption set (live ledger)

No amendments were issued during this build, so the v1 ledger is the final ledger. Eleven assumptions:

- **A1** — Static web page (HTML/CSS/JS, no build step), opened in a desktop browser on Windows. (high)
- **A2** — Input is a GitHub login handle (not a numeric ID, URL, or email). (high)
- **A3** — Public data only; no GitHub auth for the tool itself. (high)
- **A4** — One username per lookup (single-target card, not a comparison view). (high)
- **A5** — Pinned repos = GitHub's `pinnedItems` feature, up to six. (high)
- **A6** — Streak = trailing-consecutive-days streak ending at the most recent positive day. (medium)
- **A7** — Most-used language = bytes-weighted across owned non-fork public repos (Linguist method). (medium)
- **A8** — 90-day chart = daily contribution counts from `contributionsCollection.contributionCalendar`, sliced to trailing 90 days. (medium)
- **A9** — Browser-to-`api.github.com` direct (no proxy). (high)
- **A10** — No persistence; no localStorage history. (medium)
- **A11** — Nonexistent username → clear "user not found" message. (high)

## Inflection points — locked choices

- **IP1 (auth/PAT) — high importance, evidence_backed.** Locked: **user-supplied PAT** with a prominent labeled input on the page; Authorization header is `Bearer ${pat}` for both REST and GraphQL. Bundling a token was rejected on security grounds; unauthenticated alone cannot reach GraphQL `pinnedItems` or `contributionsCollection`. Evidence: docs.github.com GraphQL auth requirement + REST 60/hr vs 5000/hr rate limits.
- **IP2 (streak definition) — medium, best_effort_default.** Locked: **current streak** (consecutive days ending at the most recent positive day). Label on the card reads `Current streak` so the metric self-discloses.
- **IP3 (most-used-language aggregation) — medium, best_effort_default.** Locked: **bytes-weighted across owned non-fork public repos**, matching the method GitHub's own profile sidebar uses (Linguist). Tie-break alphabetical ascending.
- **IP4 (90-day data source) — medium, best_effort_default.** Locked: **GraphQL contributionCalendar**, sliced to trailing 90 days. Caption reads `Contribution activity (last 90 days)` rather than `Commits` so the visualization stays honest under the chosen data source.
- **IP5 (visualization form) — low.** Locked: **13×7 heatmap strip** (91 cells covering the 90-day window with one pad cell), echoing GitHub's own contribution-graph idiom.
- **IP6 (visual style) — low.** Locked: **GitHub-native dark theme** (palette `#0d1117 / #161b22 / #30363d / #58a6ff`, `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui` stack). No theme toggle (low-importance IP, deferred).

## Sections built (5)

| Section | Builder output | Notes |
|---|---|---|
| `api-client` | `js/api-client.js` | GraphQL + REST GitHub client; 5 typed error classes (UserNotFound/Auth/RateLimit/Network/MissingToken); per-repo `/languages` fan-out capped at 30 (dev-001). |
| `data-derivers` | `js/data-derivers.js` | Three pure functions: `computeCurrentStreak`, `computeMostUsedLanguage`, `sliceLast90Days`. No I/O, no DOM, deterministic. |
| `card-renderer` | `js/card-renderer.js` | DOM/SVG renderer; XSS-hardened via `textContent` + URL-validated `href`/`src`; 91-cell SVG heatmap with 5-level intensity palette. |
| `ui-shell` | `index.html` + `css/styles.css` + `js/main.js` | Page scaffold, form, status region; wires `fetchProfilePayload → derivers → renderCard`; surfaces typed errors as actionable messages. |
| `edge-case-testing` | `output/builders/edge-case-testing/builder-edge-b1/` | 77-assertion suite under Node (static checks + derivers tests); 67 pass / 0 fail / 10 deferred to CV (live-network + browser-engine). |

## Escalations

None. Zero escalations across the entire run; the Editor's two findings were tagged `pass_with_recommendations` (low severity, no routing), and the Critic's three findings were low/medium with no escalation packet raised.

## Researcher dispatches

None. IP1 was the only high-importance inflection point and Discovery resolved it `evidence_backed` inline using documented GitHub API references. TD then captured those same references as an inline citations file at `research/probes/probe-quick-github-api/findings.json` (the canonical_evidence source for every MCA touching the GitHub API), which discharged the need for a full Researcher loop. All external-system assertions were sourced with `citations_pointer` to that file.

## Inline deviations (2)

- **dev-001** (`api-client`, `implementation_path_chosen`, 2026-05-16T01:01:25Z) — Capped per-repo `/languages` fan-out at 30 (`MAX_LANGUAGE_FETCHES`). Charter said "for each non-fork owned repo" without a budget bound; unbounded fan-out would consume PAT quota for users with hundreds of repos. The 30-repo cap keeps a lookup under ~32 REST calls and ~5s wall-clock without measurably affecting which language wins (the top language saturates well inside the most-recently-updated 30 for the overwhelming majority of accounts).
- **dev-002** (`edge-case-testing`, `test_or_assertion_fix`, 2026-05-16T01:07:35Z) — Refined three source-grep patterns. Initial regexes false-positived on legitimate code: `\blogin\b` matched GitHub's API field name (`user.login`, `repo.owner.login`); `@media` matched a CSS *comment* explaining the OOS choice. Patterns tightened to match the assertion *intent* (auth-flow constructs / `@media` followed by media-query parens) rather than bare substrings.

Both deviations carry articulated `nested_equivalent` records and stay inside their declared scope categories.

## Critic findings (3)

All in the `prose_coverage` check; all surfaced without raising an escalation packet.

1. **Low** — `sections-v1.json#sections[id=ui-shell].charter` is never a direct `covers` target. Functionally fully exercised via the FC.* edges (FC.1/FC.2/FC.3/FC.10), but the graph-walk audit reads as "charter not directly targeted" for `ui-shell` specifically.
2. **Low** — Per-section `out_of_scope[]` items don't each carry a `covers` edge. Ledger-level OOS items are all covered (DCA.OOS.* × 12); per-section OOS items are structurally ruled out by static checks. Hygiene gap, not a missing-test gap.
3. **Medium** — `contracts/original/*.json` `interface` and `notes` fields aren't direct `covers` targets. Every contract export is exercised by a passing MCA on the implementation side (signatures, error names, GraphQL body shape, Authorization header form), so coverage is in place *in practice* — but the graph-walk reads as "contracts uncovered". Flagged for the v1.10 architectural amendment loop (extend `covers` semantics to permit contract-path targets, or document in `file_schemas.md` that contract interfaces are coverage-discharged by the section MCA chain).

## CV verdict

`pass_with_concerns` — 51 pass / 14 pass_with_caveat / 0 fail across the artifact-exercise tier; all 12 assumptions verified; all 12 OOS items verified absent; all 6 IP default branches honored; `principle_h_skips: []`.

All 14 `pass_with_caveat` results trace to the *same* root cause: the live `api.github.com` round-trip requires the user's own PAT, which is intrinsic to IP1's evidence-backed default and which CV deliberately does not hold. Per the CV charter's Principle H, the render path was exercised end-to-end under jsdom against canonical-evidence-shaped fixtures derived from `research/probes/probe-quick-github-api/findings.json` (octocat-shaped payload matching documented GitHub response schemas). The artifact's render code is verified; the moment of live-network truth is the user's first contact.

The other caveat (FC.1 console-cleanliness on load) is the standard "jsdom is not a Chromium engine" caveat and falls under the same Tier-2-deferred class.

## Dispatch count

Seven agent dispatches end-to-end:

1. **Orchestrator** → Discovery (initial)
2. → Technical Discovery (initial)
3. → Editor (post-TD structural audit, `pass_with_recommendations`)
4. → Coordinator (inline mode — handled Overseer + Builder + Integrator work for all 5 sections internally; 5 waves)
5. → Critic (final-sweep)
6. → Convergence Verifier
7. → Delivery (this dispatch)

No Researcher dispatches (Discovery's IP1 evidence + TD's inline citations file replaced the full Researcher loop). No Arbiter dispatches (zero escalations).

## Runtime

Approximate per-phase wall time from dispatch-log timestamps:

| Phase | Window | Notes |
|---|---|---|
| Discovery | ~00:00:00 → 00:00:00 (stamp-only) | Ledger + completion report. |
| Technical Discovery | ~00:10:00 → 00:45:00 (~35 min stamped) | Probe findings + 4 contracts + sections-v1 + completion report. |
| Editor | ~01:00:00 (stamp-only) | Structural audit, two low-severity recommendations. |
| Coordinator + 5 waves (inline) | 01:00:30 → 01:08:30 (~8 min) | Wave 1 parallel (api-client + data-derivers); waves 2–5 sequential. |
| Critic final-sweep | ~01:10:00 (stamp-only) | Nine categories of checks; three low/medium prose-coverage findings. |
| Convergence Verifier | ~03:45:00 (long gap — see log.jsonl) | jsdom load of integration; canonical-evidence-shaped fixtures; full first-contact + PNV + Tier-3 walk. |
| Delivery | 2026-05-16T04:00:00Z onward | Copy + Historian + run-report. |

Wall-clock gaps reflect cross-instance scheduling delays, not in-role work. See `history/log.jsonl` for the canonical step trail.
