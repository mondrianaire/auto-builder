// functions/src/dealHand.js — callable Cloud Function: deal the next hand server-side.
// Server-authoritative (IP2). Uses crypto.randomBytes via shuffle.js (TD-IP-C).
// Detects 2-7o and sets the easter-egg flag (S4.A6).

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { shuffleDeck, freshDeck } = require("./shuffle");
const { resolveActionOrder } = require("./handEngine");
const { isTwoSevenOff } = require("./easterEggDispatch");

exports.dealHand = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
  const { tid } = data || {};
  if (!tid) throw new functions.https.HttpsError("invalid-argument", "tid required");

  const db = admin.firestore();
  const tref = db.collection("tournaments").doc(tid);
  const tsnap = await tref.get();
  if (!tsnap.exists) throw new functions.https.HttpsError("not-found", "Tournament not found.");
  const t = tsnap.data();
  const seated = t.seated_players || [];
  const n = seated.length;
  if (n < 2) throw new functions.https.HttpsError("failed-precondition", "Need >=2 seated players.");

  const handNumber = (t.current_hand_number || 0) + 1;
  const hid = `hand-${String(handNumber).padStart(5, "0")}`;
  const deck = shuffleDeck(freshDeck());

  const buttonSeat = (handNumber - 1) % n;
  const smallBlind = (buttonSeat + 1) % n;
  const bigBlind   = (buttonSeat + 2) % n;
  const sbIdx = (n === 2) ? buttonSeat : smallBlind;
  const bbIdx = (n === 2) ? smallBlind : bigBlind;

  const level = t.config.levels[(t.current_level || 1) - 1] || t.config.levels[0];

  const holeCards = {};
  let twoSevenOff = false;
  for (let i = 0; i < n; i++) {
    holeCards[i] = [deck.pop(), deck.pop()];
    if (isTwoSevenOff(holeCards[i][0], holeCards[i][1])) twoSevenOff = true;
  }

  const seats = seated.map((p, i) => ({
    seat_index: i,
    player_uid: p.uid,
    nickname: p.display_name,
    photo_url: p.photo_url,
    chip_stack: p.chip_stack
       - (i === sbIdx ? level.small_blind : i === bbIdx ? level.big_blind : 0)
       - ((level.big_blind_ante && i === bbIdx) ? level.big_blind_ante : 0),
    is_sitting_out: false,
    hand_state: "in"
  }));

  const handDoc = {
    hand_id: hid, tournament_id: tid, hand_number: handNumber, phase: "preflop",
    community_cards: [],
    pot_total: level.small_blind + level.big_blind + (level.big_blind_ante || 0),
    side_pots: [], seats,
    button_seat_index: buttonSeat, small_blind_seat_index: sbIdx, big_blind_seat_index: bbIdx,
    current_turn: {
      seat_index: resolveActionOrder(n, "preflop").first_seat,
      started_at: admin.firestore.FieldValue.serverTimestamp(),
      min_raise: level.big_blind, to_call: level.big_blind
    },
    action_clock: { is_paused: twoSevenOff, duration_seconds: t.config.action_clock_seconds },
    easter_egg: {
      triggered: twoSevenOff,
      kind: twoSevenOff ? "two-seven-off" : null,
      started_at: twoSevenOff ? admin.firestore.FieldValue.serverTimestamp() : null,
      duration_ms: 5000
    },
    deck_remaining: deck,
    winner_seat_indices: [], revealed_hole_cards: {}
  };
  await tref.collection("hands").doc(hid).set(handDoc);
  await tref.update({ current_hand_id: hid, current_hand_number: handNumber });

  // Write per-player hole cards.
  const batch = db.batch();
  for (let i = 0; i < n; i++) {
    const ref = tref.collection("hands").doc(hid).collection("player_hole_cards").doc(seats[i].player_uid);
    batch.set(ref, { seat_index: i, cards: holeCards[i] });
  }
  await batch.commit();

  // Schedule clearing the easter egg via a 5-second timer.
  if (twoSevenOff) {
    setTimeout(async () => {
      await tref.collection("hands").doc(hid).update({
        "easter_egg.triggered": false,
        "action_clock.is_paused": false
      });
    }, 5200);
  }

  return { ok: true, hid };
});
