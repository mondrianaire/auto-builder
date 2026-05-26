// functions/src/handEngine.js — hand state machine + action-order resolver (IP1.A4, S4.A4).
// TDA-canonical heads-up rule (C.3): in 2-player play, the button posts SB and acts
// first preflop; big-blind acts first post-flop.

function resolveActionOrder(playerCount, street) {
  if (playerCount === 2) {
    if (street === "preflop") return { first_seat: 0 /* button = SB */ };
    return { first_seat: 1 /* big-blind acts first post-flop */ };
  }
  // 3+ players: preflop acts after BB; post-flop acts starting at SB.
  if (street === "preflop") return { first_seat: 3 % playerCount };
  return { first_seat: 0 };
}

function nextActiveSeat(seats, fromSeat) {
  let next = (fromSeat + 1) % seats.length, tries = 0;
  while (seats[next].hand_state !== "in" && tries < seats.length) {
    next = (next + 1) % seats.length; tries++;
  }
  return next;
}

function isBettingRoundComplete(seats) {
  // Round complete when all in-or-all_in players have matched the current bet
  // OR only one player remains.
  const inPlayers = seats.filter(s => s.hand_state === "in");
  if (inPlayers.length <= 1) return true;
  // Simplified completeness check.
  return inPlayers.every(s => s.current_bet === inPlayers[0].current_bet);
}

module.exports = { resolveActionOrder, nextActiveSeat, isBettingRoundComplete };
