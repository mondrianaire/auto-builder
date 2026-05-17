# OttoBLD as project default brand — adoption note + registry integration

**Filed:** 2026-05-17 by Codex after user adopted OttoBLD as the project-wide default brand identity.
**Status:** ADOPTED — assets in place at `brand/`. Awaits charter + registry integration when v1.12 lands.

## Maintenance Status

- **Last touched:** 2026-05-17
- **Overall state:** assets shipped to `brand/`; consumption mechanism waits on v1.12 registry

- [x] brand-assets-placed — *`brand/` directory at project root with `brand-identity.md`, `brand-book.html`, `assets/css/ottobld-tokens.css`, `assets/css/ottobld.css`. README explains policy + consumption.*
- [x] codex-aware — *Codex reads brand from `brand/`; v0.17 task open to re-skin the dashboard itself in OttoBLD.*
- [ ] discovery-td-aware — *charter amendments referencing `brand/` as a default. Maintenance-side work. Lands cleanly inside v1.12 registry amendment if that's the chosen mechanism.*
- [ ] registry-entry-shipped — *concrete entry shape in `architecture/available-build-resources.md` once Maintenance lands the registry.*
- [ ] cv-visual-conformance-check — *CV adds a visual-conformance audit (paper background present, stripe band present, three-voice type detectable) — non-blocking warning v1, hard fail in a later version once builds reliably emit OttoBLD-compliant output.*

### Codex notes

2026-05-17: Filing this to capture the adoption decision and the path forward for build-time consumption.

## The user's direction

> *"I am uploading a brand identity concept that I want to adopt for the entire project. By default the deliverables of the builds should be in accordance with the brand identity. We can change the brand identity but everything must look uniform when developed (dont need retroactive for archived builds)."*

Three load-bearing claims:
1. **Default** — every new build deliverable uses OttoBLD unless explicitly overridden.
2. **Uniform** — at any given moment, all in-flight + future builds look uniform. Don't mix brand identities across one build, don't ship two different brand defaults concurrently.
3. **Not retroactive** — archived/ratified builds are preserved as-shipped; no re-skin pass on the corpus.

## Asset placement

`brand/` at project root:

```
brand/
├── README.md                       (current version + policy + how to swap)
├── brand-identity.md               (canonical spec — 342 lines, full design system)
├── brand-book.html                 (visual reference — open in browser)
└── assets/
    └── css/
        ├── ottobld-tokens.css      (CSS variables only — drop-in)
        └── ottobld.css             (full named-component stylesheet)
```

Project-root placement chosen over `architecture/brand/` because:
- Brand is read by Codex AND consumed by build deliverables — neither is a clean "owns it" lane.
- Project-root makes "swap the brand" a single directory replacement, no path rewrites elsewhere.
- Doesn't violate the workspace-boundary memory (Codex never writes to `architecture/`).

## How this integrates with the v1.12 registry proposal

OttoBLD is exactly the kind of "available build resource" the registry proposes. The concrete entry, when Maintenance lands the registry:

```yaml
- name: "OttoBLD Brand Identity"
  kind: brand_identity
  scope: all-builds-default
  provides:
    - css_variables           # ottobld-tokens.css (drop-in)
    - typography_system       # three-voice stack (italic Georgia · monospace · system sans)
    - color_palette           # paper backgrounds + four-stripe rainbow accents
    - component_vocabulary    # masthead · stat-tile · boarding-pass · stamp · telex · etc.
    - surface_map             # web · chart · photo · video · social · slide · doc
  cost: free
  setup_required_from_user: false
  binding:
    automatic: true
    discovery_default: "When the prompt admits a visual deliverable, restate as OttoBLD-styled by default. Note the brand commitment in ledger restatement."
    td_default: "For web_app deliverables, include brand/assets/css/ottobld-tokens.css in the section that owns styling. For non-web visual deliverables (slides, charts, posters), reference the relevant per-surface skill reference file."
    builder_default: "Import the tokens CSS and use the rainbow accents + paper backgrounds per the brand spec."
    cv_check: "Verify stripe band present, paper background (not pure white/black), three-voice type detectable. Non-blocking warning v1; hard fail later."
  spec_path: "brand/brand-identity.md"
  visual_reference: "brand/brand-book.html"
  assets_path: "brand/assets/"
  skill: "ottobld"  # invokeable via Skill tool for visual design work
  notes: "Adopted 2026-05-17 as project default. Changeable — replace brand/ contents + registry entry's name/provides to switch brands. Archived builds NOT retroactively re-skinned."
```

## How this integrates with Discovery's restatement

Today's `ledger-v1.json` restatement field doesn't mention visual identity. After v1.12 + this entry land, Discovery's restatement adds a brand-commitment sentence:

> "A self-contained tool that takes a GitHub username and shows a developer profile card — styled in the project's OttoBLD brand (warm paper background, four-stripe rainbow accents, vintage aviation documentation aesthetic)."

This makes the brand a load-bearing part of the ledger and therefore a coverage-required field for downstream verification. CV's first-contact check can then validate "is the artifact actually OttoBLD-styled" alongside "does it function."

## How this integrates with TD's section breakdown

TD's `sections-v1.json` gets a section dedicated to brand application (or merges it into the page-shell section for small builds):

```json
{
  "id": "brand-application",
  "name": "OttoBLD Brand Styling",
  "charter": "Import brand/assets/css/ottobld-tokens.css. Apply paper background with SVG noise grain. Place a four-stripe rainbow band at the top of the page. Use three type voices per the brand spec — italic Georgia for headlines, monospace for data/labels, system sans for stat values. Reference brand/brand-book.html for the masthead, stat-tile, and ornament components if used."
}
```

For very small builds this can collapse into the page-shell section's charter. For larger builds (dashboards, multi-page sites) the dedicated section keeps brand application auditable.

## How this integrates with the Codex dashboard

v0.17 task is open to re-skin `codex/index.html` in OttoBLD. Substantial CSS rewrite — the current dark-theme tech-dashboard styling needs to migrate to:
- Paper background (`--paper-light` + SVG noise grain)
- Stripe band across the top
- Mastheads on each major section
- Stat tiles for the metrics row
- Boarding-pass layout for each roster row (red italic serial + slug + fields + tear-off stub)
- Passport stamps for ratified / promoted / verified status overlays
- Telex transmission styling for the v0.16 live narrative
- Italic Georgia section titles, mono labels, sans stat values

Deferred to its own deploy because: substantial work, deserves visual verification before push, and needs the `brand/` assets to be on origin first (which this commit does).

## How brand changes propagate

When the user swaps brand identity (e.g., OttoBLD → some-other-brand-X):
1. Replace `brand/brand-identity.md`, `brand/brand-book.html`, `brand/assets/`.
2. Update / install the new brand's Skill at `~/.claude/skills/{brand}/`.
3. Update the registry entry's `name` + `provides` + `spec_path` + `assets_path` + `skill` fields.
4. New builds pick up the new brand automatically via the registry.
5. In-flight builds stay on the brand they started with (uniformity-within-a-build).
6. Codex dashboard re-skin requires a separate deploy.

## What this proposal does NOT change

- Doesn't modify any existing build's artifacts.
- Doesn't require Maintenance action to land — the brand assets are in place + Codex consumes them. The registry-entry version makes consumption automatic but isn't a prerequisite for adoption.
- Doesn't lock the project into OttoBLD permanently — the swap path is documented in `brand/README.md`.

## Recommended next steps

1. **Codex (this session):** ship `brand/` directory + this doc + memory updates. ✓ (this commit)
2. **Codex (next deploy):** v0.17 dashboard re-skin in OttoBLD.
3. **Maintenance (when v1.12 lands):** add the OttoBLD entry to the registry per the shape above; amend Discovery + TD charters with the consumption defaults; add the CV visual-conformance check (non-blocking v1).
4. **First post-v1.12 build:** validates whether Discovery + TD actually consume the brand entry, whether Builders import the tokens, whether CV's conformance check fires correctly.

This is the registry's strongest validation case — OttoBLD as a `kind: brand_identity` entry is the cleanest test of whether the registry-as-mechanism design works in practice.
