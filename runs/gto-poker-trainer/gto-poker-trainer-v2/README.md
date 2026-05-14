# GTO Poker Trainer

A single-page browser app for studying GTO play in 9-handed No-Limit Texas Hold'em. Two modes:

**Walkthrough Mode** — 22 curated postflop hands, each illustrating a specific GTO edge case (polarized 3-bet pot c-bet, blocker-driven river bluffs, donk-lead defense, range-vs-range turn cards, and more). Decision-then-reveal quiz: you commit an action and sizing, the app reveals the GTO frequency mix with 3–6 paragraphs of theory and links to a 16-concept glossary.

**Table Mode** — full 9-handed cash game (100bb, 10/20 blinds). You sit as the hero; the other 8 seats are filled by archetype agents (TAG, LAG, Nit, Calling Station, Maniac, Rock, Whale, ABC), each running a static frequency-table decision engine and labeled on-seat with `contrast_with_gto` notes explaining how the archetype deviates from balance and how to exploit. Every hand emits a `HandResult` to the stats pipeline.

A **stats dashboard** tracks VPIP, PFR, 3-bet%, WTSD, W$SD, BB/100, hands played, and a GTO-deviation score (averaged across walkthrough decisions). Toggle session vs all-time. Persisted in `localStorage` under a versioned namespace.

## Run it

**Live (GitHub Pages):** the URL will be added here once Pages is enabled — typically `https://<username>.github.io/gto-poker-trainer/`.

**Local:** clone the repo and open `index.html` in any modern browser. No server, no build step, no installation. All dependencies are vanilla JS shipped in this repo.

```bash
git clone https://github.com/<username>/gto-poker-trainer.git
cd gto-poker-trainer
open index.html   # or just double-click it
```

## Architecture at a glance

| File | Role |
|---|---|
| `index.html` | Entry point and script load order |
| `shell.js` | App shell, navigation, storage adapter |
| `data/preflop-ranges.js` | Opening / 3bet / 4bet ranges for all 9 positions |
| `data/curated-hands.js` | 22 curated postflop spots + 16-concept glossary |
| `walkthrough.js` | Decision-then-reveal quiz UI |
| `archetypes.js` | 8 archetype profiles with `contrast_with_gto` |
| `agent-engine.js` | Pure `decide(state) → action` for archetype agents |
| `hand-eval.js` | Best-5-of-7 hand evaluator |
| `table-engine.js` | Deck, blinds, betting rounds, side pots, showdown |
| `table-ui.js` | 9-seat table UI with hero seat + 8 archetype seats |
| `stats.js` | Stats writer + dashboard view |
| `styles.css` | All styling (no framework) |
| `manifest.json` | Build manifest |

## Storage

All data is stored in `localStorage` under the namespace `gto-trainer/v1/`. To reset stats, clear that namespace or use the dashboard's reset control.

## Provenance

This artifact was produced end-to-end by the **Auto Builder** multi-agent orchestration system. The full build trail (Discovery ledger, Technical Discovery sections + assertions, builder outputs, Critic audit, Convergence Verifier report including the production-fidelity prompt-named-verb pass) lives in the repo's parent directory (`runs/gto-poker-trainer/` in the Auto Builder workspace). Verification verdict: **pass** — PNV.1 (play 10 hands → reload → play 5 hands, with cross-session persistence) verified end-to-end under jsdom production fidelity.

## License

MIT. See `LICENSE` if/when added; otherwise treat as MIT.
