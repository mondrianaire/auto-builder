# Curation images

Hand-supplied screenshots, mockups, or visual assets for individual builds.
Drop image files into `codex/data/curation/images/{slug}/` and reference
them from the curation overlay's `showcase_assets.screenshots` array.

The showcase page generator (`codex/scripts/showcase.mjs`) renders these
inline at the top of the showcase page.

Convention:
- One subdirectory per slug: `images/{slug}/`
- Reference paths in `curation/{slug}.json` are relative to `curation/`:
  e.g., `"screenshots": ["images/streamdock-apple-music-touchbar/touchbar.png"]`
- Recommended formats: PNG, JPEG, WebP, SVG. GIF for short demos works too.

Not under git's binary-track conventions — these are typically small visual
assets that benefit from version history. The project `.gitattributes` already
marks `*.png` / `*.jpg` / `*.gif` as binary so they won't be line-end-normalized.
