// rules-engine.js — Section 1
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
  const a = cards[0].rank;
  const b = cards[1].rank;
  if (a === b) return true;
  if (isTen(cards[0]) && isTen(cards[1])) return true;
  return false;
}

// ---------- Legal actions ----------

export function legalActions(handState) {
  const { cards, isSplitHand, alreadySplit, hasHit } = handState;
  const actions = [];
  const score = scoreHand(cards);

  if (score.isBust || score.total === 21) return actions;

  actions.push('hit');
  actions.push('stand');

  if (cards.length === 2 && !hasHit) {
    actions.push('double');
  }

  if (cards.length === 2 && !hasHit && !alreadySplit && !isSplitHand && isPair(cards)) {
    actions.push('split');
  }

  return actions;
}

// ---------- Dealer auto-play ----------

export function playDealer(dealerHand, shoe) {
  let hand = dealerHand.slice();
  let currentShoe = shoe.slice();
  while (true) {
    const score = scoreHand(hand);
    if (score.isBust) break;
    if (score.total >= 17) break;
    const { card, shoeAfter } = drawCard(currentShoe);
    hand = hand.concat([card]);
    currentShoe = shoeAfter;
  }
  return { finalDealerHand: hand, shoeAfter: currentShoe };
}

// ---------- Hand resolution ----------

export function resolveHand(playerHand, dealerHand, bet, context) {
  const ctx = context || { wasDoubled: false, wasSplit: false };
  const playerScore = scoreHand(playerHand);
  const dealerScore = scoreHand(dealerHand);
  const effectiveBet = ctx.wasDoubled ? bet * 2 : bet;

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

// ---------- Snapshot helper ----------
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
