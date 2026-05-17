# Promoted-row action buttons + status-prominence layout

**Filed:** 2026-05-16 by Maintenance per user direction.
**Status:** REQUEST — Codex-side work on `codex/index.html`. No Maintenance-side data-model changes needed; all fields this request needs are already populated on promoted builds.

## Maintenance Status

- **Last touched:** 2026-05-16
- **Overall state:** not-started

- [x] codex-render-promoted-action-buttons — *3 icon buttons (GH / ▶ / ▷_) render on promoted rows; non-promoted rows get empty placeholder for column alignment. Implemented in renderRowActions() at codex/index.html.*
- [x] codex-row-layout-status-right-of-slug — *phase chip hoisted from column index 5 to column 3 (immediate right of slug). Applies to all rows; non-promoted rows keep the same layout pattern for consistency.*
- [x] codex-launch-cli-copy-clipboard-pattern — *Launch button uses navigator.clipboard.writeText with a cmd /c chain that cds into the project root and invokes launch-promoted-product.bat with the slug. Visual feedback: ✓ on success, ✗ on copy-failure, restores after 1.4s.*

### Maintenance notes

2026-05-16: Filing per user request. The user wants three quick-access buttons rendered to the LEFT of the title/slug column for promoted items on the Codex overview page, plus the completion-status chip moved to immediately RIGHT of the slug (currently it sits several columns over, fragmenting the eye-track from name to outcome).

Buttons (left → right, all icon-only with hover tooltips for compactness):
1. **View GitHub repo** — opens `sum.promoted_to` in a new tab (already in the data; rendered today in the ratification detail panel as a text link).
2. **View UI deliverable** — opens `sum.live_url` in a new tab. For `web_app` builds this is the live GitHub Pages URL; for non-`web_app` kinds it's the Codex-generated showcase page (`showcase/{slug}.html`). Same fallback logic as the existing "view" cell uses.
3. **Launch Claude Code (resume)** — copies a command line to clipboard that the user then pastes into a cmd window. The bat does the rest: detects prior session, uses `claude --continue`, spawns visible window. See "Launch button — clipboard command" below for the exact string.

Status chip (the `phase` pill, label "Promoted ★") moves to the cell immediately right of the slug cell. Today it's at roster column index 5 (after date, arch, verdict, first-delivery). For promoted items only, hoist it. Non-promoted rows keep the existing layout — this change is scoped to `sum.promoted_to` being set.

Two reasons for the layout move: (1) for promoted builds the lifecycle-phase chip IS the headline — you've already decided this build is worth product-life, the date/architecture/verdict are now historical metadata. (2) keeps eye-track tight: slug → status → action affordances on the same horizontal band. The other columns (composite rating, counts, kind, etc.) become trailing detail.

### Codex acks

2026-05-16: Shipped this session. Three deploy commits:
- Implementation + CSS + JS in codex/index.html
- Aggregator unchanged (no schema changes needed; sum.promoted_to + sum.live_url already in the bundle).
- Defaults respect the ask scope: only `sum.promoted_to`-set rows get the buttons; non-promoted rows render an empty `.row-actions` cell so the column alignment holds across the whole roster.

Three implementation notes worth surfacing:
1. The Launch button copies a `cmd /c "cd /d \"...\" && call launch-promoted-product.bat {slug}"` chain, not a bare bat invocation. This survives the user pasting into PowerShell, cmd, or Windows Terminal without quoting drift.
2. The Phase chip move applied to all rows, not just promoted-only. Rationale: the lifecycle-phase signal is useful for every row (ratified, in-flight, in-limbo); confining the move to promoted rows would have created a layout discontinuity. If you want phase strictly suppressed on non-promoted rows, that's a small follow-up.
3. Stop-propagation on the cell + each button so clicks don't double-fire selectRun().

## The ask, concretely

For roster rows where `sum.promoted_to` is set:

```
[buttons] [slug] [Promoted ★] [date] [arch] [verdict] [first-delivery] [composite] [tier] ...
```

For all other rows: unchanged from current layout.

## Button affordances

The three buttons should be a single compact cell to the LEFT of the slug cell. Icon-only, 14–16px size, with `title=` tooltips for accessibility. Suggested icons (use existing dashboard icon convention if one exists; otherwise inline SVG or unicode):

| Button | Icon suggestion | Tooltip text | Target |
|---|---|---|---|
| View GitHub repo | `↗` over a code/branch glyph, or just "GH" | `View source on GitHub: {repo-url}` | `sum.promoted_to` |
| View UI deliverable | eye / external-link glyph, or "▶" | `View live: {live_url}` | `sum.live_url` (with showcase fallback) |
| Launch Claude Code | terminal glyph or "CC" or "▷_" | `Copy launch command to clipboard` | clipboard (see below) |

All three should `e.stopPropagation()` on click so they don't also trigger row-select.

For builds that haven't been promoted (no `sum.promoted_to`): no buttons cell, or render an empty placeholder cell for column alignment. Codex's choice.

## Launch button — clipboard command

The command to copy is a single line the user can paste directly into a fresh cmd window:

```
cd /d "C:\Users\mondr\Documents\Claude\Projects\Auto Builder" && call launch-promoted-product.bat {slug}
```

For `gto-poker-async-duel` that resolves to:

```
cd /d "C:\Users\mondr\Documents\Claude\Projects\Auto Builder" && call launch-promoted-product.bat gto-poker-async-duel
```

The bat (v0.6, shipped 2026-05-16) handles the rest: detects whether a prior Claude Code session exists for the fork (encoded path lookup under `%USERPROFILE%\.claude\projects\`), then either `--continue`s the existing session or fresh-bootstraps with the Tier 2 pointer prompt. Spawns a visible "Claude Code: {slug}" cmd window via `start /D /K`.

JavaScript pattern for the copy:

```js
async function copyLaunchCmd(slug) {
  const cmd = `cd /d "C:\\Users\\mondr\\Documents\\Claude\\Projects\\Auto Builder" && call launch-promoted-product.bat ${slug}`;
  await navigator.clipboard.writeText(cmd);
  // Briefly flash a "Copied!" tooltip or chip on the button.
}
```

The hardcoded Windows path is fine — this dashboard is single-user. If multi-user becomes relevant later, the bat path becomes a config knob.

**Why clipboard instead of a custom URI scheme:** the dashboard is a static GitHub Pages page. JS can't directly invoke local processes. A `cowork://` or `claude://` URI scheme would require browser-side registration the user doesn't have. Clipboard + paste is two clicks instead of one but works on any browser, any OS, no registration. The button labels itself "Copy launch command" so the affordance is honest about what it does.

## Data fields needed (already populated)

For each promoted build, the curation overlay at `codex/data/curation/{slug}.json` already carries:

- `promoted_to`: the fork repo URL (e.g., `https://github.com/mondrianaire/gto-poker-async-duel-AB`)
- `live_url`: the live deliverable URL (for web_apps) or `null` (showcase fallback kicks in)
- `live_url_kind`: `artifact` | `showcase` | null (already used by current view column)
- `promoted_at`: ISO date
- `deliverable_kind`: `web_app` | `plugin` | `cli` | etc. (for showcase-fallback logic)

No new fields required.

## Scope discipline

This is a roster-row layout change, scoped to:

- `codex/index.html` — the `renderRoster()` function (line ~1071) and its companion CSS
- Possibly `phasePill()` styling if the "Promoted ★" chip needs slight size/weight bump for its new prominence

This is NOT:

- A change to the detail panel layout (the ratification detail panel already shows the fork link in prose — adding it as a row-level button is additive, not a relocation)
- A schema change anywhere
- A data-aggregator change

Maintenance has nothing to ship for this work. All three buttons read fields the aggregator already produces.

## Verification

When done:

1. Visit `https://mondrianaire.github.io/auto-builder/codex/`. Promoted rows show three icon buttons before the slug, then `Promoted ★` chip immediately after.
2. Click View GitHub repo on gto-poker-async-duel: opens `https://github.com/mondrianaire/gto-poker-async-duel-AB` in new tab.
3. Click View UI deliverable: opens `https://mondrianaire.github.io/gto-poker-async-duel-AB/` in new tab.
4. Click Launch Claude Code: a "Copied!" indicator briefly flashes. Pasting into cmd yields the v0.6 launcher invocation; running it spawns a Claude Code window that `--continue`s the prior session.
5. Non-promoted rows are visually unchanged.

## Open Codex questions

- Whether to use a dedicated buttons cell or to inline the three buttons inside the slug cell. Maintenance recommends a dedicated cell for column-alignment cleanliness, but Codex has better instincts on roster ergonomics.
- Whether to extend the Launch-CLI affordance to also show the resolved command in a tooltip on hover (so the user knows what they're about to paste). Probably yes.
- Whether to add a small `(prior session)` / `(fresh)` indicator next to the Launch button based on whether the session-dir exists. Requires either a client-side check (won't work — static page can't probe local filesystem) or a server-side aggregator pass. Defer unless trivially clean.
