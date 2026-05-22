# Interactive Wrap-Up — Specification

**Status:** proposal / spec. Drafted 2026-05-22; revised same day to route on a single
differentiating question.
**Origin:** Jett's direction — "the post build wrap up can start to become interactive ...
interactive questions can identify exactly what assumptions were made incorrectly or
identify the exact task in the role that created the issue." Refined in discussion to a
one-question entry that routes to the right diagnostic lane.
**Scope:** a wrap-up-phase interactive mode. One plain-language question sorts a build's
outcome into three lanes — *satisfied* / *works-but-misaligned* / *broken* — and routes
each to the right next step: straight to ratification, a misalignment diagnosis, or a
failure diagnosis. The user never sees the lane machinery; they answer one question about
their own experience of the result.

---

## 1. Why this proposal

The closest-liquor-store build is the motivating case. The prompt asked for the *closest
liquor store*; the delivered app returns the *closest wine shop*. The artifact is not
broken — it does what it was built to do. It is built on a wrong assumption: "liquor store"
was operationalized as the OpenStreetMap `shop=alcohol` tag (section-2's data-source
choice), and `shop=alcohol` is the generic alcohol-retailer tag — it includes wine shops.

Today the user experiences any off outcome — wrong, or broken — as a dead end: "this isn't
right," with no trace back to *which decision* produced it. The full decision trail exists
in substrate (assumption ledger, inflection points, role Completion Reports) but nothing
walks it with the user. The interactive wrap-up turns the wrap-up from a static report into
a **diagnosis**, and routes every build outcome — including the good one — to its correct
next step.

## 2. The single differentiating question

The wrap-up opens with exactly one question. The user pre-classifies nothing; they report
their own lived experience of the result:

> **How did this build land for you?**
> - **A** — It's what I wanted.
> - **B** — It works, but it's not what I asked for.
> - **C** — It's broken / it doesn't do the job.

The answer routes to a lane (§3). Any internal split is backend-only and invisible.

**The question doubles as a verdict cross-check.** The architecture already recorded a
verdict for the build. Comparing the user's answer against it is itself diagnostic — the
moment "what the user lived" disagrees with "what the architecture concluded" is the single
most valuable signal the wrap-up produces:

| User answer | Recorded verdict | Reading |
|---|---|---|
| A | pass | Agreement — clean. Proceed to ratification. |
| A | fail | **Contradiction — likely a false fail.** The user's answer is evidence; route to re-audit. |
| C | fail | Agreement — the build is genuinely broken. |
| C | pass | **Contradiction — verification missed something.** A finding about the test, recorded as such. |
| B | pass *or* fail | Orthogonal — a build can pass verification and still miss intent. That is Discovery misalignment by definition. |

## 3. The three lanes

### Lane A — "It's what I wanted"
No diagnostic. Proceed to ratification. **If the recorded verdict was a fail**, this is a
false fail: capture the user's confirmation as re-audit evidence. A build that "didn't pass
the test" but actually works and satisfies intent legitimately reaches ratification this
way — not by bypassing the verification gate, but by correcting the gate's mistaken reading
(codex `re_audit_reclassified_verdict` is the existing slot for it).

### Lane B — "It works, but it's not what I asked for"
Discovery misalignment. The artifact functions; it diverged from intent. Per
`build-lifecycle.md` this is a **Phase-1 documented gap, NOT a Phase 2 trigger** — Phase 2
is for artifacts that don't work, and conflating the two would make it a feature-request
channel. Run the diagnostic walk (§5) over the assumption trail; land on the wrong
assumption or misresolved inflection point. Output: a documented gap + an amendment
candidate. Does not change `first_delivery_outcome`.

### Lane C — "It's broken / it doesn't do the job"
Verification failure. Run the diagnostic walk (§5) over the build trail; land on the
failing role-task. Output: a **targeted Phase 2 rectification brief** — the exact task to
fix, so rectification is surgical instead of guesswork. The build still has to be rectified
until it actually passes verification before it can be ratified, and `first_delivery_outcome`
stays `failed_user_reprompted` regardless (the cardinal rule — a successful rectification
never erases the first-delivery failure the corpus exists to measure).

## 4. The substrate the walk reads

Lanes B and C run the same walk over substrate that already exists per build:

| Source | File | What it carries |
|---|---|---|
| Assumption ledger | `decisions/discovery/ledger-v1.json` → `assumption_ledger[]` | each assumption + `confidence` + `rationale` + **`what_breaks_if_wrong`** |
| Inflection points | same → `inflection_points[]` | each fork, its `default_branch`, `importance`, `why_inflection` |
| Out of scope | same → `out_of_scope[]` | what Discovery explicitly excluded |
| TD resolutions | `decisions/technical-discovery/sections-v*.json` → `inflection_resolutions[]` | how each IP (Discovery-surfaced + new TD-introduced, e.g. the data-source choice) was resolved + `rationale` |
| Role Completion Reports | `state/reports/*.json` → `blurbs[]` | each role's plain-language "what did you understand / what choices did you make and why" |

`what_breaks_if_wrong` is the load-bearing field — every assumption already states the
failure it causes if mistaken, so the walk matches the user's reported problem against
those statements to rank suspects. The Completion Report blurbs are already plain-language
and user-facing, so the walk **replays them as the questions** rather than synthesizing
prose from raw substrate.

## 5. The diagnostic walk (lanes B and C)

1. **Capture the detail.** The user describes, in free text, the problem — *delivered vs
   intended* (B) or *what fails* (C).
2. **Rank candidate decisions.** Score every assumption / IP-resolution / role-task by
   relevance to the description — keyword and concept overlap with the decision text and,
   for B, especially with each assumption's `what_breaks_if_wrong`. Produces an ordered
   shortlist.
3. **Walk the trail in dependency order.** Discovery assumptions → Discovery inflection
   points → TD resolutions → role tasks. For each suspect, ask one targeted ratify/deny
   question, phrased from the Completion Report blurb where one exists: *"Discovery assumed:
   'earthquake data comes from a public feed.' Does that match what you meant?"* A guided
   narrowing — typically 3–6 questions, scaling with how cleanly the shortlist separates.
4. **Stop at the first denial, then drill one level.** Distinguish which layer owns it:
   the **decision itself** was wrong (Discovery logged the wrong default; TD resolved an IP
   against intent), versus a downstream **role-task implemented a sound decision wrongly**.
   One or two follow-ups resolve this.
5. **Name the culprit.** Output the exact decision: `id`, owning role and task, the decision
   text, and the user's correction (B) or the precise failure (C). Lane B lands on an
   assumption; Lane C lands on a failing task — same machinery, different terminus.

## 6. Interaction model

Conversational, in the build's Cowork chat — the wrap-up phase already runs there. The §2
question is asked at every wrap-up; Lane A ends after that one question, Lanes B and C
continue into the walk. Opt-in is automatic and lightweight: a satisfied user spends one
question and is done. A non-conversational interactive-HTML walk, for builds reviewed cold
from the corpus, is a v2 consideration.

## 7. What it produces

- **`runs/{slug}/wrap-up-diagnosis.json`** — the outcome lane, the verdict cross-check
  result, and for B/C the culprit decision (`id`, `role`, `task`, decision text, layer) +
  the user's correction or the failure detail.
- **Lane B** — an **amendment candidate**: what the architecture should learn, in
  failure-catalog form. E.g. *"When a prompt names a specific retail or product category,
  Discovery must surface category granularity as an inflection point and ground it in
  evidence, rather than silently mapping the term to the broadest available data tag."*
- **Lane C** — a **Phase 2 rectification brief**: the exact failing task, handed to
  `commit-step.bat`-scoped rectification.
- **Lane A + recorded fail** — a **re-audit evidence record** for `re_audit_reclassified_verdict`.
- **Optionally** — an A/B re-run input. Per the A/B testing strategy a divergent build is
  architectural evidence; the correction can seed a verbatim re-run after the amendment
  lands, or a confirmatory run with the corrected assumption pinned.

## 8. What it deliberately does NOT do

- **Does not trigger Phase 2 for Lane B.** Discovery misalignment is a Phase-1 documented
  gap by definition. The walk records; it does not rectify.
- **Does not patch the build.** A divergent or failed build is a measurement of the
  architecture. The fix is an amendment + a re-run (B) or scoped rectification (C), never an
  edit to the delivered artifact.
- **Does not ratify a genuinely-failed build.** Lane C reaches ratification only by real
  rectification that makes verification actually pass. Lane A's false-fail path corrects a
  *wrong verdict*; it never waves a broken build through.
- **Does not change `first_delivery_outcome`.** The cardinal rule holds across all lanes.
- **Does not interrogate.** Lane A is one question. B and C are short guided narrowings,
  not exhaustive questionnaires.

## 9. Worked example — closest-liquor-store (Lane B)

1. §2 question → user picks **B** ("works, but not what I asked for"). Recorded verdict is
   orthogonal — a passing build can still miss intent.
2. User detail: "it shows a wine shop; I wanted a liquor store."
3. Ranking surfaces the data-source TD-IP ("query OSM `shop=alcohol`") and any Discovery
   assumption about what "liquor store" denotes — both high-overlap with the description.
4. Walk: *"Discovery understood the goal as 'find the nearest store selling liquor.' TD
   then chose to look up stores via OpenStreetMap's `shop=alcohol` category — which covers
   any shop selling alcohol, including wine shops. Is that the behavior you wanted?"* →
   **no.**
5. Drill: *"Should 'liquor store' mean specifically a spirits store — or should the data
   source distinguish store types it currently lumps together?"* → isolates assumption
   layer vs implementation layer.
6. Culprit named: the TD data-source resolution operationalized "liquor store" as
   `shop=alcohol` with no granularity check; the upstream gap is that Discovery never
   surfaced "what counts as a liquor store" as an inflection point.
7. Output: diagnosis JSON + amendment candidate (§7) + an optional A/B re-run input.

## 10. Open questions

1. **Ranking without an LLM pass.** Step 2's scoring — pure keyword/concept overlap, or a
   model-judged match against `what_breaks_if_wrong`? v1 can be keyword overlap surfaced to
   the conversational instance, which makes the judgement inline.
2. **Multiple culprits.** A problem can trace to more than one decision. Stop at the first,
   or enumerate all? Recommend: stop at first, then ask "anything else off?" once.
3. **Lane A false-fail handling.** Auto-trigger a re-audit, or just stage the evidence
   record for a human/Maintenance to action? Recommend: stage evidence; re-audit stays a
   deliberate step.
4. **Cold corpus review.** Builds reviewed months later have no live chat — is
   conversational-only v1 acceptable, HTML walk deferred to v2? Recommend yes.
5. **Flowchart integration.** The wrap-up already emits `decision-flowchart-auto.{html,svg}`.
   Highlight the culprit cell on it? Strong v2 candidate; out of v1 scope.

## 11. Staged implementation path

| Stage | Scope |
|---|---|
| v1 | The §2 differentiating question + Lanes A/B/C conducted conversationally in the wrap-up chat. Reads ledger + IP resolutions + Completion Reports; runs the §5 walk for B/C; writes `wrap-up-diagnosis.json`. |
| v1.1 | Wire the §2 question into `wrap-up-build.mjs` / the wrap-up routine so every build is asked it. |
| v2 | Culprit highlighting on `decision-flowchart-auto.{html,svg}`; the standalone interactive-HTML walk for cold corpus review; A/B re-run input handed straight to a fresh build. |

## Maintenance Status

<!-- Edit checkboxes when actioned. -->

- [ ] spec reviewed
- [ ] v1 implementation
- [ ] v1.1 wired into the wrap-up routine
- [ ] v2 scoped

Drafted 2026-05-22. Companion memory: the project memory note on the interactive wrap-up
direction. Related: `build-lifecycle.md` (Phase-1 vs Phase-2 boundary, the cardinal rule),
`failure-catalog-streamdock.md` (amendment-candidate format), the A/B testing strategy
(builds as measurements, not deliverables to patch).
