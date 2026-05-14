// strategy-table.js — Section 2, Builder 2a
// Pure JS module. Data-only basic strategy table plus a lookup function.
// Variant: S17 + DAS + no surrender (IP1 lock).
// Action labels: 'Hit' | 'Stand' | 'Double' | 'Split'
// Source: canonical ProfitDuel-style basic-strategy chart for S17+DAS+no-surrender.
// No rendering. No DOM. No exported chart helpers (IP5 lock).

// Dealer upcard columns: indices 0..9 map to dealer 2,3,4,5,6,7,8,9,10,A.
// Note: dealer ten-value cards (10/J/Q/K) all map to column index 8 ("10").

const DEALER_INDEX = { '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7, '10': 8, 'J': 8, 'Q': 8, 'K': 8, 'A': 9 };

// Hard totals 5..21 vs dealer 2..A (10 cols). Index 0 of HARD = total 5, index 16 = total 21.
// 'D' means Double if allowed, else Hit. 'Ds' means Double if allowed, else Stand.
const HARD = [
  // 5
  ['H','H','H','H','H','H','H','H','H','H'],
  // 6
  ['H','H','H','H','H','H','H','H','H','H'],
  // 7
  ['H','H','H','H','H','H','H','H','H','H'],
  // 8
  ['H','H','H','H','H','H','H','H','H','H'],
  // 9
  ['H','D','D','D','D','H','H','H','H','H'],
  // 10
  ['D','D','D','D','D','D','D','D','H','H'],
  // 11
  ['D','D','D','D','D','D','D','D','D','H'],
  // 12
  ['H','H','S','S','S','H','H','H','H','H'],
  // 13
  ['S','S','S','S','S','H','H','H','H','H'],
  // 14
  ['S','S','S','S','S','H','H','H','H','H'],
  // 15
  ['S','S','S','S','S','H','H','H','H','H'],
  // 16
  ['S','S','S','S','S','H','H','H','H','H'],
  // 17
  ['S','S','S','S','S','S','S','S','S','S'],
  // 18
  ['S','S','S','S','S','S','S','S','S','S'],
  // 19
  ['S','S','S','S','S','S','S','S','S','S'],
  // 20
  ['S','S','S','S','S','S','S','S','S','S'],
  // 21
  ['S','S','S','S','S','S','S','S','S','S']
];

// Soft totals A,2 (=13) ... A,9 (=20). 8 rows.
// Index 0 = A,2 (13), 1 = A,3, 2 = A,4, 3 = A,5, 4 = A,6, 5 = A,7 (18), 6 = A,8 (19), 7 = A,9 (20).
const SOFT = [
  // A,2 (13)
  ['H','H','H','D','D','H','H','H','H','H'],
  // A,3 (14)
  ['H','H','H','D','D','H','H','H','H','H'],
  // A,4 (15)
  ['H','H','D','D','D','H','H','H','H','H'],
  // A,5 (16)
  ['H','H','D','D','D','H','H','H','H','H'],
  // A,6 (17)
  ['H','D','D','D','D','H','H','H','H','H'],
  // A,7 (18) — S17: stand vs 2,7,8; double-or-stand vs 3,4,5,6; hit vs 9,10,A
  ['S','Ds','Ds','Ds','Ds','S','S','H','H','H'],
  // A,8 (19)
  ['S','S','S','S','S','S','S','S','S','S'],
  // A,9 (20)
  ['S','S','S','S','S','S','S','S','S','S']
];

// Pair splits A,A through T,T (10 rows).
// Row order: 2,2 / 3,3 / 4,4 / 5,5 / 6,6 / 7,7 / 8,8 / 9,9 / T,T / A,A
const PAIRS = [
  // 2,2 — Split vs 2-7, hit vs 8+
  ['SP','SP','SP','SP','SP','SP','H','H','H','H'],
  // 3,3 — Split vs 2-7, hit vs 8+
  ['SP','SP','SP','SP','SP','SP','H','H','H','H'],
  // 4,4 — Split only vs 5,6 (DAS); hit otherwise
  ['H','H','H','SP','SP','H','H','H','H','H'],
  // 5,5 — Treat as hard 10 (never split)
  ['D','D','D','D','D','D','D','D','H','H'],
  // 6,6 — Split vs 2-6 (DAS); hit otherwise
  ['SP','SP','SP','SP','SP','H','H','H','H','H'],
  // 7,7 — Split vs 2-7; hit otherwise
  ['SP','SP','SP','SP','SP','SP','H','H','H','H'],
  // 8,8 — Always split
  ['SP','SP','SP','SP','SP','SP','SP','SP','SP','SP'],
  // 9,9 — Split vs 2-6, 8, 9; stand vs 7, 10, A
  ['SP','SP','SP','SP','SP','S','SP','SP','S','S'],
  // T,T — Always stand
  ['S','S','S','S','S','S','S','S','S','S'],
  // A,A — Always split
  ['SP','SP','SP','SP','SP','SP','SP','SP','SP','SP']
];

const PAIR_INDEX = { '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7, '10': 8, 'J': 8, 'Q': 8, 'K': 8, 'A': 9 };

// ---------- Translation helpers ----------

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

// Translate an internal symbol ('H','S','D','Ds','SP') to an action label given canDouble/canSplit.
function resolveSymbol(sym, canDouble) {
  if (sym === 'H') return 'Hit';
  if (sym === 'S') return 'Stand';
  if (sym === 'SP') return 'Split';
  if (sym === 'D') return canDouble ? 'Double' : 'Hit';
  if (sym === 'Ds') return canDouble ? 'Double' : 'Stand';
  throw new Error('strategy-table: unknown symbol ' + sym);
}

// ---------- Public API ----------

// recommendation(playerHandSnapshot, dealerUpcard) -> 'Hit' | 'Stand' | 'Double' | 'Split'
// playerHandSnapshot shape (per contract):
//   { cards, total, isSoft, isPair, canDouble, canSplit }
//
// Lookup priority:
//   1. If isPair AND canSplit -> consult PAIRS table. (5,5 row encodes "treat as hard 10".)
//   2. Else if isSoft AND total in 13..20 -> consult SOFT table.
//   3. Else consult HARD table by total (clamped to 5..21).
export function recommendation(playerHandSnapshot, dealerUpcard) {
  const snap = playerHandSnapshot;
  const col = dealerColumn(dealerUpcard);

  // Pair branch
  if (snap.isPair && snap.canSplit) {
    const row = pairRow(snap.cards[0]);
    const sym = PAIRS[row][col];
    const action = resolveSymbol(sym, snap.canDouble);
    // If pair table says Split but canSplit is false, fall through to total-based rec.
    if (action === 'Split') return 'Split';
    if (action !== 'Hit' && action !== 'Stand' && action !== 'Double') return action;
    return action;
  }

  // Soft branch (A,2 .. A,9 means total 13..20 with isSoft)
  if (snap.isSoft && snap.total >= 13 && snap.total <= 20) {
    const row = snap.total - 13;
    const sym = SOFT[row][col];
    return resolveSymbol(sym, snap.canDouble);
  }

  // Hard branch
  let total = snap.total;
  if (total < 5) total = 5;
  if (total > 21) total = 21;
  const row = total - 5;
  const sym = HARD[row][col];
  return resolveSymbol(sym, snap.canDouble);
}

// No rendering helpers. No DOM. No exported chart drawing. (IP5 lock.)
