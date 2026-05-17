# Available Build Resources Registry — proposal

**Filed:** 2026-05-16 by Maintenance after user surfaced an AutoBuilder-context awareness gap in the latest build + proposed the registry frame.
**Status:** PROPOSAL — design phase. v1.12 amendment candidate.

## Maintenance Status

- **Last touched:** 2026-05-16
- **Overall state:** captured; design TBD; touches Discovery + TD charters, Codex dashboard, and infrastructure layer

- [x] proposal-reviewed — *Codex acked 2026-05-16 with substantive observations from the github-profile-card build (which completed PASS_WITH_CONCERNS, contrary to the "failed" framing in the original post). See Codex acks below for the symptom-reconciliation pass — 2 of 3 symptoms confirmed structurally, 1 reframed.*
- [ ] registry-shape-defined — *what fields per resource, who curates, where it lives on disk.*
- [ ] consumption-mechanism-defined — *how builds discover the registry; charter amendments for Discovery + TD.*
- [ ] codex-dashboard-surface-decided — *whether the registry has a UI panel in Codex or stays as architecture/ markdown.*
- [x] firebase-bootstrap-binding-decided — *USER DECISION 2026-05-17: gto-poker-async-duel's Firebase becomes a SHARED resource. Scope flips from `scoped-to-gto-poker-async-duel` to a shared scope (exact shape TBD by Maintenance; likely `all-builds-with-compatible-auth-model`). Companion direction: Codex begins keeping connector-usage statistics on overseer sections to identify high-frequency dependencies for pre-packaging — captured as separate proposal at `codex/docs/connector-usage-analytics-proposal.md`. The Firebase decision is the registry's first user-flagged shared resource; the analytics is what makes the registry self-growing thereafter.*

### Maintenance notes

2026-05-16: Filing this immediately after user reported three structural issues with the build that just ran (or attempted to run):

1. **Discovery picked "local desktop app" over "web app"** for a prompt that should naturally have resolved to web_app inside AutoBuilder. Discovery's `simplest-within-reason` rule treats prompts in isolation; it doesn't know that inside AutoBuilder, web_app is the cheaper shipping path (free Pages hosting, zero setup).
2. **TD designed the build assuming the user would configure a GitHub PAT.** AutoBuilder already has `FORK_PAT` in its GitHub Actions secrets; the user shouldn't need to set up authentication. TD treated the user as the infrastructure operator.
3. **TD or Coordinator proposed creating a "sister repo"** rather than landing the artifact at `runs/{slug}/output/final/` per file_schemas.md. That's a hard architectural break — the directory layout is unambiguous about where artifacts live.

All three symptoms have the same root cause: **build agents don't know they're inside AutoBuilder**. Their charter contains the role's process but no system-level execution-context awareness.

User's framing: *"we should start to think about keeping a 'settings' panel that keeps a list of available build libraries that have login information such as the firebase installation created in the GTO poker application."*

This is stronger than just adding a static "you are inside AutoBuilder" preamble to charters. It's a **discoverable registry of pre-configured resources** — services, libraries, credentials, hosting — that any new build can evaluate and bind to. Concrete: another build needing async state shouldn't ask the user to set up a new Firebase project; it should see "Firebase project X exists, scoped to build Y, free-tier usage, reusable for read-only access" in the registry, decide whether to reuse or request new, and proceed without forcing user infrastructure setup.

### Codex acks

2026-05-16 — substantive ack from Codex after walking `runs/github-profile-card/` post-delivery. Build outcome: **PASS_WITH_CONCERNS** (10/10 first-contact requirements pass; all 14 caveats trace to the user-supplied PAT, which IP1 evidence-backed-resolved as intrinsic to the design). The build did deliver a functional artifact — the architecture's always-deliver contract held. The "failed" framing in the original post needs nuance.

**Symptom-by-symptom reconciliation:**

1. **"Local app instead of web app"** — REFRAMED. The build actually delivered a static HTML+CSS+JS bundle (which structurally IS a web app — it runs in a browser). What went wrong is the *deployment framing*: TD's section breakdown produced a deliverable shipped as `output/final/index.html` with `README-RUN.md` instructions saying "double-click index.html." That triggered the file:// CORS failure mode the user reported, which Phase 2 recovered from by inlining everything into a single HTML file. The recovery's `divergence-from-integration.json` contains its own `architectural_lessons_for_next_amendment_loop` section, and **Orchestrator itself pre-figured this proposal verbatim**:

   > "Alternative deliverable form that would have eliminated the entire failure class: deploy as GitHub Pages (HTTPS origin, ES modules work natively, shareable link). The v1.10-candidate 'Shared Pages + shared Firebase across builds' memory entry already points at this direction. For GitHub-themed tools specifically, GitHub Pages is the natural host."

   So the gap isn't "Discovery picked desktop over web" — Discovery + TD did pick web. The gap is **"Discovery didn't know AutoBuilder auto-deploys runs/{slug}/output/final/ to Pages"**, so TD framed the deliverable as file:// rather than HTTPS-served. The registry's `AutoBuilder GitHub Pages` entry closes this — with `binding.automatic: true` + `binding.path` reading "runs/{slug}/output/final/ (during build); auto-served at https://mondrianaire.github.io/auto-builder/runs/{slug}/output/final/", TD designs the deliverable around the served URL, not around file://.

2. **"Required GitHub PAT"** — CORROBORATED with nuance. The PAT requirement is *structurally necessary* for the chosen API surface (GraphQL `pinnedItems` + `contributionsCollection` cannot be reached unauthenticated; that's GitHub's API design, not a TD oversight). Discovery's IP1 resolved this `evidence_backed` with explicit citations to the GitHub auth docs, and TD picked GraphQL precisely because the prompt needed pinned-repos data which the REST API doesn't expose. So the build correctly identified the constraint. The architectural gap is that **AutoBuilder has no concept of "build-time-available credentials"** — there's no signal to Discovery that a workflow-level PAT exists or could be made to exist. The registry's `FORK_PAT GitHub credential` entry needs a companion entry for "a GitHub-API read PAT scoped to anonymous-public-read use cases" (or similar), at which point Discovery would have a non-user path to consider for IP1's resolution.

3. **"Sister repo instead of /runs/"** — CORROBORATED in spirit. The build itself never created a sister repo internally — `runs/github-profile-card/output/final/` exists and contains the deliverable as file_schemas.md prescribes. The "sister repo" surfaced when the **user tried to manually move the deliverable to Pages** and the dispatched agent helping with the deploy suggested creating a new repo (the user said as much in the original post). So the gap is at the *deploy-help* boundary, not at the build boundary itself. Same root cause as symptom 1: agents don't know AutoBuilder's own Pages deployment path. The registry closes both by making the Pages binding discoverable.

**v1.11 emission observations (Codex's other watch-points from the build window):**

- **Top-level role reports emitted: 6 of expected ~13.** `state/reports/` contains `discovery-initial-v1.json`, `td-initial-v1.json`, `editor-v1.json`, `coordinator-v1.json`, `critic-v1.json`, `cv-v1.json`. The dispatched LLM internalized the Completion Report convention for the dispatchable top-level roles — this is the headline pass for v1.11's prompt-level substrate work.
- **Per-section reports: NOT EMITTED.** Despite 5 sections (api-client, card-renderer, data-derivers, edge-case-testing, ui-shell) all running through Overseer + Builder + Integrator (in inline mode), no `overseer-{section}-v1.json` or `builder-{section}-v1.json` files exist. The inline-mode collapse of Coordinator + Overseer + Builder may be eating the per-section reports — Coordinator's `coordinator-v1.json` is the only artifact carrying section-level narrative. This is a real emission gap for v1.12 to address: under inline mode, either (a) Coordinator's report needs explicit per-section sub-blurbs, or (b) the inline-mode Overseer/Builder roles need to emit their own reports despite being collapsed.
- **`state/live/current-step.json` NEVER WRITTEN.** Empty `state/live/` directory. The atomic-write substrate Maintenance shipped is unused. Critic did NOT raise a Sev-2 audit finding for the missing file — confirming both ends of watch-point 2: writer not emitting + auditor not catching. v1.12 needs explicit dispatcher hooks for current-step.json (it cannot be charter-text-only because no role's own self-interest pulls them toward writing it).
- **Banned-vocabulary in blurb answers: 3 of 6 reports have hits.** Spot-check via grep against the banned list:
  - discovery-initial-v1.json — CLEAN.
  - td-initial-v1.json — CLEAN.
  - editor-v1.json — CLEAN.
  - coordinator-v1.json — leaked `DCA`, `MCA`, `dispatch`, `tier 2`.
  - critic-v1.json — leaked `MCA`, `DCA`, `tier 2`, `escalation`.
  - cv-v1.json — leaked `verdict`, `IP1`, `Principle`.

   Pattern: roles whose own work-product naturally uses the banned vocabulary (Coordinator's dispatch language, Critic's audit language, CV's verdict/IP/Principle language) leak it into the user-facing blurbs. Roles closer to prompt-fidelity (Discovery, TD, Editor) stayed clean.

   **Update (later same day):** the user reframed this finding: don't ban the vocabulary from content (it's load-bearing developer signal), ban it from the top user-frontend view only. Audience-layered shape — `user_headline` field per report for the dashboard's top view; blurb `answer` text keeps full technical vocabulary for the developer drill-down. Captured as separate proposal at `codex/docs/blurb-audience-layering-amendment.md`. This supersedes the earlier per-role-rewrite-examples suggestion above.

**Strong endorsement of the registry frame.** The reason the registry is the right shape (rather than just a static "you are in AutoBuilder" charter preamble): it makes the answer to "what's free / what's already configured" *queryable* during Discovery + TD's reasoning, rather than relying on the dispatched LLM to recall a list. Static preamble would tell agents "GitHub Pages exists for you" but couldn't tell them "and the project ID is X, scoped Y, free-tier usage caps Z" — that requires structured data. Worth noting that the existing memory entry `feedback_autobuilder_shared_deployment_infrastructure.md` is the *intent*; the registry is the *mechanism*; this proposal's three-symptom mapping is the *evidence the intent is load-bearing*.

**Codex-side implementation considerations for the registry's UI surface (if it lands as a dashboard panel):**

- Existing dashboard already loads `architecture/README.md` for amendments and `architecture/principles.md` for principles via the aggregator. Adding a parser for `architecture/available-build-resources.md` (or `architecture/resources/registry.md`) fits the same pattern — one helper in aggregate.mjs, one new section in index.html. ~2 hours of work for v0.1 read-only.
- The panel could surface differently colored badges per resource `kind` (hosting / baas / credential / library) using the existing `.kind-chip` CSS conventions from the deliverable-kind chips.
- A "Resources" filter button on the roster would let user see "show me builds that bind to Firebase-from-gto-poker-async-duel" — useful for impact analysis when a shared resource needs migration. Defer to v0.2.

**Recommendations on the proposal's 5 open design questions (Codex view):**

1. **Single file vs per-resource files** — single file for v0.1. Per-resource scales better long-term but adds parsing complexity; not warranted with 3-5 starting entries.
2. **How builds consume** — dispatcher-injected into every role's system prompt. Agreed. Anything optional gets skipped.
3. **Not-in-registry resources** — agreed with the proposal's path (TD escalates with the 3-option choice, becomes only sanctioned user-infra path). This is exactly the kind of friction that drives the registry's growth — every "not in registry" event becomes a candidate for a new entry.
4. **Dashboard surface synchronous vs eventual** — start read-only, defer read-write. Per the existing async-coordination convention, user-curated entries can land via Maintenance editing the markdown until the UI write path is justified.
5. **Multi-tier (AutoBuilder-wide vs build-scoped vs user-wide)** — the `scope` field captures it. UX-tier separation can come later if the registry grows beyond ~10 entries. Don't over-engineer the surface for 3 starting entries.

**Recommended next step from Codex's view:**

Land v1.12-minimal as proposal recommended — single `architecture/available-build-resources.md` file with 3 entries (Pages, FORK_PAT, Firebase-from-gto-poker-async-duel — with the latter's `scope` flipped to `all-builds-with-compatible-auth-model` if user confirms), Discovery + TD charter pointers, no dashboard surface yet. Validates the format. The next build is the test of whether the consumption mechanism works in practice.

---

**Codex ack addendum 2026-05-17 (user decisions + scope expansion):**

User decided BOTH outstanding questions in one message:

1. **Firebase scope: SHARED.** gto-poker-async-duel's Firebase project becomes the registry's first user-flagged shared resource. Scope flips from `scoped-to-gto-poker-async-duel` to a shared scope (exact shape — `all-builds-with-compatible-auth-model` or similar — for Maintenance to settle).

2. **Connector-usage analytics: ADOPT.** *"codex should begin keeping statistics on overseer sections to identify most used 'connector' (not claude) such as database connection and web servers to identify them and prepackage them if necessary."*

   The "(not claude)" clarification is load-bearing — this is NOT about MCP/Claude connectors (LLM integrations). It's about each build's RUNTIME TECHNICAL DEPENDENCIES: the database clients, web servers, frameworks, external APIs, hosting targets, auth schemes that builds compose with.

   Captured as a separate Codex-side proposal at `codex/docs/connector-usage-analytics-proposal.md`. The proposal:

   - Defines a connector-categorization taxonomy (BaaS, database_self_hosted, api_external, auth, hosting_runtime, framework_ui, framework_server, visualization, bundler_buildtool, testing, data_format, cdn_asset, other).
   - Extracts connector signals from four substrate sources per build (Discovery proper_nouns → first_contact_requirements → TD section charters → builder source-grep), precedence-ordered.
   - Aggregates per-build into `codex/data/connectors/{slug}.json` and corpus-wide into `codex/data/connector-usage.json`.
   - Surfaces high-frequency connectors as registry-entry candidates with a user-confirmed promotion step (no auto-promotion in v0.1).
   - Two pre-packaging levels: Level 1 (lightweight — `reference_implementation` field on registry entry pointing at a known-good builder output) and Level 2 (heavy — vendored scaffolds in a project-level `vendor/` or `scaffolds/` directory, deferred to v0.19+).
   - Asks Maintenance to extend registry-entry schema with `extracted_from_builds[]`, `extraction_source` (`maintenance-curated` vs `codex-detected-via-usage`), `reference_implementation`, and optional `scaffold_path` fields.

   The Firebase decision lands the registry's first user-flagged shared resource. The connector-usage analytics is what makes the registry self-growing thereafter — Codex observes patterns, surfaces candidates, Maintenance + user promote them, and the registry becomes a discoverable catalog of what the corpus has proven worth pre-packaging rather than a hand-maintained static list.

   v0.18 task open on Codex side for the analytics implementation (~half-day; lands after v0.17 dashboard re-skin so the new Connectors panel can slot into the OttoBLD-styled dashboard).

## The proposal in shape

### Layer 1: a registry document

A new file `architecture/available-build-resources.md` (or possibly `architecture/resources/registry.md`) — curated catalog of pre-configured infrastructure that builds can leverage. Each entry:

```yaml
- name: "AutoBuilder GitHub Pages"
  kind: hosting
  scope: all-web-app-builds
  provides: [static_hosting, https, custom_domain_capable]
  cost: free
  setup_required_from_user: false
  binding:
    automatic: true
    path: "runs/{slug}/output/final/ (during build); shipped to mondrianaire/{slug}-AB on promotion"
  notes: "Web_app builds automatically get a live URL. No user action required."

- name: "Firebase (gto-poker-async-duel)"
  kind: baas
  scope: scoped-to-gto-poker-async-duel
  provides: [auth_anonymous, firestore, cloud_functions]
  cost: free_tier
  setup_required_from_user: false
  binding:
    automatic: false
    config_reference: "runs/gto-poker-async-duel/output/final/src/config.js"
    instructions: "If reusing: read config values, share collection namespace, respect free-tier limits. If not reusing: request new project from user (rare; default to reuse for similar use-cases)."
  reusability: "open-for-discussion"  # user has not yet declared whether this is project-specific or shareable
  notes: "Created during gto-poker-async-duel build. Has anonymous auth + Firestore + push relay configured. Used by that app for async state; other builds with compatible auth model could share if user approves."

- name: "FORK_PAT GitHub credential"
  kind: credential
  scope: workflow-2-fork-ceremony
  provides: [github_repo_create, github_pages_enable, github_push]
  cost: free
  setup_required_from_user: false  # already in GitHub Actions secrets
  binding:
    automatic: true
    invoked_by: "workflow #2 (completion-triggered-fork.yml)"
  notes: "Builds NEVER need to ask the user to set up GitHub authentication. The FORK_PAT secret handles fork + Pages enable + push."
```

### Layer 2: charter consumption

Discovery + TD charters get an "AutoBuilder Execution Context" subsection (per v1.11 pattern — small, role-specific, mechanics canonical in Notes for All Roles):

- **Discovery**: when resolving the "what kind of artifact?" IP, consult the registry. If the registry shows `hosting` available and the prompt admits web delivery, web_app is the simplest *within AutoBuilder* default. Standalone-desktop is heavier inside AutoBuilder because it foregoes free hosting; only choose it when the prompt explicitly demands offline-only / no-network / desktop-app-specifically.

- **TD**: when picking technical components (libraries, data sources, BaaS), consult the registry. Prefer registry-listed resources to recommending the user set up new infrastructure. If a build genuinely needs something not in the registry, flag explicitly that this requires user action, and recommend whether to add it to the registry (for future builds to leverage).

- **Both**: never require user to set up infrastructure (GitHub credentials, hosting accounts, API keys) unless the registry confirms it's a user-action requirement. The default expectation is "AutoBuilder has it covered."

### Layer 3: Codex dashboard surface

A "Resources" / "Settings" panel on the Codex dashboard surfacing the registry as UI. Per resource: name + kind badge + scope tag + provides list + binding mode (automatic/manual). User can:
- See what's available at a glance
- Click an entry to see the full registry record + notes
- Mark a resource as shareable / project-scoped / deprecated
- Add a new resource entry (for credentials/services the user has spun up that should be discoverable to future builds)

This makes the registry user-curated rather than static-architecture. It also becomes part of the user's mental model: "what do I have configured, and what would a new build inherit?"

### Layer 4: registry maintenance

Two paths for registry-keeping:

- **Manual curation** (recommended for v0.1): user adds entries when they spin up new infrastructure. Maintenance writes the registry markdown; user reviews/edits via Codex panel.
- **Auto-discovery** (later): a script scans `runs/{slug}/output/final/` for known patterns (firebase config files, supabase config, etc.) and proposes new registry entries for user to approve. Reduces curation burden but adds a moving part.

Start with manual; auto-discovery is a v0.2 feature.

## Connection to the existing v1.10 candidate

Memory carries `feedback_autobuilder_shared_deployment_infrastructure.md`:

> "Shared Pages + shared Firebase across builds (v1.10 candidate) — web-app builds default to one AutoBuilder Pages instance + one shared BaaS, slug-namespaced under runs/{slug}/; not N repos + N Firebase projects + N VAPID pairs."

The registry is the **mechanism** that operationalizes that note. Without a registry, "shared Firebase" is just an aspiration — there's no place to look up the project ID, no way for a new build to discover it. The registry gives "shared Firebase" a discoverable home.

If the user wants gto-poker-async-duel's Firebase to be the de facto "AutoBuilder shared BaaS," the registry entry's `scope` field flips from `scoped-to-gto-poker-async-duel` to `all-builds-with-compatible-auth-model`. Done.

## The three symptoms from the build, mapped to the proposal

1. **"Local app instead of web app"** → Discovery consults the registry, sees Pages available, defaults web_app. **Resolved.**
2. **"Required GitHub PAT"** → TD consults the registry, sees `FORK_PAT` is `setup_required_from_user: false`. TD never proposes user-side credential setup. **Resolved.**
3. **"Sister repo instead of /runs/"** → TD consults the registry, sees that `AutoBuilder GitHub Pages` binds via `runs/{slug}/output/final/` and is shipped via workflow #2. TD designs the artifact to land there, not in a sister repo. **Resolved.**

All three failure modes are downstream of the same gap. The registry closes it.

## Open design questions

1. **Where do registry entries live on disk?** Single markdown file `architecture/available-build-resources.md` (simple, low-friction) OR per-resource files under `architecture/resources/` (scales better, allows per-resource lifecycle). Probably single file for v0.1.

2. **How does a build consume the registry?** Dispatcher reads `available-build-resources.md` and includes it as part of every role's system prompt? OR roles read it themselves via a `## Resources` context_pointer? Probably dispatcher-injected so it's always visible.

3. **What happens when a build wants a resource that's not in the registry?** Charter rule: TD escalates to user with "this build needs X which isn't in the registry; do you want to (a) add X to the registry [user provides config], (b) the build will design around without X, or (c) abandon." User picks. This becomes the only sanctioned path for user infrastructure setup.

4. **Codex dashboard surface — synchronous or eventual?** A read-only "Resources" panel is easy. A read-write panel (user adding resources from the UI, edits flowing back to markdown) is more complex. v0.1 = read-only; v0.2 = read-write.

5. **Multi-tier registry?** Some resources are AutoBuilder-wide (FORK_PAT, Pages). Some are build-scoped (gto-poker-async-duel's Firebase). Some are user-wide (the user's personal Firebase account if they have one). The `scope` field captures this but the UX could surface tiers as separate sections.

6. **Versioning?** Resources change over time (Firebase project deleted, credential rotated, new service added). The registry needs a way to mark entries deprecated / migrated.

## Recommended next step

When the design discussion picks back up:

1. **Codex surfaces observations from today's build** in the Codex-acks section. Especially: did Codex see the build try to create a sister repo / require user PAT setup, and at what stage (TD? Coordinator? Builder)? Source data informs which roles need the registry-consumption addendum most urgently.
2. **User decides on Firebase reusability**: is gto-poker-async-duel's Firebase scoped to that app, or available as a shared resource? This is the keystone decision for whether the registry becomes operational or stays aspirational.
3. **First registry entry shipped** as a v1.12 minimal landing: just the three entries above (Pages, FORK_PAT, Firebase-from-gto-poker-async-duel). Validates the format. Future builds consume.
4. **Charter amendments to Discovery + TD** referencing the registry.

This is a substantial design surface. The smart move is to land v1.12-minimal (registry doc + Discovery/TD pointer + 3 entries) first, then iterate on dashboard surface + auto-discovery + multi-tier later.
