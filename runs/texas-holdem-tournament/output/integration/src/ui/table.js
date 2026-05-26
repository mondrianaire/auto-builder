// src/ui/table.js — main table view: ring + community cards + betting controls + my hole cards.
import { db, doc, onSnapshot, collection } from "../firebase.js";
import { renderRing } from "./ring.js";
import { renderCard, renderCardRow } from "./card.js";
import { renderBettingControls } from "./betting.js";
import { submitActionClient } from "../game-engine-client.js";
import { SERVER_ENGINE_MODE } from "../config.js";

const ACTIVE_TID = "active";
let _unsubT = null, _unsubH = null, _unsubMyHole = null;

export function renderTable(root, user) {
  if (_unsubT) _unsubT();
  if (_unsubH) _unsubH();
  if (_unsubMyHole) _unsubMyHole();

  root.innerHTML = `
    <section class="table-view">
      <div id="ring-root" class="ring-root"></div>
      <div class="my-hole-cards" id="my-hole-cards"></div>
      <div id="betting-root" class="betting-root"></div>
      <div class="action-history" id="action-history"></div>
    </section>
  `;
  const ringRoot   = root.querySelector("#ring-root");
  const myHoleRoot = root.querySelector("#my-hole-cards");
  const betRoot    = root.querySelector("#betting-root");

  const tref = doc(db, "tournaments", ACTIVE_TID);
  _unsubT = onSnapshot(tref, (tsnap) => {
    if (!tsnap.exists()) {
      root.innerHTML = `<div class="table-empty">No active tournament. Go back to the lobby.</div>`;
      return;
    }
    const t = tsnap.data();
    if (!t.current_hand_id) {
      root.querySelector("#ring-root").innerHTML = `<div class="waiting">Waiting for first hand to deal...</div>`;
      return;
    }
    const href = doc(tref, "hands", t.current_hand_id);
    if (_unsubH) _unsubH();
    _unsubH = onSnapshot(href, (hsnap) => {
      if (!hsnap.exists()) return;
      const h = hsnap.data();
      renderRing(ringRoot, h);
      // Render community cards in the dedicated slot.
      const slot = ringRoot.querySelector("#community-slot");
      if (slot) {
        slot.innerHTML = "";
        (h.community_cards || []).forEach((c, i) => {
          const cardSvg = renderCard(c, { width: 44, height: 64 });
          cardSvg.setAttribute("x", String((i - 2) * 50));
          cardSvg.setAttribute("y", "-32");
          slot.appendChild(cardSvg);
        });
      }
      // Render the local user's own hole cards.
      const mySeat = (h.seats || []).find(s => s.player_uid === user.uid);
      if (mySeat) {
        const playerHoleRef = doc(collection(href, "player_hole_cards"), user.uid);
        if (_unsubMyHole) _unsubMyHole();
        _unsubMyHole = onSnapshot(playerHoleRef, (snap) => {
          if (snap.exists()) {
            renderCardRow(myHoleRoot, snap.data().cards || [], { width: 70, height: 100 });
          } else {
            myHoleRoot.innerHTML = "";
          }
        });
      } else {
        // Spectator: show two face-down cards stub.
        myHoleRoot.innerHTML = `<div class="spectator-tag">Spectating</div>`;
      }
      renderBettingControls(betRoot, h, user, async (action) => {
        try {
          if (SERVER_ENGINE_MODE === "client-dealer") {
            await submitActionClient(ACTIVE_TID, action);
          } else {
            const { submitActionCallable } = await import("../game-engine-cloud-shim.js");
            await submitActionCallable(ACTIVE_TID, action);
          }
        } catch (e) {
          console.error("Action failed:", e);
          alert("Action failed: " + e.message);
        }
      });
    });
  });
}
