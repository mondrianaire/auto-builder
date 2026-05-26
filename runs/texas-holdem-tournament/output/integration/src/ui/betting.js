// src/ui/betting.js — betting controls (fold/check/call/bet/raise + action clock).
import { SERVER_ENGINE_MODE } from "../config.js";

export function renderBettingControls(root, hand, user, onAction) {
  root.innerHTML = "";
  if (!hand || !hand.current_turn || hand.current_turn.seat_index === null) {
    root.innerHTML = `<div class="betting-idle">Waiting for next hand.</div>`;
    return;
  }
  const seat = hand.seats[hand.current_turn.seat_index];
  const isMyTurn = seat && seat.player_uid === user.uid;
  if (!isMyTurn) {
    root.innerHTML = `<div class="betting-waiting">${escapeHtml(seat ? seat.nickname : "")} to act.</div>`;
    return;
  }
  const toCall  = hand.current_turn.to_call || 0;
  const minRaise = (hand.current_turn.to_call || 0) + (hand.current_turn.min_raise || 0);
  const myStack = seat.chip_stack;
  const controls = document.createElement("div");
  controls.className = "betting-controls";
  controls.innerHTML = `
    <button class="bet-btn bet-fold" data-action="fold" type="button">Fold</button>
    ${toCall === 0
      ? `<button class="bet-btn bet-check" data-action="check" type="button">Check</button>`
      : `<button class="bet-btn bet-call" data-action="call" type="button">Call ${toCall}</button>`}
    <div class="raise-group">
      <input class="raise-amount" type="number" min="${minRaise}" max="${myStack}" value="${minRaise}" step="1">
      <button class="bet-btn bet-raise" data-action="raise" type="button">Raise</button>
      <button class="bet-btn bet-allin" data-action="allin" type="button">All In</button>
    </div>
    <div class="action-clock" id="action-clock"></div>
  `;
  root.appendChild(controls);

  controls.addEventListener("click", async (e) => {
    const a = e.target.dataset.action;
    if (!a) return;
    if (a === "fold")  return onAction({ type: "fold", amount: 0 });
    if (a === "check") return onAction({ type: "check", amount: 0 });
    if (a === "call")  return onAction({ type: "call", amount: 0 });
    if (a === "raise") {
      const v = parseInt(controls.querySelector(".raise-amount").value, 10);
      return onAction({ type: "raise", amount: v });
    }
    if (a === "allin") return onAction({ type: "raise", amount: myStack });
  });

  startActionClock(controls.querySelector("#action-clock"), hand);
}

let _clockTimer = null;
function startActionClock(root, hand) {
  if (_clockTimer) { clearInterval(_clockTimer); _clockTimer = null; }
  const dur = hand.action_clock.duration_seconds || 30;
  const start = new Date(hand.current_turn.started_at).getTime();
  const paused = hand.action_clock.is_paused;
  function tick() {
    const remaining = paused
      ? dur
      : Math.max(0, dur - Math.floor((Date.now() - start) / 1000));
    root.textContent = paused ? "paused" : `${remaining}s`;
    root.classList.toggle("paused", paused);
    if (!paused && remaining <= 0) {
      clearInterval(_clockTimer); _clockTimer = null;
    }
  }
  tick();
  _clockTimer = setInterval(tick, 250);
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
