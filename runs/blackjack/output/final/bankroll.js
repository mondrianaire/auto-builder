// bankroll.js
// Pure chip / bankroll module. Attaches window.Bankroll.
// No DOM, no rules logic. Tracks balance + committedBets.
// Per contract: STARTING_POOL=1000, MIN_BET=5, MAX_BET capped at balance.
// Payouts: blackjack = 2.5x bet, win = 2x bet, push = 1x bet, loss = 0.
(function (root) {
  'use strict';

  var STARTING_POOL = 1000;
  var MIN_BET = 5;

  // Module-internal state. Singleton — there's only one bankroll per session.
  var state = {
    balance: STARTING_POOL,
    committedBets: 0
  };

  // Reset to a fresh state and return a snapshot.
  function init() {
    state.balance = STARTING_POOL;
    state.committedBets = 0;
    return snapshot();
  }

  function snapshot() {
    return { balance: state.balance, committedBets: state.committedBets };
  }

  // Available chips not yet committed to any in-flight hand.
  function getBalance() {
    return state.balance;
  }

  // Total chips owned: available + committed (used for end-of-game display).
  function getTotalChips() {
    return state.balance + state.committedBets;
  }

  // Whether a fresh bet of `amount` is legal.
  function canBet(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return false;
    if (amount < MIN_BET) return false;
    if (amount > state.balance) return false;
    return true;
  }

  // Place a fresh bet for a new hand. Moves chips from balance to committedBets.
  function placeBet(amount) {
    if (!canBet(amount)) return false;
    state.balance -= amount;
    state.committedBets += amount;
    return true;
  }

  // Whether the player can afford the additional wager for a double-down.
  function canAffordDouble(currentHandBet) {
    return state.balance >= currentHandBet;
  }

  // Whether the player can afford the additional wager for a split.
  function canAffordSplit(currentHandBet) {
    return state.balance >= currentHandBet;
  }

  // Move additional chips into committedBets (for double or split second-hand wager).
  function addToBet(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return false;
    if (amount <= 0) return false;
    if (amount > state.balance) return false;
    state.balance -= amount;
    state.committedBets += amount;
    return true;
  }

  // Resolve a single hand: return chips to balance per result, decrement committedBets.
  // Returns the payout (chips returned to balance).
  function resolve(betAmount, result) {
    if (typeof betAmount !== 'number' || isNaN(betAmount)) return 0;
    if (betAmount < 0) return 0;

    var payout;
    switch (result) {
      case 'blackjack':
        payout = betAmount * 2.5; // 1.5x winnings + original
        break;
      case 'win':
        payout = betAmount * 2; // 1x winnings + original
        break;
      case 'push':
        payout = betAmount; // original returned
        break;
      case 'loss':
        payout = 0;
        break;
      default:
        // Unknown result string — treat as no payout but still release the committed bet.
        payout = 0;
        break;
    }

    state.committedBets -= betAmount;
    if (state.committedBets < 0) state.committedBets = 0;
    state.balance += payout;
    return payout;
  }

  // Whether the player has enough to place the minimum bet for a new hand.
  function canPlay() {
    return state.balance >= MIN_BET;
  }

  // Hard reset back to starting pool.
  function reset() {
    state.balance = STARTING_POOL;
    state.committedBets = 0;
    return snapshot();
  }

  var api = {
    STARTING_POOL: STARTING_POOL,
    MIN_BET: MIN_BET,
    init: init,
    getBalance: getBalance,
    getTotalChips: getTotalChips,
    canBet: canBet,
    placeBet: placeBet,
    canAffordDouble: canAffordDouble,
    canAffordSplit: canAffordSplit,
    addToBet: addToBet,
    resolve: resolve,
    canPlay: canPlay,
    reset: reset,
    // Test-only snapshot.
    _snapshot: snapshot
  };

  root.Bankroll = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
