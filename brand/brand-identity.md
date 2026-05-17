# OttoBLD — Brand Identity Specification

> **Portable handoff document.** Consolidates the visual identity established across the rebrand exploration session. Hand this to a brand-identity or design specialist (human or another Claude instance) as the canonical source of truth for recreating the OttoBLD visual system. Pair with `brand-book.html` (sibling file) for live visual reference.

---

## 1. Identity

**Project.** OttoBLD is the rebrand of AutoBuilder — a build-automation orchestration system that runs multi-agent workflows producing software artifacts. The "Codex" is its canonical registry of every build the system has produced.

**Wordmark.** `OttoBLD` — single token, mixed case, "Otto" lowercase-styled in italic Georgia bold, "BLD" optionally styled with a heavier weight emphasis. Treat the whole word as one symbol; do not space them.

**Visual identity, in one sentence.** *Vintage aviation / mission-control documentation* — the warm cream of an old plane ticket or NASA mission brief, with a four-color faded rainbow stripe as the recurring identity mark, set in a mix of italic Georgia serif (display) + monospace (data) + Helvetica/system sans (UI).

**What it is not.** Not industrial brutalism. Not cool-grey tech. Not vibrant PlayStation-saturated primaries. Not flat dashboard SaaS. The aesthetic is intentionally *warm, documentary, slightly retro-futuristic*, with a NASA / Pan Am / Apollo-era discipline.

**Audience.** Operators and system maintainers who need to read build status, audit history, and coordinate handoffs. The brand says *"this is a serious tool that takes itself seriously, with the discipline of a flight manifest, not the cheerfulness of a dashboard."*

---

## 2. Color Palette

### Paper (background tones — never pure white)

| Token         | Hex       | Use                                                  |
|---------------|-----------|------------------------------------------------------|
| `paper-light` | `#f5efe2` | Primary background for major surfaces                |
| `paper-warm`  | `#ede4ca` | Elevated/secondary surfaces (manila tan)             |
| `paper-cream` | `#f7f1e3` | Lighter alt for radial gradient highlights           |
| `paper-deep`  | `#ece4cb` | Darker alt for radial gradient shadows               |

The standard background uses a radial gradient from `paper-cream` at center to `paper-deep` at edge, with an SVG noise overlay (see §6 Texture).

### Faded rainbow accents (identity mark, never replace)

| Token         | Hex       | Notes                                                |
|---------------|-----------|------------------------------------------------------|
| `accent-red`    | `#c83a3a` | Faded brick red — primary attention/warning         |
| `accent-orange` | `#d77a3e` | Faded warm orange — secondary accent / caution      |
| `accent-yellow` | `#d4b04a` | Faded gold — tertiary / neutral data                |
| `accent-blue`   | `#4a6a8a` | Faded navy blue — fourth accent / cool state        |

These four colors appear together as the **four-stripe rainbow band** (the identity mark). They also serve as left-border accents for stat tiles, stamp colors, and chart channels. Order is always: red → orange → yellow → blue, left-to-right or top-to-bottom.

### Ink (text, structure)

| Token       | Hex       | Use                                                    |
|-------------|-----------|--------------------------------------------------------|
| `ink-navy`  | `#1a3a5e` | Primary text · display headlines · structural elements |
| `ink-body`  | `#2a2a2a` | Body text where higher contrast needed                 |
| `ink-dim`   | `#6a6258` | Secondary text · field labels · meta info              |
| `ink-rule`  | `#c8c0aa` | Dividers · dashed borders · subtle rules               |

### Secondary status colors

| Token          | Hex       | Use                                          |
|----------------|-----------|----------------------------------------------|
| `state-pass`   | `#3a7a5a` | Success · pass · "ratified" green            |
| `state-warn`   | `#d77a3e` | Caution · warning (same as `accent-orange`)  |
| `state-fail`   | `#c83a3a` | Failure · error (same as `accent-red`)       |

### Color usage rules

- Background is always paper, never pure white or black.
- The four rainbow accents are the identity. Use them as a set whenever possible (the four-stripe band), and individually as left-border accents or stamp colors. Do not introduce a fifth color into the rainbow without explicit reason.
- Headlines, structural lines, and primary text are `ink-navy`.
- Field labels and metadata are `ink-dim`.
- The whole system functions in print and at low color fidelity — verify by desaturating; the navy/cream hierarchy should still read clearly.

---

## 3. Typography

### Type voices (three distinct registers)

The system uses three typographic voices, each with a specific role. The discipline is in keeping them separated.

#### Voice 1 — Display (italic Georgia serif)

- **Stack:** `italic 700 [size] "Georgia", "Times New Roman", serif`
- **Used for:** Section headlines · build slugs · wordmark · display moments
- **Sizes:** 14px (sub-headers), 16-18px (section titles), 22-30px (page titles)
- **Case:** Sentence case for most, lowercase for slugs (`github-profile-card`)
- **Tone:** Warm editorial, like a vintage magazine headline

#### Voice 2 — Data / labels (monospace)

- **Stack:** `ui-monospace, "Cascadia Mono", "Consolas", monospace`
- **Used for:** Field labels (ALL CAPS small), data values (mixed case bold), serial numbers, technical readouts
- **Sizes:** 8-9px (small caps labels), 10-12px (data values), 14-16px (larger numbers)
- **Case:** ALL CAPS for labels (with letter-spacing 0.16-0.20em), mixed case for values
- **Tone:** Mission-control instrument / typewriter

#### Voice 3 — Body / UI (system sans)

- **Stack:** `-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", sans-serif`
- **Used for:** Stat values (large numbers), button labels, secondary UI text
- **Weights:** 200 (display thin), 500 (default), 700 (bold), 800 (heavy)
- **Sizes:** Body 13-14px, large stats 22-44px
- **Tone:** Neutral functional, recedes behind the editorial voices

### Type scale (concrete sizes)

| Use                          | Stack | Size | Weight | Style       |
|------------------------------|-------|------|--------|-------------|
| Wordmark "OttoBLD"           | Georgia | 30-36px | 700 | italic    |
| Page title                   | Georgia | 22-26px | 700 | italic    |
| Section title                | Georgia | 16-18px | 700 | italic    |
| Sub-headline                 | Georgia | 13-14px | 700 | italic    |
| Body / editorial             | Georgia | 12-13px | 400 | italic    |
| Stat value (large)           | Helv.   | 28-44px | 200-800 | regular |
| Field value (data)           | Mono    | 10-12px | 700 | regular   |
| Field label (ALL CAPS)       | Mono    | 8-9px   | 700 | regular · letter-spacing 0.16em · uppercase |
| Slug / identifier            | Mono    | 10-13px | 500-700 | regular |
| Footer · status              | Mono    | 9-10px  | 500 | regular · letter-spacing 0.16em · uppercase |

### Case conventions

- **Section titles:** Sentence case italic. "Corpus overview · Mission status" — not "CORPUS OVERVIEW".
- **Field labels:** ALL CAPS small monospace. "DISPATCHES", "PHASE", "ACTION".
- **Slugs:** lowercase mono. "github-profile-card", "gto-poker-async-duel".
- **Stat values:** Mixed case bold helvetica. Numbers in tabular-nums.
- **Stamps:** ALL CAPS bold monospace inside the stamp border.

### Critical typography rule

**Never mix italic-caps display with lowercase slug content in the same row** — the case mismatch breaks the eye. Either both sentence case, or use different visual containers to separate them.

---

## 4. Texture

### Paper grain (mandatory background treatment)

Every paper surface gets a subtle SVG noise grain overlay. This is what makes the cream feel like *paper* rather than a flat color fill.

```html
<!-- Light paper variant -->
background-color: #f5efe2;
background-image:
  url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .055 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"),
  radial-gradient(ellipse at center, #f7f1e3 0%, #ece4cb 100%);
background-size: 240px 240px, 100% 100%;
```

Tunable parameters:
- `baseFrequency` 0.7–0.9 controls grain coarseness (higher = finer)
- `numOctaves` 1–3 controls grain richness
- `seed` — vary per surface to avoid repeating pattern visually
- The final alpha in `feColorMatrix` (0.045–0.07) controls intensity; keep subtle

### Surface variants

- **Light paper:** `#f5efe2` base with seed 5 — primary surfaces
- **Warm/manila paper:** `#ede4ca` base with seed 7 — elevated surfaces (tickets, cards)
- **Cream alt:** `#f7f1e3` with seed 12 — page interiors

---

## 5. Components (named vocabulary)

The system thinks in **document family** primitives, each with a specific role. Use these names when discussing the system.

### 5.1 Masthead

The branded header of any major surface. Always contains: top rainbow stripe band, the OttoBLD wordmark + "doc · classification" tag, page meta (date + revision), and a metadata strip with key stats.

### 5.2 Stripe band

The four-color rainbow strip (red / orange / yellow / blue). Used at the top of mastheads, as accents on document edges, and as section dividers. Height varies 4-9px. This is the identity mark — every OttoBLD surface should have at least one stripe band somewhere.

### 5.3 Stat tile (instrument cluster)

Boxed stat showing a single metric. Has a **4px left border in one of the rainbow accent colors**, a small ALL CAPS mono label at top, and a large helvetica numeric value below. Used in grids of 4-6 for corpus overview dashboards.

### 5.4 Boarding pass (run roster row)

Horizontal grid `[serial · main · fields · stub]` representing a build entry. Has:
- A red italic serial number on the left
- Slug + route info in the middle
- Field/value grid in the third column
- A "stub" (verdict + class) on the right, separated by a dashed perforation line with tear-off half-circles cut into the top and bottom of the perforation

### 5.5 Tear-off perforation

The dashed border between the main pass and the stub, with small filled circles (`background-color` matching the page outside the ticket) overlapping the top and bottom of the perforation line — creating the iconic ticket cutout silhouette.

```css
.tear-perforation {
  border-left: 1.5px dashed #6a6258;
  position: relative;
}
.tear-perforation::before, .tear-perforation::after {
  content: '';
  position: absolute;
  left: -7px;
  width: 14px; height: 14px;
  background: var(--page-bg); /* matches the surrounding page color */
  border-radius: 50%;
}
.tear-perforation::before { top: -7px; }
.tear-perforation::after { bottom: -7px; }
```

### 5.6 Ticket book spread

Two-page open layout for detail views. Left page (manila tan) is the cover/identity side: kicker, slug, telos, verdict stamps, ratification block. Right page (light paper) is the detail side: head row, fields grid, sub-sections.

### 5.7 Carbon copy duplicate

Stack of 3 offset paper layers (red `#f0d8d2`, yellow `#f4ecc8`, white `#f5efe2`) suggesting carbon-paper copies. Top sheet visible, lower sheets peek 4-8px to the right and down. Used for "copy of original" treatments.

### 5.8 Telex transmission

Pure monospace block bordered by `border-top: 3px double #1a3a5e; border-bottom: 1px solid #1a3a5e`. Contains all-caps mono message body with `STOP` punctuation rendered in red between sentences. Used for live event streams.

### 5.9 Customs form

Bordered rectangle with cutout section labels (e.g., `A · IDENTIFICATION` floating on the top border). Inside: field/value grids, checkbox rows, signature lines. Used for pre-action verification checklists.

### 5.10 Passport stamp page

Background surface with multiple overlapping rectangular and circular rubber stamps at slight rotations (±2 to ±9 degrees). Stamps are outlined boxes in red/blue/green/orange with ALL CAPS bold mono text inside. Used for audit trails and "where this build has been" histories.

### 5.11 Stamps (atom-level)

Four standard variants:
- **Rectangular outline:** `border: 1.5px solid <color>; padding: 4px 10px; font: 700 9px monospace; letter-spacing: 0.2em; text-transform: uppercase`
- Colors: red `#c83a3a`, green `#3a7a5a`, blue `#4a6a8a`, orange `#d77a3e`
- Background: `rgba(245,239,226,0.4)` (translucent paper)
- **Circular:** Same styling but `width: 70-84px; height: same; border-radius: 50%`, rotated ±4-9°, with multi-line text
- Stamps appear *over* content, often at slight rotation

### 5.12 Ornament (decorative separator)

Small `[dot · line · dot]` pattern in `accent-red` (dot) + `ink-dim` (line). Used as a section break inside ticket book pages, between header and body.

---

## 6. Layout Principles

- **Container max-width:** 1100px for the codex page; 460-560px for tickets/single artifacts.
- **Container padding:** 20-32px horizontal, 18-24px vertical.
- **Section separation:** `border-bottom: 1px solid #c8c0aa` (light) or `border-bottom: 2px solid #1a3a5e` (heavy / phase break).
- **Stripe band always at the very top** of a masthead, followed by a 14-16px gap, then content.
- **Grid spacing:** 10-16px between tiles in a grid.
- **Vertical rhythm:** Multiples of 4px. Headers get 14-24px margin-bottom.
- **Tear-offs and perforations:** Always have half-circles cut into them (see §5.5).
- **No drop shadows on paper-on-paper.** Use 1px borders + dashed dividers. Shadows only for elevated cards (`0 2-4px 12-16px rgba(0,0,0,0.08-0.12)`).

---

## 7. Voice & Tone

### Scope (read this first)

The voice described in this section applies to **visual identity and component naming**, **internal architecture documents**, and **brand-side marketing surfaces** (the Codex itself, this brand book, posters, decks, social posts that are explicitly *about* OttoBLD).

The voice does **not** apply to **user-facing application copy** inside software that uses OttoBLD as its brand: role descriptions, captions, status text, button labels, error messages, in-app instructions, tooltips, empty states. Those stay plain and functional.

**Rule of thumb.** If a user is reading copy to *experience OttoBLD as a brand*, voice on. If a user is reading copy to *understand what the app is doing for them*, voice off — plain English. The brand visuals make the surface OttoBLD; the copy makes it usable.

### In-product visual language (use freely)

These apply to component names, decorative ALL-CAPS labels on visual elements, internal artifacts, and Codex-side surfaces — *not* to live UI strings the user must read to operate the app.

- **Mission control / aviation vocabulary** as decoration and component naming: "in flight", "T+ 09:32", "nominal", "mission control", "dispatched", "manifest", "boarding pass", "ratified", "promoted"
- **Phase verbs** in build-side documents (charters, role specs, internal artifacts): Kickoff → Planning → Build → Verification → Delivery → Ratification → Promoted
- **Document genres** as component names: boarding pass · carbon copy · telex · customs form · passport stamp · ticket book
- **Stamps say short imperative phrases** when the stamp's *job* is to mark a status visibly (audit trails, decorative postmarks): "PASS W/ CONCERNS" · "RATIFIED" · "IN FLIGHT" · "CORPUS SEALED"

### User-facing application copy (stay plain)

- **Role descriptions in live UI:** plain English. ✅ "Starts the build by waking Discovery." ❌ "Orchestrator on station."
- **Phase labels in live UI:** ✅ "Phase 1", "Discovery". ❌ "Phase 01 · Kickoff", "T+ 00:00".
- **Status text and waiting states:** ✅ "Waiting to start". ❌ "Awaiting handoff", "Standing by".
- **Stamps used as identifiers in live UI** should say the literal thing the stamp identifies (e.g. `D-ORC-1 · ORCHESTRATOR`), not a flavored alternative.
- **Functional mono ALL CAPS UI labels** are fine because they're compact labels, not flavor: `ROLE`, `PHASE`, `DECISION`, `SLUG`. Avoid puffed-up labels like `ROLE · IN FLIGHT` or `STAGE · NOMINAL` — drop the aviation half.

### Editorial voice (applies where voice applies)

When voice is on — headlines, brand-side prose, Codex captions, marketing — use:

- **Sentence case in headlines** with the option to italicize the lead word ("*Corpus overview* · mission status")
- **Em-dashes for asides** in italic Georgia serif
- **Footnote-style commentary** in italic Georgia at 11.5-12px for "what strained" / explanatory prose

---

## 8. Anti-Patterns (explicitly avoid)

- ❌ Industrial brutalism (Otto thin + BLD heavy, slate-and-orange) — too cold for this brand
- ❌ Cool grey base (#A6A6A6 or PS1 grey) — felt too tech, lost the document warmth
- ❌ Vibrant PlayStation-saturated primaries (#e60012 etc.) — too modern arcade
- ❌ Pure black backgrounds — breaks the paper feel
- ❌ Pure white backgrounds — breaks the paper feel
- ❌ Flat sans-serif italic display caps mixed with lowercase mono slugs in the same row — case mismatch
- ❌ Clinical SaaS dashboard layouts (cards, shadows, rounded corners) — wrong vocabulary
- ❌ Hot-pink magenta / cyan combos (vaporwave) — wrong era
- ❌ Holographic / glass / iridescent surfaces — wrong material
- ❌ Bold action buttons in primary RGB (red Fold / green Call) — wrong context

---

## 9. Application Examples

The brand has been applied to:

1. **OttoBLD Codex page redesign (Rev 0010)** — the canonical reference implementation. Full page mockup including masthead, instrument cluster, run roster of boarding passes, ticket book spread for selected build, maintenance telex queue footer.

2. **Ticket family (six interpretations)** — Boarding pass · carbon copy duplicate · telex transmission · customs declaration form · passport stamp page · ticket book spread.

3. **View-to-use-case mapping** — Each ticket variant maps to a specific build state (boarding pass = "in flight" · carbon copy = "receipt" · telex = "live event stream" · customs form = "pre-promotion checklist" · passport stamps = "audit trail" · ticket book = "wrap-up document").

---

## 10. Recreation Checklist

If a downstream specialist receives this document and is asked to recreate the OttoBLD identity for a new surface, they should verify:

- [ ] Background is paper (`#f5efe2` or `#ede4ca`), never pure white/black
- [ ] SVG noise grain is applied to the background
- [ ] The four-stripe rainbow band appears somewhere prominent
- [ ] At least one of the three type voices is present (italic Georgia / monospace / system sans)
- [ ] Section headlines are sentence case italic Georgia, not ALL CAPS
- [ ] Field labels are ALL CAPS small monospace with 0.16em letter-spacing
- [ ] Slugs/identifiers are lowercase monospace
- [ ] Any "ticket" element has tear-off half-circle perforations
- [ ] Stamps use the four accent colors, rotated ±2-9°, with letter-spacing 0.2em
- [ ] No primary RGB, no cool greys, no holographic, no PlayStation primaries
- [ ] The whole surface still reads as a "document" rather than an "app"

---

## 11. Versioning

- **v0.1** (2026-05-17) — initial consolidation from rebrand exploration session. North star: Codex Rev 0010 / "In the Fire" mockup.
- Future updates land here as the brand extends to new surfaces (button systems, marketing pages, packaging).

---

*Generated from a multi-round OttoBLD brand identity exploration. North star deliverable: Codex Rev 0010. Sibling file: `brand-book.html` (visual reference).*
