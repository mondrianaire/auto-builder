// src/auth.js — Google SSO sign-in flow, session/profile resolution, /players/{uid} sync.
import {
  auth, db, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  doc, getDoc, setDoc
} from "./firebase.js";
import { ADMIN_UID } from "./config.js";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

let _currentUser = null;
const _subscribers = new Set();

function notify() {
  for (const fn of _subscribers) {
    try { fn(_currentUser); } catch (e) { console.error("auth subscriber threw:", e); }
  }
}

onAuthStateChanged(auth, async (fbUser) => {
  if (!fbUser) { _currentUser = null; notify(); return; }
  // Resolve our app-shaped user object: Google profile + nickname from /players/{uid}.
  const playerRef = doc(db, "players", fbUser.uid);
  let snap = await getDoc(playerRef);
  if (!snap.exists()) {
    // First-time sign-in: seed the /players/{uid} doc with defaults.
    await setDoc(playerRef, {
      uid: fbUser.uid,
      google_given_name: (fbUser.displayName || "").split(/\s+/)[0] || "Player",
      google_photo_url: fbUser.photoURL || "",
      nickname: null,
      notification_prefs: {
        current_game: false,
        new_tournaments: false
      },
      four_color_deck: false,
      created_at: Date.now()
    });
    snap = await getDoc(playerRef);
  }
  const p = snap.data();
  _currentUser = {
    uid: fbUser.uid,
    google_given_name: p.google_given_name || (fbUser.displayName || "").split(/\s+/)[0] || "Player",
    google_photo_url: p.google_photo_url || fbUser.photoURL || "",
    nickname: p.nickname || null,
    notification_prefs: p.notification_prefs || { current_game: false, new_tournaments: false },
    four_color_deck: !!p.four_color_deck,
    is_admin: fbUser.uid === ADMIN_UID
  };
  notify();
});

export function getCurrentUser() { return _currentUser; }

export function onAuthStateChange(callback) {
  _subscribers.add(callback);
  // Fire immediately with current state.
  try { callback(_currentUser); } catch (e) {}
  return { unsubscribe: () => _subscribers.delete(callback) };
}

export function displayName(user) {
  if (!user) return "";
  return (user.nickname && user.nickname.trim()) || user.google_given_name || "Player";
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export async function signOutCurrentUser() {
  return signOut(auth);
}

export async function setNickname(nickname) {
  if (!_currentUser) throw new Error("Not signed in.");
  const ref = doc(db, "players", _currentUser.uid);
  await setDoc(ref, { nickname: nickname || null }, { merge: true });
  _currentUser = { ..._currentUser, nickname: nickname || null };
  notify();
}

export async function setNotificationPref(key, value) {
  if (!_currentUser) throw new Error("Not signed in.");
  const ref = doc(db, "players", _currentUser.uid);
  const prefs = { ..._currentUser.notification_prefs, [key]: !!value };
  await setDoc(ref, { notification_prefs: prefs }, { merge: true });
  _currentUser = { ..._currentUser, notification_prefs: prefs };
  notify();
}

export async function setFourColorDeck(on) {
  if (!_currentUser) throw new Error("Not signed in.");
  const ref = doc(db, "players", _currentUser.uid);
  await setDoc(ref, { four_color_deck: !!on }, { merge: true });
  _currentUser = { ..._currentUser, four_color_deck: !!on };
  // Apply the CSS variables right now so the next render reflects the toggle.
  applyFourColorDeck(!!on);
  notify();
}

export function applyFourColorDeck(on) {
  const r = document.documentElement.style;
  if (on) {
    r.setProperty("--suit-diamond", "#2057D6"); // blue
    r.setProperty("--suit-club", "#1B8A3A");    // green
  } else {
    r.setProperty("--suit-diamond", "#c83a3a"); // red (matches OttoBLD red)
    r.setProperty("--suit-club", "#1a3a5e");    // navy (close to traditional black, OttoBLD-tuned)
  }
}
