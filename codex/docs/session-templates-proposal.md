# Session Templates — proposal for AutoBuilder-Maintenance

**Status:** PROPOSAL — design phase. v1.12 amendment candidate.
**Author:** Orchestrator instance (github-profile-card build, 2026-05-17).
**Scope:** what AutoBuilder-Maintenance needs to add to `architecture/` and the build pipeline to let recurring code-substrate patterns be slotted modularly into new builds, instead of being rederived every time.
**Related (sibling, not duplicate):** [`maintenance-initiated/available-build-resources-registry-proposal.md`](maintenance-initiated/available-build-resources-registry-proposal.md). The resource registry covers the **infrastructure layer** (Pages, FORK_PAT, shared Firebase). This proposal covers the **code-substrate layer** (PAT-auth UI pattern, static-web shell scaffold, pure-derivation-functions section). They are complementary; together they close the "agents don't know they're inside AutoBuilder, so they rebuild what already exists" gap from both ends.

## Maintenance Status

- **Last touched:** 2026-05-17 (filed by Orchestrator)
- **Overall state:** filed; awaiting Maintenance review; design TBD
- [ ] proposal-reviewed
- [ ] template-schema-defined — what fields per template, file shape, where on disk
- [ ] consumption-mechanism-defined — how Discovery + TD query templates; charter amendments
- [ ] promotion-lifecycle-defined — how templates get extracted from completed builds (manual? semi-automated? user-curated?)
- [ ] codex-dashboard-surface-decided — whether templates have a UI panel like the resource registry will

---

## Recommendation upfront

**Build session templates as a sibling registry to the in-flight resource registry**, with a parallel schema and the same Codex dashboard treatment. Land them together as one v1.12 amendment: resources answer "what's already provisioned?" and templates answer "what's already designed?" The combined effect is that Discovery + TD inherit AutoBuilder's accumulated experience the same way they currently inherit its commit cadence — invisibly, by default, with explicit opt-out.

**Sequence two visible artifacts:**

1. **Codex `patterns` view** (read-only, statistics-driven). Aggregator walks `runs/*` and surfaces recurring section names, IP topics, library picks, contract shapes, and OOS keywords. No effect on builds — pure visibility. This is the **empirical input** for deciding which templates to formalize. ~2 days of Codex work.
2. **`architecture/session-templates/`** (the registry proper). Each template is a frozen-by-version recipe Discovery + TD consume. **Templates are promoted from successful builds**, not invented in a vacuum.

Doing (1) first means (2)'s starting templates are evidence-backed, not speculative.

---

## The gap this addresses

The github-profile-card build that triggered this proposal spent meaningful Discovery + TD effort rederiving things that are dead-obvious recurring patterns. Concrete examples from this build's ledger:

- **PAT-auth pattern (IP1).** Discovery wrote 6 IP options for "API authentication / rate limiting," cited 3 GitHub docs URLs, and locked the standard pattern (in-memory PAT, "create one" link, no localStorage). The pattern is structurally identical to what any tool hitting an authenticated third-party API would need (OpenAI, Anthropic, Stripe-read, Notion, Linear). That's not 6 IPs of original thinking — it's a template that should have been one IP: `pat-auth-readonly :: applies`.
- **Static-web shell.** The `index.html` + `#input` + `#button` + `#status-region` + `#card-container` skeleton is structurally identical across at least 3 of the 6 corpus builds (tic-tac-toe, latex-equation-renderer, github-profile-card). Each redesigned the shell from scratch.
- **Pure-derivation-functions section.** The `data-derivers` section here (3 pure functions, no I/O, Node-runnable) is the same shape as `rules-engine` in tic-tac-toe and blackjack. Same testing pattern. Same OOS list. Same charter wording style.
- **Error taxonomy.** `UserNotFoundError | AuthError | RateLimitError | NetworkError | MissingTokenError` is the canonical error taxonomy for any client-side HTTP API tool. Should be a template, not 5 ad-hoc class declarations per build.

Each of those represents ~30-40% of the build's section-design effort. A build that pulled in the templates would have Discovery + TD focused on the build-specific 20% (which metrics? which visualization? which empty states?) instead of rebuilding the chassis. Editor's structural audit would have less to verify. CV would inherit pre-vetted assertion patterns. Total dispatch count drops, fidelity goes up.

This is the same architectural argument as the resource registry, applied one layer up: instead of "you don't need to provision X — AutoBuilder already has it," it's *"you don't need to design X — AutoBuilder has already shipped it three times."*

---

## Evidence from the corpus

Six completed builds: tic-tac-toe, blackjack, latex-equation-renderer, gto-poker-async-duel, streamdock, github-profile-card. Cross-build pattern observations (informal until Codex's `patterns` view formalizes them):

| Pattern | Builds it appeared in (of 6) | What it would template |
|---|---|---|
| Static web tool, no backend, runs in browser | 5 | Deliverable kind + Pages deploy default + README pointing at live URL + commit-build.bat as C5 |
| Single-form input → single-call action → single-render output | 4 | HTML shell, status region, error→message map, in-place re-render |
| Pure-derivation-functions section (no I/O, Node-runnable) | 3 | Section charter wording, Node test harness, "no DOM/network/fetch" OOS items, deterministic-test patterns |
| Public-API HTTP client with typed error taxonomy | 2 (github-profile-card today; latex used CDN, would benefit if refactored) | Error class hierarchy, status-code → error-class mapper, `Authorization: Bearer` header pattern, CORS-friendly endpoints |
| Inline-SVG visualization (no charting lib) | 3 (heatmap, tic-tac-toe grid, blackjack table) | SVG-as-DOM patterns, intensity-scale palettes, XSS-safe attr-write helpers |
| GitHub-dark theme + system-ui font | 2 today; likely default going forward | CSS variable set, no `@media`, no web-font fetch, system-ui stack |

**These are not all template candidates of equal value.** The Codex `patterns` view (item 1 in the recommendation) is what produces the actual ranking. The table above is a hand-pass estimate to motivate the proposal, not the formalized substrate.

---

## Proposed mechanism

### 1. Storage location

`architecture/session-templates/` at the AutoBuilder repo root. One subdirectory per template:

```
architecture/session-templates/
├── README.md                          (index + how to use)
├── pat-auth-readonly/
│   ├── template.yaml                  (the recipe)
│   ├── reference-build.md             (link to the build this was promoted from)
│   ├── default-assertions.json        (MCAs/DCAs the template guarantees)
│   └── customization-points.md        (what the build-specific layer fills in)
├── static-web-on-pages/
│   ├── ...
└── pure-derivation-functions-section/
    ├── ...
```

Markdown + YAML/JSON. Lives in `architecture/` because templates are architecturally load-bearing (Discovery and TD consult them), not Codex artifacts (Codex never writes to `runs/` or `architecture/` per the workspace-boundary memory; Codex only *reads* templates to surface them on the dashboard).

### 2. Schema sketch (template.yaml)

```yaml
template_id: pat-auth-readonly
version: 1
status: stable        # stable | draft | deprecated
promoted_from_build: github-profile-card
promoted_at: 2026-05-17
applies_to:
  artifact_kinds: [web_app, cli]
  prompt_patterns:
    - "any tool that calls an authenticated third-party HTTP API for the user"
    - "any tool that needs to identify the user to that API"
substrate_provided:
  # What Discovery inherits
  default_assumptions:
    - {id: PA-A1, assumption: "User provides their own PAT; tool never stores or transmits it elsewhere", confidence: high}
    - {id: PA-A2, assumption: "PAT held in memory for the session only; no localStorage by default", confidence: high}
  default_proper_nouns:
    - {surface: "Personal Access Token", role: target_defining, canonical_source_required: true}
  default_ips_with_defaults:
    - {id: PA-IP1, topic: "PAT input UX", default_branch: "labeled password input with 'create one' link to provider's token page", importance: medium}
    - {id: PA-IP2, topic: "Persistence", default_branch: "in-memory only; opt-in localStorage", importance: medium}
  default_oos:
    - "OAuth flow (PAT only)"
    - "Server-side token storage"
    - "Token sharing across users"
  default_first_contact_requirements:
    - {description: "PAT input field is visible above the fold with explanatory text and a link to create a token", artifact_type_basis: "authenticated-API tool"}
  # What TD inherits
  default_section_template:
    section_id: "{prefix}-api-client"
    charter_pattern: "Encapsulate all network interaction behind a single async function. Issue authenticated requests via Authorization: Bearer header. Classify every failure into the typed error taxonomy. No DOM access, no global state."
    acceptance_pattern: "Returns a fully-shaped payload for valid auth; throws the right typed error for each failure mode."
    default_error_taxonomy:
      - UserNotFoundError
      - AuthError
      - RateLimitError
      - NetworkError
      - MissingTokenError
  default_assertions_pointer: "architecture/session-templates/pat-auth-readonly/default-assertions.json"
customization_points:
  - "API base URL"
  - "Specific endpoints called"
  - "Payload shape per the API"
  - "Per-API rate-limit semantics"
  - "Token scope guidance (which scopes the user needs to create)"
opt_out:
  description: "Discovery may reject this template when (a) the prompt explicitly forbids user-supplied credentials (b) the API supports anonymous-only access for the use case (c) AutoBuilder's resource registry has a pre-provisioned credential for this API"
  recorded_as: "Discovery ledger field `template_opt_outs[]` with id + rationale"
```

### 3. Lifecycle: how templates get created and retired

**Promotion (extract template from a build):**

Templates are **promoted from completed builds**, not invented ex nihilo. Add a step to the existing ratification flow (`ratify-build.bat`):

> "Of this build's substrate (ledger entries, section charters, contracts, assertion patterns), is anything reusable as a session template? If yes, name candidates and the Maintenance/user pass extracts them into `architecture/session-templates/` with a `promoted_from_build` field pointing back."

The Codex `patterns` view feeds this — if a section name has appeared in N≥3 builds with similar charter wording, it's a candidate. Manual extraction for v1; semi-automated extraction is v2 territory.

**Versioning:**

`template.yaml#version` is monotonic. When a template is updated, the new version sits alongside the old (`pat-auth-readonly/v1.yaml` becomes `v2.yaml`). Builds record which version they consumed. Old versions stay valid for re-audits of prior builds.

**Deprecation:**

`status: deprecated` + `superseded_by: <new_template_id>` field. Discovery + TD warn (not fail) when a build inherits a deprecated template; run-report surfaces the inheritance for awareness.

**Empty starting state is fine:**

`architecture/session-templates/` starts empty (or with a single seed template extracted from this build). The infrastructure is what matters; templates accumulate as builds complete.

### 4. Charter amendments needed

**Discovery (Initial Mode):**

After step 2 ("enumerate proper nouns") and before step 4 ("capture explicit assumptions"), insert:

> **2.5. Consult session templates.** Read `architecture/session-templates/README.md` for the current index. For each template whose `applies_to.artifact_kinds` and `applies_to.prompt_patterns` match the prompt at hand, evaluate: does this template's substrate fit? If yes, record on the ledger as `inherited_templates: [{id, version}]` and inherit the template's default assumptions, proper nouns, IPs, OOS, and first-contact requirements as starting points. Discovery may amend any inherited entry by adding to or overriding it; record the deviation in `template_deviations[]`. Discovery may reject a template match entirely; record in `template_opt_outs[]` with rationale.

**Technical Discovery (Initial Mode):**

After step 3 ("draft section breakdown") and before step 4 ("for each section, charter + acceptance"), insert:

> **3.5. Consult inherited templates.** For each template in `ledger.inherited_templates[]`, read its `default_section_template` and consider slotting it as one of the sections. The template provides charter wording, acceptance pattern, assertion patterns, and an OOS list. TD customizes only the customization-points named in the template. Record on `sections[].source: "template:{id}@v{N}"` for template-slotted sections; `source: "td-original"` otherwise.

**Editor:**

Add a 6th structural check:

> **template_fidelity** — For each `sections[].source: "template:{id}@v{N}"`, confirm that the section's charter does not violate the template's `substrate_provided` (e.g., a section slotted from `pure-derivation-functions-section` template must not depend on `fetch` or DOM). For each `ledger.template_deviations[]`, confirm the deviation is documented with rationale. Verdict still `pass | pass_with_recommendations | route_to_td`.

**Critic (final-sweep):**

Add a 10th check (parallel to `prose_coverage`):

> **template_drift** — For each `sections[].source: "template:{id}@v{N}"`, walk the template's `default_assertions` and verify each assertion still has a pointer to a covering assertion in the build's sections file. Template assertions that didn't make it into the build are flagged as drift (the template's contract with the build was that those assertions would hold).

### 5. Relationship to the resource registry

| | Available Build Resources Registry (in flight) | Session Templates (this proposal) |
|---|---|---|
| **Answers** | "What's already provisioned for me?" | "What's already designed for me?" |
| **Layer** | Infrastructure (Pages, FORK_PAT, gto-poker Firebase, future shared services) | Code substrate (section charters, IP defaults, error taxonomies, OOS lists, assertion patterns) |
| **Consumed by** | Discovery + TD (to choose infra paths) | Discovery + TD (to choose substrate paths) |
| **Lifecycle** | Maintenance-curated; entries added when infra is provisioned | Build-promoted; entries added at ratification when substrate is reusable |
| **Storage** | `architecture/available-build-resources.md` (TBD by registry proposal) | `architecture/session-templates/` (this proposal) |
| **Dashboard** | Codex panel: resource table | Codex panel: template table |
| **Failure if missing** | TD asks user to provision infra → user friction | TD designs substrate from scratch → wasted cycles + variance + dehydrated patterns |

The two together produce: a Discovery + TD pair that, on any new prompt, asks first *"what's already available to me from prior builds?"* and only designs from scratch the build-specific delta. That is the operational version of the v1.10-candidate `feedback_autobuilder_shared_deployment_infrastructure.md` memory entry, generalized from "shared infrastructure" to "shared everything-prior-builds-figured-out."

---

## Open design questions for Maintenance

1. **Storage shape — single file vs per-template directories.** Per-template directories (this proposal's sketch) scale better long-term and let each template carry its own reference-build + default-assertions + customization notes; single file is simpler for v1. Recommendation: per-template directories from v1; the per-template files compose naturally into the same dashboard surface either way.

2. **Promotion authority — Maintenance, user, or automated.** Templates extracted from builds need someone to author the YAML. Options:
   - (a) Maintenance extracts during ratification review
   - (b) User triggers extraction via a `promote-template.bat <build-slug> <template-id>` script
   - (c) Automated extraction by Codex's `patterns` view when threshold (N≥3 similar builds) hits
   - Recommendation: (a) for v1.12, (b) for v1.13, (c) is v2.x.

3. **Template-rejection consequences.** When Discovery rejects an applicable template via `template_opt_outs[]`, should Editor flag it for re-review (high-friction; ensures conscious rejection) or just log it (low-friction; trusts Discovery's judgment)? Recommendation: log-only at v1, escalate to flag-for-review only if template rejection rates suggest templates are noisy.

4. **Template version conflicts.** When `pat-auth-readonly@v2` is promoted but a build halfway through inherited @v1, does the build complete on @v1 or get migrated? Recommendation: complete on the version the build started with (immutable substrate), regardless of new releases.

5. **Multi-template composition.** A build needing both `pat-auth-readonly` + `static-web-on-pages` + `pure-derivation-functions-section` should be able to inherit all three. Templates must be designed so they compose (no shared section IDs that clash, no contradictory OOS lists). Recommendation: schema includes `composes_with: []` and `incompatible_with: []` fields per template; Editor's new template_fidelity check audits composition.

6. **Where do templates live for a promoted build?** Per `feedback_autobuilder_promotion_completeness.md`, promotion ships a standalone repo. Should the inherited templates' source be packaged into the promoted repo, or just referenced by id+version? Recommendation: referenced by id+version (templates are AutoBuilder substrate; the promoted product just records what it inherited).

---

## What this proposal needs from Maintenance vs what Maintenance owns

**This proposal is asking Maintenance to:**

1. Approve or amend the proposed schema, location, and lifecycle.
2. Author the file_schemas.md amendment defining template.yaml shape (parallels how `architecture/file_schemas.md` defines all other substrate).
3. Author the charter amendments for Discovery, TD, Editor, Critic (sketched above; needs Maintenance's precision).
4. Decide the open design questions above.
5. Coordinate with Codex on the dashboard surface (likely a sibling panel to the resource registry's).
6. Decide whether this proposal's first template extraction should be done as part of the v1.12 amendment work, or deferred until the first ratification of a build that wants to opt into template-inheritance.

**Orchestrator (the role that filed this) does NOT own:**

- Architecture writes — only Maintenance writes to `architecture/`.
- Codex dashboard work — Codex owns its own surface.
- Decision on whether to land this at all — Maintenance + user judgment.

**Orchestrator commits to, once this lands:**

- Consulting `architecture/session-templates/` at every Discovery dispatch (charter amendment will codify this).
- Naming inherited templates in run-reports so the empirical signal on which templates get reused vs rejected is visible.
- Filing `template_deviation` notes when a build needs to amend an inherited template — those notes are the input signal for whether a template is right or needs versioning.

---

## Suggested sequencing within v1.12

If Maintenance accepts this proposal as v1.12 amendment material alongside the resource registry:

1. **Week 1:** Resource registry schema + first 3 entries (Pages, FORK_PAT, gto-poker Firebase). Codex `patterns` view ships read-only.
2. **Week 2:** Session template schema + Discovery/TD charter amendments. First template extracted from github-profile-card (`pat-auth-readonly`) as the seed entry.
3. **Week 3:** Editor + Critic charter amendments. First build under v1.12 — exercise both registries end-to-end.
4. **Week 4:** Run-report on v1.12's first build. Adjust schemas based on what the exercise surfaced.

If Maintenance prefers staggered landings (resource registry first, session templates as v1.13), that also works — the two are independent and the resource registry has more momentum already. The argument for landing both as v1.12 is that they have the same root cause (agents don't know they're inside AutoBuilder) and Discovery + TD's charter is touched once instead of twice.

---

## Anti-patterns to defend against

These were called out in the conversation that produced this proposal; recording them so the design doesn't drift toward them:

- **Premature abstraction.** Templates that are "obvious" before being extracted from real builds tend to be wrong. Resist the urge to seed the registry with speculative templates before the Codex `patterns` view shows what's actually recurring.
- **Mandatory templates.** Templates must be opt-out. Discovery has to be able to reject a template match when the prompt has specific reasons. Charter amendments enforce this via `template_opt_outs[]` being a first-class field, not a hidden override.
- **Templates that hide decisions.** Every template-derived field still needs `covers` edges and source attribution per Principle C and Principle H. The prose-coverage check doesn't get a pass just because the value came from a template. Section files must record `source: "template:{id}@v{N}"` for inherited fields and `covers` pointers must still resolve.
- **Template versioning rot.** Templates need explicit versions; builds record which template version they used; deprecation surfaces in the run-report. Without this, the registry will silently drift and old builds will become un-re-auditable.
- **One-build-wonder templates.** A template promoted from a single build is brittle. Promotion authority (decision question 2 above) should require evidence the pattern appeared cleanly in at least two builds, OR an explicit Maintenance acknowledgment that the template is speculative and will be re-evaluated after its first reuse.

---

## Source of this proposal

Filed by the Orchestrator instance dispatched for the `github-profile-card` build on 2026-05-17. The build delivered an artifact (PASS_WITH_CONCERNS verdict — caveats trace to the user-supplied PAT intrinsic to IP1's evidence-backed design). During Phase 2 rectification, three architecture gaps were surfaced in sequence by the user:

1. Discovery defaulted to a `file://`-served static file for a networked tool — concrete instance of the "agents don't know they're inside AutoBuilder so they pick wrong defaults" pattern.
2. Orchestrator's recovery script created a sister repo — concrete instance of "agents don't know AutoBuilder has its own git/Pages identity."
3. *"Would there be value in keeping detailed statistics on possible highly used sessions that appear often?"* — direct user request that produced this proposal.

The `available-build-resources-registry-proposal.md` from Maintenance the day before already addresses the same root cause from the infrastructure side; this proposal is the code-substrate sibling. Both should land together to fully close the gap.

Build-specific evidence and reasoning preserved in:
- `runs/github-profile-card/output/final/divergence-from-integration.json` (architectural lessons section)
- `runs/github-profile-card/run-report.md` (Uncertainty Manifest + Refinements to consider)

End of proposal.
