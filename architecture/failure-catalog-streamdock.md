# Failure Catalog — StreamDock Plugin Run

**Source build:** MiraboxSpace StreamDock VSD N4 Pro plugin, displaying Apple Music now-playing on the Touchbar Mode display strip.
**Date:** 2026-05-14
**Architecture version at run time:** v1.7
**Status:** Diagnostic complete. Raw failure data prepared for handoff to maintenance design conversation.

## What this document is

The build passed every internal verification gate (Critic clean, CV pass, Orchestrator delivered verdict `pass`) while failing the simplest user-facing test: the plugin did not display in the StreamDock host software on the user's Windows machine.

This document is **raw failure data**, not design proposals. Fix proposals are deliberately omitted — the design work belongs to a separate maintenance conversation that takes this catalog as its primary input.

It is also the second build in the project to pass internal gates and fail first contact (the first was poker 1.0). The recurrence is itself a data point.

---

## 1. Per-Role Failures Observed in This Run

### Discovery (initial mode)

- **Treated proper nouns as descriptive rather than atomic.** "MiraboxSpace StreamDock VSD N4 Pro," "Touchbar Mode," and "Apple Music Desktop Application" are three trademarked product/feature names. Discovery's ledger restated them as a generic "wide-display strip" / "Apple Music desktop client" without naming them as specific products to be researched. The architecture's heuristic "where the prompt is silent, simple wins" was applied where the prompt was *not* silent — it had named the products precisely.
- **Ignored execution-context evidence.** Windows path separators (`C:\Users\mondr\…\AppData\Roaming\…\Program Files (x86)`) were in every sub-agent's system prompt. Discovery resolved IP1 (host OS) to macOS by appealing to "Apple Music's flagship desktop client is macOS," never consulting the platform actually running.
- **`importance: high` was decorative, not load-bearing.** Discovery flagged IP1 as high importance with explicit cascade-depth language and then chose a default. The architecture did nothing differential with the flag.
- **Did not surface to user.** The architecture has a Sev 4 user-surfacing path but Discovery's "headless, simplest-within-reason" charter discouraged using it even where the cost of a wrong guess was the entire build.

### Technical Discovery (initial mode)

- **Conflated similarly-named SDKs.** TD recognized `.sdPlugin` + `manifest.json` + WebSocket handshake as the Elgato Stream Deck SDK shape, treated the prompt's "StreamDock" as a synonym, and locked TD-IP-A through TD-IP-F to Stream Deck constructs (`SDKVersion: 2`, `Controllers: ["Encoder"]`, `Encoder` sub-block with layout JSON, `setFeedback` paint API). Every one of those is wrong for VSDinside StreamDock.
- **Quick-reasoning rubric bypassed where it should have fired.** TD-IP-A's rubric was self-reported as all four conditions passing. In fact "well-known canonical answers in your training data" is true for Stream Deck and false for StreamDock — TD answered the wrong product's question. TD-IP-C (Node.js runtime) explicitly recorded 2/4 rubric conditions failing and still did not dispatch a Researcher.
- **No Researcher dispatch for any IP in the initial cycle.** Despite a complex, hardware-specific, third-party-SDK domain.
- **TD-IPs sourced from TD's training-data familiarity, not from the canonical project source.** TD invented MCAs that asserted facts about what the artifact would contain (`SDKVersion: 2`) rather than asserting facts about what the target host requires.

### Researcher (v3 dispatches, in escalation mode)

- **Cited repositories instead of reading them.** Both `probe-windows-nowplaying` and `probe-windows-plugin-runtime` listed GitHub repo URLs as `context_pointers` and returned findings as if those had been read. They had not — they were summarized from training-data knowledge of similar projects.
- **The architecture's structural defense against TD's blind spot was itself blind.** Researcher is supposed to expand the option space when the IP can't be quick-reasoned. In practice the v3 Researcher returned recommendations consistent with TD's pre-existing assumptions — adding the appearance of due diligence without the substance.

### Coordinator (inline)

- **Enacted the plan without sanity-checking against the prompt.** Coordinator's charter explicitly limits it to flow control ("you make no architectural or product decisions"). That charter is correct in principle, but it means the role can dispatch the wrong build at full speed because no role in the dispatch graph re-reads the prompt against the plan.
- **dev-002 (test affordance in product code) was logged correctly per v1.4 amendment but it was the kind of charter-stretch that a substantive review would have caught.** Critic flagged it LOW, which by threshold did not escalate.

### Critic (final_sweep, both cycles)

- **Verified self-consistency, not correctness.** Every MCA passed because it asserted what TD had decided the artifact should contain, and Builders produced exactly that. Critic checked `manifest.json#SDKVersion == 2` and reported PASS because the integrated artifact did have SDKVersion 2. The assertion was the wrong assertion — Critic has no role-defined way to question whether an assertion's `expected_value` is itself correct.
- **`prose_coverage` flagged the v1.7 schema completeness gap and forced the v1→v2 sections rewrite.** The amendment loop ran forty assertions of paperwork to wire `covers` arrays into the spec, while not one of those assertions said anything about whether the spec was right.

### Convergence Verifier (CV)

- **PNV.1 verified the verb against an environment the verifier itself constructed.** "Production fidelity" was defined as "real plugin process, real ws library, fake SDK host on 127.0.0.1." The fake SDK host was modeled on the Stream Deck protocol — the same protocol the artifact was built for. The PNV could not fail because the test environment was wrong in the same way as the artifact.
- **No assertion ever ran against the actual VSD Craft host on the user's actual machine.** v1.5's "production-fidelity exercise" amendment was supposed to close this exact class. It closed the variant where verifiers substitute runtime libraries (the latex CDN case); it did not close the variant where verifiers substitute the host runtime itself.

### Orchestrator

- **Delivered with verdict `pass` despite the user-facing test never having been run.** The Delivery Checklist (v1.2) has 8 required artifacts; none of them is "the user can install this and see it work." The checklist verifies the architectural process, not the user's experience.

---

## 2. Cross-Cutting Patterns

Five separate failure-mode classes converge into three structural laws the architecture currently violates:

### Law A — Proper Nouns Are Atomic, Not Descriptive

When a user's prompt contains a trademarked product/feature/app name, that string is load-bearing as text — it names a specific external system whose properties exist independent of the architecture's assumptions. Discovery currently treats every prompt string as raw text to interpret; it should treat proper nouns as identifiers to look up. The atomicity should be overridable only by Researcher findings that demonstrate (with cited evidence) that the user's named product cannot do what the prompt's intent requires.

### Law B — External Authority Is Required for Every Inference Domain Outside Training Data Certainty

TD and Researchers currently produce findings sourced from training-data familiarity, with citations that look like research but aren't. The architecture has no mechanism to distinguish "I read this in the canonical source" from "I recall this is true." Every load-bearing technical decision needs a citation that, if a Critic-type role followed the URL or file path, would surface verbatim text confirming the decision.

### Law C — Self-Constructed Verification Cannot Verify Against the Target Environment

PNV under v1.5 verifies that the artifact does the verb in the verifier's environment. When the verifier and the artifact share assumptions (same SDK, same protocol, same host model), the PNV is a closed loop and cannot catch errors in those shared assumptions. A real-environment touchpoint is structurally required — either the deliverable is run against the actual target host (rare; impossible for many hardware/SaaS targets) OR the verification reads the target host's canonical documentation and asserts the artifact conforms to it (always available). The current PNV does neither; it tests the artifact against a model the architecture invented.

---

## 3. Missing Role — "Editor" / "Intent Reviewer"

The architecture has roles for planning (Discovery, TD), executing (Coordinator, Overseer, Builder), auditing substrate (Critic), auditing acceptance (CV), routing exceptions (Arbiter), and recording (Historian). It has no role for re-reading the prompt against the plan.

A candidate Editor charter (sketched, not designed):

- Invoked between TD's output and Coordinator's first Wave dispatch.
- Input: the user's literal prompt, Discovery's ledger, TD's sections file.
- Process: walks every proper noun in the prompt and asks "does the spec demonstrably address this specific named thing, or has the spec substituted a generic equivalent?" Walks every Discovery IP resolution and asks "if the user had been asked this question directly, would they have picked this branch?" Walks every TD-IP and asks "is the chosen branch sourced from canonical evidence about the target system or from training-data familiarity?"
- Output: routes back to Discovery (amendment) or TD (impact-analysis) for any gap. Cannot itself decide; can only flag.
- Distinct from Critic because it audits against the prompt's intent, not against the spec's own consistency.
- Distinct from CV because it runs before build, not after.

This is the role whose absence let v1, v3, and v3-install-path all ship.

---

## 4. The First-User-Test Gate

Both the poker 1.0 build and this build passed every internal verification gate while failing the simplest possible user-facing test:

- **Poker 1.0:** build verdict `pass`, user opened the file, saw nothing.
- **This build (v1):** build verdict `pass`, user installed the bundle, side panel did not show the action.
- **This build (v3):** build verdict `pass`, side panel showed the action, but dragging it to a slot would have produced no display (verified via the SDK doc, not on-device).

The architecture has no gate of the form "before delivery, the artifact is exercised in the user's actual environment (or against the target environment's documented contract, not the architecture's modeled contract)." Adding such a gate is non-trivial — many builds target environments the verifier can't reach — but the principle is independent of mechanism: **the verification's relationship to the user's reality is the load-bearing property, and the architecture currently has no rule defending it.**

---

## 5. Prompt Analysis

The prompt is fine. The architecture failed it, not the other way around.

Going clause by clause:

- **"Build me a plugin for MiraboxSpace StreamDock VSD N4 Pro"** — Three load-bearing proper nouns identifying a specific hardware product from a specific manufacturer. Resolvable in a single web search. The architecture should treat this as atomic.
- **"that Utilizes the Touchbar Mode"** — Names a specific UI mode of the host software. Visible in the host's UI labeled exactly "Touchbar Mode." Resolvable by inspecting the host or its docs.
- **"to display the currently playing song and artist"** — Specifies the verb (display) and the data shape (song + artist).
- **"from Apple Music Desktop Application"** — Names the data source. On Windows, "Apple Music Desktop Application" is unambiguously the Microsoft Store Apple Music app (because Apple ships exactly one desktop client per OS). On macOS, same — Music.app.
- **"The plugin should take up the entire length of the VSD N4 Pro touch bar for display."** — Reinforces the display surface (the wide strip, not an individual key).

Things the prompt does NOT specify that the architecture should not have needed it to specify:

- Host OS (visible in execution context).
- Which SDK to target (uniquely determined by the named hardware).
- Plugin folder format (uniquely determined by the SDK).
- Install path (uniquely determined by the host software's documentation).
- Now-playing acquisition mechanism (uniquely determined by the OS + data source).

A "defensive" version of the prompt — one that pre-emptively closes every architectural blind spot hit — would look like this:

> "Build me a plugin for the MiraboxSpace StreamDock VSD N4 Pro device, running on the VSD Craft host software on Windows 11. The plugin should be packaged according to the VSDinside Plugin SDK (canonical demo at https://github.com/VSDinside/VSDinside-Plugin-SDK, specifically the VSDNodeJsSDKV2 template), use the Touchbar Mode of the VSD Craft software (which surfaces as the wide-strip controller), and display the currently playing song title and artist as read from Apple Music for Windows (Microsoft Store) via the Windows SMTC API. The plugin should occupy the entire length of the touch bar. Install path is %APPDATA%\HotSpot\StreamDock\plugins."

But that prompt is doing the architecture's job for the architecture. The whole point of the AutoBuilder framework is that you don't have to write that — the system is supposed to derive every clarification from the proper nouns and the execution context.

**Recommendation:** re-run the original prompt verbatim once the maintenance discussion lands amendments. The same prompt is the cleanest A/B test for whether the architecture changes actually defend against this failure pattern.

---

## 6. Take-To-Maintenance Summary

For the maintenance model conversation, the load-bearing inputs from this run are:

1. **Proper nouns are atomic** (Law A above) — Discovery charter amendment.
2. **External authority required for inference outside training-data certainty** (Law B above) — Researcher + TD charter amendments.
3. **Self-constructed verification is structurally insufficient** (Law C above) — CV charter amendment.
4. **Editor / intent-reviewer role is missing** (§3 above) — new role to add.
5. **First-user-test gate is missing** (§4 above) — delivery checklist amendment.
6. **`importance: high` is decorative** (Discovery section above) — charter amendment to make it load-bearing.
7. **Sandbox-permission-locked file deletions** (delivery section) — orchestrator delivery-tool amendment.

The five concrete failure instances from this run (v1 OS, v3 SDK, v3 Researcher shallowness, v3 install path, "Editor" absence) are evidence for those seven laws, not separate items to patch.

After the maintenance model has landed amendments, the user is ready to re-run the original prompt verbatim and compare results.

---

## Addenda from Diagnostic Conversation

The following observations were raised during the diagnostic conversation that produced this catalog. They are flagged separately so the maintenance design conversation can adopt or reject each on its own merits.

### Addendum A — Law C generalizes to Critic

Law C is named for CV (verifier constructed the environment it tested against), but the same structural shape applies to Critic: Critic verified `SDKVersion: 2` against TD's assertion that `SDKVersion: 2` is correct. Both verifiers are evaluating the artifact against criteria derived from the same source as the artifact. A cleaner phrasing of Law C may be:

> **Self-referential verification is structurally insufficient — the verifier and the verified must not share their source of truth.**

That generalization covers both the CV/fake-SDK case *and* the Critic/own-assertions case in one law.

### Addendum B — "Decorative metadata" is a class, not a one-off

The catalog identifies `importance: high` as decorative on IP1. This pattern almost certainly recurs: any field recorded by an upstream role but not consumed by a downstream role's decision logic is decorative. Worth naming the *class* — "Decorative Fields" — and flagging that the v1.9 audit should walk every field in every schema and ask "what role consumes this, and what differential decision does it drive?"

The dev-002 example fits here too: Critic recorded the flag, threshold filtered it, no role consumed the LOW-severity flag downstream. Field exists, no teeth.

### Addendum C — Editor charter interacts with Law B

§3's Editor sketch says Editor "walks every proper noun and asks 'does the spec demonstrably address this specific named thing?'" — but Editor itself cannot *substantively* verify the proper noun without research (or it falls into Law B's trap). So Editor's check must be structural:

- Structural (Editor): "does TD have a *citation to canonical evidence* for this proper noun?"
- Substantive (Researcher): "is the citation correct?"

The substantive check belongs to Researcher, dispatched by Editor. The maintenance design must be careful not to give Editor a job that re-creates Law B's failure mode.

### Addendum D — Prompt-specificity asymmetry deserves a name

§5 closes with the observation that the defensive prompt would do the architecture's job for the architecture. Worth elevating this to a stated principle for the maintenance conversation to ratify:

> **Prompt specificity must not scale with the architecture's failure modes.**

If the architecture needs the user to over-specify, that is an architecture bug, not a user bug. This is the operationalization of the Google ethos that motivated the project: *understand exactly what the user means and build them exactly what they want.* The asymmetric burden between user and architecture is the design property the project exists to invert.

### Addendum E — Law A × Law B interaction (unreachable canonical source)

Law A says proper nouns are atomic; Law B says go to canonical source. The interaction case is not specified:

> **What happens when the canonical source for a proper noun is unreachable or non-existent?**

Currently the architecture silently falls back to training-data familiarity (the v3 Researcher behavior). The correct behavior is probably escalate-to-user (Sev 4 surfacing) or block — not silently substitute. The maintenance design needs to specify this interaction explicitly; otherwise Law A and Law B can both be honored on paper while the actual failure mode (silent substitution) persists.

---

---

## 7. Worked Example — Unreachable User-Provided Resource (Law A × Law B Resolution Flow)

Addendum E raised an open question: what happens when a proper noun is atomic (Law A) but its canonical source is unreachable (Law B)? Currently the architecture silently falls back to training-data familiarity, which is the wrong answer. The following worked example illustrates what the *correct* resolution flow should look like — and surfaces several mechanisms the architecture currently lacks.

### Scenario

User prompt: *"Make an app to map my walks ... use sampledata from `http://notasite.com/notreal/map.kml` to map user activity over time."*

The URL is dead. No site at that domain. No archived copy. No matching filename elsewhere on the public web.

### Proposed resolution flow

1. **Discovery** identifies user's intent: an application to view walking activity on a map. Telos = "map walking data."
2. **Technical Discovery** identifies need for mapping library, KML parser, satellite imagery. Identifies the user-provided URL as the dataset.
3. **Coordinator** dispatches Overseers: mapping library, KML parser, satellite API, UI/UX, *sample-data acquisition*.
4. **Sample-data Overseer** attempts fetch → 404. No hosting remnants.
5. Exception raised to **Critic**.
6. Critic raises to **Technical Discovery** (technical-axis routing first).
7. TD spawns a **substitutive-research probe**: any alternative locations for that specific filename? Returns 0 matches.
8. Exception cannot be resolved within TD's technical scope. Critic escalates the exception's axis: this is no longer purely technical — it threatens what the user wants. Routes to **Discovery**.
9. **Discovery analyzes telos vs literal**:
   - Telos: "map walking data."
   - Atomic noun: `map.kml at notasite.com`.
   - The lexical marker `sampledata` weakens atomicity — this string was supportive/illustrative, not target-defining.
   - The build can satisfy intent with substituted material.
10. Discovery rules: **demote** the proper noun. Authoritative declaration that the URL is non-load-bearing given telos.
11. Discovery hands revised intent to TD: "find a substitute dataset that closest matches the perceived contents (a sample KML/GPX trail file representing walking activity)."
12. TD dispatches **substitutive-research** for an alternative dataset.
13. TD updates sections. Coordinator **cancels** the dead-URL Overseer and **spawns** new Overseers for the substitute-dataset path.
14. Build proceeds with substitute. Historian logs the demotion for audit.

### Mechanisms this flow requires that the architecture currently lacks

- **Discovery's demotion authority.** A new Discovery operation: rule a proper noun *acknowledged-as-atomic but non-load-bearing given telos*. Distinct from honoring (build with the noun) and violating (substitute silently). Demotion is authoritative substitution backed by intent analysis.

- **Demotion guardrails.** Discovery cannot demote freely or it becomes an escape hatch. Candidate criteria — *all four* must hold:
  - The proper noun is genuinely unreachable, not merely inconvenient to verify.
  - The proper noun is in a *supportive/illustrative* role in the prompt, not a *target-defining* role.
  - Discovery can articulate the telos *without* the demoted noun.
  - The build with substitution still demonstrably satisfies user intent.

  The StreamDock proper nouns fail all four (the device IS the target). The KML URL passes all four. This asymmetry is what the criteria need to enforce.

- **Three Discovery outcomes, not two.** When a proper noun is unreachable, Discovery must choose among:
  - **Demote**: noun non-critical → silently substitute, log for audit.
  - **Substitute-and-confirm**: noun substitutable, but the user might prefer to provide an alternative → surface Sev 4 with proposed substitute, build continues unless user objects within timeout.
  - **Block**: noun load-bearing → halt build, Sev 4 fatal, request user input. Example: *"Make an app to view the data at `http://specific-research-site.com/dataset.csv`"* — here the URL *is* the target.

- **Lexical markers that weaken atomicity.** Law A should be extended: proper nouns inside `sample`/`example`/`e.g.`/`such as`/`like`/`for instance` constructions are pre-weakened. The user has signalled the referent is illustrative.

- **Telos as an explicit field in Discovery's ledger.** Currently Discovery records assumptions and inflection-point resolutions. There is no field for "the smallest restating of the prompt that captures the user's want." Without an explicit telos, the demotion criterion above ("Discovery can articulate the telos *without* the demoted noun") has no anchor. Candidate: `ledger-v1.telos` = one-sentence canonical statement of want, authored by Discovery, queryable by any downstream role.

- **Substitutive-research as a distinct Researcher pattern.** TD currently dispatches Researchers for *verifying-research* ("is X true?"). The substitute-dataset case requires *substitutive-research* ("find a Y that satisfies the same role as the unreachable X"). Different operation, different success criteria, different output schema.

- **Coordinator cancellation semantics.** Killing the dead-URL Overseer and respawning is the same primitive needed by the compatibility-probe theme (§E in earlier diagnostic discussion). Both cases are *"in-flight builder, plan amended, cancel and re-dispatch."* Coordinator needs one clean cancellation operation that handles both.

- **Routing-axis question.** In the flow above, Critic raises to TD first, then escalates to Discovery when TD can't resolve. An alternative routing: unreachable-resource exceptions go *directly* to Discovery, because resource-availability is an intent question (does the user's named resource still exist?), not a technical question (what library do we use to parse it?). The two-axis routing in §C of the catalog needs to specify the routing rule for resource-availability exceptions explicitly.

### Why this scenario matters for the maintenance design

It is a *cleaner* test case than the StreamDock failure because:

- The failure surfaces at build time (fetch returns 404), not at first-contact.
- The proper noun is reachable in theory but not in fact (vs. StreamDock where the noun was always reachable but TD didn't reach).
- The resolution involves authentic intent reasoning by Discovery (vs. StreamDock where multiple Laws were violated simultaneously and the failure mode is harder to isolate).

The maintenance design should be able to specify the resolution flow above end-to-end. If the design can handle this case clearly, the Law A × Law B interaction is solved structurally rather than only addressed for the specific StreamDock failure mode.

---

## 8. Deliverability — A Three-Tier Verification Hierarchy

The catalog's §4 names "first-user-test gate" as a missing gate. On further analysis, deliverability is not a single gate but a three-tier hierarchy. The architecture currently has a verifier for the top tier only.

### Tier 1 — Telos verification (the spirit / Discovery-level want)

*Does the artifact do what the user fundamentally wanted?*

Currently verified by CV's PNV (prompt-named verb). The earthquake-map run: "user opens index.html, sees markers on map" — PNV passes when 480 markers appear. This works.

### Tier 2 — First-contact verification (deliverability access)

*Can the user reach the artifact in one obvious step?*

Currently no role verifies this. The architecture has no rule defending it.

This means: deliverables must be accessible via a single obvious mechanism — an inline link, a file in a folder the user already has open, an install path the OS recognizes natively. No multi-step procedures. No "navigate to subfolder X then run command Y." The reference model is what produces a `computer://`-style direct link the user clicks once.

Failures at this tier:
- Poker 1.0: user opened file, saw nothing (no first-contact)
- StreamDock v1: plugin installed, did not appear in host (first-contact deferred to host UI; failed)

### Tier 3 — Sub-goal verification (TD-decomposed accessibility)

*Does each TD-identified technical sub-goal work at the user-access level?*

This is the third tier, and the most-missed. TD enumerates technical sub-goals during planning ("the plugin will register with the host," "the KML parser will produce events[]", "the legend will use S2's exposed style fns"). Currently:

- **Critic verifies sub-goals for substrate consistency** — does the manifest.json declare what TD said it should declare? Does the loadEvents() signature match the contract? This is checking that the build matches the plan, not that the plan works for the user.
- **CV verifies the telos** — Tier 1.
- **No role walks TD's sub-goal enumeration with user-access verification questions.** TD says "the plugin will register with the host" → no role asks "if the user opens the host, do they see the plugin registered?" TD says "the KML parser will produce events[]" → no role asks "if the user runs the app, do they see events on the map?"

The user's framing: the architecture is good at matching the *spirit* of the build to Discovery's identified goals, but is not ensuring that the *sub-goals* identified by Technical Discovery are individually accessibly verifiable.

### Cross-tier design constraint: inline / one-step access

The user's framing of "VERY OBVIOUSLY AND SIMPLY (often inline)" is a design constraint that applies to *all three* tiers. The verification mechanism for each tier should be something a user could replicate in one step. If verifying a sub-goal requires the user to install dev tools, that's a deliverability failure even if the sub-goal technically works.

### Implication for the maintenance design

The catalog previously named "first-user-test gate" (Tier 2) as the missing gate. The full picture is:

| Tier | Verification target | Current role | Status |
|------|---------------------|--------------|--------|
| 1 — Telos | Prompt-named verb | CV / PNV | Exists; v1.5 amendment addresses fidelity |
| 2 — First-contact | User reaches the artifact | (none) | Missing |
| 3 — Sub-goal | Each TD sub-goal user-accessibly works | (none) | Missing |

The maintenance design should add gates for both Tier 2 and Tier 3, not just Tier 2. Tier 3 may require a new role (or an expansion of CV) that walks TD's sub-goal enumeration with user-access verification questions, distinct from Critic's substrate-consistency check.

### A note on what NOT to verify at each tier

To keep these gates load-bearing rather than decorative (per Addendum B), each tier should have a clear scope:

- Tier 1 does not check sub-goals (that's Tier 3).
- Tier 2 does not check that the artifact works deeply (that's Tier 1/3).
- Tier 3 does not check the prompt-verb (that's Tier 1) or compliance with TD's plan as a document (that's Critic).

If the tiers blur, the architecture re-creates the "Critic verifies self-consistency" failure mode at higher levels.

---

## Pointer to Source Run

Full run substrate, including all role outputs, audit logs, and verifier reports:
`runs/streamdock-applemusic-touchbar/`

The architecture-version-active-at-run-time files are in:
`architecture/` (v1.7 state)

The earthquake-map run-report (the previous successful run, useful as a contrast case where the architecture *worked*) is in:
`runs/earthquake-map/run-report.md`
