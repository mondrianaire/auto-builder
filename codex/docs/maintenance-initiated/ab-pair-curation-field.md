# A/B-pair curation field — request to Codex for dashboard visualization

**Filed:** 2026-05-16 by Maintenance per user direction.
**Status:** REQUEST — Codex-side work. Maintenance has shipped the data model + populated overlays for the two existing pairs.

## Context

Some builds in the corpus are not independent — they're **A/B test pairs**: same prompt, re-run after user-enacted AutoBuilder amendments to the data-interpretation infrastructure. Each pair captures a measurement of "how much did the architecture amendment improve the delivery against the same prompt?"

Per user 2026-05-16: *"both blackjack -> blackjack-trainer and streamdock-applemusic-touchbar are two examples of implementations where the initial deliverable for v1 was so off that I enacted AutoBuilder infrastructure changes to handle how the data was interpreted and reran with the same prompt for A/B testing. These should be indicated together somehow in the codex view"*

This is the "build is a measurement" framing in action — a pair of measurements taken across an architecture amendment delta is itself a higher-order signal about whether the amendment improved delivery quality.

## The data model

A new `ab_pair` field on each member's curation overlay at `codex/data/curation/{slug}.json`:

```json
{
  "ab_pair": {
    "with": "{partner-slug}",
    "role": "v1" | "v2",
    "trigger": "{plain-english description of what changed between runs}",
    "note": "{optional free-text context for fresh readers}"
  }
}
```

**Field semantics:**

- **`with`** (required): the partner slug. Symmetric relationship — each member's curation overlay points at the other.
- **`role`** (required): which side of the pair this build is on. `v1` = the initial delivery that didn't satisfy the user. `v2` = the re-run after AutoBuilder amendments. Future-proofing: arbitrary roles are allowed if multi-rerun pairs emerge.
- **`trigger`** (optional but recommended): plain-English description of what changed between v1 and v2. Examples: "v1.5 amendment closed the production-fidelity-exercise loophole" or "v1.8 Discovery charter introduced Principle E for execution-context evidence".
- **`note`** (optional): free-text context for fresh readers — what was off about v1, what was different about v2, what the comparison is meant to teach us.

## Currently-populated pairs (shipped this commit)

| v1 | v2 | trigger summary |
|---|---|---|
| `blackjack` | `blackjack-trainer` | AutoBuilder data-interpretation infrastructure changes |
| `streamdock-apple-music-touchbar` | `streamdock-applemusic-touchbar` | AutoBuilder data-interpretation amendments between runs |

Both pairs have symmetric `ab_pair` entries in their curation files (v1 points at v2 and vice versa).

## Codex dashboard ask

Visualize A/B pairs in the per-build roster + detail panel. Suggested treatments (Codex's choice on which):

1. **Roster row grouping** — render adjacent rows with a visual connector (e.g., a left-side bracket spanning both rows with "A/B pair" badge), so the pair is visually recognizable as a unit rather than two unrelated builds.
2. **Detail-panel cross-link** — when viewing v1, surface a "compare with v2 →" link (and vice versa). Click navigates to the partner's detail panel with a comparison header active.
3. **Comparison view (richest)** — a side-by-side panel showing the two members' verdict / FDO / architecture version / decision counts / etc. on adjacent columns. Highlights deltas. The "did the amendment improve delivery?" question becomes scannable.

**Suggested minimum (option 1 + 2):** roster grouping + cross-link. The comparison view (option 3) is nice-to-have but can be deferred.

## What this is NOT

- Not a relationship type for ratification/promotion lifecycle (those gates apply per-build independently).
- Not auto-detected. The pair link is curated — Maintenance writes the overlay when the user identifies a re-run. Avoids fragile heuristics (similar slugs, similar prompts, chronological proximity).
- Not specific to v1/v2 only. If a third run happens (v3 = re-run after another amendment), the field shape supports it: each member's `ab_pair.with` becomes an array, or new convention `ab_sequence` emerges. Defer the schema extension until/if it happens.

## Open questions for Codex

1. **Roster ordering when a pair exists.** Should pairs always render adjacent (forced re-sort by pair-relationship), or stay in their natural order (date/slug) with a visual connector that may span non-adjacent rows? **Codex's call** based on UX research.
2. **Filter affordance.** Should the roster filter set include "show A/B pairs only" or "exclude v1-of-pair (focus on latest)"? Useful for corpus statistics that want to count each prompt-attempt once. **Codex's call.**
3. **Dashboard summary metric.** Should the top-of-dashboard metrics surface "N pairs, M v1-of-pair builds, P v2-of-pair builds"? Useful for tracking "how often did the architecture amend after a delivery miss?" **Codex's call.**

## Acks / log

This proposal was filed alongside the curation-overlay writes for both existing pairs. No further Maintenance work required to unblock Codex.

Maintenance will add new `ab_pair` entries to curation overlays as additional re-runs are identified. The field shape is stable as-of this filing.
