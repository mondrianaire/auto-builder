# Blurb audience-layering — v1.12 amendment candidate

**Filed:** 2026-05-16 by Codex after user reframed the v1.11 banned-vocabulary rule.
**Status:** PROPOSAL — supersedes the "per-role banned-vocab rewrite examples" hint in Codex's ack of `available-build-resources-registry-proposal.md`.
**Tier:** small substrate amendment; touches `file_schemas.md` + `role_charters.md` + Codex dashboard renderer; ~half-day implementation.

## Maintenance Status

- **Last touched:** 2026-05-16
- **Overall state:** proposal filed; awaiting Maintenance review on shape decisions

- [ ] proposal-reviewed — *Maintenance acks the audience-layering reframe; aligns or counter-proposes.*
- [ ] schema-shape-decided — *user_headline at report level vs per-blurb vs both.*
- [ ] critic-audit-target-redirected — *banned-vocab check moves from `answer` to `user_headline` only.*
- [ ] codex-renderer-updated — *live narrative renders headline as top line, blurbs as drill-down detail.*

### Codex notes

2026-05-16: Filing this after the user's reframe of the v1.11 banned-vocab rule.

## The user's reframe

The v1.11 amendment introduced a banned-vocabulary list (`IP`, `dispatch`, `section` structural, `verdict`, `Sev N`, `Principle X`, `phase`, `tier`, `delegation`, `escalation`) that role completion reports' `answer` text must avoid. Critic audits and raises a rewrite-request when any banned token appears.

User direction:

> "In its final production form, the user will have no indication what those phrases are and they are EXTREMELY useful for describing the inner workings of the application to the developer. Instead of banning the phrases, we need to ban them from the top user frontend view."

The diagnosis: banning vocabulary at the content layer destroys load-bearing developer signal. The same content needs to land differently for two audiences:

- **The user** (looking at the live narrative on the dashboard) — needs plain language, no jargon. The whole point of v1.11's substrate work was to make "what is the build doing right now" legible to a fresh reader.
- **The developer** (drilling into a role's report for architectural diagnosis, audit, or root-cause analysis) — needs the full technical vocabulary. `IP1` is a precise pointer to a specific decision; `Principle H` cites a structural rule; `Sev 1` carries severity semantics; `dispatch` is the architecture's unit of work. Stripping these tokens makes the content less accurate, not more, for the developer audience.

The fix is rendering-layer, not content-layer.

## The proposal

### Schema change (`file_schemas.md`)

Add one field to the v1.11 Role Completion Report schema:

```json
{
  "role": "Discovery",
  "instance_id": "discovery-initial",
  "iteration": 1,
  "mode": "initial",
  "completed_at": "ISO-8601",
  "section": null,
  "escalation_id": null,
  "user_headline": "Discovery understood you want a profile card lookup tool and committed to a PAT-based design because GitHub's pinned-repos API needs auth.",
  "blurbs": [
    {
      "question": "What did you understand the user wants?",
      "answer": "A self-contained tool that takes a GitHub handle plus a Personal Access Token and renders a card showing pinned repos, current streak, most-used language, and a 90-day commit activity chart. The PAT requirement is intrinsic to IP1's evidence-backed resolution under Principle G — GraphQL pinnedItems + contributionsCollection cannot be reached unauthenticated.",
      "kind": "always",
      "importance": "high"
    },
    {
      "question": "What choices did you make on their behalf, and why?",
      "answer": "Resolved IP1 (auth requirement) evidence_backed via canonical citations to GitHub auth docs. Resolved IP2 (streak definition) as trailing consecutive-positive-day count ending at the most recent positive day. Resolved IP3 (language ranking) as bytes-weighted across owned non-fork repos per Linguist method. ...",
      "kind": "always",
      "importance": "high"
    }
  ],
  "raised_escalation": false,
  "next_role": "TechnicalDiscovery"
}
```

**Field semantics for `user_headline`:**

- **Required** on every report (no `null` allowed — every role completion needs a user-facing line).
- **Plain language only.** Banned vocabulary check runs against this field, not against `answer`. Critic raises Sev-1 + rewrite-request when banned tokens appear here.
- **~10–20 words.** One sentence. Telos-anchored (must advance "what is this getting the user toward").
- **Second-person voice welcome** (the existing v1.11 Notes-for-All-Roles style guidance applies to `user_headline` specifically, not to `answer`).
- **Independent of blurb count.** Even when a role has many blurbs, `user_headline` is the one-line summary that fits in the dashboard's role card header.

### Charter change (`role_charters.md`)

Update each role's `### Completion Report (v1.11)` subsection: the per-role blurb-question list stays unchanged, but add a leading instruction:

> "Before writing your blurbs, write `user_headline` — one sentence in plain language that summarizes the role's work for a fresh reader who has no AutoBuilder context. Banned vocabulary (IP, dispatch, section structural, verdict, Sev N, Principle X, phase, tier, delegation, escalation) does not appear in `user_headline`. The blurbs that follow may use whatever vocabulary makes the content accurate — they are for the developer drilling into your report, not the user reading the dashboard."

Update `§ Notes for All Roles`: rewrite the banned-vocabulary rule to scope it to `user_headline` only, with explicit permission for blurb `answer` text to use the technical vocabulary.

### Critic audit change

Critic's v1.11 audit hook for banned vocabulary changes target from `blurbs[].answer` to `user_headline`. The other v1.11 audits (one report per role-completion, conditional blurbs fire only when their condition holds) are unchanged.

### Codex dashboard change (`codex/index.html` renderLiveNarrative)

The live narrative renderer currently shows blurbs as the role card's primary content. After this amendment lands:

- Each role card's header gets a prominent `lnv-headline` element rendering `user_headline`.
- Blurbs collapse to a "Show details" disclosure under the headline. The user sees a clean one-line-per-role timeline by default; clicking a role card expands its blurbs for the developer view.
- For roles where `user_headline` is missing (legacy v1.11-only reports), fall back to rendering the first `importance: high` blurb's `answer` as the headline (clearly tagged as fallback).

This is a small CSS + JS change in the existing `renderLiveNarrative` function. ~30 minutes of work.

## Why this is better than per-role rewrite examples

In Codex's earlier ack of the registry proposal, the suggestion was that the banned-vocabulary list needs per-role rewrite examples in the charter ("say 'the design decision that required a token' instead of 'IP1'"). That works for the top-view layer, but it destroys developer-useful precision in the underlying content. Two audiences, two needs — one field can't serve both.

The audience-layered shape:

- Lets the developer's full vocabulary stay where it's load-bearing (blurb `answer`).
- Gives the user a clean entry point that the rendering layer is responsible for, not the agent.
- Makes the audit narrower: Critic checks one field per report, not every blurb answer.
- Doesn't require new rewrite-example content in every role charter — just a "write `user_headline` first" instruction that's the same for all roles.

## Open questions

1. **`user_headline` per-blurb vs per-report?** Proposal recommends per-report (one line per role completion). Per-blurb would let each question have its own user-facing line, but most reports have 2-4 blurbs and per-report keeps the dashboard's top-view density right. Per-blurb is a v2 if the per-report shape feels too coarse in practice.

2. **What about reports whose role has no plain-language summary that fits in one line?** Coordinator under high-parallelism, Critic with 20+ findings — one sentence may be insufficient. Possible answer: `user_headline` can be up to two sentences when needed; importance-weighted to be conservative.

3. **Should `user_headline` get its own banned-list, or inherit from the existing v1.11 list?** Inherit. The whole point is that the existing list was the right list — it was just being checked against the wrong field.

4. **Legacy v1.11 reports (no `user_headline`).** Renderer falls back to first-importance-high blurb. Critic does not retroactively audit. The audit-target change is forward-only.

5. **Should the user_headline also surface in the codex/data per-run aggregator output?** Yes — aggregator includes it in `live_narrative.reports[].user_headline` so the dashboard can render without recomputing. Trivial aggregator change.

## Implementation cost estimate

- `file_schemas.md` schema addition + style contract: ~30 lines.
- `role_charters.md` per-role instruction (~1 line × 13 roles) + Notes for All Roles rewrite: ~30 lines total.
- Critic audit retarget: 1-line change in the v1.11 audit hook description.
- Codex dashboard `renderLiveNarrative`: ~40 lines (headline DOM + disclosure toggle + CSS).
- Aggregator `readLiveNarrative`: 0 lines (already loads the full report; the new field rides along).

Total: ~100 lines across 4 files. ~3-4 hours including testing against the github-profile-card reports as a fixture.

## Recommended next step

1. Maintenance reviews this proposal and either acks or counter-proposes.
2. If acked, Maintenance lands the schema + charter + Critic-target changes (architecture lane).
3. Codex lands the renderer change (codex lane) — can land independently since the fallback handles legacy reports.
4. The user_headline field gets populated by the next build under v1.12+; older builds keep the legacy fallback rendering.

The user's reframe is correct and the cost is small. Lands cleanly alongside the registry amendment as part of v1.12.
