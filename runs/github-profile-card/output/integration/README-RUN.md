# GitHub Profile Card — how to run

## 1. Get a GitHub Personal Access Token (PAT)

Open https://github.com/settings/tokens/new and create a **fine-grained** or **classic** PAT. For public profiles, the only scope you need is `read:user` (or, on the fine-grained side, no extra repository permissions). Copy the token — you'll paste it into the page.

## 2. Serve the folder locally (recommended)

This page is built as ES modules (`<script type="module">`). Modern browsers block ES module loading over `file://` for security, so you'll want a tiny local static server. From this `integration/` folder:

**Python 3** (installed by default on Windows in most setups):

```
python -m http.server 8000
```

then open http://localhost:8000 in your browser.

**Node** (if you have it):

```
npx serve -p 8000 .
```

then open http://localhost:8000.

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

## Opening directly via `file://`

If you double-click `index.html` and see a blank page or "Page error" in red, it's almost certainly the `file://` ES module restriction. Use the local server route above. The page itself uses `window.onerror` to surface a hint about this.

## What it depends on at runtime

Only `https://api.github.com` (GraphQL + REST). No CDNs, no third-party JS, no web-font fetches.
