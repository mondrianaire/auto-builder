// functions/src/submitAction.js — callable Cloud Function: validate + apply a player action.
// Enforces turn order, stack limits, min-raise rule (S4.A2).
const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.submitAction = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
  const { tid, action } = data || {};
  if (!tid || !action || !action.type) throw new functions.https.HttpsError("invalid-argument", "tid + action required");

  const db = admin.firestore();
  const tref = db.collection("tournaments").doc(tid);
  const tsnap = await tref.get();
  if (!tsnap.exists) throw new functions.https.HttpsError("not-found", "Tournament not found.");
  const t = tsnap.data();
  const href = tref.collection("hands").doc(t.current_hand_id);
  return db.runTransaction(async (tx) => {
    const hsnap = await tx.get(href);
    if (!hsnap.exists) throw new functions.https.HttpsError("not-found", "Hand not found.");
    const h = hsnap.data();
    const seatIdx = h.current_turn.seat_index;
    if (seatIdx === null || seatIdx === undefined) throw new functions.https.HttpsError("failed-precondition", "No current turn.");
    const seat = h.seats[seatIdx];
    if (seat.player_uid !== context.auth.uid) throw new functions.https.HttpsError("permission-denied", "Not your turn.");
    const toCall = h.current_turn.to_call || 0;
    const minRaiseDelta = h.current_turn.min_raise || 0;
    let bet = 0;
    if (action.type === "fold") { seat.hand_state = "folded"; }
    else if (action.type === "check") {
      if (toCall > 0) throw new functions.https.HttpsError("invalid-argument", "Cannot check; there is a bet to call.");
    }
    else if (action.type === "call") {
      bet = Math.min(seat.chip_stack, toCall);
    }
    else if (action.type === "bet" || action.type === "raise") {
      const total = parseInt(action.amount, 10) || 0;
      if (total < toCall + minRaiseDelta) throw new functions.https.HttpsError("invalid-argument", "Raise below min-raise.");
      if (total > seat.chip_stack) throw new functions.https.HttpsError("invalid-argument", "Bet exceeds stack.");
      bet = total;
    }
    else throw new functions.https.HttpsError("invalid-argument", "Unknown action type.");
    seat.chip_stack -= bet;
    if (seat.chip_stack <= 0) seat.hand_state = "all_in";
    h.pot_total += bet;
    // Advance turn (simple — full betting-round-complete logic in resolveHand.js).
    let next = (seatIdx + 1) % h.seats.length, tries = 0;
    while (h.seats[next].hand_state !== "in" && tries < h.seats.length) {
      next = (next + 1) % h.seats.length; tries++;
    }
    const active = h.seats.filter(s => s.hand_state === "in" || s.hand_state === "all_in");
    if (active.length === 1) {
      h.phase = "resolved";
      h.winner_seat_indices = [active[0].seat_index];
      h.seats[active[0].seat_index].chip_stack += h.pot_total;
      h.current_turn.seat_index = null;
    } else {
      h.current_turn.seat_index = next;
      h.current_turn.started_at = admin.firestore.FieldValue.serverTimestamp();
    }
    tx.set(href, h);
    return { ok: true };
  });
});
