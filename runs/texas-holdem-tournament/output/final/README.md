# Texas Hold'em Tournament

A live multiplayer Texas Hold'em tournament web app. Up to nine Google-authenticated players join a single tournament, play in real time around an animated poker ring under tournament regulations, and have their results tracked across weekly, monthly, and all-time leaderboards.

Built by AutoBuilder. Reuses the existing `gto-poker-qui` Firebase project (the same backend as the `gto-poker-async-duel` build).

## Open the live build

> https://mondrianaire.github.io/auto-builder/runs/texas-holdem-tournament/output/final/

Sign in with Google. Join the lobby. When at least two players are seated, anyone can press **Start tournament** (or it auto-starts five minutes after the first join).

## Features

- **Google SSO sign-in** via Firebase Auth (no email/password, no other providers).
- **Lobby** showing profile pictures of awaiting members. Single concurrent tournament at launch.
- **Three seeded tournament presets** (research-driven from probe-001):
  - **Friendly Turbo** — 1,500 starting stack, 7-minute levels, 15-second action clock.
  - **Standard Home Game** — 10,000 stack, 20-minute levels, 30-second clock, big-blind ante from level 5.
  - **WSOP-Style Deep Stack** — 60,000 stack, 30-minute levels, 45-second clock, big-blind ante from level 1.
  - Custom configurations supported — edit any field after picking a preset.
- **Animated poker ring** (oval SVG, breathing glow) with adaptive seat layout. Heads-up gets opposite-pole seating; nine-handed gets even distribution. In heads-up, the button posts the small blind and acts first preflop (TDA-canonical).
- **Standard 52-card deck** rendered as inline SVG. A user-toggleable **4-color deck** (blue diamonds, green clubs) lives in the user account card.
- **Server-authoritative game engine**, two delivery modes (see DEPLOYMENT.md):
  - *Client-dealer fallback* — runs in the browser using `window.crypto.getRandomValues`, suitable for friendly home-game use. Default for first-contact; no deploys required beyond Pages.
  - *Cloud Functions* — production-grade. Source ships in `functions/`; deploy with `firebase deploy --only functions --project gto-poker-qui`, then flip `SERVER_ENGINE_MODE` to `"cloud-functions"` in `src/config.js`.
- **2-7o easter egg** — when any player is dealt 2-7 offsuit, every connected user sees a five-second dramatic full-screen animation. The animation never reveals which player triggered it.
- **Weekly / Monthly / All-Time leaderboards** using the Position-Weighted Completion Score (PWCS) formula: `round(100 * (1 - (position-1)/field) ^ 0.6) * completion_weight`, where finished tournaments score full weight and unfinished tournaments score proportionally to eliminations.
- **Maintenance dashboard** at `#/admin` for the project owner: list tournaments by status, force-end stuck tournaments, recompute leaderboards.
- **Notifications**: browser Notifications API with in-app banner fallback. No FCM, no service worker.
- **Brand**: OttoBLD visual identity applied to UI chrome (header, panels, buttons, palette). Card faces stay standard. User-facing copy is plain language — no aviation jargon.

## First-time setup (project owner)

1. **Find your Google UID.** Open the deployed app, sign in once, then open the browser dev tools console and run: `firebase.auth().currentUser.uid` — or read it from the Firebase Console under Authentication > Users.
2. **Set `ADMIN_UID` in `src/config.js`** to that value and redeploy. The `/admin` route and the Firestore admin rule check both read it.
3. **Update `firestore.rules`** — replace the `REPLACE_WITH_PROJECT_OWNER_GOOGLE_UID` literal with your UID, then publish:
   - Firebase Console > Firestore Database > Rules > paste contents of `firestore.rules` > Publish.
   - Or: `firebase deploy --only firestore:rules --project gto-poker-qui`.
4. **Authorize this Pages origin for OAuth** (one-time, required for sign-in to succeed):
   - Firebase Console > Authentication > Settings > Authorized domains.
   - Add `mondrianaire.github.io` if not already present.
5. **(Optional) Deploy Cloud Functions** for production-grade hand dealing — see DEPLOYMENT.md.

## Caveats

- **Client-dealer mode (default) is not cryptographically secure against collusion.** The "dealer client" (the seated player with the lowest UID for each hand) computes hole cards and writes them to per-player Firestore subcollections. Firestore rules restrict per-player subcollections to that player's own UID, so other clients cannot read each others' cards — but the dealer client itself can. For friendly home-game scope this is acceptable; for competitive integrity, deploy Cloud Functions (DEPLOYMENT.md) and flip `SERVER_ENGINE_MODE` to `"cloud-functions"`.
- **Single concurrent tournament** at launch (per the prompt). The tournament document id is the constant string `"active"`. Multi-tournament support is a post-launch extension.
- **Web only.** No native iOS/Android apps. The web app is responsive-ish but designed for desktop.
- **No table chat, no audio, no closed-tab push notifications** — all noted as out-of-scope at Discovery time.

## File layout

```
index.html                  entry point
src/
  app.js                    shell + router
  config.js                 Firebase config + ADMIN_UID + SERVER_ENGINE_MODE
  firebase.js               modular ESM Firebase imports from gstatic CDN
  auth.js                   Google sign-in + /players/{uid} sync + 4-color CSS-var swap
  lobby.js                  lobby view + Join/Start/auto-start
  ui/
    landing.js              pre-sign-in surface
    user-card.js            top-right account card panel
    ring.js                 animated oval ring + adaptive seat positions
    card.js                 inline-SVG card faces
    betting.js              fold/check/call/raise/all-in controls + action clock
    table.js                main table view (ring + cards + betting)
  game-engine-client.js     client-dealer fallback engine
  game-engine-cloud-shim.js callable wrappers when SERVER_ENGINE_MODE === "cloud-functions"
  hand-evaluator.js         best-5-of-7 evaluator
  scoring.js                PWCS formula
  rng.js                    browser CSPRNG wrapper
  notifications.js          Notifications API + in-app banner fallback
  leaderboards.js           weekly / monthly / all-time tabs
  admin.js                  /admin dashboard
  easterEgg/
    twoSevenOff.js          dramatic overlay component
  tournament/
    presets.js              the three seeded presets (Researcher findings)
    settings-form.js        preset selector + custom-edit form
styles/
  main.css                  OttoBLD-themed shell + ring + cards
  animations.css            ring glow + easter-egg keyframes
icons/favicon.svg
firestore.rules             paste-into-console security rules
functions/                  Cloud Functions source (deploy-when-ready)
```

## How verification happens

The `output/builders/section-10/test-report.json` file documents per-assertion verification status for every `verifier: edge_case_testing` item in the section list. Pure-function assertions (scoring formula, side-pot resolution, action-order, 2-7o detection, shuffle CSPRNG presence) run under `node functions/test/runTests.js`. DOM-level assertions are deferred to the AutoBuilder Convergence Verifier's Playwright pass against this deployed URL.
