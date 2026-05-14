// Section 5c: Table mode UI — 9 seats around an oval, action panel, log.
// Hero plays via UI; archetype seats call AgentEngine.decide().

(function () {
  'use strict';

  const SUITS_RED = { 'h': '♥', 'd': '♦' };
  const SUITS_BLACK = { 's': '♠', 'c': '♣' };

  let table = null;
  let heroSeatId = 0;
  let activeTooltip = null;

  function miniCard(card, faceDown) {
    const div = document.createElement('div');
    div.className = 'mini-card';
    if (faceDown) {
      div.classList.add('back');
      div.textContent = '';
      return div;
    }
    if (!card || card === '_') { div.textContent = '?'; return div; }
    const r = card[0], s = card[1];
    let suitChar;
    if (SUITS_RED[s]) { suitChar = SUITS_RED[s]; div.classList.add('red'); }
    else suitChar = SUITS_BLACK[s];
    div.textContent = r + suitChar;
    return div;
  }
  function bigCard(card) {
    const div = document.createElement('div');
    div.className = 'card';
    if (!card) { div.textContent = '?'; return div; }
    const r = card[0], s = card[1];
    let suitChar;
    if (SUITS_RED[s]) { suitChar = SUITS_RED[s]; div.classList.add('red'); }
    else suitChar = SUITS_BLACK[s];
    div.innerHTML = '<span class="rank">' + r + '</span><span class="suit">' + suitChar + '</span>';
    return div;
  }

  // Compute seat positions on an oval — 9 seats. seat 0 at bottom-center for hero.
  function seatPositions(numSeats, heroSeat) {
    const out = [];
    // Place hero seat at bottom (90 degrees, i.e., angle PI/2)
    // Distribute the rest around the oval.
    const startAngle = Math.PI / 2; // bottom
    for (let i = 0; i < numSeats; i++) {
      // offset from hero: 0=hero (bottom), going clockwise
      const offset = (i - heroSeat + numSeats) % numSeats;
      const angle = startAngle - (offset / numSeats) * Math.PI * 2;
      const x = 50 + 45 * Math.cos(angle);
      const y = 50 + 38 * Math.sin(angle);
      out.push({ left: x + '%', top: y + '%' });
    }
    return out;
  }

  function showArchetypeTooltip(archetype, anchorEl) {
    if (activeTooltip) activeTooltip.remove();
    if (!archetype) return;
    const tip = document.createElement('div');
    tip.className = 'archetype-tooltip';
    tip.innerHTML =
      '<h4>' + archetype.display_name + '</h4>' +
      '<p style="margin:4px 0;color:var(--fg-dim)">VPIP ' + archetype.vpip_target + ' / PFR ' + archetype.pfr_target + ' / AF ' + archetype.aggression_factor + '</p>' +
      '<p style="margin:4px 0">' + archetype.description + '</p>' +
      '<p style="margin:4px 0;color:var(--fg-dim);font-style:italic">' + archetype.contrast_with_gto.split('\n')[0] + '</p>';
    document.body.appendChild(tip);
    const rect = anchorEl.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - 320, rect.left) + 'px';
    tip.style.top = (rect.bottom + 6) + 'px';
    activeTooltip = tip;
    setTimeout(() => {
      const close = (e) => {
        if (!tip.contains(e.target) && e.target !== anchorEl) {
          tip.remove();
          activeTooltip = null;
          document.removeEventListener('click', close);
        }
      };
      document.addEventListener('click', close);
    }, 50);
  }

  function renderTable(container) {
    container.innerHTML =
      '<div class="table-layout">' +
      '<div class="poker-table" id="poker-table"></div>' +
      '<div class="action-panel" id="action-panel"></div>' +
      '<div class="hand-log" id="hand-log"></div>' +
      '</div>';

    const tableEl = container.querySelector('#poker-table');

    // Board area
    const boardArea = document.createElement('div');
    boardArea.className = 'board-area';
    const potDisp = document.createElement('div');
    potDisp.className = 'pot-display';
    potDisp.id = 'pot-display';
    potDisp.textContent = 'Pot: ' + table.pot;
    boardArea.appendChild(potDisp);
    const boardCards = document.createElement('div');
    boardCards.className = 'board-cards';
    boardCards.id = 'board-cards';
    table.board.forEach(c => boardCards.appendChild(bigCard(c)));
    boardArea.appendChild(boardCards);
    tableEl.appendChild(boardArea);

    // Seats
    const positions = seatPositions(table.seats.length, heroSeatId);
    table.seats.forEach((seat, i) => {
      const seatEl = document.createElement('div');
      seatEl.className = 'seat' + (seat.is_hero ? ' hero' : '') + (seat.folded ? ' folded' : '') + (i === table.current_seat && table.street !== 'idle' && table.street !== 'showdown' ? ' acting' : '');
      seatEl.style.left = positions[i].left;
      seatEl.style.top = positions[i].top;

      const positionLabel = window.TableEngine.getPositionLabel(table, i);
      let archetype = null;
      if (!seat.is_hero && seat.archetype_id && window.Archetypes) {
        archetype = window.Archetypes.getArchetype(seat.archetype_id);
      }

      const labelDiv = document.createElement('div');
      labelDiv.className = 'seat-label';
      labelDiv.textContent = positionLabel + (seat.is_hero ? ' (You)' : '');
      seatEl.appendChild(labelDiv);

      if (archetype) {
        const archDiv = document.createElement('div');
        archDiv.className = 'seat-archetype';
        archDiv.textContent = archetype.display_name;
        archDiv.style.cursor = 'pointer';
        archDiv.title = 'Click for GTO contrast';
        archDiv.addEventListener('click', (e) => {
          e.stopPropagation();
          showArchetypeTooltip(archetype, archDiv);
        });
        seatEl.appendChild(archDiv);
      }

      const stackDiv = document.createElement('div');
      stackDiv.className = 'seat-stack';
      stackDiv.textContent = seat.stack;
      seatEl.appendChild(stackDiv);

      const betDiv = document.createElement('div');
      betDiv.className = 'seat-bet';
      betDiv.textContent = seat.bet > 0 ? 'bet ' + seat.bet : '';
      seatEl.appendChild(betDiv);

      const cardsDiv = document.createElement('div');
      cardsDiv.className = 'seat-cards';
      if (seat.cards && seat.cards.length) {
        if (seat.is_hero || table.street === 'showdown') {
          seat.cards.forEach(c => cardsDiv.appendChild(miniCard(c)));
        } else {
          if (!seat.folded) {
            cardsDiv.appendChild(miniCard(null, true));
            cardsDiv.appendChild(miniCard(null, true));
          }
        }
      }
      seatEl.appendChild(cardsDiv);

      tableEl.appendChild(seatEl);
    });

    renderActionPanel(container);
    renderLog(container);
  }

  function renderActionPanel(container) {
    const panel = container.querySelector('#action-panel');
    panel.innerHTML = '';

    if (table.street === 'idle') {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.textContent = 'Start hand';
      btn.addEventListener('click', () => {
        window.TableEngine.startHand(table);
        renderTable(container);
        // Run the hand loop until hero's turn or end
        scheduleAdvance(container);
      });
      panel.appendChild(btn);
      return;
    }
    if (table.street === 'showdown') {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.textContent = 'Next hand';
      btn.addEventListener('click', () => {
        window.TableEngine.startHand(table);
        renderTable(container);
        scheduleAdvance(container);
      });
      panel.appendChild(btn);
      return;
    }

    const heroSeat = table.seats[heroSeatId];
    if (table.current_seat !== heroSeatId || heroSeat.folded || heroSeat.all_in) {
      const note = document.createElement('div');
      note.style.color = 'var(--fg-dim)';
      note.textContent = 'Waiting for ' + window.TableEngine.getPositionLabel(table, table.current_seat) + ' to act...';
      panel.appendChild(note);
      // Let agent act after a short delay (already scheduled by scheduleAdvance)
      return;
    }

    // Hero turn
    const toCall = Math.max(0, table.current_bet - heroSeat.bet);
    const row = document.createElement('div');
    row.className = 'action-row';

    const foldBtn = document.createElement('button');
    foldBtn.className = 'action-btn fold';
    foldBtn.textContent = 'Fold';
    foldBtn.addEventListener('click', () => heroAct(container, 'fold'));
    row.appendChild(foldBtn);

    if (toCall === 0) {
      const checkBtn = document.createElement('button');
      checkBtn.className = 'action-btn call';
      checkBtn.textContent = 'Check';
      checkBtn.addEventListener('click', () => heroAct(container, 'check'));
      row.appendChild(checkBtn);
    } else {
      const callBtn = document.createElement('button');
      callBtn.className = 'action-btn call';
      callBtn.textContent = 'Call ' + toCall;
      callBtn.addEventListener('click', () => heroAct(container, 'call'));
      row.appendChild(callBtn);
    }

    const raiseBtn = document.createElement('button');
    raiseBtn.className = 'action-btn raise';
    const raiseLabel = table.current_bet === 0 ? 'Bet' : 'Raise';
    raiseBtn.textContent = raiseLabel;
    raiseBtn.addEventListener('click', () => {
      const v = parseInt(sizingInput.value, 10);
      if (!Number.isFinite(v) || v < (table.current_bet + table.min_raise)) {
        alert('Min raise is ' + (table.current_bet + table.min_raise));
        return;
      }
      if (v > heroSeat.stack + heroSeat.bet) {
        alert('Cannot exceed stack');
        return;
      }
      heroAct(container, 'raise', v);
    });
    row.appendChild(raiseBtn);

    panel.appendChild(row);

    const sizing = document.createElement('div');
    sizing.className = 'sizing-row';
    const minRaise = table.current_bet + table.min_raise;
    const sizingInput = document.createElement('input');
    sizingInput.type = 'number';
    sizingInput.min = minRaise;
    sizingInput.max = heroSeat.stack + heroSeat.bet;
    sizingInput.value = Math.min(heroSeat.stack + heroSeat.bet, Math.round(table.pot * 0.66 + table.current_bet));
    sizing.appendChild(sizingInput);

    [0.33, 0.66, 1.0].forEach(frac => {
      const ps = document.createElement('span');
      ps.className = 'sizing-preset';
      ps.textContent = (frac === 1 ? 'pot' : Math.round(frac * 100) + '%');
      ps.addEventListener('click', () => {
        sizingInput.value = Math.min(heroSeat.stack + heroSeat.bet, Math.round(table.pot * frac + table.current_bet));
      });
      sizing.appendChild(ps);
    });
    const allIn = document.createElement('span');
    allIn.className = 'sizing-preset';
    allIn.textContent = 'all-in';
    allIn.addEventListener('click', () => { sizingInput.value = heroSeat.stack + heroSeat.bet; });
    sizing.appendChild(allIn);

    panel.appendChild(sizing);
  }

  function renderLog(container) {
    const log = container.querySelector('#hand-log');
    log.innerHTML = '';
    table.hand_log.slice(-30).forEach(entry => {
      const e = document.createElement('div');
      e.className = 'log-entry' + (entry.seat_id === heroSeatId ? ' hero' : '');
      e.textContent = entry.msg;
      log.appendChild(e);
    });
    log.scrollTop = log.scrollHeight;
  }

  // Pre-action snapshot for stats
  let preActionSnapshot = null;
  function snapshotForStats() {
    const heroSeat = table.seats[heroSeatId];
    return {
      hand_number: table.hand_number,
      hero_hole: heroSeat.cards.slice(),
      hero_actions: [],
      vpip_flag: false, pfr_flag: false, threebet_flag: false, saw_showdown: false, won_at_showdown: false,
      starting_stack: heroSeat.stack + heroSeat.committed_total,
      hero_position: window.TableEngine.getPositionLabel(table, heroSeatId)
    };
  }

  function trackHeroAction(action, sizing) {
    if (!preActionSnapshot) return;
    const street = table.street;
    preActionSnapshot.hero_actions.push({ street: street, action: action, sizing: sizing });
    if (street === 'preflop') {
      if (action === 'call') preActionSnapshot.vpip_flag = true;
      if (action === 'bet' || action === 'raise') {
        preActionSnapshot.vpip_flag = true;
        preActionSnapshot.pfr_flag = true;
        const raises = table.action_history.filter(a => a.action === 'raise').length;
        if (raises >= 1) preActionSnapshot.threebet_flag = true;
      }
    }
  }

  function heroAct(container, action, sizing) {
    const heroBefore = table.seats[heroSeatId].stack + table.seats[heroSeatId].bet;
    if (table.street === 'preflop' && !preActionSnapshot) {
      preActionSnapshot = snapshotForStats();
    }
    trackHeroAction(action, sizing);
    window.TableEngine.applyAction(table, heroSeatId, action, sizing);
    afterAction(container);
  }

  function afterAction(container) {
    // Check if street is complete
    if (window.TableEngine.isStreetComplete(table)) {
      const live = table.seats.filter(s => !s.folded);
      if (live.length <= 1) {
        // Hand ends now
        finishHand(container);
        return;
      }
      window.TableEngine.advanceStreet(table);
      if (table.street === 'showdown') {
        finishHand(container);
        return;
      }
    } else {
      // advance to next seat
      table.current_seat = window.TableEngine.nextSeat(table, table.current_seat);
    }
    renderTable(container);
    scheduleAdvance(container);
  }

  function finishHand(container) {
    const live = table.seats.filter(s => !s.folded);
    let result;
    if (live.length === 1) {
      const winner = live[0];
      winner.stack += table.pot;
      table.hand_log.push({ msg: window.TableEngine.getPositionLabel(table, winner.seat_id) + ' wins ' + table.pot + ' uncontested', seat_id: winner.seat_id });
      table.pot = 0;
      result = { winners: [{ seat_id: winner.seat_id, amount: 0 }] };
      table.street = 'idle';
    } else {
      table.street = 'showdown';
      result = window.TableEngine.resolveShowdown(table);
    }
    // Emit HandResult
    const heroSeat = table.seats[heroSeatId];
    const heroDelta = (heroSeat.stack + heroSeat.bet) - (preActionSnapshot ? preActionSnapshot.starting_stack : heroSeat.stack);
    const hr = {
      hand_id: 'h' + table.hand_number,
      hero_seat: heroSeatId,
      hero_hole: preActionSnapshot ? preActionSnapshot.hero_hole : heroSeat.cards,
      hero_position: preActionSnapshot ? preActionSnapshot.hero_position : 'unknown',
      board: table.board.slice(),
      hero_actions: preActionSnapshot ? preActionSnapshot.hero_actions : [],
      hero_won: result.winners.some(w => w.seat_id === heroSeatId && w.amount > 0),
      hero_delta_chips: heroDelta,
      hero_pnl_bb: heroDelta / table.bb,
      pot_size: table.pot,
      vpip: preActionSnapshot ? preActionSnapshot.vpip_flag : false,
      pfr: preActionSnapshot ? preActionSnapshot.pfr_flag : false,
      threebet: preActionSnapshot ? preActionSnapshot.threebet_flag : false,
      saw_showdown: live.length > 1 && !heroSeat.folded,
      won_at_showdown: live.length > 1 && !heroSeat.folded && result.winners.some(w => w.seat_id === heroSeatId),
      gto_deviations: []
    };
    if (window.AppShell && window.AppShell.bus) {
      window.AppShell.bus.emit('hand_result', hr);
    }
    preActionSnapshot = null;
    renderTable(container);
  }

  function scheduleAdvance(container) {
    if (table.street === 'idle' || table.street === 'showdown') return;
    if (table.current_seat === heroSeatId && !table.seats[heroSeatId].folded && !table.seats[heroSeatId].all_in) return;
    setTimeout(() => {
      if (!table || table.street === 'idle' || table.street === 'showdown') return;
      const sid = table.current_seat;
      const seat = table.seats[sid];
      if (seat.is_hero || seat.folded || seat.all_in) {
        // skip
        if (window.TableEngine.isStreetComplete(table)) {
          afterAction(container);
        } else {
          table.current_seat = window.TableEngine.nextSeat(table, sid);
          scheduleAdvance(container);
        }
        return;
      }
      const archetype = window.Archetypes.getArchetype(seat.archetype_id);
      const state = window.TableEngine.agentState(table, sid);
      const dec = window.AgentEngine.decide(state, archetype, table.seed + sid + table.hand_number);
      // Translate sizing fraction into absolute chips for raise
      let sizing = dec.sizing;
      if (dec.action === 'raise' || dec.action === 'bet') {
        if (typeof sizing === 'number' && sizing > 0 && sizing < 5) {
          // fraction of pot — convert to absolute target
          sizing = Math.round(table.pot * sizing + table.current_bet);
        }
        if (table.street === 'preflop' && (dec.action === 'raise')) {
          // sizing might be in BB multiples
          if (typeof dec.sizing === 'number' && dec.sizing < 30) sizing = Math.round(dec.sizing * table.bb);
        }
      }
      window.TableEngine.applyAction(table, sid, dec.action, sizing);
      afterAction(container);
    }, 350);
  }

  function mountTable(container) {
    if (!table) {
      // Initialize a fresh table
      const archetypes = window.Archetypes.listArchetypes();
      const heroSeat = 0;
      heroSeatId = heroSeat;
      const names = [];
      const archAssignments = [];
      // Round-robin archetypes for non-hero seats
      let arcIdx = 0;
      for (let i = 0; i < 9; i++) {
        if (i === heroSeat) {
          names.push('Hero');
          archAssignments.push(null);
        } else {
          const a = archetypes[arcIdx % archetypes.length];
          names.push(a.display_name);
          archAssignments.push(a.id);
          arcIdx++;
        }
      }
      table = window.TableEngine.newTable(9, {
        names: names,
        archetypes: archAssignments,
        hero_seat: heroSeat,
        seed: 42
      });
    }
    renderTable(container);
  }

  function unmountTable() {
    if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
  }

  function registerAll() {
    if (!window.AppShell) { setTimeout(registerAll, 10); return; }
    window.AppShell.registerRoute('table', mountTable, unmountTable);
  }
  registerAll();
})();
