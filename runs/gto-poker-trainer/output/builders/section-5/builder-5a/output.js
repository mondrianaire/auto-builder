// Section 5a: 9-handed cash table engine.
// Deck, deal, blinds, betting rounds, side pots, hand resolution.
// Pure-ish: state is passed in/out; UI calls these.

(function () {
  'use strict';

  const RANKS = '23456789TJQKA';
  const SUITS = 'shdc';
  const SB_AMOUNT = 10;
  const BB_AMOUNT = 20;
  const STARTING_STACK = 2000; // 100bb at 20 BB

  function buildDeck() {
    const d = [];
    for (let r of RANKS) for (let s of SUITS) d.push(r + s);
    return d;
  }
  // Fisher-Yates shuffle using crypto if available
  function shuffleDeck(deck, rng) {
    const arr = deck.slice();
    const r = rng || Math.random;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function makeRng(seed) {
    if (typeof seed === 'number') {
      let s = seed >>> 0;
      return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    return Math.random;
  }

  // Position labels for 9-max relative to button
  // seat 0 is BTN, then SB, BB, UTG, UTG1, MP, LJ, HJ, CO
  const POSITION_LABELS_BY_OFFSET = ['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO'];

  function newTable(numSeats, opts) {
    opts = opts || {};
    const seats = [];
    for (let i = 0; i < numSeats; i++) {
      seats.push({
        seat_id: i,
        name: opts.names ? opts.names[i] : ('Seat ' + i),
        archetype_id: opts.archetypes ? opts.archetypes[i] : null,
        is_hero: opts.hero_seat === i,
        stack: STARTING_STACK,
        cards: [],
        bet: 0,
        committed_total: 0,
        folded: false,
        all_in: false,
        acted: false
      });
    }
    return {
      seats: seats,
      button_seat: 0,
      hand_number: 0,
      sb: SB_AMOUNT,
      bb: BB_AMOUNT,
      pot: 0,
      board: [],
      deck: [],
      street: 'idle', // 'preflop','flop','turn','river','showdown','idle'
      current_seat: -1,
      current_bet: 0,
      min_raise: BB_AMOUNT,
      last_aggressor: -1,
      action_history: [],
      hand_log: [],
      seed: opts.seed || Date.now()
    };
  }

  function activeSeats(table) {
    return table.seats.filter(s => !s.folded && s.stack > 0 || (s.all_in && !s.folded));
  }
  function nonFoldedSeats(table) {
    return table.seats.filter(s => !s.folded);
  }

  function getPositionLabel(table, seatId) {
    const n = table.seats.length;
    const offset = ((seatId - table.button_seat) + n) % n;
    if (n === 9) return POSITION_LABELS_BY_OFFSET[offset];
    // For smaller, fall back
    if (offset === 0) return 'BTN';
    if (offset === 1) return 'SB';
    if (offset === 2) return 'BB';
    return 'EP';
  }

  function nextSeat(table, fromId) {
    const n = table.seats.length;
    let i = (fromId + 1) % n;
    let safety = n + 1;
    while (safety-- > 0) {
      const s = table.seats[i];
      if (!s.folded && !s.all_in && s.stack > 0) return i;
      i = (i + 1) % n;
    }
    return -1;
  }

  function startHand(table) {
    table.hand_number += 1;
    table.deck = shuffleDeck(buildDeck(), makeRng(table.seed + table.hand_number));
    table.board = [];
    table.pot = 0;
    table.action_history = [];
    table.hand_log = [];
    table.street = 'preflop';
    table.current_bet = 0;
    table.min_raise = table.bb;

    // Reset seats
    table.seats.forEach(s => {
      s.cards = [];
      s.bet = 0;
      s.committed_total = 0;
      s.folded = s.stack <= 0;
      s.all_in = false;
      s.acted = false;
    });

    // Move button if needed (after first hand)
    if (table.hand_number > 1) {
      let next = (table.button_seat + 1) % table.seats.length;
      let safety = table.seats.length;
      while (safety-- > 0 && table.seats[next].stack <= 0) next = (next + 1) % table.seats.length;
      table.button_seat = next;
    }

    const n = table.seats.length;
    const sbId = (table.button_seat + 1) % n;
    const bbId = (table.button_seat + 2) % n;

    postBlind(table, sbId, table.sb);
    postBlind(table, bbId, table.bb);

    // Deal 2 hole cards each, starting from SB
    let dealStart = sbId;
    for (let round = 0; round < 2; round++) {
      let i = dealStart;
      for (let k = 0; k < n; k++) {
        if (!table.seats[i].folded) {
          table.seats[i].cards.push(table.deck.pop());
        }
        i = (i + 1) % n;
      }
    }

    table.current_bet = table.bb;
    table.current_seat = (bbId + 1) % n;
    while (table.seats[table.current_seat].folded) {
      table.current_seat = (table.current_seat + 1) % n;
    }
    table.last_aggressor = -1;
    log(table, 'Hand #' + table.hand_number + ' begins. SB ' + sbId + ', BB ' + bbId);
    return table;
  }

  function postBlind(table, seatId, amt) {
    const s = table.seats[seatId];
    const a = Math.min(amt, s.stack);
    s.stack -= a;
    s.bet += a;
    s.committed_total += a;
    table.pot += a;
    if (s.stack === 0) s.all_in = true;
    log(table, getPositionLabel(table, seatId) + ' posts ' + a);
  }

  function applyAction(table, seatId, action, sizing) {
    const s = table.seats[seatId];
    if (!s || s.folded || s.all_in) return false;
    const toCall = table.current_bet - s.bet;

    if (action === 'fold') {
      s.folded = true;
      s.acted = true;
      log(table, getPositionLabel(table, seatId) + ' folds', seatId);
      table.action_history.push({ seat: seatId, action: 'fold' });
    } else if (action === 'check') {
      if (toCall > 0) {
        // illegal — convert to fold
        s.folded = true;
        log(table, getPositionLabel(table, seatId) + ' folds (illegal check)', seatId);
        return true;
      }
      s.acted = true;
      log(table, getPositionLabel(table, seatId) + ' checks', seatId);
      table.action_history.push({ seat: seatId, action: 'check' });
    } else if (action === 'call') {
      const a = Math.min(toCall, s.stack);
      s.stack -= a; s.bet += a; s.committed_total += a;
      table.pot += a;
      if (s.stack === 0) s.all_in = true;
      s.acted = true;
      log(table, getPositionLabel(table, seatId) + ' calls ' + a, seatId);
      table.action_history.push({ seat: seatId, action: 'call', amount: a });
    } else if (action === 'bet' || action === 'raise') {
      // Sizing is total chips IN this round (target). If sizing is a fraction, treat as fraction of pot.
      let target = typeof sizing === 'number' ? sizing : table.bb * 2.5;
      if (target > 0 && target < 1.5) {
        // fraction of pot bet
        target = Math.round(table.pot * target + table.current_bet);
      }
      target = Math.max(target, table.current_bet + table.min_raise);
      target = Math.min(target, s.bet + s.stack);
      const delta = target - s.bet;
      s.stack -= delta; s.bet = target; s.committed_total += delta;
      table.pot += delta;
      const wasRaise = target > table.current_bet;
      if (wasRaise) {
        table.min_raise = target - table.current_bet;
        table.current_bet = target;
        table.last_aggressor = seatId;
        // reset acted flags for others
        table.seats.forEach((x, idx) => { if (idx !== seatId && !x.folded && !x.all_in) x.acted = false; });
      }
      if (s.stack === 0) s.all_in = true;
      s.acted = true;
      log(table, getPositionLabel(table, seatId) + ' ' + (wasRaise ? 'raises to ' : 'bets ') + target, seatId);
      table.action_history.push({ seat: seatId, action: wasRaise ? 'raise' : 'bet', amount: target });
    } else {
      return false;
    }
    return true;
  }

  function isStreetComplete(table) {
    const live = table.seats.filter(s => !s.folded);
    if (live.length <= 1) return true;
    const canAct = live.filter(s => !s.all_in);
    if (canAct.length === 0) return true;
    const allActed = canAct.every(s => s.acted);
    const allMatched = canAct.every(s => s.bet === table.current_bet);
    return allActed && allMatched;
  }

  function advanceStreet(table) {
    table.seats.forEach(s => { s.bet = 0; s.acted = false; });
    table.current_bet = 0;
    table.min_raise = table.bb;
    if (table.street === 'preflop') {
      table.street = 'flop';
      table.deck.pop(); // burn
      table.board.push(table.deck.pop(), table.deck.pop(), table.deck.pop());
      log(table, 'Flop: ' + table.board.join(' '));
    } else if (table.street === 'flop') {
      table.street = 'turn';
      table.deck.pop();
      table.board.push(table.deck.pop());
      log(table, 'Turn: ' + table.board[3]);
    } else if (table.street === 'turn') {
      table.street = 'river';
      table.deck.pop();
      table.board.push(table.deck.pop());
      log(table, 'River: ' + table.board[4]);
    } else if (table.street === 'river') {
      table.street = 'showdown';
      return;
    }
    // Set first to act after button
    table.current_seat = (table.button_seat + 1) % table.seats.length;
    while (table.current_seat >= 0 && (table.seats[table.current_seat].folded || table.seats[table.current_seat].all_in)) {
      table.current_seat = (table.current_seat + 1) % table.seats.length;
      if (table.current_seat === table.button_seat) break;
    }
  }

  function resolveShowdown(table) {
    const live = table.seats.filter(s => !s.folded);
    if (live.length === 1) {
      // Award pot to last
      live[0].stack += table.pot;
      log(table, getPositionLabel(table, live[0].seat_id) + ' wins ' + table.pot + ' uncontested');
      table.pot = 0;
      table.street = 'idle';
      return { winners: [{ seat_id: live[0].seat_id, amount: table.pot }] };
    }

    // Build side pots based on committed_total
    const pots = buildSidePots(table);
    const winners = [];
    pots.forEach(pot => {
      // Find best hand among eligible
      const evals = pot.eligible.map(seatId => ({
        seat_id: seatId,
        e: window.HandEval ? window.HandEval.evaluateHand(table.seats[seatId].cards, table.board) : { rank: 0, tiebreakers: [] }
      }));
      let best = evals[0];
      const winnersForPot = [evals[0]];
      for (let i = 1; i < evals.length; i++) {
        const cmp = window.HandEval ? window.HandEval.compareEvals(evals[i].e, best.e) : 0;
        if (cmp > 0) { best = evals[i]; winnersForPot.length = 0; winnersForPot.push(evals[i]); }
        else if (cmp === 0) { winnersForPot.push(evals[i]); }
      }
      const split = Math.floor(pot.amount / winnersForPot.length);
      const remainder = pot.amount - split * winnersForPot.length;
      winnersForPot.forEach((w, idx) => {
        const award = split + (idx === 0 ? remainder : 0);
        table.seats[w.seat_id].stack += award;
        winners.push({ seat_id: w.seat_id, amount: award, hand_name: w.e.name });
        log(table, getPositionLabel(table, w.seat_id) + ' wins ' + award + ' with ' + w.e.name);
      });
    });
    table.pot = 0;
    table.street = 'idle';
    return { winners: winners };
  }

  function buildSidePots(table) {
    // Group live (or showdown-eligible: not folded) seats by committed_total
    const live = table.seats.filter(s => !s.folded);
    const folded = table.seats.filter(s => s.folded);
    const levels = [...new Set(live.map(s => s.committed_total))].sort((a, b) => a - b);
    const pots = [];
    let prev = 0;
    levels.forEach(level => {
      const layer = level - prev;
      if (layer <= 0) return;
      let amount = 0;
      table.seats.forEach(s => {
        if (s.committed_total >= prev) {
          const contrib = Math.min(s.committed_total - prev, layer);
          amount += contrib;
        }
      });
      const eligible = live.filter(s => s.committed_total >= level).map(s => s.seat_id);
      pots.push({ amount: amount, eligible: eligible });
      prev = level;
    });
    return pots;
  }

  function log(table, msg, seatId) {
    table.hand_log.push({ msg: msg, seat_id: seatId == null ? -1 : seatId });
  }

  // Build a state snapshot for an agent at the given seat.
  function agentState(table, seatId) {
    const s = table.seats[seatId];
    const street = table.street;
    const facing = table.current_bet === 0 ? 'check' : (table.current_bet > s.bet ? (street === 'preflop' && table.current_bet > table.bb ? 'raise' : 'bet') : 'check');
    let pfFacing = 'open';
    if (street === 'preflop') {
      // Look at action history
      const raises = table.action_history.filter(a => a.action === 'raise' || a.action === 'bet');
      if (raises.length === 0) pfFacing = table.current_bet > 0 ? 'raise' : 'open'; // BB special — treat as facing limp/raise
      else if (raises.length === 1) pfFacing = 'raise';
      else if (raises.length >= 2) pfFacing = '3bet';
    }
    const board = table.board.slice();
    return {
      street: street,
      position: getPositionLabel(table, seatId),
      hole_cards: s.cards.slice(),
      board: board,
      pot: table.pot,
      current_bet: table.current_bet,
      to_call: Math.max(0, table.current_bet - s.bet),
      raise_to: table.current_bet,
      facing: street === 'preflop' ? pfFacing : (facing === 'bet' ? 'bet' : 'check'),
      pot_odds: table.current_bet === 0 ? 0 : (table.current_bet - s.bet) / Math.max(1, table.pot + (table.current_bet - s.bet) + (table.current_bet - s.bet)),
      stack: s.stack,
      board_texture: classifyBoard(table.board)
    };
  }

  function classifyBoard(board) {
    if (!board || board.length < 3) return 'preflop';
    const ranks = board.slice(0, 3).map(c => RANKS.indexOf(c[0]));
    const suits = board.slice(0, 3).map(c => c[1]);
    const flushDraw = new Set(suits).size <= 2;
    const sorted = ranks.slice().sort((a, b) => a - b);
    const connected = (sorted[2] - sorted[0]) <= 4;
    if (flushDraw && connected) return 'wet';
    if (flushDraw || connected) return 'wet';
    return 'dry';
  }

  window.TableEngine = window.TableEngine || {};
  window.TableEngine.newTable = newTable;
  window.TableEngine.startHand = startHand;
  window.TableEngine.applyAction = applyAction;
  window.TableEngine.isStreetComplete = isStreetComplete;
  window.TableEngine.advanceStreet = advanceStreet;
  window.TableEngine.resolveShowdown = resolveShowdown;
  window.TableEngine.activeSeats = activeSeats;
  window.TableEngine.nonFoldedSeats = nonFoldedSeats;
  window.TableEngine.nextSeat = nextSeat;
  window.TableEngine.getPositionLabel = getPositionLabel;
  window.TableEngine.agentState = agentState;
  window.TableEngine.SB_AMOUNT = SB_AMOUNT;
  window.TableEngine.BB_AMOUNT = BB_AMOUNT;
  window.TableEngine.STARTING_STACK = STARTING_STACK;
})();
