// tests/run.js
// Load sandbox modules into a shared fake `window` and exercise public APIs.
// Writes tests/report.json with { passed, failed, total, scenarios: [...] }.
//
// Usage: node tests/run.js  (run from this directory)

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SANDBOX_DIR = path.resolve(__dirname, '..', 'sandbox');
const REPORT_PATH = path.resolve(__dirname, 'report.json');

// Build a fake window/global that the modules can attach to.
const fakeWindow = {};
const sandboxContext = {
  window: fakeWindow,
  globalThis: fakeWindow,
  console: console,
  Math: Math,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  module: undefined
};
vm.createContext(sandboxContext);

// Load a JS file into the sandbox.
function loadModule(filename) {
  const filepath = path.join(SANDBOX_DIR, filename);
  const code = fs.readFileSync(filepath, 'utf8');
  vm.runInContext(code, sandboxContext, { filename: filename });
}

// Load rules-engine.js, bankroll.js, ui-render.js. (Skip ui-render — needs a DOM.)
loadModule('rules-engine.js');
loadModule('bankroll.js');

const RulesEngine = fakeWindow.RulesEngine;
const Bankroll = fakeWindow.Bankroll;

// ---- Test scaffolding ------------------------------------------------------

const scenarios = [];
function record(id, name, status, detail) {
  scenarios.push({ id, name, status, detail });
}

function makeCard(rank, suit, faceUp) {
  return { rank, suit, faceUp: faceUp !== false };
}

// Build a state directly with controlled hands (bypass random shuffle).
function makeState(playerCards, dealerCards, deckTail, bet) {
  const state = {
    deck: (deckTail || []).slice(), // top card is at end (pop)
    dealerHand: {
      cards: dealerCards.map(c => Object.assign({}, c)),
      bet: 0,
      isDoubled: false, isSplit: false, isFromSplitAces: false,
      isStood: false, isBust: false, isBlackjack: false
    },
    playerHands: [
      {
        cards: playerCards.map(c => Object.assign({}, c)),
        bet: bet || 100,
        isDoubled: false, isSplit: false, isFromSplitAces: false,
        isStood: false, isBust: false, isBlackjack: false
      }
    ],
    activeHandIndex: 0,
    phase: 'playerTurn'
  };
  // Compute initial isBlackjack based on initial deal (2-card hands).
  if (state.playerHands[0].cards.length === 2 && RulesEngine.handTotal(state.playerHands[0]).total === 21) {
    state.playerHands[0].isBlackjack = true;
  }
  if (state.dealerHand.cards.length === 2 && RulesEngine.handTotal(state.dealerHand).total === 21) {
    state.dealerHand.isBlackjack = true;
  }
  // If either side has blackjack at start, mimic dealInitial's effect: skip player turn.
  if (state.playerHands[0].isBlackjack || state.dealerHand.isBlackjack) {
    state.playerHands[0].isStood = true;
    state.phase = 'dealerTurn';
  }
  return state;
}

// ---- Scenarios --------------------------------------------------------------

// 1. blackjack-on-initial-deal: player A+10, dealer 5+9
try {
  const s = makeState(
    [makeCard('A', 'spades'), makeCard('10', 'hearts')],
    [makeCard('5', 'clubs'), makeCard('9', 'diamonds', false)],
    [],
    100
  );
  RulesEngine.playDealer(s);
  const outcomes = RulesEngine.resolveOutcomes(s);
  if (outcomes[0].result === 'blackjack' && outcomes[0].playerTotal === 21) {
    record('s1', 'blackjack-on-initial-deal', 'pass', 'player A+10 -> blackjack');
  } else {
    record('s1', 'blackjack-on-initial-deal', 'fail', 'expected blackjack, got ' + JSON.stringify(outcomes[0]));
  }
} catch (e) { record('s1', 'blackjack-on-initial-deal', 'fail', 'exception: ' + e.message); }

// 2. dealer-blackjack-push: both blackjack
try {
  const s = makeState(
    [makeCard('A', 'spades'), makeCard('K', 'hearts')],
    [makeCard('A', 'clubs'), makeCard('Q', 'diamonds', false)],
    [],
    100
  );
  RulesEngine.playDealer(s);
  const outcomes = RulesEngine.resolveOutcomes(s);
  if (outcomes[0].result === 'push') {
    record('s2', 'dealer-blackjack-push', 'pass', 'both 21 on initial -> push');
  } else {
    record('s2', 'dealer-blackjack-push', 'fail', 'expected push, got ' + outcomes[0].result);
  }
} catch (e) { record('s2', 'dealer-blackjack-push', 'fail', 'exception: ' + e.message); }

// 3. player-bust-loses
try {
  const s = makeState(
    [makeCard('10', 'spades'), makeCard('7', 'hearts')],
    [makeCard('5', 'clubs'), makeCard('9', 'diamonds', false)],
    [makeCard('5', 'spades')], // top card on draw
    100
  );
  // Player hits and busts.
  RulesEngine.applyAction(s, 'hit'); // draws 5 -> 22 -> bust
  if (!s.playerHands[0].isBust) {
    record('s3', 'player-bust-loses', 'fail', 'expected bust, total=' + RulesEngine.handTotal(s.playerHands[0]).total);
  } else {
    RulesEngine.playDealer(s);
    const outcomes = RulesEngine.resolveOutcomes(s);
    if (outcomes[0].result === 'loss') {
      record('s3', 'player-bust-loses', 'pass', 'busted to 22 -> loss');
    } else {
      record('s3', 'player-bust-loses', 'fail', 'expected loss, got ' + outcomes[0].result);
    }
  }
} catch (e) { record('s3', 'player-bust-loses', 'fail', 'exception: ' + e.message); }

// 4. dealer-bust-player-wins
try {
  const s = makeState(
    [makeCard('10', 'spades'), makeCard('8', 'hearts')], // 18
    [makeCard('10', 'clubs'), makeCard('6', 'diamonds', false)], // 16
    [makeCard('10', 'spades')], // dealer draws 10 -> 26 bust
    100
  );
  RulesEngine.applyAction(s, 'stand');
  RulesEngine.playDealer(s);
  const outcomes = RulesEngine.resolveOutcomes(s);
  if (s.dealerHand.isBust && outcomes[0].result === 'win') {
    record('s4', 'dealer-bust-player-wins', 'pass', 'dealer 26 bust, player 18 -> win');
  } else {
    record('s4', 'dealer-bust-player-wins', 'fail', 'dealerBust=' + s.dealerHand.isBust + ' result=' + outcomes[0].result);
  }
} catch (e) { record('s4', 'dealer-bust-player-wins', 'fail', 'exception: ' + e.message); }

// 5. push-on-equal
try {
  const s = makeState(
    [makeCard('10', 'spades'), makeCard('9', 'hearts')], // 19
    [makeCard('10', 'clubs'), makeCard('9', 'diamonds', false)], // 19
    [],
    100
  );
  RulesEngine.applyAction(s, 'stand');
  RulesEngine.playDealer(s);
  const outcomes = RulesEngine.resolveOutcomes(s);
  if (outcomes[0].result === 'push') {
    record('s5', 'push-on-equal', 'pass', 'both 19 -> push');
  } else {
    record('s5', 'push-on-equal', 'fail', 'expected push, got ' + outcomes[0].result);
  }
} catch (e) { record('s5', 'push-on-equal', 'fail', 'exception: ' + e.message); }

// 6. soft-17-stands (S17 rule)
try {
  const s = makeState(
    [makeCard('10', 'spades'), makeCard('9', 'hearts')], // 19
    [makeCard('A', 'clubs'), makeCard('6', 'diamonds', false)], // soft 17
    [makeCard('5', 'hearts')], // dealer would draw if hitting soft 17
    100
  );
  RulesEngine.applyAction(s, 'stand');
  RulesEngine.playDealer(s);
  // dealer should stand on soft 17 -> total stays 17, did not draw the 5
  const dealerTotal = RulesEngine.handTotal(s.dealerHand).total;
  if (dealerTotal === 17 && s.dealerHand.cards.length === 2) {
    record('s6', 'soft-17-stands', 'pass', 'dealer stood on soft 17');
  } else {
    record('s6', 'soft-17-stands', 'fail', 'dealer total=' + dealerTotal + ' cardCount=' + s.dealerHand.cards.length);
  }
} catch (e) { record('s6', 'soft-17-stands', 'fail', 'exception: ' + e.message); }

// 7. split-pair: two 8s
try {
  const s = makeState(
    [makeCard('8', 'spades'), makeCard('8', 'hearts')],
    [makeCard('5', 'clubs'), makeCard('9', 'diamonds', false)],
    [makeCard('3', 'spades'), makeCard('7', 'hearts')], // top of deck for new hands (pop order: 7 first to hand1, 3 to hand2)
    100
  );
  const legal = RulesEngine.legalActions(s, 1000);
  if (legal.indexOf('split') === -1) {
    record('s7', 'split-pair', 'fail', 'split not legal on 8,8');
  } else {
    RulesEngine.applyAction(s, 'split');
    if (s.playerHands.length === 2) {
      record('s7', 'split-pair', 'pass', 'split produced two hands');
    } else {
      record('s7', 'split-pair', 'fail', 'expected 2 hands, got ' + s.playerHands.length);
    }
  }
} catch (e) { record('s7', 'split-pair', 'fail', 'exception: ' + e.message); }

// 8. split-aces-one-card-only
try {
  const s = makeState(
    [makeCard('A', 'spades'), makeCard('A', 'hearts')],
    [makeCard('5', 'clubs'), makeCard('9', 'diamonds', false)],
    [makeCard('5', 'spades'), makeCard('7', 'hearts')], // one card per split-ace hand
    100
  );
  RulesEngine.applyAction(s, 'split');
  // Both hands should have exactly 2 cards (original ace + 1 draw) and be stood.
  const ok = s.playerHands.length === 2 &&
    s.playerHands[0].cards.length === 2 && s.playerHands[0].isStood &&
    s.playerHands[1].cards.length === 2 && s.playerHands[1].isStood &&
    s.playerHands[0].isFromSplitAces && s.playerHands[1].isFromSplitAces;
  if (ok) {
    record('s8', 'split-aces-one-card-only', 'pass', 'both ace hands locked at 2 cards');
  } else {
    record('s8', 'split-aces-one-card-only', 'fail', 'state: ' + JSON.stringify(s.playerHands.map(h => ({ n: h.cards.length, stood: h.isStood, fromAces: h.isFromSplitAces }))));
  }
} catch (e) { record('s8', 'split-aces-one-card-only', 'fail', 'exception: ' + e.message); }

// 9. double-down-deals-one-card
try {
  const s = makeState(
    [makeCard('5', 'spades'), makeCard('6', 'hearts')], // 11 — classic double
    [makeCard('5', 'clubs'), makeCard('9', 'diamonds', false)],
    [makeCard('K', 'spades')], // double draws this 10
    100
  );
  const initialCards = s.playerHands[0].cards.length; // 2
  RulesEngine.applyAction(s, 'double');
  const finalCards = s.playerHands[0].cards.length;
  const isLocked = s.playerHands[0].isStood && s.playerHands[0].isDoubled;
  if (finalCards === initialCards + 1 && isLocked) {
    record('s9', 'double-down-deals-one-card', 'pass', '11+10=21, hand locked');
  } else {
    record('s9', 'double-down-deals-one-card', 'fail', 'cards=' + finalCards + ' locked=' + isLocked);
  }
} catch (e) { record('s9', 'double-down-deals-one-card', 'fail', 'exception: ' + e.message); }

// 10. illegal-split-on-non-pair
try {
  const s = makeState(
    [makeCard('8', 'spades'), makeCard('5', 'hearts')],
    [makeCard('5', 'clubs'), makeCard('9', 'diamonds', false)],
    [],
    100
  );
  const legal = RulesEngine.legalActions(s, 1000);
  if (legal.indexOf('split') === -1) {
    record('s10', 'illegal-split-on-non-pair', 'pass', 'split correctly excluded');
  } else {
    record('s10', 'illegal-split-on-non-pair', 'fail', 'split was offered on 8,5');
  }
} catch (e) { record('s10', 'illegal-split-on-non-pair', 'fail', 'exception: ' + e.message); }

// 11. illegal-double-without-funds
try {
  const s = makeState(
    [makeCard('5', 'spades'), makeCard('6', 'hearts')],
    [makeCard('5', 'clubs'), makeCard('9', 'diamonds', false)],
    [],
    100
  );
  // bankroll < bet -> can't afford double
  const legal = RulesEngine.legalActions(s, 50);
  if (legal.indexOf('double') === -1) {
    record('s11', 'illegal-double-without-funds', 'pass', 'double correctly excluded when bankroll < bet');
  } else {
    record('s11', 'illegal-double-without-funds', 'fail', 'double was offered with insufficient bankroll');
  }
} catch (e) { record('s11', 'illegal-double-without-funds', 'fail', 'exception: ' + e.message); }

// 12. bankroll-payouts-correct
try {
  Bankroll.reset();
  const start = Bankroll.getBalance(); // 1000
  // win 100
  Bankroll.placeBet(100);  // balance 900, committed 100
  Bankroll.resolve(100, 'win'); // payout 200, balance 1100, committed 0
  const afterWin = Bankroll.getBalance();
  // blackjack 100
  Bankroll.placeBet(100); // balance 1000
  Bankroll.resolve(100, 'blackjack'); // payout 250 -> balance 1250
  const afterBJ = Bankroll.getBalance();
  // push 100
  Bankroll.placeBet(100); // balance 1150
  Bankroll.resolve(100, 'push'); // payout 100 -> balance 1250
  const afterPush = Bankroll.getBalance();
  // loss 100
  Bankroll.placeBet(100); // balance 1150
  Bankroll.resolve(100, 'loss'); // payout 0 -> balance 1150
  const afterLoss = Bankroll.getBalance();

  const expected = { afterWin: 1100, afterBJ: 1250, afterPush: 1250, afterLoss: 1150 };
  const actual = { afterWin, afterBJ, afterPush, afterLoss };
  const ok = afterWin === 1100 && afterBJ === 1250 && afterPush === 1250 && afterLoss === 1150;
  if (ok) {
    record('s12', 'bankroll-payouts-correct', 'pass', 'win=+100, bj=+150, push=0, loss=-100 net');
  } else {
    record('s12', 'bankroll-payouts-correct', 'fail', 'expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual));
  }
} catch (e) { record('s12', 'bankroll-payouts-correct', 'fail', 'exception: ' + e.message); }

// 13. bankroll-reset-restores-pool
try {
  // After scenario 12 we have 1150. Drain a bit, reset.
  Bankroll.placeBet(500);
  Bankroll.resolve(500, 'loss');
  const before = Bankroll.getBalance();
  Bankroll.reset();
  const after = Bankroll.getBalance();
  if (after === Bankroll.STARTING_POOL) {
    record('s13', 'bankroll-reset-restores-pool', 'pass', 'reset returned ' + after + ' (was ' + before + ')');
  } else {
    record('s13', 'bankroll-reset-restores-pool', 'fail', 'after=' + after + ' expected ' + Bankroll.STARTING_POOL);
  }
} catch (e) { record('s13', 'bankroll-reset-restores-pool', 'fail', 'exception: ' + e.message); }

// 14. soft-ace-handling: A,7 reports soft 18; A,7,5 hardens to 13
try {
  const h1 = { cards: [makeCard('A','hearts'), makeCard('7','spades')], bet:0, isDoubled:false, isSplit:false, isFromSplitAces:false, isStood:false, isBust:false, isBlackjack:false };
  const t1 = RulesEngine.handTotal(h1);
  const h2 = { cards: [makeCard('A','hearts'), makeCard('7','spades'), makeCard('5','clubs')], bet:0, isDoubled:false, isSplit:false, isFromSplitAces:false, isStood:false, isBust:false, isBlackjack:false };
  const t2 = RulesEngine.handTotal(h2);
  if (t1.total === 18 && t1.isSoft === true && t2.total === 13 && t2.isSoft === false) {
    record('s14', 'soft-ace-handling', 'pass', 'A+7=soft18, A+7+5=hard13');
  } else {
    record('s14', 'soft-ace-handling', 'fail', 't1=' + JSON.stringify(t1) + ' t2=' + JSON.stringify(t2));
  }
} catch (e) { record('s14', 'soft-ace-handling', 'fail', 'exception: ' + e.message); }

// ---- Write report ----------------------------------------------------------

const passed = scenarios.filter(s => s.status === 'pass').length;
const failed = scenarios.filter(s => s.status === 'fail').length;
const total = scenarios.length;
const report = { passed, failed, total, scenarios };

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

console.log('Tests complete: ' + passed + '/' + total + ' passed, ' + failed + ' failed.');
if (failed > 0) {
  scenarios.filter(s => s.status === 'fail').forEach(s => {
    console.log('  FAIL ' + s.id + ' ' + s.name + ': ' + s.detail);
  });
}
process.exit(failed === 0 ? 0 : 1);
