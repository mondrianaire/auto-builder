# GitHub Profile Card — how to run

## 1. Get a GitHub Personal Access Token (PAT)

Open https://github.com/settings/tokens/new and create a **fine-grained** or **classic** PAT. For public profiles, the only scope you need is `read:user` (or, on the fine-grained side, no extra repository permissions). Copy the token — you'll paste it into the page.

## 2. Open the page

**Double-click `index.html`** — that's it. Everything (CSS, JavaScript, all four logical modules) is inlined into the single HTML file, so it works directly from disk under `file://` with no local server, no build step, and no dependencies beyond `https://api.github.com`.

> The `js/` and `css/` folders next to `index.html` are the **modular reference build** preserved from the integration pass. The patched `index.html` does not load them. They're harmless dead weight in the deliverable; you can ignore them or delete them.

## 3. Use the page

1. Type a GitHub username (e.g., `octocat`, `torvalds`, `gaearon`) into the username field.
2. Paste your PAT into the PAT field.
3. Click **Look up** (or press Enter).

The card will show:

- Avatar + name + handle
- Current streak in days
- Most-used language across owned public repos
- Total contributions (past year)
- Pinned repositories (up to 6, or an empty-state message)
- A 13-week × 7-day heatmap captioned "Contribution activity (last 90 days)"

## Error messages

- **No GitHub user found …** — username doesn't exist
- **GitHub rejected the token …** — bad or expired PAT
- **Rate limit was hit …** — wait a few minutes
- **Could not reach api.github.com …** — network problem
- **A Personal Access Token is required …** — only triggered if internal logic flags it; usually a missing PAT means a degraded card is shown instead with an info message asking for a token to load pinned/contribution data

## What it depends on at runtime

Only `https://api.github.com` (GraphQL + REST). No CDNs, no third-party JS, no web-font fetches.

## Why the single-file rebuild?

The original integration shipped as four ES modules loaded by `index.html` with `<script type="module">`. Modern browsers block ES module imports over `file://` (every `file://` URL is its own unique origin, so `import` fails CORS). The Convergence Verifier ran under jsdom — which does not enforce that restriction — and missed the first-contact failure. The user caught it on the first double-click.

The Phase 2 recovery patch concatenates all four modules into a single classic `<script>` inside `index.html`, preserving every function, the XSS hardening, and the deliverable's behavior. The modular source remains under `output/integration/` for audit and any future bundler-based build. Full divergence record: `divergence-from-integration.json`.
