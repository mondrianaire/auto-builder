// strategy-table.js — Section 2
// Pure JS module. Data-only basic strategy table plus a lookup function.
// Variant: S17 + DAS + no surrender.

const DEALER_INDEX = { '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7, '10': 8, 'J': 8, 'Q': 8, 'K': 8, 'A': 9 };

const HARD = [
  ['H','H','H','H','H','H','H','H','H','H'], // 5
  ['H','H','H','H','H','H','H','H','H','H'], // 6
  ['H','H','H','H','H','H','H','H','H','H'], // 7
  ['H','H','H','H','H','H','H','H','H','H'], // 8
  ['H','D','D','D','D','H','H','H','H','H'], // 9
  ['D','D','D','D','D','D','D','D','H','H'], // 10
  ['D','D','D','D','D','D','D','D','D','H'], // 11
  ['H','H','S','S','S','H','H','H','H','H'], // 12
  ['S','S','S','S','S','H','H','H','H','H'], // 13
  ['S','S','S','S','S','H','H','H','H','H'], // 14
  ['S','S','S','S','S','H','H','H','H','H'], // 15
  ['S','S','S','S','S','H','H','H','H','H'], // 16
  ['S','S','S','S','S','S','S','S','S','S'], // 17
  ['S','S','S','S','S','S','S','S','S','S'], // 18
  ['S','S','S','S','S','S','S','S','S','S'], // 19
  ['S','S','S','S','S','S','S','S','S','S'], // 20
  ['S','S','S','S','S','S','S','S','S','S']  // 21
];

const SOFT = [
  ['H','H','H','D','D','H','H','H','H','H'],   // A,2 (13)
  ['H','H','H','D','D','H','H','H','H','H'],   // A,3 (14)
  ['H','H','D','D','D','H','H','H','H','H'],   // A,4 (15)
  ['H','H','D','D','D','H','H','H','H','H'],   // A,5 (16)
  ['H','D','D','D','D','H','H','H','H','H'],   // A,6 (17)
  ['S','Ds','Ds','Ds','Ds','S','S','H','H','H'], // A,7 (18)
  ['S','S','S','S','S','S','S','S','S','S'],   // A,8 (19)
  ['S','S','S','S','S','S','S','S','S','S']    // A,9 (20)
];

const PAIRS = [
  ['SP','SP','SP','SP','SP','SP','H','H','H','H'],   // 2,2
  ['SP','SP','SP','SP','SP','SP','H','H','H','H'],   // 3,3
  ['H','H','H','SP','SP','H','H','H','H','H'],       // 4,4 (DAS)
  ['D','D','D','D','D','D','D','D','H','H'],         // 5,5 (treat as hard 10)
  ['SP','SP','SP','SP','SP','H','H','H','H','H'],    // 6,6
  ['SP','SP','SP','SP','SP','SP','H','H','H','H'],   // 7,7
  ['SP','SP','SP','SP','SP','SP','SP','SP','SP','SP'], // 8,8
  ['SP','SP','SP','SP','SP','S','SP','SP','S','S'],  // 9,9
  ['S','S','S','S','S','S','S','S','S','S'],         // T,T
  ['SP','SP','SP','SP','SP','SP','SP','SP','SP','SP']// A,A
];

const PAIR_INDEX = { '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7, '10': 8, 'J': 8, 'Q': 8, 'K': 8, 'A': 9 };

function dealerColumn(dealerUpcard) {
  const r = dealerUpcard.rank;
  if (!(r in DEALER_INDEX)) {
    throw new Error('strategy-table: unknown dealer rank ' + r);
  }
  return DEALER_INDEX[r];
}

function pairRow(card) {
  const r = card.rank;
  if (!(r in PAIR_INDEX)) {
    throw new Error('strategy-table: unknown pair rank ' + r);
  }
  return PAIR_INDEX[r];
}

function resolveSymbol(sym, canDouble) {
  if (sym === 'H') return 'Hit';
  if (sym === 'S') return 'Stand';
  if (sym === 'SP') return 'Split';
  if (sym === 'D') return canDouble ? 'Double' : 'Hit';
  if (sym === 'Ds') return canDouble ? 'Double' : 'Stand';
  throw new Error('strategy-table: unknown symbol ' + sym);
}

export function recommendation(playerHandSnapshot, dealerUpcard) {
  const snap = playerHandSnapshot;
  const col = dealerColumn(dealerUpcard);

  if (snap.isPair && snap.canSplit) {
    const row = pairRow(snap.cards[0]);
    const sym = PAIRS[row][col];
    const action = resolveSymbol(sym, snap.canDouble);
    return action;
  }

  if (snap.isSoft && snap.total >= 13 && snap.total <= 20) {
    const row = snap.total - 13;
    const sym = SOFT[row][col];
    return resolveSymbol(sym, snap.canDouble);
  }

  let total = snap.total;
  if (total < 5) total = 5;
  if (total > 21) total = 21;
  const row = total - 5;
  const sym = HARD[row][col];
  return resolveSymbol(sym, snap.canDouble);
}
