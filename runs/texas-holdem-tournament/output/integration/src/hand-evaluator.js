// src/hand-evaluator.js — pure 5-of-7 best-hand evaluator for Texas Hold'em showdown.
// Ranks: 9=straight flush, 8=quads, 7=full house, 6=flush, 5=straight,
//        4=trips, 3=two pair, 2=pair, 1=high card.
// Returns a comparable score (higher = stronger).

const RANK_ORDER = { "2":2, "3":3, "4":4, "5":5, "6":6, "7":7, "8":8, "9":9, "10":10, "T":10, "J":11, "Q":12, "K":13, "A":14 };

export function bestHand(sevenCards) {
  // Enumerate all C(7,5) = 21 hands.
  const combos = [];
  for (let a = 0; a < 7; a++)
    for (let b = a+1; b < 7; b++)
      for (let c = b+1; c < 7; c++)
        for (let d = c+1; d < 7; d++)
          for (let e = d+1; e < 7; e++)
            combos.push([sevenCards[a], sevenCards[b], sevenCards[c], sevenCards[d], sevenCards[e]]);
  let best = null;
  for (const five of combos) {
    const score = scoreFive(five);
    if (!best || score.cmp > best.cmp) best = { five, ...score };
  }
  return best;
}

function scoreFive(five) {
  const ranks = five.map(c => RANK_ORDER[String(c.rank).toUpperCase()]).sort((a,b)=>b-a);
  const suits = five.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const uniqueR = [...new Set(ranks)].sort((a,b)=>b-a);
  // Straight detection (including A-2-3-4-5 wheel).
  let isStraight = false, straightHigh = 0;
  if (uniqueR.length === 5) {
    if (uniqueR[0] - uniqueR[4] === 4) { isStraight = true; straightHigh = uniqueR[0]; }
    else if (uniqueR.join(",") === "14,5,4,3,2") { isStraight = true; straightHigh = 5; }
  }
  // Counts.
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const byCount = Object.entries(counts).map(([r,c]) => [parseInt(r,10), c])
    .sort((a,b)=> b[1]-a[1] || b[0]-a[0]);
  const top = byCount[0], second = byCount[1] || [0,0];

  let category, kickers;
  if (isStraight && isFlush) { category = 9; kickers = [straightHigh]; }
  else if (top[1] === 4)     { category = 8; kickers = [top[0], byCount[1][0]]; }
  else if (top[1] === 3 && second[1] === 2) { category = 7; kickers = [top[0], second[0]]; }
  else if (isFlush)          { category = 6; kickers = ranks; }
  else if (isStraight)       { category = 5; kickers = [straightHigh]; }
  else if (top[1] === 3)     { category = 4; kickers = [top[0], ...byCount.slice(1).map(x=>x[0])]; }
  else if (top[1] === 2 && second[1] === 2) { category = 3; kickers = [top[0], second[0], byCount[2][0]]; }
  else if (top[1] === 2)     { category = 2; kickers = [top[0], ...byCount.slice(1).map(x=>x[0])]; }
  else                       { category = 1; kickers = ranks; }
  // Score as: category * 10^10 + kickers as digits.
  let cmp = category * 1e10;
  for (let i = 0; i < kickers.length && i < 5; i++) cmp += kickers[i] * Math.pow(15, 4-i);
  return { category, kickers, cmp };
}

export function categoryName(c) {
  return ["", "High card", "Pair", "Two pair", "Trips", "Straight", "Flush",
          "Full house", "Quads", "Straight flush"][c] || "";
}
