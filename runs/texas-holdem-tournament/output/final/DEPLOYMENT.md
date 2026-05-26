# Deployment Guide

## Static site (GitHub Pages) — the default delivery

The application ships as a static site and is deployed by the AutoBuilder pipeline to:

> https://mondrianaire.github.io/auto-builder/runs/texas-holdem-tournament/output/final/

Re-deploying uses the existing `commit-build.bat` (or `deploy-session.bat`) script at the AutoBuilder repo root. No additional infrastructure is required for the **client-dealer mode** default.

## Pre-flight checks (one-time, per Firebase project)

1. **Add the Pages origin to Firebase Auth's authorized domains**, or Google sign-in will fail with `auth/unauthorized-domain`:
   - Firebase Console > project `gto-poker-qui` > Authentication > Settings > Authorized domains.
   - Add: `mondrianaire.github.io`.
2. **Publish `firestore.rules`** to project `gto-poker-qui`:
   - Firebase Console > Firestore Database > Rules > paste contents of `firestore.rules` > Publish.
   - Or via CLI: `firebase deploy --only firestore:rules --project gto-poker-qui`.
3. **Replace the admin UID placeholder** in two places (atomic — both must match):
   - `src/config.js` — `ADMIN_UID` constant.
   - `firestore.rules` — the `REPLACE_WITH_PROJECT_OWNER_GOOGLE_UID` literal inside `isAdmin()`.

## (Optional) Cloud Functions — production-grade engine

The default `SERVER_ENGINE_MODE = "client-dealer"` runs the poker engine in the browser. To upgrade to server-authoritative deal/resolve, deploy the Cloud Functions and flip the mode flag.

### One-time setup

```bash
cd functions
npm install
# Make sure your local firebase CLI is authenticated.
firebase use gto-poker-qui
```

### Deploy

```bash
firebase deploy --only functions --project gto-poker-qui
```

This deploys all named exports per `functions/src/index.js`:

- `dealHand` — callable, server-side Fisher-Yates shuffle using `crypto.randomBytes`.
- `submitAction` — callable, validates turn order / stack / min-raise; rejects invalid actions.
- `resolveHand` — winner determination + side-pot distribution.
- `advanceBlindLevel` — scheduled (every minute) blind-level progression.
- `lobbyTimers` — scheduled (every minute) lobby auto-start.
- `recomputeLeaderboards` — callable; admin-only; rebuilds `/leaderboards/{weekly,monthly,alltime}`.
- `fireEasterEgg` — callable; sets the easter-egg flag for ~5 seconds.

### Flip the mode flag

In `src/config.js`:

```js
export const SERVER_ENGINE_MODE = "cloud-functions";
```

Redeploy the static site. The client will now call the deployed functions for all dealing and action submission.

## What changes between modes

| | Client-dealer (default) | Cloud Functions |
|---|---|---|
| Hand-dealing RNG | `window.crypto.getRandomValues` | Node `crypto.randomBytes` |
| Who computes hole cards | Lowest-UID seated client per hand | Cloud Function service account |
| Hole-card confidentiality | Firestore subcollection rules + dealer-client trust | Firestore rules only |
| Collusion resistance | Vulnerable to a malicious dealer-client | Server-authoritative — no client sees others' cards |
| Recompute leaderboards | Runs in admin's browser | Callable Cloud Function |
| Cost | Free | Cloud Functions invocation costs (negligible at home-game scale) |
| Deploy steps | Zero beyond Pages | One-time `firebase deploy --only functions` |

## Re-deploying just the static site

Use the AutoBuilder repo-root scripts:

- `commit-build.bat` — full per-build commit + push.
- `deploy-session.bat` — incremental session commit + push.

Output goes to `https://mondrianaire.github.io/auto-builder/runs/texas-holdem-tournament/output/final/`.
