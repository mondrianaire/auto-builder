// src/config.js
// ---------------------------------------------------------------
// PASTE YOUR FIREBASE + VAPID CONFIG VALUES BELOW.
//
// 1) Create a free Firebase project at https://console.firebase.google.com/
//
// 2) In that project: enable Firestore (Native mode) and Anonymous
//    Authentication (Authentication > Sign-in method > Anonymous > Enable).
//
// 3) Open Project settings (gear icon) > General > Your apps > Add app >
//    Web. Register the app, then copy the "firebaseConfig" object that
//    Firebase shows you. Paste each value below into FIREBASE_CONFIG.
//
// 4) In Project settings > Cloud Messaging > "Web configuration":
//    click "Generate key pair" under Web Push certificates. Copy the
//    public key into VAPID_PUBLIC_KEY. Then in the Firebase Console URL
//    you'll see a "..." menu under the generated key — Firebase shows
//    only the public key. To get the private key, the simplest path
//    is to use a third-party VAPID key-pair generator that gives you
//    both halves (e.g., the web-push npm CLI: `npx web-push generate-vapid-keys`).
//    Whatever pair you generate, paste BOTH halves below — they must
//    correspond to the same key pair, and the public key here must match
//    what you uploaded into Firebase's Web Push certificates panel.
//
// 5) Paste your contact email or URL into VAPID_SUBJECT — push services
//    require this for abuse contact (it doesn't get displayed to users).
//
// 6) Paste the Firestore Security Rules from /firestore.rules into
//    Firebase Console > Firestore > Rules and click Publish.
//
// 7) Commit this whole directory to a GitHub repo and enable GitHub Pages.
//    See the README for the full step-by-step.
// ---------------------------------------------------------------

export const FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID",
};

// VAPID keys for Web Push. Public key goes to PushManager.subscribe;
// private key signs the JWT used to authenticate push requests.
// Both must be the same key pair, encoded in URL-safe base64.
export const VAPID_PUBLIC_KEY = "PASTE_YOUR_VAPID_PUBLIC_KEY";
export const VAPID_PRIVATE_KEY = "PASTE_YOUR_VAPID_PRIVATE_KEY";

// Contact identifier the push service uses for abuse outreach.
// Use a mailto: URL with an email you check.
export const VAPID_SUBJECT = "mailto:you@example.com";
