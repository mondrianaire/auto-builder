# Available Build Resources Registry — proposal

**Filed:** 2026-05-16 by Maintenance after user surfaced an AutoBuilder-context awareness gap in the latest build + proposed the registry frame.
**Status:** PROPOSAL — design phase. v1.12 amendment candidate.

## Maintenance Status

- **Last touched:** 2026-05-16
- **Overall state:** captured; design TBD; touches Discovery + TD charters, Codex dashboard, and infrastructure layer

- [ ] proposal-reviewed — *Codex reads + acks the frame; surfaces own observations from today's build window.*
- [ ] registry-shape-defined — *what fields per resource, who curates, where it lives on disk.*
- [ ] consumption-mechanism-defined — *how builds discover the registry; charter amendments for Discovery + TD.*
- [ ] codex-dashboard-surface-decided — *whether the registry has a UI panel in Codex or stays as architecture/ markdown.*
- [ ] firebase-bootstrap-binding-decided — *whether gto-poker-async-duel's Firebase becomes a shared/discoverable resource or stays scoped to that build.*

### Maintenance notes

2026-05-16: Filing this immediately after user reported three structural issues with the build that just ran (or attempted to run):

1. **Discovery picked "local desktop app" over "web app"** for a prompt that should naturally have resolved to web_app inside AutoBuilder. Discovery's `simplest-within-reason` rule treats prompts in isolation; it doesn't know that inside AutoBuilder, web_app is the cheaper shipping path (free Pages hosting, zero setup).
2. **TD designed the build assuming the user would configure a GitHub PAT.** AutoBuilder already has `FORK_PAT` in its GitHub Actions secrets; the user shouldn't need to set up authentication. TD treated the user as the infrastructure operator.
3. **TD or Coordinator proposed creating a "sister repo"** rather than landing the artifact at `runs/{slug}/output/final/` per file_schemas.md. That's a hard architectural break — the directory layout is unambiguous about where artifacts live.

All three symptoms have the same root cause: **build agents don't know they're inside AutoBuilder**. Their charter contains the role's process but no system-level execution-context awareness.

User's framing: *"we should start to think about keeping a 'settings' panel that keeps a list of available build libraries that have login information such as the firebase installation created in the GTO poker application."*

This is stronger than just adding a static "you are inside AutoBuilder" preamble to charters. It's a **discoverable registry of pre-configured resources** — services, libraries, credentials, hosting — that any new build can evaluate and bind to. Concrete: another build needing async state shouldn't ask the user to set up a new Firebase project; it should see "Firebase project X exists, scoped to build Y, free-tier usage, reusable for read-only access" in the registry, decide whether to reuse or request new, and proceed without forcing user infrastructure setup.

### Codex acks
*(Codex writes here; especially welcome — observations from today's build window that corroborate or contradict the symptoms above.)*

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
