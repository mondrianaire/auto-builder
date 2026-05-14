// Section 5b: Hand evaluator. evaluateHand(holeCards, board) -> { rank, tiebreakers, name }
// Best 5-of-7 NLHE evaluation. Pure function.

(function () {
  'use strict';

  const RANKS = '23456789TJQKA';
  // Hand ranks (higher = better)
  const HAND_RANK = {
    HIGH_CARD: 0,
    PAIR: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8
  };
  const HAND_NAME = {
    0: 'High Card', 1: 'Pair', 2: 'Two Pair', 3: 'Three of a Kind', 4: 'Straight',
    5: 'Flush', 6: 'Full House', 7: 'Four of a Kind', 8: 'Straight Flush'
  };

  function rankIdx(card) { return RANKS.indexOf(card[0]); }
  function suit(card) { return card[1]; }

  // Generate all 5-card combinations from 7 cards
  function combinations5(cards) {
    const out = [];
    const n = cards.length;
    for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
    for (let c = b + 1; c < n - 2; c++)
    for (let d = c + 1; d < n - 1; d++)
    for (let e = d + 1; e < n; e++) {
      out.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
    }
    return out;
  }

  // Evaluate a 5-card hand. Returns { rank, tiebreakers (array of rank indices, big-first) }
  function eval5(cards) {
    const r = cards.map(rankIdx).sort((a, b) => b - a);
    const s = cards.map(suit);

    const isFlush = s.every(x => x === s[0]);

    // Straight detection: distinct sorted ranks descending
    const distinct = [...new Set(r)].sort((a, b) => b - a);
    let straightHigh = -1;
    if (distinct.length === 5) {
      if (distinct[0] - distinct[4] === 4) straightHigh = distinct[0];
      else if (distinct[0] === 12 && distinct[1] === 3 && distinct[2] === 2 && distinct[3] === 1 && distinct[4] === 0) straightHigh = 3; // wheel = 5-high
    }
    if (isFlush && straightHigh >= 0) {
      return { rank: HAND_RANK.STRAIGHT_FLUSH, tiebreakers: [straightHigh] };
    }

    // Pair logic
    const counts = {};
    r.forEach(x => counts[x] = (counts[x] || 0) + 1);
    const groups = Object.entries(counts).map(([k, v]) => ({ r: +k, c: v }));
    groups.sort((a, b) => b.c - a.c || b.r - a.r);

    if (groups[0].c === 4) {
      return { rank: HAND_RANK.FOUR_OF_A_KIND, tiebreakers: [groups[0].r, groups[1].r] };
    }
    if (groups[0].c === 3 && groups[1] && groups[1].c >= 2) {
      return { rank: HAND_RANK.FULL_HOUSE, tiebreakers: [groups[0].r, groups[1].r] };
    }
    if (isFlush) {
      return { rank: HAND_RANK.FLUSH, tiebreakers: r };
    }
    if (straightHigh >= 0) {
      return { rank: HAND_RANK.STRAIGHT, tiebreakers: [straightHigh] };
    }
    if (groups[0].c === 3) {
      const kickers = groups.slice(1).filter(g => g.c === 1).map(g => g.r);
      return { rank: HAND_RANK.THREE_OF_A_KIND, tiebreakers: [groups[0].r].concat(kickers.slice(0, 2)) };
    }
    if (groups[0].c === 2 && groups[1] && groups[1].c === 2) {
      const pairs = [groups[0].r, groups[1].r].sort((a, b) => b - a);
      const kicker = groups.find(g => g.c === 1).r;
      return { rank: HAND_RANK.TWO_PAIR, tiebreakers: [pairs[0], pairs[1], kicker] };
    }
    if (groups[0].c === 2) {
      const kickers = groups.slice(1).filter(g => g.c === 1).map(g => g.r);
      return { rank: HAND_RANK.PAIR, tiebreakers: [groups[0].r].concat(kickers.slice(0, 3)) };
    }
    return { rank: HAND_RANK.HIGH_CARD, tiebreakers: r };
  }

  function compareEvals(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const at = a.tiebreakers, bt = b.tiebreakers;
    const n = Math.min(at.length, bt.length);
    for (let i = 0; i < n; i++) if (at[i] !== bt[i]) return at[i] - bt[i];
    return 0;
  }

  function evaluateHand(holeCards, board) {
    const all = (holeCards || []).concat(board || []);
    if (all.length < 5) {
      // Cannot evaluate; return a high-card-like best of available
      if (all.length === 0) return { rank: -1, tiebreakers: [], name: 'No Cards' };
      const sorted = all.map(rankIdx).sort((a, b) => b - a);
      return { rank: 0, tiebreakers: sorted.slice(0, 5), name: 'High Card' };
    }
    if (all.length === 5) {
      const e = eval5(all);
      e.name = HAND_NAME[e.rank];
      return e;
    }
    // 6 or 7 — find best 5
    const combos = combinations5(all);
    let best = eval5(combos[0]);
    for (let i = 1; i < combos.length; i++) {
      const cur = eval5(combos[i]);
      if (compareEvals(cur, best) > 0) best = cur;
    }
    best.name = HAND_NAME[best.rank];
    return best;
  }

  window.HandEval = window.HandEval || {};
  window.HandEval.evaluateHand = evaluateHand;
  window.HandEval.compareEvals = compareEvals;
  window.HandEval.HAND_RANK = HAND_RANK;
  window.HandEval.HAND_NAME = HAND_NAME;
})();
