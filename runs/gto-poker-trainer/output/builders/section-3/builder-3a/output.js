// Section 3a: Walkthrough mode controller — index, hand view, decision-then-reveal, glossary popups.
// Registers route 'walkthrough' with AppShell.

(function () {
  'use strict';

  const SUITS_RED = { 'h': '♥', 'd': '♦' };
  const SUITS_BLACK = { 's': '♠', 'c': '♣' };

  function cardEl(card) {
    const div = document.createElement('div');
    div.className = 'card';
    if (!card || card === '_') {
      div.textContent = '?';
      div.style.background = '#444';
      div.style.color = '#888';
      return div;
    }
    const rank = card[0];
    const suit = card[1];
    let suitChar;
    if (SUITS_RED[suit]) { suitChar = SUITS_RED[suit]; div.classList.add('red'); }
    else suitChar = SUITS_BLACK[suit];
    div.innerHTML = '<span class="rank">' + rank + '</span><span class="suit">' + suitChar + '</span>';
    return div;
  }

  function paragraphsFromText(text) {
    return text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
  }

  let currentHandId = null;
  let lastDecision = null;

  function scoreDecision(handData, action) {
    const mix = handData.gto_mix || {};
    const freq = mix[action];
    if (typeof freq !== 'number') return { label: 'off-tree', deviation: 1.0 };
    if (freq >= 0.30) return { label: 'matches GTO mix', deviation: 0.0 };
    if (freq >= 0.10) return { label: 'partial', deviation: 0.4 };
    return { label: 'off-tree', deviation: 1.0 };
  }

  function showGlossary(termId) {
    const term = window.GTOData.getGlossaryTerm(termId);
    if (!term) return;
    const overlay = document.createElement('div');
    overlay.className = 'glossary-overlay';
    overlay.addEventListener('click', () => {
      overlay.remove();
      pop.remove();
    });
    const pop = document.createElement('div');
    pop.className = 'glossary-pop';
    pop.innerHTML =
      '<span class="close-btn">x</span>' +
      '<h3>' + term.name + '</h3>' +
      '<p><em>' + term.short_def + '</em></p>' +
      '<p>' + term.long_explanation + '</p>';
    pop.querySelector('.close-btn').addEventListener('click', () => {
      overlay.remove();
      pop.remove();
    });
    document.body.appendChild(overlay);
    document.body.appendChild(pop);
  }

  function renderIndex(container, hands) {
    const idxEl = container.querySelector('.wt-index');
    idxEl.innerHTML = '';
    hands.forEach(h => {
      const item = document.createElement('div');
      item.className = 'wt-index-item' + (h.id === currentHandId ? ' active' : '');
      item.innerHTML =
        '<div>' + h.title + '</div>' +
        '<div class="wt-tag">' + h.position + ' / ' + h.street + '</div>';
      item.addEventListener('click', () => {
        currentHandId = h.id;
        renderIndex(container, hands);
        renderDetail(container, h);
      });
      idxEl.appendChild(item);
    });
  }

  function renderDetail(container, hand) {
    const det = container.querySelector('.wt-detail');
    det.innerHTML = '';
    if (!hand) {
      det.innerHTML = '<p style="color:var(--fg-dim)">Select a hand from the left to begin.</p>';
      return;
    }

    const titleEl = document.createElement('h2');
    titleEl.style.marginTop = '0';
    titleEl.textContent = hand.title;
    det.appendChild(titleEl);

    const meta = document.createElement('p');
    meta.style.color = 'var(--fg-dim)';
    meta.style.fontSize = '12px';
    meta.textContent = hand.position + ' | ' + hand.street + ' | pot ' + hand.pot + 'bb | stacks ' + hand.stacks + 'bb';
    det.appendChild(meta);

    const spotWrap = document.createElement('div');
    spotWrap.className = 'wt-spot';

    const heroBlock = document.createElement('div');
    heroBlock.className = 'wt-spot-card';
    heroBlock.innerHTML = '<h4>Hero hole cards</h4>';
    const heroCards = document.createElement('div');
    heroCards.className = 'cards-row';
    hand.hole_cards.forEach(c => heroCards.appendChild(cardEl(c)));
    heroBlock.appendChild(heroCards);
    spotWrap.appendChild(heroBlock);

    const boardBlock = document.createElement('div');
    boardBlock.className = 'wt-spot-card';
    boardBlock.innerHTML = '<h4>Board</h4>';
    const boardCards = document.createElement('div');
    boardCards.className = 'cards-row';
    if (!hand.board || hand.board.length === 0) {
      boardCards.innerHTML = '<span style="color:var(--fg-dim)">preflop — no board</span>';
    } else {
      hand.board.forEach(c => { if (c && c !== '_') boardCards.appendChild(cardEl(c)); });
    }
    boardBlock.appendChild(boardCards);
    spotWrap.appendChild(boardBlock);

    det.appendChild(spotWrap);

    const histEl = document.createElement('div');
    histEl.className = 'wt-spot-card';
    histEl.style.marginBottom = '12px';
    histEl.innerHTML = '<h4>Action history</h4><p style="margin:0">' + hand.action_history + '</p>';
    det.appendChild(histEl);

    // Decision panel
    const decisionPanel = document.createElement('div');
    decisionPanel.className = 'wt-spot-card';
    decisionPanel.innerHTML = '<h4>Your decision</h4>';
    const actionRow = document.createElement('div');
    actionRow.className = 'action-row';

    function commitAction(action, sizing) {
      const score = scoreDecision(hand, action);
      lastDecision = {
        hand_id: hand.id,
        user_action: action,
        user_sizing: sizing || null,
        gto_mix: hand.gto_mix,
        score_label: score.label,
        deviation_score: score.deviation,
        timestamp: Date.now()
      };
      // Emit DecisionResult
      if (window.AppShell && window.AppShell.bus) {
        window.AppShell.bus.emit('decision_result', lastDecision);
      }
      // Persist last-viewed
      if (window.AppShell && window.AppShell.storage) {
        window.AppShell.storage.set('walkthrough/last_hand', hand.id);
      }
      renderReveal(det, hand, lastDecision);
    }

    hand.legal_actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.textContent = act;
      if (/fold/.test(act)) btn.classList.add('fold');
      else if (/check|call/.test(act)) btn.classList.add('call');
      else btn.classList.add('raise');
      btn.addEventListener('click', () => commitAction(act, null));
      actionRow.appendChild(btn);
    });

    decisionPanel.appendChild(actionRow);
    det.appendChild(decisionPanel);
  }

  function renderReveal(det, hand, decision) {
    // Remove existing reveal if any
    const existing = det.querySelector('.reveal-panel');
    if (existing) existing.remove();

    const reveal = document.createElement('div');
    reveal.className = 'reveal-panel';
    reveal.id = 'wt-reveal';

    // Score label
    const scoreEl = document.createElement('div');
    scoreEl.style.marginBottom = '12px';
    scoreEl.innerHTML = 'Your action: <strong>' + decision.user_action + '</strong> &nbsp; ';
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'score-label ' + (
      decision.score_label === 'matches GTO mix' ? 'match' :
      decision.score_label === 'partial' ? 'partial' : 'off-tree');
    scoreSpan.textContent = decision.score_label;
    scoreEl.appendChild(scoreSpan);
    reveal.appendChild(scoreEl);

    // GTO mix bars
    const mixWrap = document.createElement('div');
    mixWrap.innerHTML = '<h4 style="margin:0 0 6px;font-size:12px;color:var(--fg-dim)">GTO frequency mix</h4>';
    const bars = document.createElement('div');
    bars.className = 'gto-mix-bars';
    Object.keys(hand.gto_mix).forEach(action => {
      const freq = hand.gto_mix[action];
      const row = document.createElement('div');
      row.className = 'gto-mix-row';
      const pct = Math.round(freq * 100);
      row.innerHTML =
        '<div class="gto-mix-label">' + action + '</div>' +
        '<div class="gto-mix-bar"><div class="gto-mix-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="gto-mix-pct">' + pct + '%</div>';
      bars.appendChild(row);
    });
    mixWrap.appendChild(bars);
    reveal.appendChild(mixWrap);

    // Theory paragraphs
    const theory = document.createElement('div');
    theory.className = 'theory';
    paragraphsFromText(hand.theory_explanation).forEach(p => {
      const pe = document.createElement('p');
      pe.textContent = p;
      theory.appendChild(pe);
    });
    reveal.appendChild(theory);

    // Glossary chips
    if (hand.concept_tags && hand.concept_tags.length) {
      const chipsWrap = document.createElement('div');
      chipsWrap.innerHTML = '<h4 style="margin:8px 0 6px;font-size:12px;color:var(--fg-dim)">Related concepts</h4>';
      const chips = document.createElement('div');
      chips.className = 'glossary-chips';
      hand.concept_tags.forEach(tag => {
        const term = window.GTOData.getGlossaryTerm(tag);
        if (!term) return;
        const chip = document.createElement('span');
        chip.className = 'glossary-chip';
        chip.textContent = term.name;
        chip.dataset.term = tag;
        chip.addEventListener('click', () => showGlossary(tag));
        chips.appendChild(chip);
      });
      chipsWrap.appendChild(chips);
      reveal.appendChild(chipsWrap);
    }

    // Next hand button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'action-btn';
    nextBtn.textContent = 'Next hand →';
    nextBtn.style.marginTop = '12px';
    nextBtn.addEventListener('click', () => {
      const hands = window.GTOData.listHands();
      const i = hands.findIndex(h => h.id === hand.id);
      const next = hands[(i + 1) % hands.length];
      currentHandId = next.id;
      const root = document.getElementById('route-container');
      mountWalkthrough(root);
    });
    reveal.appendChild(nextBtn);

    det.appendChild(reveal);
  }

  function mountWalkthrough(container) {
    container.innerHTML =
      '<div class="wt-layout">' +
      '<div class="wt-index"></div>' +
      '<div class="wt-detail"></div>' +
      '</div>';
    const hands = window.GTOData.listHands();
    if (!currentHandId && hands.length) currentHandId = hands[0].id;
    renderIndex(container, hands);
    const hand = window.GTOData.getHand(currentHandId);
    renderDetail(container, hand);
  }

  function unmountWalkthrough() {
    // Clean up overlays
    document.querySelectorAll('.glossary-overlay, .glossary-pop').forEach(n => n.remove());
  }

  // Glossary route
  function mountGlossary(container) {
    container.innerHTML = '<h2 style="margin-top:0">GTO Glossary</h2><div class="gloss-grid" id="gloss-grid"></div>';
    const grid = container.querySelector('#gloss-grid');
    window.GTOData.listGlossary().forEach(g => {
      const card = document.createElement('div');
      card.className = 'gloss-card';
      card.innerHTML =
        '<h3>' + g.name + '</h3>' +
        '<p class="short">' + g.short_def + '</p>' +
        '<p class="long">' + g.long_explanation + '</p>';
      grid.appendChild(card);
    });
  }

  // Register on shell ready (or immediately if shell is up)
  function registerAll() {
    if (!window.AppShell) {
      setTimeout(registerAll, 10);
      return;
    }
    window.AppShell.registerRoute('walkthrough', mountWalkthrough, unmountWalkthrough);
    window.AppShell.registerRoute('glossary', mountGlossary);
  }
  registerAll();
})();
