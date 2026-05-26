// functions/src/pots.js — pure side-pot distribution math (S4.A3). Extracted from
// resolveHand.js so the test harness can require it without pulling in firebase-functions.

function distributePots(seatBets, eligibleAtShowdown) {
  // seatBets: { seatIdx: chipsContributed }
  // eligibleAtShowdown: array of seat indices that did not fold (eligible to win)
  // Returns: array of { amount, eligible_seat_indices } in ascending-contribution order.
  const entries = Object.entries(seatBets).map(([i, c]) => [parseInt(i, 10), c]).filter(([, c]) => c > 0);
  if (entries.length === 0) return [];
  entries.sort((a, b) => a[1] - b[1]);
  const pots = [];
  let prevCap = 0;
  for (let i = 0; i < entries.length; i++) {
    const cap = entries[i][1];
    if (cap === prevCap) continue;
    const layerAmount = (cap - prevCap) * entries.slice(i).length;
    const layerEligible = entries.slice(i).map(([idx]) => idx)
      .filter(idx => eligibleAtShowdown.includes(idx));
    pots.push({ amount: layerAmount, eligible_seat_indices: layerEligible });
    prevCap = cap;
  }
  return pots;
}

module.exports = { distributePots };
