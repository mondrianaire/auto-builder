// ui-render.js
// Pure DOM rendering for the blackjack table. Attaches window.UIRender.
// No event binding (controller wires events via stable IDs).
// render(state, rootEl) is idempotent: repeated calls with the same state produce the same DOM.
(function (root) {
  'use strict';

  var SUIT_GLYPH = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };

  var ACTION_BUTTON_IDS = {
    hit: 'btn-hit',
    stand: 'btn-stand',
    double: 'btn-double',
    split: 'btn-split'
  };

  // Helpers ----------------------------------------------------------------

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!attrs.hasOwnProperty(k)) continue;
        if (k === 'className') node.className = attrs[k];
        else if (k === 'textContent') node.textContent = attrs[k];
        else if (k === 'id') node.id = attrs[k];
        else if (k === 'value') node.value = attrs[k];
        else if (k === 'type') node.type = attrs[k];
        else if (k === 'min' || k === 'max' || k === 'step') node.setAttribute(k, attrs[k]);
        else if (k === 'disabled') {
          if (attrs[k]) node.setAttribute('disabled', 'disabled');
        }
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c == null) continue;
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else node.appendChild(c);
      }
    }
    return node;
  }

  function isRedSuit(suit) {
    return suit === 'hearts' || suit === 'diamonds';
  }

  // Render a single card. Hidden hole card (faceUp:false) shows as facedown.
  function renderCard(card) {
    if (!card.faceUp) {
      return el('div', { className: 'card card-face-down' }, []);
    }
    var className = 'card' + (isRedSuit(card.suit) ? ' card-red' : ' card-black') + ' suit-' + card.suit;
    return el('div', { className: className }, [
      el('span', { className: 'rank' }, [card.rank]),
      el('span', { className: 'suit' }, [SUIT_GLYPH[card.suit] || '?'])
    ]);
  }

  // Render a hand block (cards + total + status).
  function renderHand(hand, opts) {
    opts = opts || {};
    var cls = 'hand';
    if (opts.isActive) cls += ' hand-active';
    if (hand.isBust) cls += ' hand-bust';
    if (hand.isBlackjack) cls += ' hand-blackjack';

    var cards = el('div', { className: 'cards' }, []);
    for (var i = 0; i < hand.cards.length; i++) {
      cards.appendChild(renderCard(hand.cards[i]));
    }

    var totalText = '';
    if (typeof hand.total === 'number') {
      totalText = 'Total: ' + hand.total;
      if (hand.isBust) totalText += ' (bust)';
      else if (hand.isBlackjack) totalText = 'Blackjack!';
    }

    var betText = '';
    if (typeof hand.bet === 'number' && hand.bet > 0) {
      betText = 'Bet: ' + hand.bet;
    }

    var outcomeText = '';
    if (hand.outcome) {
      outcomeText = ' — ' + hand.outcome.toUpperCase();
    }

    var meta = el('div', { className: 'hand-meta' }, [
      el('span', { className: 'hand-total' }, [totalText]),
      betText ? el('span', { className: 'hand-bet' }, [' · ' + betText + outcomeText]) : null
    ]);

    return el('div', { className: cls }, [cards, meta]);
  }

  // Render the dealer area.
  function renderDealerArea(state) {
    var dealer = state.dealerHand || { cards: [], total: null, isBust: false };
    var hand = {
      cards: dealer.cards || [],
      total: dealer.total,
      bet: 0,
      isActive: false,
      isBust: !!dealer.isBust,
      isBlackjack: false,
      outcome: null
    };
    var heading = el('h2', { className: 'area-heading' }, ['Dealer']);
    var handEl = renderHand(hand, { isActive: false });
    return el('div', { id: 'area-dealer', className: 'area area-dealer' }, [heading, handEl]);
  }

  // Render the player area (one or more hands).
  function renderPlayerArea(state) {
    var heading = el('h2', { className: 'area-heading' }, ['Player']);
    var handsContainer = el('div', { className: 'hands' }, []);
    var hands = state.playerHands || [];
    if (hands.length === 0) {
      handsContainer.appendChild(el('div', { className: 'hand hand-empty' }, [
        el('div', { className: 'cards' }, []),
        el('div', { className: 'hand-meta' }, ['Place a bet to begin.'])
      ]));
    } else {
      for (var i = 0; i < hands.length; i++) {
        var ph = hands[i];
        handsContainer.appendChild(renderHand(ph, { isActive: !!ph.isActive }));
      }
    }
    return el('div', { id: 'area-player', className: 'area area-player' }, [heading, handsContainer]);
  }

  // Render the controls (bet input, deal, hit, stand, double, split, reset).
  function renderControls(state) {
    var legal = {};
    var actions = state.legalActions || [];
    for (var i = 0; i < actions.length; i++) legal[actions[i]] = true;

    var phase = state.phase;
    var inBetting = (phase === 'betting');
    var inPlayer = (phase === 'playerTurn');

    // Bet input + Deal button.
    var betInput = el('input', {
      id: 'input-bet',
      type: 'number',
      min: '5',
      step: '5',
      value: typeof state.currentBetInput === 'number' ? state.currentBetInput : 25,
      disabled: !inBetting
    }, []);

    var dealBtn = el('button', {
      id: 'btn-deal',
      className: 'btn btn-primary',
      disabled: !inBetting
    }, ['Deal']);

    // Action buttons.
    var hitBtn = el('button', {
      id: 'btn-hit', className: 'btn btn-action',
      disabled: !(inPlayer && legal.hit)
    }, ['Hit']);
    var standBtn = el('button', {
      id: 'btn-stand', className: 'btn btn-action',
      disabled: !(inPlayer && legal.stand)
    }, ['Stand']);
    var doubleBtn = el('button', {
      id: 'btn-double', className: 'btn btn-action',
      disabled: !(inPlayer && legal.double)
    }, ['Double']);
    var splitBtn = el('button', {
      id: 'btn-split', className: 'btn btn-action',
      disabled: !(inPlayer && legal.split)
    }, ['Split']);

    // Reset button — visible only when canReset is true.
    var resetAttrs = { id: 'btn-reset', className: 'btn btn-warning' };
    if (!state.canReset) {
      resetAttrs.style = 'display:none';
    }
    var resetBtn = el('button', resetAttrs, ['Reset Bankroll']);

    var betRow = el('div', { className: 'controls-row controls-bet' }, [
      el('label', { 'for': 'input-bet' }, ['Bet: ']),
      betInput,
      dealBtn
    ]);

    var actionRow = el('div', { className: 'controls-row controls-actions' }, [
      hitBtn, standBtn, doubleBtn, splitBtn
    ]);

    var resetRow = el('div', { className: 'controls-row controls-reset' }, [resetBtn]);

    return el('div', { className: 'controls' }, [betRow, actionRow, resetRow]);
  }

  // Render the bankroll/message strip.
  function renderStatus(state) {
    var balance = (typeof state.balance === 'number') ? state.balance : 0;
    var committed = (typeof state.committedBets === 'number') ? state.committedBets : 0;
    var msg = state.message || '';

    return el('div', { className: 'status' }, [
      el('div', { id: 'display-balance', className: 'display-balance' }, [
        'Bankroll: ',
        el('strong', null, [String(balance)]),
        committed > 0 ? ' (committed: ' + committed + ')' : ''
      ]),
      el('div', { id: 'display-message', className: 'display-message' }, [msg])
    ]);
  }

  // Public API ----------------------------------------------------------------

  function render(state, rootEl) {
    if (!rootEl) return;
    if (!state) state = { phase: 'betting', dealerHand: { cards: [], total: null, isBust: false }, playerHands: [], balance: 0, committedBets: 0, currentBetInput: 25, legalActions: [], message: '', canReset: false };

    // Clear root.
    while (rootEl.firstChild) rootEl.removeChild(rootEl.firstChild);
    // Tag the root with the contract id (idempotent).
    rootEl.id = rootEl.id || 'blackjack-app';
    if (rootEl.id !== 'blackjack-app') {
      // Wrap inside an inner blackjack-app container if root has a different id.
      var inner = el('div', { id: 'blackjack-app', className: 'blackjack-app' }, []);
      inner.appendChild(renderStatus(state));
      inner.appendChild(renderDealerArea(state));
      inner.appendChild(renderPlayerArea(state));
      inner.appendChild(renderControls(state));
      rootEl.appendChild(inner);
      return;
    }

    rootEl.classList.add('blackjack-app');
    rootEl.appendChild(renderStatus(state));
    rootEl.appendChild(renderDealerArea(state));
    rootEl.appendChild(renderPlayerArea(state));
    rootEl.appendChild(renderControls(state));
  }

  function getActionButtonId(action) {
    return ACTION_BUTTON_IDS[action] || null;
  }

  var api = {
    render: render,
    getActionButtonId: getActionButtonId
  };

  root.UIRender = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
