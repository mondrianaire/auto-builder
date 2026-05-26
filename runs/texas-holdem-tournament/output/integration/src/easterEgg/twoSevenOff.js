// src/easterEgg/twoSevenOff.js — the dramatic 2-7o easter-egg overlay.
// Bounded total duration 4000-6000ms (target 5000); does NOT reveal the holder.
// Triggered by Firestore field hand.easter_egg.triggered=true.

import { db, doc, onSnapshot } from "../firebase.js";

export const ANIMATION_TOTAL_MS = 5000; // within bound 4000-6000 (IP7.A1, S6.A2)

let _unsubT = null, _unsubH = null;
let _activeOverlay = null;

export function initEasterEggListener(rootSlot) {
  // Listen to the active tournament's current hand. Trigger when hand.easter_egg.triggered flips true.
  const tref = doc(db, "tournaments", "active");
  _unsubT = onSnapshot(tref, (tsnap) => {
    if (!tsnap.exists()) return;
    const t = tsnap.data();
    if (!t.current_hand_id) return;
    if (_unsubH) _unsubH();
    const href = doc(tref, "hands", t.current_hand_id);
    _unsubH = onSnapshot(href, (hsnap) => {
      if (!hsnap.exists()) return;
      const h = hsnap.data();
      const trig = h.easter_egg && h.easter_egg.triggered;
      if (trig && !_activeOverlay) {
        showOverlay(rootSlot);
      }
    });
  });
}

function showOverlay(rootSlot) {
  const overlay = document.createElement("div");
  overlay.className = "easter-egg-overlay";
  // IMPORTANT: NO holder identity, name, seat index, or uid in this DOM (S6.A3, IP7.A3, A19).
  overlay.innerHTML = `
    <div class="ee-burst ee-burst-1"></div>
    <div class="ee-burst ee-burst-2"></div>
    <div class="ee-burst ee-burst-3"></div>
    <div class="ee-cards">
      <div class="ee-card ee-card-2"><span class="ee-rank">2</span><span class="ee-suit">♥</span></div>
      <div class="ee-card ee-card-7"><span class="ee-rank">7</span><span class="ee-suit">♣</span></div>
    </div>
    <div class="ee-shout">WORST. HAND. IN. POKER.</div>
    <div class="ee-confetti">
      ${Array.from({length: 32}).map((_, i) => `<span class="ee-confetto ee-c${i % 8}"></span>`).join("")}
    </div>
  `;
  rootSlot.appendChild(overlay);
  _activeOverlay = overlay;
  setTimeout(() => {
    overlay.classList.add("ee-fade-out");
    setTimeout(() => {
      overlay.remove();
      _activeOverlay = null;
    }, 400);
  }, ANIMATION_TOTAL_MS - 400);
}
