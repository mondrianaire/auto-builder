// rules-engine.js
// Pure blackjack rules engine. Attaches window.RulesEngine.
// No DOM, no chip math (carries Hand.bet for accounting only).
// Per contract: 6-deck shoe, S17 dealer, blackjack only on initial deal,
// split allowed once, split aces get one card and are ineligible for further actions.
(function (root) {
  'use strict';

  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  var DECK_COUNT = 6;

  // ---------- Deck / shuffle ----------

  // Build a fresh 6-deck shoe of 312 cards.
  function buildShoe() {
    var shoe = [];
    for (var d = 0; d < DECK_COUNT; d++) {
      for (var s = 0; s < SUITS.length; s++) {
        for (var r = 0; r < RANKS.length; r++) {
          shoe.push({ rank: RANKS[r], suit: SUITS[s], faceUp: true });
        }
      }
    }
    return shoe;
  }

  // Fisher-Yates shuffle using injected rng (defaults to Math.random).
  function shuffle(arr, rng) {
    rng = rng || Math.random;
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  // Pop and return the top card from the deck.
  function drawCard(deck, faceUp) {
    if (deck.length === 0) {
      // Re-shoe if exhausted (defensive; shouldn't happen in normal play).
      var fresh = shuffle(buildShoe());
      for (var i = 0; i < fresh.length; i++) deck.push(fresh[i]);
    }
    var card = deck.pop();
    card.faceUp = faceUp !== false;
    return card;
  }

  // ---------- Hand math ----------

  // Compute total + soft flag. Aces count as 11 unless that busts the hand.
  // isSoft = true if at least one Ace is still being counted as 11.
  function handTotal(hand) {
    var total = 0;
    var aces = 0;
    for (var i = 0; i < hand.cards.length; i++) {
      var c = hand.cards[i];
      if (c.rank === 'A') {
        total += 11;
        aces += 1;
      } else if (c.rank === 'J' || c.rank === 'Q' || c.rank === 'K' || c.rank === '10') {
        total += 10;
      } else {
        total += parseInt(c.rank, 10);
      }
    }
    // Demote aces from 11 to 1 while busting and we still have a counted-11 ace.
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    return { total: total, isSoft: aces > 0 };
  }

  // Make an empty hand attached to a bet.
  function makeHand(bet) {
    return {
      cards: [],
      bet: bet || 0,
      isDoubled: false,
      isSplit: false,
      isFromSplitAces: false,
      isStood: false,
      isBust: false,
      isBlackjack: false
    };
  }

  // Initial-deal blackjack check: exactly 2 cards summing to 21.
  function checkBlackjack(hand) {
    if (hand.cards.length !== 2) return false;
    return handTotal(hand).total === 21;
  }

  // Recompute and stamp isBust/isBlackjack on a hand. (Blackjack only on initial deal.)
  function refreshHandFlags(hand, allowBlackjack) {
    var t = handTotal(hand).total;
    hand.isBust = t > 21;
    if (allowBlackjack) {
      hand.isBlackjack = checkBlackjack(hand);
    }
  }

  // ---------- Public API ----------

  // Fresh state. Phase = betting until controller calls dealInitial.
  function createInitialState() {
    var deck = shuffle(buildShoe());
    return {
      deck: deck,
      dealerHand: makeHand(0),
      playerHands: [makeHand(0)],
      activeHandIndex: 0,
      phase: 'betting'
    };
  }

  // Deal two cards to player and dealer. Dealer's second card faceUp:false.
  // If either side has blackjack, jump to 'resolved' (controller will reveal hole card via playDealer).
  function dealInitial(state, bet) {
    // Reset hands while keeping deck.
    state.dealerHand = makeHand(0);
    state.playerHands = [makeHand(bet)];
    state.activeHandIndex = 0;
    state.phase = 'playerTurn';

    var player = state.playerHands[0];
    var dealer = state.dealerHand;

    // Deal order: player, dealer (face up), player, dealer (face down)
    player.cards.push(drawCard(state.deck, true));
    dealer.cards.push(drawCard(state.deck, true));
    player.cards.push(drawCard(state.deck, true));
    dealer.cards.push(drawCard(state.deck, false));

    refreshHandFlags(player, true);
    refreshHandFlags(dealer, true);

    // If player has blackjack, or dealer's up-card warrants, controller checks blackjack.
    // The engine signals 'resolved' phase when either side is blackjack so playDealer can reveal.
    if (player.isBlackjack || dealer.isBlackjack) {
      // Mark stood so player turn is effectively skipped; dealer reveal happens in playDealer.
      player.isStood = true;
      state.phase = 'dealerTurn';
    }
    return state;
  }

  // Compute legal actions for the active player hand, given current bankroll.
  // Per contract subset is ['hit','stand','double','split'].
  function legalActions(state, bankroll) {
    if (state.phase !== 'playerTurn') return [];
    var hand = state.playerHands[state.activeHandIndex];
    if (!hand || hand.isBust || hand.isStood || hand.isDoubled) return [];

    // Split aces are dealt one card and immediately frozen — no further actions.
    if (hand.isFromSplitAces) return [];

    var actions = ['hit', 'stand'];

    // Double: only on first two cards, must afford an additional bet equal to current bet.
    if (hand.cards.length === 2 && bankroll >= hand.bet) {
      actions.push('double');
    }

    // Split: only if we have exactly 2 cards of the same rank value (10/J/Q/K all = 10),
    // not already split (no resplits per IP2 lock), and bankroll affords second wager.
    if (
      hand.cards.length === 2 &&
      state.playerHands.length === 1 &&
      bankroll >= hand.bet
    ) {
      var v0 = cardValue(hand.cards[0]);
      var v1 = cardValue(hand.cards[1]);
      if (v0 === v1) actions.push('split');
    }

    return actions;
  }

  // Numeric value of a card for split-pair compare (10, J, Q, K all 10; A is 11 here).
  function cardValue(card) {
    if (card.rank === 'A') return 11;
    if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K' || card.rank === '10') return 10;
    return parseInt(card.rank, 10);
  }

  // Apply an action to the active hand. Returns the (mutated) state.
  function applyAction(state, action) {
    if (state.phase !== 'playerTurn') return state;
    var hand = state.playerHands[state.activeHandIndex];
    if (!hand) return state;

    if (action === 'hit') {
      hand.cards.push(drawCard(state.deck, true));
      refreshHandFlags(hand, false);
      if (hand.isBust) {
        // Bust auto-advances.
        advanceActiveHand(state);
      }
    } else if (action === 'stand') {
      hand.isStood = true;
      advanceActiveHand(state);
    } else if (action === 'double') {
      // Double: deal exactly one card, lock the hand.
      hand.cards.push(drawCard(state.deck, true));
      hand.isDoubled = true;
      hand.bet = hand.bet * 2; // total wager for this hand becomes 2x
      refreshHandFlags(hand, false);
      hand.isStood = true;
      advanceActiveHand(state);
    } else if (action === 'split') {
      // Split: take the second card of the active hand into a new hand,
      // deal one new card to each, both with the original bet.
      var origBet = hand.bet;
      var first = hand.cards[0];
      var second = hand.cards[1];

      // Hand 1 keeps first card; hand 2 starts with second card.
      var h1 = makeHand(origBet);
      h1.isSplit = true;
      h1.cards.push(first);

      var h2 = makeHand(origBet);
      h2.isSplit = true;
      h2.cards.push(second);

      // Deal one card to each.
      h1.cards.push(drawCard(state.deck, true));
      h2.cards.push(drawCard(state.deck, true));

      // Split aces: each hand gets exactly one card and is frozen — no further hits or blackjack.
      if (first.rank === 'A') {
        h1.isFromSplitAces = true;
        h2.isFromSplitAces = true;
        h1.isStood = true;
        h2.isStood = true;
      }

      refreshHandFlags(h1, false);
      refreshHandFlags(h2, false);
      // Blackjack does not count after split per IP2 lock — leave isBlackjack=false.

      state.playerHands = [h1, h2];
      state.activeHandIndex = 0;

      // If first hand is split-aces (already stood), advance.
      if (h1.isStood) advanceActiveHand(state);
    }

    return state;
  }

  // Find the next playable hand; if none, set phase='dealerTurn'.
  function advanceActiveHand(state) {
    for (var i = state.activeHandIndex + 1; i < state.playerHands.length; i++) {
      var h = state.playerHands[i];
      if (!h.isBust && !h.isStood && !h.isDoubled) {
        state.activeHandIndex = i;
        return;
      }
    }
    // No more playable hands. Dealer plays only if at least one player hand is not bust.
    state.phase = 'dealerTurn';
  }

  // Dealer plays per S17: hits while total < 17, stands on all 17 (including soft 17).
  // Reveals hole card. Phase ends 'resolved'.
  function playDealer(state) {
    var dealer = state.dealerHand;
    // Reveal hole card.
    for (var i = 0; i < dealer.cards.length; i++) dealer.cards[i].faceUp = true;

    // If all player hands are bust, dealer doesn't draw further (still reveals).
    var anyAlive = false;
    for (var j = 0; j < state.playerHands.length; j++) {
      if (!state.playerHands[j].isBust) { anyAlive = true; break; }
    }

    if (anyAlive) {
      // S17: stand on all 17 including soft 17.
      while (true) {
        var t = handTotal(dealer);
        if (t.total >= 17) break;
        dealer.cards.push(drawCard(state.deck, true));
      }
    }
    refreshHandFlags(dealer, true);
    state.phase = 'resolved';
    return state;
  }

  // Compare each player hand against dealer to produce Outcome[].
  function resolveOutcomes(state) {
    var outcomes = [];
    var dealerTotal = handTotal(state.dealerHand).total;
    var dealerBust = state.dealerHand.isBust;
    var dealerBJ = state.dealerHand.isBlackjack;

    for (var i = 0; i < state.playerHands.length; i++) {
      var hand = state.playerHands[i];
      var pt = handTotal(hand).total;
      var result;

      if (hand.isBust) {
        result = 'loss';
      } else if (hand.isBlackjack && !dealerBJ) {
        result = 'blackjack';
      } else if (hand.isBlackjack && dealerBJ) {
        result = 'push';
      } else if (!hand.isBlackjack && dealerBJ) {
        result = 'loss';
      } else if (dealerBust) {
        result = 'win';
      } else if (pt > dealerTotal) {
        result = 'win';
      } else if (pt === dealerTotal) {
        result = 'push';
      } else {
        result = 'loss';
      }

      outcomes.push({
        handIndex: i,
        result: result,
        playerTotal: pt,
        dealerTotal: dealerTotal
      });
    }
    return outcomes;
  }

  // Public API.
  var api = {
    createInitialState: createInitialState,
    dealInitial: dealInitial,
    legalActions: legalActions,
    applyAction: applyAction,
    playDealer: playDealer,
    resolveOutcomes: resolveOutcomes,
    handTotal: handTotal,
    // Internal helpers exposed for testing harness use only.
    _internal: {
      buildShoe: buildShoe,
      shuffle: shuffle,
      cardValue: cardValue,
      makeHand: makeHand,
      drawCard: drawCard
    }
  };

  root.RulesEngine = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
