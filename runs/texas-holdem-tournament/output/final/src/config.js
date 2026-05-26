// src/config.js
// Texas Hold'em Tournament — Firebase configuration for the gto-poker-qui project.
// This config is reused from the existing AutoBuilder Firebase infrastructure
// (same project as gto-poker-async-duel). DO NOT change to a different project
// without coordinating with the AutoBuilder Maintenance instance.

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCxc5ICHwz4Fp_2kRwHogeLdgUeCGKgHss",
  authDomain: "gto-poker-qui.firebaseapp.com",
  projectId: "gto-poker-qui",
  // The following are not required for Firestore + Google Auth on the web
  // path used by this app; if the user adds Storage/Messaging later they go here.
  storageBucket: "gto-poker-qui.appspot.com",
  appId: "1:000000000000:web:texasholdem"
};

// Pinned Firebase SDK version. The browser loads modules from gstatic CDN
// at this version. README documents adding mondrianaire.github.io to the 
// Firebase OAuth authorized domains (DCA.A23).
export const FIREBASE_SDK_VERSION = "11.0.2";

// Admin Google UID — gates the /admin route + Firestore rules' admin checks.
// Replace with the project owner's Google uid after first sign-in.
// During first deploy, sign in once with your Google account, open the browser
// devtools, read the value of `firebase.auth().currentUser.uid`, and paste it here.
export const ADMIN_UID = "REPLACE_WITH_PROJECT_OWNER_GOOGLE_UID";

// Server engine mode — see DEPLOYMENT.md and inline-deviation dev-001.
//   "client-dealer"   = browser runs the engine; first-contact-deliverable on
//                       a fresh Firebase project without Cloud Functions deploy.
//                       Hole-card confidentiality enforced by Firestore rules
//                       restricting per-player subcollections to that UID.
//                       Suitable for friendly home-game scope.
//   "cloud-functions" = browser calls deployed Cloud Functions. Production-grade
//                       integrity. Requires `firebase deploy --only functions`.
//
// Default for first-contact: "client-dealer". Flip to "cloud-functions" after
// you deploy the included functions/ source.
export const SERVER_ENGINE_MODE = "client-dealer";  // rev-2 rollback — flip back to cloud-functions AFTER firebase deploy completes

// Per-preset action-clock seconds — derived from src/tournament/presets.js but
// exported here for the action-clock UI to look up without importing the full
// presets module. Kept in sync at build time.
export const ACTION_CLOCK_DEFAULT_SECONDS = 30;

// Auto-start delay after first join when minimum threshold (>=2) is met (IP4).
export const AUTO_START_AFTER_MS = 5 * 60 * 1000; // 5 minutes
