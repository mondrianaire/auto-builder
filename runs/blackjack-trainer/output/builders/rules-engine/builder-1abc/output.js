// rules-engine.js — Section 1, Builder 1abc
// Pure JS module. No DOM, no globals, no I/O.
// Implements card model, shoe, scoring, legal actions, dealer auto-play, hand resolution.
// Locked variant: S17 + DAS + no surrender, blackjack 3:2.

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['S', 'H', 'D', 'C'];

// ---------- Shoe construction ----------

export function buildShoe(numDecks = 6) {
  const cards = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit });
      }
    }
  }
  // Fisher-Yates shuffle on a copy
  const shuffled = cards.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Pure draw: returns { card, shoeAfter }, never mutates input.
export function drawCard(shoe) {
  if (!Array.isArray(shoe) || shoe.length === 0) {
    throw new Error('drawCard: shoe is empty');
  }
  const card = shoe[0];
  const shoeAfter = shoe.slice(1);
  return { card, shoeAfter };
}

// ---------- Card values ----------

export function cardValue(card) {
  const r = card.rank;
  if (r === 'A') return 11;
  if (r === 'J' || r === 'Q' || r === 'K' || r === '10') return 10;
  return parseInt(r, 10);
}

function isTen(card) {
  const r = card.rank;
  return r === '10' || r === 'J' || r === 'Q' || r === 'K';
}

// ---------- Scoring ----------
// scoreHand returns { total, isSoft, isBlackjack, isBust }.
// Aces count as 11 unless that busts; downgrade aces to 1 as needed.

export function scoreHand(cards) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return { total: 0, isSoft: false, isBlackjack: false, isBust: false };
  }
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') {
      aces += 1;
      total += 11;
    } else {
      total += cardValue(c);
    }
  }
  // Downgrade aces from 11 -> 1 while busting
  let acesCountedAs11 = aces;
  while (total > 21 && acesCountedAs11 > 0) {
    total -= 10;
    acesCountedAs11 -= 1;
  }
  const isSoft = acesCountedAs11 > 0 && total <= 21;
  const isBlackjack = cards.length === 2 && total === 21;
  const isBust = total > 21;
  return { total, isSoft, isBlackjack, isBust };
}

export function isPair(cards) {
  if (!Array.isArray(cards) || cards.length !== 2) return false;
  // Pair semantics: matching ranks; any two ten-value cards count as a pair (10/J/Q/K)
  const a = cards[0].rank;
  const b = cards[1].rank;
  if (a === b) return true;
  if (isTen(cards[0]) && isTen(cards[1])) return true;
  return false;
}

// ---------- Legal actions ----------
// handState shape: { cards, isSplitHand, alreadySplit, hasHit, dealerUpcard }
// isSplitHand: this hand was created from a split.
// alreadySplit: a split has already happened on this player turn (no resplits per simplest-within-reason).
// hasHit: at least one hit taken on this hand (disables double/split).

export function legalActions(handState) {
  const { cards, isSplitHand, alreadySplit, hasHit } = handState;
  const actions = [];
  const score = scoreHand(cards);

  // Cannot act on resolved hands
  if (score.isBust || score.total === 21) return actions;

  // Hit and stand are always available on a live hand
  actions.push('hit');
  actions.push('stand');

  // Double: only on initial 2-card decision (no prior hits). DAS allowed (split sub-hands may double).
  if (cards.length === 2 && !hasHit) {
    actions.push('double');
  }

  // Split: only on initial 2-card pair, and only if not already split.
  if (cards.length === 2 && !hasHit && !alreadySplit && !isSplitHand && isPair(cards)) {
    actions.push('split');
  }

  // 'surrender' is intentionally never appended (IP1 lock).
  return actions;
}

// ---------- Dealer auto-play ----------
// S17: dealer stands on all 17, including soft 17.

export function playDealer(dealerHand, shoe) {
  let hand = dealerHand.slice();
  let currentShoe = shoe.slice();
  while (true) {
    const score = scoreHand(hand);
    if (score.isBust) break;
    if (score.total >= 17) break; // S17: stand on any 17 including soft
    const { card, shoeAfter } = drawCard(currentShoe);
    hand = hand.concat([card]);
    currentShoe = shoeAfter;
  }
  return { finalDealerHand: hand, shoeAfter: currentShoe };
}

// ---------- Hand resolution ----------
// resolveHand returns { outcome, netDelta }.
// outcome ∈ player_blackjack | player_win | push | dealer_win | player_bust | dealer_bust
// netDelta is the signed payout vs the bet (positive = player won that many chips).
// Blackjack pays 3:2 (1.5x bet on top).
// context: { wasDoubled, wasSplit }

export function resolveHand(playerHand, dealerHand, bet, context) {
  const ctx = context || { wasDoubled: false, wasSplit: false };
  const playerScore = scoreHand(playerHand);
  const dealerScore = scoreHand(dealerHand);
  const effectiveBet = ctx.wasDoubled ? bet * 2 : bet;

  // Player blackjack only counts when not the result of a split.
  const playerHasBlackjack = playerScore.isBlackjack && !ctx.wasSplit;
  const dealerHasBlackjack = dealerScore.isBlackjack;

  if (playerHasBlackjack && !dealerHasBlackjack) {
    return { outcome: 'player_blackjack', netDelta: Math.round(bet * 1.5) };
  }
  if (playerHasBlackjack && dealerHasBlackjack) {
    return { outcome: 'push', netDelta: 0 };
  }
  if (playerScore.isBust) {
    return { outcome: 'player_bust', netDelta: -effectiveBet };
  }
  if (dealerScore.isBust) {
    return { outcome: 'dealer_bust', netDelta: effectiveBet };
  }
  if (playerScore.total > dealerScore.total) {
    return { outcome: 'player_win', netDelta: effectiveBet };
  }
  if (playerScore.total < dealerScore.total) {
    return { outcome: 'dealer_win', netDelta: -effectiveBet };
  }
  return { outcome: 'push', netDelta: 0 };
}

// ---------- Snapshot helper for strategy-table inputs ----------
// Used by game-state-machine to build the playerHandSnapshot the strategy-table expects.
export function buildPlayerSnapshot(handState) {
  const { cards, isSplitHand, alreadySplit, hasHit } = handState;
  const score = scoreHand(cards);
  const pair = cards.length === 2 && !hasHit && isPair(cards);
  return {
    cards: cards.slice(),
    total: score.total,
    isSoft: score.isSoft,
    isPair: pair,
    canDouble: cards.length === 2 && !hasHit,
    canSplit: pair && !alreadySplit && !isSplitHand
  };
}
