# Auto Builder — Project Brand

**Current brand identity:** OttoBLD (vintage aviation / mission-control documentation aesthetic)
**Status:** ACTIVE — adopted as project default 2026-05-17
**Version:** v0.1 (skill version)

## What lives here

| File | Purpose |
|---|---|
| `brand-identity.md` | Canonical brand spec — colors, typography, components, application rules. Read this first |
| `brand-book.html` | Visual reference — open in a browser to see every component rendered |
| `assets/css/ottobld-tokens.css` | Drop-in CSS variables — paste into any web build's stylesheet root |
| `assets/css/ottobld.css` | Full named-component stylesheet — masthead, stat-tile, boarding-pass, stamp, etc. |

## Policy

All new build deliverables follow OttoBLD by default. Discovery's restatement of the user's request should commit to OttoBLD visual identity for any web/visual deliverable unless the prompt explicitly overrides. TD picks `assets/css/ottobld-tokens.css` (or `ottobld.css` if components needed) as a default include for web_app builds.

The brand is changeable — replace the contents of this directory with a different brand identity bundle and the project switches over. But at any given moment, all in-flight + future builds must look uniform: don't mix brand identities across a single build, and don't ship "AutoBuilder-default" branding alongside a custom-prompt brand override in the same artifact.

**Archived/ratified builds are NOT retroactively re-skinned.** Historical artifacts preserve whatever brand they shipped under.

## How builds consume the brand

Pre-v1.12 (today): Discovery + TD reference this directory in their charters; no automatic consumption. Builders manually copy or import `brand/assets/css/ottobld-tokens.css` into the deliverable's stylesheet.

Post-v1.12 (planned): The available-build-resources registry catalogs OttoBLD as a `kind: brand_identity` entry with `binding: automatic`. Discovery + TD consult the registry; Builders import the tokens automatically; CV's visual conformance check verifies presence of the stripe band + paper background + three-voice type system before passing the build.

See `codex/docs/maintenance-initiated/available-build-resources-registry-proposal.md` and `codex/docs/ottobld-as-project-default-brand.md` for the full registry-as-mechanism design.

## How the brand itself can be changed

Three steps:
1. Replace `brand-identity.md`, `brand-book.html`, and the `assets/` directory with the new brand's equivalents.
2. Update the OttoBLD skill at `~/.claude/skills/ottobld/` (or install the new brand's skill) so the Skill tool reflects the change.
3. Update the registry entry's `name` + `provides` fields and any per-build curation overlays that pin to the old brand explicitly.

Until step 3, builds will start producing artifacts in the new brand. To preserve uniformity across an in-progress wave, batch the swap to a clean boundary (between builds, not mid-build).

## Skill integration

The OttoBLD skill is installed at `~/.claude/skills/ottobld/`. Invoke via the Skill tool when designing anything visual — it loads the surface map (web pages, charts, photographs, video, social posts, slide decks, etc.) and per-surface reference files automatically.
