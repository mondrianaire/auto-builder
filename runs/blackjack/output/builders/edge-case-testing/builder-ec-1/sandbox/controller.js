// controller.js
// Orchestrates the blackjack round lifecycle. Attaches window.Controller.
// Calls RulesEngine for rules, Bankroll for chips, UIRender for DOM repaint.
// Re-renders after every event; render is the single authoritative view.
(function (root) {
  'use strict';

  var rootEl = null;
  var roundState = null; // RulesEngine RoundState
  var message = '';
  var lastOutcomes = null; // resolved outcomes for current/last round
  var defaultBetInput = 25;
  var lastBetInput = 25;

  // Build the ViewState that UIRender consumes.
  function buildViewState() {
    var Bankroll = root.Bankroll;
    var RulesEngine = root.RulesEngine;

    var phase;
    if (!roundState) phase = 'betting';
    else phase = roundState.phase;

    // gameOver overrides phase if bankroll is exhausted and we're between rounds.
    var canPlay = Bankroll.canPlay();
    var inResolved = (phase === 'resolved');
    var betweenRounds = (phase === 'betting') || inResolved;
    var gameOver = !canPlay && betweenRounds && Bankroll.getBalance() < Bankroll.MIN_BET;

    if (gameOver) phase = 'gameOver';

    // Map dealer hand for view.
    var dealerView = { cards: [], total: null, isBust: false };
    if (roundState && roundState.dealerHand) {
      var allRevealed = true;
      for (var i = 0; i < roundState.dealerHand.cards.length; i++) {
        if (!roundState.dealerHand.cards[i].faceUp) { allRevealed = false; break; }
      }
      dealerView.cards = roundState.dealerHand.cards.slice();
      // Show total only when all cards face-up (post-reveal).
      dealerView.total = allRevealed ? RulesEngine.handTotal(roundState.dealerHand).total : null;
      dealerView.isBust = !!roundState.dealerHand.isBust;
    }

    // Map player hands for view.
    var playerHandsView = [];
    if (roundState && roundState.playerHands) {
      for (var p = 0; p < roundState.playerHands.length; p++) {
        var ph = roundState.playerHands[p];
        var t = RulesEngine.handTotal(ph).total;
        var outcome = null;
        if (lastOutcomes && lastOutcomes[p]) outcome = lastOutcomes[p].result;
        playerHandsView.push({
          cards: ph.cards.slice(),
          total: t,
          bet: ph.bet,
          isActive: (phase === 'playerTurn' && p === roundState.activeHandIndex),
          isBust: !!ph.isBust,
          isBlackjack: !!ph.isBlackjack,
          outcome: outcome
        });
      }
    }

    // Legal actions only meaningful during playerTurn.
    var legal = [];
    if (phase === 'playerTurn' && roundState) {
      legal = RulesEngine.legalActions(roundState, Bankroll.getBalance());
    }

    // canReset: surface Reset button when bankroll exhausted, OR always between rounds (so user can reset proactively).
    // Per contract, canReset is "true when bankroll exhausted". Keep it strict.
    var canReset = !canPlay;

    return {
      phase: phase,
      dealerHand: dealerView,
      playerHands: playerHandsView,
      balance: Bankroll.getBalance(),
      committedBets: Bankroll.getTotalChips() - Bankroll.getBalance(),
      currentBetInput: lastBetInput,
      legalActions: legal,
      message: message,
      canReset: canReset
    };
  }

  // Repaint and re-bind events (idempotent because UIRender clears + rebuilds).
  function repaint() {
    var view = buildViewState();
    root.UIRender.render(view, rootEl);
    bindEvents();
  }

  // Handlers --------------------------------------------------------

  function onDeal() {
    var Bankroll = root.Bankroll;
    var RulesEngine = root.RulesEngine;
    var input = document.getElementById('input-bet');
    var bet = parseInt(input && input.value, 10);
    if (isNaN(bet)) { message = 'Enter a valid bet.'; repaint(); return; }
    lastBetInput = bet;

    if (!Bankroll.canBet(bet)) {
      message = 'Bet must be at least ' + Bankroll.MIN_BET + ' and no more than your bankroll (' + Bankroll.getBalance() + ').';
      repaint();
      return;
    }
    if (!Bankroll.placeBet(bet)) {
      message = 'Could not place bet.';
      repaint();
      return;
    }

    // Fresh state for this round (re-shoe each round, per IP2 lock interpretation).
    roundState = RulesEngine.createInitialState();
    roundState = RulesEngine.dealInitial(roundState, bet);
    lastOutcomes = null;
    message = '';

    // Blackjack-on-initial-deal short-circuit: dealInitial already set phase='dealerTurn' if so.
    if (roundState.phase === 'dealerTurn') {
      finishRound();
      return;
    }
    repaint();
  }

  function onAction(action) {
    var Bankroll = root.Bankroll;
    var RulesEngine = root.RulesEngine;
    if (!roundState || roundState.phase !== 'playerTurn') return;

    var legal = RulesEngine.legalActions(roundState, Bankroll.getBalance());
    if (legal.indexOf(action) === -1) return;

    var hand = roundState.playerHands[roundState.activeHandIndex];
    var origBet = hand.bet;

    if (action === 'double') {
      // Commit additional wager equal to original bet for this hand.
      Bankroll.addToBet(origBet);
    } else if (action === 'split') {
      // Commit a second wager for the new hand.
      Bankroll.addToBet(origBet);
    }

    roundState = RulesEngine.applyAction(roundState, action);

    if (roundState.phase === 'dealerTurn') {
      finishRound();
      return;
    }
    repaint();
  }

  function finishRound() {
    var Bankroll = root.Bankroll;
    var RulesEngine = root.RulesEngine;

    roundState = RulesEngine.playDealer(roundState);
    var outcomes = RulesEngine.resolveOutcomes(roundState);
    lastOutcomes = outcomes;

    // Resolve each hand's bet with Bankroll.
    var msgs = [];
    for (var i = 0; i < outcomes.length; i++) {
      var o = outcomes[i];
      var hand = roundState.playerHands[o.handIndex];
      Bankroll.resolve(hand.bet, o.result);
      msgs.push('Hand ' + (i + 1) + ': ' + o.result + ' (you ' + o.playerTotal + ' vs dealer ' + o.dealerTotal + ')');
    }
    if (outcomes.length === 1) {
      var o0 = outcomes[0];
      var verb = ({
        win: 'You win!',
        loss: 'Dealer wins.',
        push: 'Push.',
        blackjack: 'Blackjack!'
      })[o0.result] || o0.result;
      message = verb + ' (you ' + o0.playerTotal + ' vs dealer ' + o0.dealerTotal + ')';
    } else {
      message = msgs.join(' | ');
    }

    // Force phase to 'resolved' for view; next deal resets state.
    roundState.phase = 'resolved';
    repaint();
  }

  function onReset() {
    var Bankroll = root.Bankroll;
    Bankroll.reset();
    roundState = null;
    lastOutcomes = null;
    message = 'Bankroll reset to ' + Bankroll.STARTING_POOL + '.';
    lastBetInput = defaultBetInput;
    repaint();
  }

  // Bind DOM events to current buttons. Called after every render.
  function bindEvents() {
    var deal = document.getElementById('btn-deal');
    if (deal) deal.addEventListener('click', onDeal);

    var hit = document.getElementById('btn-hit');
    if (hit) hit.addEventListener('click', function () { onAction('hit'); });

    var stand = document.getElementById('btn-stand');
    if (stand) stand.addEventListener('click', function () { onAction('stand'); });

    var doub = document.getElementById('btn-double');
    if (doub) doub.addEventListener('click', function () { onAction('double'); });

    var split = document.getElementById('btn-split');
    if (split) split.addEventListener('click', function () { onAction('split'); });

    var reset = document.getElementById('btn-reset');
    if (reset) reset.addEventListener('click', onReset);
  }

  // Public ----------------------------------------------------------

  function init(host) {
    rootEl = host;
    root.Bankroll.init();
    roundState = null;
    lastOutcomes = null;
    message = 'Place a bet and press Deal.';
    repaint();
  }

  var api = { init: init };
  root.Controller = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
