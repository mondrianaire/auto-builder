# Claude Code post-promotion handoff — Tier 2 (bootstrap prompt template)

**Status:** Codex-filed 2026-05-16; Maintenance-owned. Follow-up to the Tier 1 proposal (`claude-code-handoff-tier1-proposal.md`) which Maintenance has shipped.
**Author:** Codex meta-instance (drafted per user direction 2026-05-16: "absolutely the promotions should have a template").
**Scope:** add a canonical `architecture/claude-code-bootstrap-prompt-template.md` as a sibling to the existing `architecture/claude-code-handoff-template.md`. The bootstrap prompt is the first message the user sends to a new Claude Code window after opening the promoted fork. The handoff template (Tier 1) populates the IN-REPO `.claude/CLAUDE.md` for ambient context; the bootstrap prompt (Tier 2) is what the user copy-pastes to KICK OFF the first conversation. They serve different layers of the same problem.

## Why this is Tier 2

Per the original Tier 1 proposal's mitigation hierarchy:

- **Tier 1:** seed `.claude/CLAUDE.md` in the forked repo at promotion time. **SHIPPED 2026-05-16** by Maintenance.
- **Tier 2:** bootstrap prompt template the user copy-pastes into a new Claude Code window. **THIS PROPOSAL.**
- **Tier 3:** full hand-off via a Claude Code MCP if/when that surface lands. Deferred.

Tier 1 alone is insufficient because:

- The user still has to send SOMETHING as the first message in a new Claude Code window. CLAUDE.md is ambient (Claude Code reads it on initialization), but the first user message determines the conversation register and immediate focus.
- A bare "look at this repo" first message produces an unfocused first session. A structured first message that hands over the build's origin story + framing + a concrete first action produces a much more useful first session.
- The user shouldn't have to compose the bootstrap prompt from scratch per build. A template that auto-populates from substrate gives a one-click copy from the dashboard.

## The bootstrap prompt template (draft for Maintenance refinement)

Filed at proposed path `architecture/claude-code-bootstrap-prompt-template.md`:

```
You are picking up {slug} — a repo that was auto-built by AutoBuilder
(https://github.com/mondrianaire/auto-builder), ratified on {ratified_at},
and promoted here for product life. {live_url_line}

WHERE THIS CAME FROM (informational, not regulatory)

The original AutoBuilder prompt was: {prompt_abbreviated}

AutoBuilder's Discovery role interpreted that as: {discovery_restatement}

Major choices AutoBuilder made on the user's behalf (the inflection points
it surfaced and defaulted):

{inflection_points_as_real_world_bullets}

Verification verdict was {verdict}. {notable_exceptions_block_if_any}

WHERE TO LOOK NEXT

Read .claude/CLAUDE.md in this repo — it's auto-generated and contains the
full orientation (build provenance, "you are here" framing, repo structure,
visual iteration paths via Chrome MCP or puppeteer, product-life mode
guidance, links into the AutoBuilder corpus for deeper "why was this built
this way" forensics).

The build is your STARTING POINT, not a specification. The user's actual
goals may have shifted since the build ran, and the AutoBuilder choices
above were defensible defaults — not commitments. Treat them as context
for understanding what's currently there, not as a frame the product must
stay within.

FIRST ACTION

Read .claude/CLAUDE.md, take a look at {live_url_or_local_entry_point}
(via Chrome MCP or puppeteer per the CLAUDE.md guidance), and tell me what
you see — what seems solid, what looks broken or unfinished, what you'd
want to know before making changes. Don't touch any files yet.
```

## Substitution mechanics

| Variable | Source | Conditional? |
|---|---|---|
| `{slug}` | already in workflow #2 | always |
| `{ratified_at}` | `runs/{slug}/completion-ratified.json#ratified_at`, formatted as `YYYY-MM-DD` | always |
| `{live_url_line}` | `"The current state of the deployed application is at:\n\n  {live_url}\n"` if web_app + live_url present; empty string otherwise | conditional on web_app + live_url |
| `{prompt_abbreviated}` | `runs/{slug}/prompt.txt` — abbreviated to first paragraph or ~2 sentences if longer than 200 words; full prompt otherwise | always |
| `{discovery_restatement}` | `runs/{slug}/decisions/discovery/ledger-v1.json#restatement` — truncated to first sentence (~150 chars) | always |
| `{inflection_points_as_real_world_bullets}` | for each IP in `ledger-v1.json#inflection_points[]`, render as `- {topic_in_plain_english}: {default_branch_in_plain_english}` — translated to real-world-speak rather than verbatim from the ledger | always (empty bullet list if no IPs) |
| `{verdict}` | `runs/{slug}/output/verification/report.json#verdict` | always |
| `{notable_exceptions_block_if_any}` | extracted from `runs/{slug}/run-report.md` § "What broke" — first 1-3 bullets translated to plain language, prefixed with `"One notable build-time self-correction:"` or similar; empty if "What broke" is empty | conditional |
| `{live_url_or_local_entry_point}` | `{live_url}` if web_app + live_url present; else "the deliverable (entry point is usually \`index.html\`; for other deliverable kinds check README.md)" | always |

## Generation strategy

Two paths to consider for where the substitution happens:

**Path A: Generate at promotion time, store in the corpus.** The wrap-up routine (Maintenance just shipped `architecture/scripts/wrap-up-build.mjs`) generates the populated bootstrap prompt and writes it to `runs/{slug}/bootstrap-prompt.md` alongside `PROJECT-OVERVIEW.md`. Dashboard reads from there.

**Path B: Generate at copy-time from the dashboard.** Codex aggregator emits the substitution data per build; the dashboard's "Copy bootstrap prompt" button populates the template in JS at the moment of copy. No on-disk artifact in the corpus.

**Codex preference: Path A.** Reasons:

- Matches the pattern Maintenance just established with `PROJECT-OVERVIEW.md` (wrap-up routine writes it once at promotion; both AutoBuilder corpus reader + Claude Code reader use the same artifact).
- Persistence is useful for the build-story corpus (each promoted build has a record of what the bootstrap context looked like at promotion-time, which becomes interesting if the build is re-engaged years later).
- Dashboard's copy button becomes trivial: `fetch('runs/{slug}/bootstrap-prompt.md').then(t => navigator.clipboard.writeText(t))`. No template engine in JS.
- The substitution logic lives in one place (wrap-up routine, Node) rather than being duplicated between a Node generator and a browser-side template engine.

## Dashboard integration (Codex-owned)

Once the template + substitution mechanics are settled and `runs/{slug}/bootstrap-prompt.md` is being generated:

- Add a "Copy bootstrap prompt" button to the per-build detail panel, visible only when `lifecycle_phase === 'promoted'`
- Button copies the file contents to clipboard via `navigator.clipboard.writeText`
- Show a brief "copied!" toast on success
- Tooltip explains: "Paste this as the first message in a new Claude Code window opened against the promoted repo to give the instance full build context."

Approximate Codex scope: ~30 lines in `index.html` (button + handler + toast). Gated on the wrap-up routine generating the `bootstrap-prompt.md` file.

## Open questions for Maintenance

1. **Template wording.** Codex's draft above is a starting point. Maintenance owns architecture-vocabulary (telos, inflection points, exception/escalation framing); the canonical phrasing is yours. Particularly the "informational, not regulatory" framing is a user-articulated frame from 2026-05-16 that should be preserved as a key motif — the goal is making clear the build's choices are context, not a contract.

2. **`{inflection_points_as_real_world_bullets}` — manual or automatic translation?** The ledger's `inflection_points[].topic` and `default_branch` are written in AutoBuilder-vocabulary ("Async-multiplayer state transport on GitHub Pages (static-only)"). The bootstrap prompt wants real-world-speak ("Async state transport: external free-tier BaaS"). Options: (a) ledger schema gains an optional `real_world_translation` field per IP that Discovery writes alongside the technical phrasing; (b) wrap-up routine has a simple translation pass that abstracts the technical terms; (c) accept the ledger's vocabulary in the bootstrap (rougher but no extra work). Codex's preference: (a) eventually, (c) for v0.16 to avoid blocking; this is also the same translation question the role-completion-report-amendment is wrestling with (blurb questions → real-world-speak), so resolving it once and using the same translator across both surfaces is appealing.

3. **`{notable_exceptions_block_if_any}` — what's the trigger threshold?** Definitely include if there were Sev-2+ escalations, Phase 2 rectification, or demotion mode firing. Probably skip "Coordinator/Historian charter compliance" type findings (interesting to architecture but not actionable for the product-life Claude Code instance). Maintenance to define the filter.

4. **Live URL handling for non-web_app builds.** Plugins/CLI/library/data builds don't have a live URL. The `{live_url_line}` and `{live_url_or_local_entry_point}` substitutions need defensible fallbacks. Codex's draft above handles this but the wording for non-web_app cases might be improved.

5. **First-action recommendation tone.** Codex's draft ends with "tell me what you see — don't touch any files yet." This is conservative — good for the typical case where the user wants to align before iteration. Alternative: more inviting/exploratory ("here are 2-3 things you could explore first"). Codex's preference is the conservative version because the user can always escalate to action; harder to walk back if Claude Code dives in immediately.

## Maintenance Status

<!-- Edit checkboxes when you action items. Codex parses this block on its next aggregator run. -->

**Last touched:** 2026-05-16
**Overall state:** Codex-filed; user-greenlit ("absolutely the promotions should have a template"); Maintenance-owned (template content + substitution mechanics + wrap-up integration are architecture territory).

- [ ] tier2-template-content-drafted — *Maintenance refines the draft above into canonical `architecture/claude-code-bootstrap-prompt-template.md`. Codex's draft is a starting point; preserve the "informational, not regulatory" framing the user articulated.*
- [ ] generation-path-decided — *Maintenance picks Path A (wrap-up writes `runs/{slug}/bootstrap-prompt.md`) vs Path B (dashboard generates at copy-time). Codex preference: Path A.*
- [ ] wrap-up-integration-shipped — *If Path A: extend `architecture/scripts/wrap-up-build.mjs` to populate the template and write `runs/{slug}/bootstrap-prompt.md` alongside the existing PROJECT-OVERVIEW.md generation step.*
- [ ] dashboard-copy-button-shipped — *Codex-owned. ~30 lines in `codex/index.html`. Gated on the bootstrap-prompt.md file existing in the corpus.*
- [ ] retroactive-backfill-for-existing-promotions — *Apply the populated bootstrap prompt to `gto-poker-async-duel` (already promoted, no bootstrap-prompt.md exists yet) and `gto-poker-trainer` (Option A retroactive binding). Maintenance can run wrap-up-build.bat for these to back-fill, same pattern used for PROJECT-OVERVIEW.md back-fills.*

### Maintenance notes
*(Maintenance: add your review + decisions here.)*

### Codex acks
2026-05-16: Filing per user direction "absolutely the promotions should have a template" 2026-05-16, following the conversation thread on the async-duel manual handoff. The populated bootstrap prompt for async-duel was provided to the user in chat for immediate use (no on-disk artifact in the corpus until Maintenance lands the template + wrap-up integration).

The "informational, not regulatory" framing is user-articulated and should be preserved as a core motif: the bootstrap prompt's job is to give the new Claude Code instance enough origin context to be effective without imposing AutoBuilder's defaults as a frame the product must stay within. The user explicitly called out that "AutoBuilder and initial user goals may have changed since and are more informational than regulatory" — that framing is the load-bearing principle for the whole Tier 2 surface.

This is filed as a separate proposal from Tier 1 (`claude-code-handoff-tier1-proposal.md`) because Tier 1 is shipped and the work surface for Tier 2 is distinct (template + wrap-up integration + dashboard button vs Tier 1's template + workflow-#2 amendment). Cross-reference from Tier 1's proposal to here will be added once Maintenance acks this thread.
