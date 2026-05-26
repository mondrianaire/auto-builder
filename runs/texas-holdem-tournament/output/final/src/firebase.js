// src/firebase.js — modular Firebase ESM imports from gstatic CDN (TD-IP-F).
// Pinned version per FIREBASE_SDK_VERSION in config.js.

import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION } from "./config.js";

const V = FIREBASE_SDK_VERSION;
const G = `https://www.gstatic.com/firebasejs/${V}`;

// We import the App, Auth, and Firestore modules at runtime. Importing from
// gstatic this way is Firebase's documented modular pattern for browsers.
const appMod  = await import(`${G}/firebase-app.js`);
const authMod = await import(`${G}/firebase-auth.js`);
const fsMod   = await import(`${G}/firebase-firestore.js`);

export const app  = appMod.initializeApp(FIREBASE_CONFIG);
export const auth = authMod.getAuth(app);
export const db   = fsMod.getFirestore(app);

// Re-export the named symbols app code reaches for, so app modules don't
// re-import from gstatic and we keep a single canonical Firebase init.
export const {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} = authMod;

export const {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc,
  query, where, orderBy, limit, getDocs, onSnapshot, serverTimestamp,
  runTransaction, arrayUnion, arrayRemove, Timestamp
} = fsMod;
