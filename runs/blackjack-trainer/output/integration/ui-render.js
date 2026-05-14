// ui-render.js — Section 4
// ES module. Render-on-state subscriber. Pure render: receives state, emits user actions via dispatch().
// CRITICAL: Deal/Next button is enabled in 'betting' AND 'resolved'/'review' phases.

const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_COLOR = { S: 'black', H: 'red', D: 'red', C: 'black' };

export function mountUI(rootElement, stateMachine) {
  rootElement.innerHTML = '';
  rootElement.classList.add('bj-app');

  const html = `
    <div class="bj-table" id="bj-table">
      <section class="bj-dealer">
        <h2>Dealer</h2>
        <div id="dealer-hand" class="bj-hand bj-dealer-hand" aria-label="Dealer hand"></div>
        <div id="dealer-score" class="bj-score"></div>
      </section>

      <section class="bj-player">
        <h2>You</h2>
        <div id="player-hand" class="bj-hand bj-player-hand" aria-label="Player hand"></div>
        <div id="player-score" class="bj-score"></div>
      </section>

      <section class="bj-controls">
        <button id="btn-deal" type="button" class="bj-btn bj-btn-deal">Deal</button>
        <button id="btn-hit" type="button" class="bj-btn">Hit</button>
        <button id="btn-stand" type="button" class="bj-btn">Stand</button>
        <button id="btn-double" type="button" class="bj-btn">Double</button>
        <button id="btn-split" type="button" class="bj-btn">Split</button>
        <button id="btn-hint" type="button" class="bj-btn bj-btn-hint">Hint</button>
      </section>

      <section class="bj-hint" id="hint-area">
        <h3>Hint</h3>
        <div id="hint-display" class="bj-hint-display" aria-live="polite"></div>
      </section>

      <section class="bj-review" id="review-area">
        <h3>Hand review</h3>
        <div id="review-panel" class="bj-review-panel" aria-live="polite"></div>
      </section>

      <section class="bj-status">
        <span id="status-line" class="bj-status-line"></span>
      </section>
    </div>
  `;
  rootElement.innerHTML = html;

  const $ = (id) => rootElement.querySelector('#' + id);
  const els = {
    dealerHand: $('dealer-hand'),
    dealerScore: $('dealer-score'),
    playerHand: $('player-hand'),
    playerScore: $('player-score'),
    btnDeal: $('btn-deal'),
    btnHit: $('btn-hit'),
    btnStand: $('btn-stand'),
    btnDouble: $('btn-double'),
    btnSplit: $('btn-split'),
    btnHint: $('btn-hint'),
    hintDisplay: $('hint-display'),
    reviewPanel: $('review-panel'),
    statusLine: $('status-line')
  };

  els.btnDeal.addEventListener('click', () => stateMachine.dispatch({ type: 'deal' }));
  els.btnHit.addEventListener('click', () => stateMachine.dispatch({ type: 'hit' }));
  els.btnStand.addEventListener('click', () => stateMachine.dispatch({ type: 'stand' }));
  els.btnDouble.addEventListener('click', () => stateMachine.dispatch({ type: 'double' }));
  els.btnSplit.addEventListener('click', () => stateMachine.dispatch({ type: 'split' }));

  function renderCard(card, hidden) {
    const span = document.createElement('span');
    span.className = 'bj-card';
    if (hidden) {
      span.classList.add('bj-card-back');
      span.textContent = '█';
      span.setAttribute('aria-label', 'face-down card');
      return span;
    }
    span.style.color = SUIT_COLOR[card.suit] || 'black';
    const r = card.rank === '10' ? '10' : card.rank;
    span.textContent = r + SUIT_GLYPH[card.suit];
    span.setAttribute('aria-label', card.rank + ' of ' + card.suit);
    return span;
  }

  function renderHand(container, hand, isDealer) {
    container.innerHTML = '';
    if (isDealer) {
      for (const slot of hand) {
        container.appendChild(renderCard(slot.card, !slot.visible));
      }
    } else {
      for (const c of hand) {
        container.appendChild(renderCard(c, false));
      }
    }
  }

  function dealerVisibleScoreText(dealerHand) {
    const visibleCards = dealerHand.filter(d => d.visible).map(d => d.card);
    if (visibleCards.length === 0) return '';
    if (dealerHand.every(d => d.visible)) {
      const total = scoreSimple(visibleCards);
      return 'Total: ' + total;
    }
    const upTotal = scoreSimple(visibleCards);
    return 'Showing: ' + upTotal;
  }

  function scoreSimple(cards) {
    let total = 0; let aces = 0;
    for (const c of cards) {
      if (c.rank === 'A') { aces += 1; total += 11; }
      else if (c.rank === '10' || c.rank === 'J' || c.rank === 'Q' || c.rank === 'K') total += 10;
      else total += parseInt(c.rank, 10);
    }
    while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
    return total;
  }

  function renderPlayerHands(container, playerHands, activeIndex, phase) {
    container.innerHTML = '';
    if (playerHands.length === 0) return;
    if (playerHands.length === 1) {
      const h = playerHands[0];
      const wrap = document.createElement('div');
      wrap.className = 'bj-subhand';
      if (h.isActive) wrap.classList.add('bj-subhand-active');
      const cardsBox = document.createElement('div');
      cardsBox.className = 'bj-hand bj-cards-row';
      renderHand(cardsBox, h.cards, false);
      wrap.appendChild(cardsBox);
      container.appendChild(wrap);
      return;
    }
    playerHands.forEach((h, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'bj-subhand';
      if (i === activeIndex && phase === 'player_turn') wrap.classList.add('bj-subhand-active');
      const label = document.createElement('div');
      label.className = 'bj-subhand-label';
      label.textContent = 'Hand ' + (i + 1);
      wrap.appendChild(label);
      const cardsBox = document.createElement('div');
      cardsBox.className = 'bj-hand bj-cards-row';
      renderHand(cardsBox, h.cards, false);
      wrap.appendChild(cardsBox);
      container.appendChild(wrap);
    });
  }

  function setBtn(btn, enabled, label) {
    btn.disabled = !enabled;
    if (label !== undefined) btn.textContent = label;
  }

  function renderControls(state) {
    const phase = state.phase;
    const legal = state.legalActions || [];

    // Deal/Next: enabled in 'betting' AND in 'resolved'/'review'.
    const dealEnabled = (phase === 'betting' || phase === 'resolved' || phase === 'review');
    setBtn(els.btnDeal, dealEnabled, phase === 'betting' ? 'Deal' : (dealEnabled ? 'Next hand' : 'Deal'));

    setBtn(els.btnHit, legal.includes('hit'));
    setBtn(els.btnStand, legal.includes('stand'));
    setBtn(els.btnDouble, legal.includes('double'));
    setBtn(els.btnSplit, legal.includes('split'));

    setBtn(els.btnHint, phase === 'player_turn');
  }

  function renderStatus(state) {
    const phase = state.phase;
    let txt = '';
    switch (phase) {
      case 'betting': txt = 'Click Deal to start a hand.'; break;
      case 'player_turn':
        if (state.playerHands.length > 1) {
          txt = 'Your turn (Hand ' + (state.activeHandIndex + 1) + ' of ' + state.playerHands.length + ').';
        } else {
          txt = 'Your turn.';
        }
        break;
      case 'dealer_turn': txt = 'Dealer plays...'; break;
      case 'resolved':
      case 'review':
        txt = formatResolvedSummary(state);
        break;
      default: txt = '';
    }
    els.statusLine.textContent = txt;
  }

  function formatResolvedSummary(state) {
    if (state.playerHands.length === 1) {
      const o = state.playerHands[0].outcome;
      return outcomeLabel(o) + ' Click Deal for the next hand.';
    }
    const labels = state.playerHands.map((h, i) => 'Hand ' + (i + 1) + ': ' + outcomeLabel(h.outcome));
    return labels.join('  |  ') + '  |  Click Deal for the next hand.';
  }

  function outcomeLabel(o) {
    switch (o) {
      case 'player_blackjack': return 'Blackjack!';
      case 'player_win': return 'You win.';
      case 'dealer_win': return 'Dealer wins.';
      case 'player_bust': return 'Bust.';
      case 'dealer_bust': return 'Dealer busts — you win.';
      case 'push': return 'Push.';
      default: return '';
    }
  }

  function renderHint(actionLabel) {
    els.hintDisplay.textContent = actionLabel || '';
  }

  function renderReviewRows(rows) {
    els.reviewPanel.innerHTML = '';
    if (!rows || rows.length === 0) return;
    const table = document.createElement('table');
    table.className = 'bj-review-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>#</th><th>Hand</th><th>You played</th><th>Correct</th><th>Match</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      tr.className = row.matched ? 'bj-row-match' : 'bj-row-mismatch';
      tr.innerHTML = '<td>' + (i + 1) + '</td>'
        + '<td>' + escapeHtml(row.handSnapshotSummary || '') + '</td>'
        + '<td>' + escapeHtml(row.chosenAction || '') + '</td>'
        + '<td>' + escapeHtml(row.correctAction || '') + '</td>'
        + '<td>' + (row.matched ? 'Yes' : 'No') + '</td>';
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    els.reviewPanel.appendChild(table);
  }

  function clearReview() {
    els.reviewPanel.innerHTML = '';
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render(state) {
    renderHand(els.dealerHand, state.dealerHand, true);
    els.dealerScore.textContent = dealerVisibleScoreText(state.dealerHand);

    renderPlayerHands(els.playerHand, state.playerHands, state.activeHandIndex, state.phase);
    if (state.playerHands.length > 0) {
      const active = state.playerHands[state.activeHandIndex] || state.playerHands[0];
      els.playerScore.textContent = 'Total: ' + scoreSimple(active.cards);
    } else {
      els.playerScore.textContent = '';
    }

    renderControls(state);
    renderStatus(state);

    if (state.phase === 'betting') {
      els.hintDisplay.textContent = '';
      clearReview();
    }
  }

  const unsubscribe = stateMachine.subscribe(render);

  return {
    unmount() {
      unsubscribe();
      rootElement.innerHTML = '';
    },
    renderHint,
    renderReviewRows,
    elements: {
      btnHint: els.btnHint,
      hintDisplay: els.hintDisplay,
      reviewPanel: els.reviewPanel
    }
  };
}
