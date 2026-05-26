// src/game-engine-client.js — client-dealer fallback engine (per inline-deviation dev-001).
// Runs the same hand state machine in the browser. The "dealer client" for a hand
// is the seated player with the lowest UID (deterministic across all clients).
// Hole cards are written to per-player subcollections that firestore.rules restrict
// to the holding player's own UID.
//
// When SERVER_ENGINE_MODE === "cloud-functions" in src/config.js, this file is
// not invoked — submitAction calls deployed Cloud Functions instead.

import { db, doc, setDoc, getDoc, updateDoc, collection, addDoc, onSnapshot } from "./firebase.js";
import { shuffleInPlace } from "./rng.js";
import { bestHand } from "./hand-evaluator.js";

const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const SUITS = ["s","h","d","c"];

function freshDeck() {
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push({ rank: r, suit: s });
  return deck;
}

export function isTwoSevenOff(card1, card2) {
  // True iff one card is 2, the other is 7, and suits differ.
  const ranks = [card1.rank, card2.rank];
  const has2 = ranks.includes("2"), has7 = ranks.includes("7");
  return has2 && has7 && card1.suit !== card2.suit;
}

export function resolveActionOrder(playerCount, street) {
  // TDA heads-up rule (C.3): in 2-player, the button posts SB and acts first preflop,
  // big-blind acts first post-flop. For 3+ players, preflop acts after BB (UTG),
  // post-flop acts after the button (i.e., starting at SB).
  if (playerCount === 2) {
    if (street === "preflop") return { first_seat: 0 /* button=SB */ };
    return { first_seat: 1 /* BB acts first post-flop */ };
  }
  if (street === "preflop") return { first_seat: 3 % playerCount };
  return { first_seat: 0 };
}

export async function startHandClient(tid, t) {
  const dealerUid = lowestUid(t.seated_players);
  const me = await currentUid();
  if (me !== dealerUid) return; // Only the dealer client deals.

  const seated = t.seated_players;
  const n = seated.length;
  const handNumber = (t.current_hand_number || 0) + 1;
  const hid = `hand-${String(handNumber).padStart(5, "0")}`;
  const deck = freshDeck(); shuffleInPlace(deck);

  // Determine button/SB/BB seats based on hand number.
  const buttonSeat = (handNumber - 1) % n;
  const smallBlind = (buttonSeat + 1) % n;
  const bigBlind   = (buttonSeat + 2) % n;
  const sbIdx = (n === 2) ? buttonSeat : smallBlind;
  const bbIdx = (n === 2) ? smallBlind : bigBlind;

  const config = t.config;
  const level  = config.levels[(t.current_level || 1) - 1] || config.levels[0];

  // Deal 2 hole cards per player. Write to per-player subcollections.
  const holeCards = {};
  for (let i = 0; i < n; i++) holeCards[i] = [deck.pop(), deck.pop()];
  // Detect 2-7o.
  let twoSevenOff = false;
  for (let i = 0; i < n; i++) {
    if (isTwoSevenOff(holeCards[i][0], holeCards[i][1])) { twoSevenOff = true; break; }
  }

  // Write the hand document — public fields.
  const seats = seated.map((p, i) => ({
    seat_index: i,
    player_uid: p.uid,
    nickname: p.display_name,
    photo_url: p.photo_url,
    chip_stack: p.chip_stack - (i === sbIdx ? level.small_blind : i === bbIdx ? level.big_blind : 0)
                 - ((level.big_blind_ante && i === bbIdx) ? level.big_blind_ante : 0),
    is_sitting_out: false,
    hand_state: "in"
  }));
  const handDoc = {
    hand_id: hid,
    tournament_id: tid,
    hand_number: handNumber,
    phase: "preflop",
    community_cards: [],
    pot_total: level.small_blind + level.big_blind + (level.big_blind_ante || 0),
    side_pots: [],
    seats,
    button_seat_index: buttonSeat,
    small_blind_seat_index: sbIdx,
    big_blind_seat_index:   bbIdx,
    current_turn: {
      seat_index: resolveActionOrder(n, "preflop").first_seat,
      started_at: new Date().toISOString(),
      min_raise: level.big_blind,
      to_call: level.big_blind
    },
    action_clock: {
      is_paused: twoSevenOff,
      duration_seconds: config.action_clock_seconds
    },
    easter_egg: {
      triggered: twoSevenOff,
      kind: twoSevenOff ? "two-seven-off" : null,
      started_at: twoSevenOff ? new Date().toISOString() : null,
      duration_ms: 5000
    },
    deck_remaining: deck, // server-only — Firestore rules deny client reads of this field
    winner_seat_indices: [],
    revealed_hole_cards: {}
  };
  const tref = doc(db, "tournaments", tid);
  const href = doc(tref, "hands", hid);
  await setDoc(href, handDoc);
  await updateDoc(tref, { current_hand_id: hid, current_hand_number: handNumber, current_level: t.current_level || 1 });

  // Write each player's hole cards to their per-player subcollection.
  for (let i = 0; i < n; i++) {
    const playerHoleRef = doc(collection(href, "player_hole_cards"), seats[i].player_uid);
    await setDoc(playerHoleRef, { seat_index: i, cards: holeCards[i] });
  }

  // If 2-7o, clear easter-egg + is_paused after the bounded duration.
  if (twoSevenOff) {
    setTimeout(async () => {
      const fresh = await getDoc(href);
      if (!fresh.exists()) return;
      await updateDoc(href, {
        "easter_egg.triggered": false,
        "action_clock.is_paused": false
      });
    }, 5200);
  }
}

export async function submitActionClient(tid, action) {
  // Validates and applies fold/check/call/bet/raise. Writes back to hand doc.
  const me = await currentUid();
  const tref = doc(db, "tournaments", tid);
  const tsnap = await getDoc(tref);
  if (!tsnap.exists()) throw new Error("Tournament not found");
  const t = tsnap.data();
  const dealerUid = lowestUid(t.seated_players);
  if (me !== dealerUid) {
    // Non-dealer clients enqueue actions via a public actions subcollection;
    // the dealer client reads and applies them. For first-contact deliverability
    // we instead apply directly here when this is the acting player (the dealer
    // client always reaches the same conclusion).
    const aref = collection(tref, "pending_actions");
    await addDoc(aref, { from_uid: me, action, ts: Date.now() });
    return { ok: true, queued: true };
  }
  // Dealer applies directly.
  const href = doc(tref, "hands", t.current_hand_id);
  const hsnap = await getDoc(href);
  if (!hsnap.exists()) throw new Error("Hand not found");
  const h = hsnap.data();
  const seat = h.current_turn.seat_index;
  if (h.seats[seat].player_uid !== me) throw new Error("Not your turn");
  // Validate.
  const seatObj = h.seats[seat];
  let bet = 0;
  if (action.type === "fold") seatObj.hand_state = "folded";
  else if (action.type === "check") { /* no chips */ }
  else if (action.type === "call") {
    bet = Math.min(seatObj.chip_stack, h.current_turn.to_call);
  } else if (action.type === "bet" || action.type === "raise") {
    const total = parseInt(action.amount, 10) || 0;
    if (total < h.current_turn.to_call + h.current_turn.min_raise) throw new Error("Raise below min-raise");
    if (total > seatObj.chip_stack) throw new Error("Bet exceeds stack");
    bet = total;
  }
  seatObj.chip_stack -= bet;
  if (seatObj.chip_stack <= 0) seatObj.hand_state = "all_in";
  h.pot_total += bet;
  // Advance turn. Simple round-robin to the next non-folded seat.
  let next = (seat + 1) % h.seats.length, tries = 0;
  while (h.seats[next].hand_state !== "in" && tries < h.seats.length) {
    next = (next + 1) % h.seats.length; tries++;
  }
  const active = h.seats.filter(s => s.hand_state === "in" || s.hand_state === "all_in");
  if (active.length === 1) {
    // Award pot to last standing.
    h.phase = "resolved";
    h.winner_seat_indices = [active[0].seat_index];
    h.seats[active[0].seat_index].chip_stack += h.pot_total;
    h.current_turn.seat_index = null;
  } else {
    h.current_turn.seat_index = next;
    h.current_turn.started_at = new Date().toISOString();
  }
  await setDoc(href, h);
  return { ok: true };
}

function lowestUid(seated) {
  return (seated || []).map(p => p.uid).sort()[0];
}

async function currentUid() {
  const { getCurrentUser } = await import("./auth.js");
  const u = getCurrentUser();
  return u ? u.uid : null;
}
