# Connector usage analytics — Codex-side proposal

**Filed:** 2026-05-17 by Codex after user direction to (1) make gto-poker-async-duel's Firebase a shared resource and (2) begin keeping statistics on overseer sections to identify the most-used technical connectors and pre-package them.
**Status:** PROPOSAL — design phase. Implementation v0.18 task open.
**Tier:** medium substrate amendment; Codex aggregator + dashboard surface + connector-categorization heuristics. ~half-day implementation for v0.18; pre-packaging mechanism is a follow-on.

## Maintenance Status

- **Last touched:** 2026-05-17
- **Overall state:** proposal filed; depends on registry shape decision in `available-build-resources-registry-proposal.md`

- [ ] proposal-reviewed — *Maintenance acks the analytics direction; aligns with registry shape.*
- [ ] connector-categorization-defined — *taxonomy of connector kinds (BaaS/API/Hosting/Auth/Framework/Viz/Other).*
- [ ] extraction-heuristic-defined — *which fields to mine from each run, with what precedence.*
- [ ] promotion-threshold-defined — *at what usage count does a detected connector become a registry-entry candidate.*
- [ ] codex-side-implementation-landed — *aggregator extraction + dashboard panel.*

### Codex notes

2026-05-17: Filing per user direction. The user expanded the registry vision from "static catalog Maintenance curates" to "data-driven catalog where Codex observes build patterns and surfaces commonly-used dependencies for promotion to shared resources." This proposal captures the Codex-side mechanism.

## The user's direction (verbatim)

> *"not only should that resource become a shared resource, codex should begin keeping statistics on overseer sections to identify most used 'connector' (not claude) such as database connection and web servers to identify them and prepackage them if necessary"*

Two decisions in one sentence:

1. **Firebase scope decision:** `gto-poker-async-duel`'s Firebase project becomes a SHARED resource. Registry scope flips from `scoped-to-gto-poker-async-duel` to a shared scope (exact shape TBD by Maintenance; likely `all-builds-with-compatible-auth-model` per the original registry proposal). This is the keystone decision the registry proposal flagged as load-bearing for the catalog to be operational rather than aspirational.

2. **Codex begins connector-usage analytics:** observe what build sections actually depend on, count frequencies, surface high-frequency dependencies as registry-entry candidates that should be pre-packaged for future builds to inherit.

The "(not claude)" clarification is load-bearing: this is NOT about MCP/Claude connectors (LLM integrations). It's about the BUILD'S runtime technical dependencies — the bricks builds compose with to make their deliverables function. Firebase as BaaS, Express as web server, Leaflet as map renderer, `api.github.com` as data source.

## Why this matters

The github-profile-card build proved the gap. It reached for GitHub's REST + GraphQL APIs with PAT auth, a static-HTML page shell, no framework, ES modules → recovered to single-file inline. Those choices weren't recorded as "connectors used" anywhere — Codex sees the build's slug + verdict + section count, but doesn't know that "another build needed GitHub REST + PAT auth" without re-reading every section's charter.

After this proposal:
- Build A finishes → aggregator extracts `[github-rest-api, github-graphql-api, pat-auth, vanilla-static-html, leaflet-no]` as the connectors.
- Build B (months later, different prompt) starts → if Discovery's restatement implies GitHub data, Codex can surface: "8 prior builds used `github-rest-api`; consider the existing pattern at runs/github-profile-card/output/final/js/api-client.js as a starting point" — or, once the connector is pre-packaged, "use registry entry `gh-rest-client-vendored`."

## What gets extracted

Per-build connector extraction walks four substrate sources, in precedence order:

| Source | Signal | Example output |
|---|---|---|
| `decisions/discovery/ledger-v1.json` → `proper_nouns[]` | Services explicitly named by Discovery (GitHub, Firebase, OpenAI, Stripe, ...) | `{"surface": "GitHub", "role": "data_source", "verification_status": "verified"}` |
| `decisions/discovery/ledger-v1.json` → `first_contact_requirements[]` | What the user must touch (a PAT, an account login, an API key) | "user obtains a PAT and pastes into the page" |
| `decisions/technical-discovery/sections-v1.json` → `sections[].charter` | Section-level technology choices (Leaflet, jsdom, fetch, GraphQL) | "Initialize a Leaflet map filling its container, attach a tile layer..." |
| `output/integration/manifest.json` + builder outputs | Actual import statements, fetch URLs, dependency declarations | `import { ... } from 'leaflet'`, `fetch('https://api.github.com/...')` |

The four-source extraction is precedence-ordered because Discovery's `proper_nouns[]` is the cleanest signal (Discovery explicitly named it) while source-grep is the noisiest (false positives on words in comments). When two sources disagree, the earlier source wins.

## Connector categorization taxonomy

Each extracted connector gets a `kind` tag for cross-build aggregation:

| Kind | Examples |
|---|---|
| `baas` | Firebase, Supabase, AWS Amplify, Convex |
| `database_self_hosted` | Postgres, MongoDB, SQLite, Redis |
| `api_external` | GitHub REST, OpenAI, Stripe, USGS earthquake feed, GraphQL endpoints |
| `auth` | PAT, OAuth, JWT, Firebase Auth, magic link |
| `hosting_runtime` | GitHub Pages, Vercel, Netlify, Cloudflare, Node `http.server`, Python `http.server` |
| `framework_ui` | React, Vue, Svelte, vanilla, Solid, lit |
| `framework_server` | Express, Fastify, Next.js, FastAPI |
| `visualization` | Leaflet, D3, Chart.js, Recharts, Three.js, Plotly |
| `bundler_buildtool` | Vite, Webpack, esbuild, Rollup, parcel |
| `testing` | Jest, Vitest, Playwright, jsdom |
| `data_format` | GeoJSON, GraphQL schema, CSV, Parquet |
| `cdn_asset` | Tailwind CDN, jsDelivr, cdnjs |
| `other` | Anything that doesn't fit |

Per-build connector list: `[{name, kind, role, source_files[], external_url?, auth_required?}]`.

## Per-build → corpus aggregation

Aggregator emits two new artifacts:

**`codex/data/connectors/{slug}.json`** — per-build:

```json
{
  "slug": "github-profile-card",
  "extracted_at": "2026-05-17T...",
  "connectors": [
    {"name": "GitHub REST API", "kind": "api_external", "role": "data_source",
     "external_url": "https://api.github.com", "auth_required": "pat",
     "source_files": ["output/final/js/api-client.js"],
     "discovery_proper_noun": true},
    {"name": "GitHub GraphQL API", "kind": "api_external", "role": "data_source",
     "external_url": "https://api.github.com/graphql", "auth_required": "pat",
     "source_files": ["output/final/js/api-client.js"],
     "discovery_proper_noun": true},
    {"name": "Personal Access Token", "kind": "auth", "role": "user_credential",
     "source_files": ["output/final/index.html", "output/final/js/api-client.js"]},
    {"name": "vanilla static HTML", "kind": "framework_ui", "role": "ui_surface"},
    {"name": "GitHub Pages (manual)", "kind": "hosting_runtime", "role": "deploy_target"}
  ]
}
```

**`codex/data/connector-usage.json`** — corpus-wide:

```json
{
  "generated_at": "2026-05-17T...",
  "totals": {
    "build_count": 11,
    "unique_connectors": 47,
    "category_distribution": {"api_external": 9, "auth": 5, "visualization": 4, ...}
  },
  "connectors": [
    {"name": "GitHub REST API", "kind": "api_external",
     "used_in_builds": ["github-profile-card"], "count": 1, "promotion_candidate": false},
    {"name": "Firebase", "kind": "baas",
     "used_in_builds": ["gto-poker-async-duel"], "count": 1, "promotion_candidate": true,
     "promotion_reason": "user-flagged as shared resource 2026-05-17"},
    {"name": "vanilla static HTML", "kind": "framework_ui",
     "used_in_builds": ["github-profile-card", "earthquake-map", "tic-tac-toe", "blackjack-trainer", "kanban-board", "latex-equation-renderer", "gto-poker-trainer", "gto-poker-async-duel"],
     "count": 8, "promotion_candidate": true,
     "promotion_reason": "high-frequency: 8 of 11 builds use this pattern"}
  ]
}
```

## Promotion-to-registry threshold

A connector becomes a registry-entry candidate when EITHER:

1. **Usage threshold:** count ≥ 3 builds. The same dependency reached for repeatedly is a signal that pre-packaging saves effort.
2. **User flag:** user explicitly flags it (the Firebase case — user said "this becomes a shared resource", count is 1 but importance is decided).
3. **Cost flag:** the connector requires user-side setup (PAT, account, API key). Even a single occurrence is worth surfacing — every future build that needs it costs the user setup time.

Below threshold: tracked silently, surfaced in the dashboard's "rising candidates" panel.
At threshold: surfaced as "promote to registry" with a one-click ack from the user to draft a registry entry (manual review preferred over auto-promotion, per the registry proposal's "manual curation for v0.1" stance).

## Dashboard surface (v0.18)

New "Connectors" section on the Codex dashboard. Three sub-panels:

1. **Registry-entered** — already-promoted connectors with their registry status, scope, binding mode, used-in-builds list. Cross-link to the registry entry doc.
2. **Promotion candidates** — connectors at-or-above threshold with a "Draft registry entry" button.
3. **Rising candidates** — below-threshold connectors with frequency + last-used date, sortable.

Each connector card uses OttoBLD treatment (per the brand adoption): a small instrument-cluster-style tile with `kind` color tag (BaaS = blue, auth = red, framework = orange, etc.), used-in count, and detail-on-click.

## Pre-packaging mechanism (deferred to v0.19+)

The user's word was "pre-package if necessary." Two levels of pre-packaging:

**Level 1 (lightweight):** the registry entry includes a `reference_implementation` field pointing at a known-good builder output, e.g., `runs/github-profile-card/output/final/js/api-client.js`. Future builds reading the registry see "here's how a prior build used this connector; copy the pattern."

**Level 2 (heavy):** the registry includes a `scaffold_path` pointing at a vendored, dependency-pinned module in a project-level `vendor/` or `scaffolds/` directory. TD's builder dispatch includes the scaffold as a starting point rather than asking the builder to write from scratch.

Level 1 is easy and high-value — extract the reference impl path from per-build connector data, surface in the registry entry. Lands cleanly in v0.18.

Level 2 is heavier — requires deciding where scaffolds live, who curates them, how versioning works, whether they're auto-extracted or hand-crafted. Defer to v0.19+ once Level 1 proves the pattern.

## Integration with v1.12 registry proposal

This proposal is the **data layer** that feeds the registry. Concrete tie-ins:

- Registry entry schema adds `extracted_from_builds[]` and `extraction_source` (`maintenance-curated` vs `codex-detected-via-usage`) fields so the catalog distinguishes hand-curated entries from data-driven ones.
- Registry entry schema adds `reference_implementation` (Level 1 pre-package) and optional `scaffold_path` (Level 2).
- Maintenance maintains hand-curated entries (Pages, FORK_PAT, OttoBLD brand). Codex maintains the `codex-detected` entries from connector usage data.
- A new entry gets promoted by either path; once in the registry, consumption mechanism (Discovery + TD querying) is identical regardless of source.

## What this proposal does NOT include

- Doesn't propose changing how Discovery/TD consume the registry — that's the registry proposal's domain.
- Doesn't auto-promote candidates to the registry — user-confirmed promotion only for v0.1; auto-promotion at very high usage thresholds is a v0.2 consideration.
- Doesn't propose Codex modifying registry entries Maintenance curated. Codex-detected entries live alongside Maintenance-curated, in a separate "auto-detected" section of the registry. Maintenance can promote a Codex-detected entry to Maintenance-curated by editing it; Codex won't overwrite.

## Implementation plan (v0.18)

| Step | Cost | Output |
|---|---|---|
| Connector extraction helper in aggregator | ~150 lines | `codex/scripts/extract-connectors.mjs` (new module) |
| Per-build `codex/data/connectors/{slug}.json` write | wired into aggregateRun | 11 files (one per current corpus build) |
| Corpus-wide `codex/data/connector-usage.json` rollup | wired into main() | 1 file |
| Dashboard "Connectors" section + 3 sub-panels | ~200 lines | new section in `codex/index.html` |
| OttoBLD-styled connector cards (per v0.17 dashboard re-skin) | ~30 lines CSS | unified with v0.17 brand pass |
| Registry-entry draft tool ("promote this candidate") | ~40 lines | generates a registry-entry markdown stub |

Total: ~half-day. Lands cleanly alongside or after v0.17 dashboard re-skin.

## Recommended next steps

1. **Maintenance:** ack the proposal direction; align on connector taxonomy + promotion threshold; update registry-proposal schema with `extraction_source` + `reference_implementation` fields.
2. **Codex:** implement v0.18 extraction + dashboard panel after v0.17 dashboard re-skin lands (substrate first, then panel slots into the re-skinned dashboard).
3. **First post-v0.18 audit:** walk the corpus, see what the top 10 connectors are by usage. Likely includes vanilla static HTML, the various external APIs, jsdom for CV — surfacing those is the first concrete win.

The Firebase decision lands the registry's first user-flagged shared resource. The connector-usage analytics is what makes the registry self-growing thereafter.
