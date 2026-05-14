// game-state-machine.js — Section 3
// ES module. Pure JS. No DOM, no global side effects.
// Phases: betting -> player_turn -> dealer_turn -> resolved -> betting.

export function createGameStateMachine(deps) {
  const { rulesEngine, strategyTable } = deps;

  let listeners = [];
  let shoe = rulesEngine.buildShoe(6);

  let state = freshState();

  function freshState() {
    return {
      phase: 'betting',
      bet: 1,
      dealerHand: [],
      playerHands: [],
      activeHandIndex: 0,
      legalActions: [],
      decisionLog: [],
      lastResolvedHandIndex: null,
      handsPlayed: 0
    };
  }

  function reshuffleIfNeeded() {
    if (shoe.length < 78) {
      shoe = rulesEngine.buildShoe(6);
    }
  }

  function notify() {
    const snapshot = getState();
    for (const fn of listeners.slice()) {
      try { fn(snapshot); } catch (e) { /* ignore */ }
    }
  }

  function subscribe(listener) {
    listeners.push(listener);
    try { listener(getState()); } catch (e) { /* ignore */ }
    return function unsubscribe() {
      listeners = listeners.filter(l => l !== listener);
    };
  }

  function getState() {
    return {
      phase: state.phase,
      bet: state.bet,
      dealerHand: state.dealerHand.map(d => ({ card: d.card, visible: d.visible })),
      playerHands: state.playerHands.map((h, i) => ({
        cards: h.cards.slice(),
        isActive: i === state.activeHandIndex && state.phase === 'player_turn',
        outcome: h.outcome,
        bet: h.bet,
        wasDoubled: !!h.wasDoubled,
        wasSplit: !!h.wasSplit
      })),
      activeHandIndex: state.activeHandIndex,
      legalActions: state.legalActions.slice(),
      decisionLog: state.decisionLog.map(e => ({
        playerHandSnapshot: e.playerHandSnapshot,
        dealerUpcard: e.dealerUpcard,
        chosenAction: e.chosenAction,
        correctAction: e.correctAction
      })),
      lastResolvedHandIndex: state.lastResolvedHandIndex,
      handsPlayed: state.handsPlayed
    };
  }

  function activeHand() {
    return state.playerHands[state.activeHandIndex];
  }

  function dealerUpcardForLookup() {
    return state.dealerHand[0] && state.dealerHand[0].card;
  }

  function getCurrentHintQuery() {
    if (state.phase !== 'player_turn') return null;
    const hand = activeHand();
    if (!hand) return null;
    const handState = {
      cards: hand.cards,
      isSplitHand: !!hand.isSplitHand,
      alreadySplit: !!hand.alreadySplit,
      hasHit: !!hand.hasHit,
      dealerUpcard: dealerUpcardForLookup()
    };
    const playerHandSnapshot = rulesEngine.buildPlayerSnapshot(handState);
    return { playerHandSnapshot, dealerUpcard: dealerUpcardForLookup() };
  }

  function getDecisionLog() {
    return state.decisionLog.map(e => ({ ...e }));
  }

  function recordDecision(chosenAction) {
    const hand = activeHand();
    const handState = {
      cards: hand.cards,
      isSplitHand: !!hand.isSplitHand,
      alreadySplit: !!hand.alreadySplit,
      hasHit: !!hand.hasHit,
      dealerUpcard: dealerUpcardForLookup()
    };
    const snap = rulesEngine.buildPlayerSnapshot(handState);
    const correctAction = strategyTable.recommendation(snap, dealerUpcardForLookup());
    state.decisionLog.push({
      playerHandSnapshot: snap,
      dealerUpcard: dealerUpcardForLookup(),
      chosenAction,
      correctAction
    });
  }

  function recomputeLegalActions() {
    if (state.phase !== 'player_turn') {
      state.legalActions = [];
      return;
    }
    const hand = activeHand();
    if (!hand) { state.legalActions = []; return; }
    state.legalActions = rulesEngine.legalActions({
      cards: hand.cards,
      isSplitHand: !!hand.isSplitHand,
      alreadySplit: !!hand.alreadySplit,
      hasHit: !!hand.hasHit,
      dealerUpcard: dealerUpcardForLookup()
    });
  }

  function startHand() {
    reshuffleIfNeeded();
    state.dealerHand = [];
    state.playerHands = [{
      cards: [],
      isActive: true,
      outcome: null,
      bet: state.bet,
      isSplitHand: false,
      alreadySplit: false,
      hasHit: false,
      wasDoubled: false,
      wasSplit: false
    }];
    state.activeHandIndex = 0;
    state.decisionLog = [];
    state.lastResolvedHandIndex = null;

    const d1 = rulesEngine.drawCard(shoe); shoe = d1.shoeAfter;
    state.playerHands[0].cards.push(d1.card);

    const d2 = rulesEngine.drawCard(shoe); shoe = d2.shoeAfter;
    state.dealerHand.push({ card: d2.card, visible: true });

    const d3 = rulesEngine.drawCard(shoe); shoe = d3.shoeAfter;
    state.playerHands[0].cards.push(d3.card);

    const d4 = rulesEngine.drawCard(shoe); shoe = d4.shoeAfter;
    state.dealerHand.push({ card: d4.card, visible: false });

    state.phase = 'player_turn';

    const playerScore = rulesEngine.scoreHand(state.playerHands[0].cards);
    if (playerScore.isBlackjack) {
      revealDealer();
      resolveAll();
      return;
    }

    recomputeLegalActions();
  }

  function revealDealer() {
    state.dealerHand = state.dealerHand.map(d => ({ card: d.card, visible: true }));
  }

  function advanceToNextHandOrDealer() {
    let next = state.activeHandIndex + 1;
    while (next < state.playerHands.length) {
      const h = state.playerHands[next];
      const sc = rulesEngine.scoreHand(h.cards);
      if (!sc.isBust && sc.total !== 21) {
        state.activeHandIndex = next;
        if (h.cards.length === 1) {
          const dr = rulesEngine.drawCard(shoe); shoe = dr.shoeAfter;
          h.cards.push(dr.card);
        }
        recomputeLegalActions();
        return;
      }
      next += 1;
    }
    enterDealerTurn();
  }

  function enterDealerTurn() {
    const anyAlive = state.playerHands.some(h => !rulesEngine.scoreHand(h.cards).isBust);
    revealDealer();
    if (anyAlive) {
      state.phase = 'dealer_turn';
      const dealerCards = state.dealerHand.map(d => d.card);
      const result = rulesEngine.playDealer(dealerCards, shoe);
      shoe = result.shoeAfter;
      state.dealerHand = result.finalDealerHand.map(c => ({ card: c, visible: true }));
    }
    resolveAll();
  }

  function resolveAll() {
    const dealerCards = state.dealerHand.map(d => d.card);
    for (const h of state.playerHands) {
      const r = rulesEngine.resolveHand(h.cards, dealerCards, h.bet, {
        wasDoubled: !!h.wasDoubled,
        wasSplit: !!h.wasSplit
      });
      h.outcome = r.outcome;
      h.netDelta = r.netDelta;
    }
    state.lastResolvedHandIndex = state.playerHands.length - 1;
    state.legalActions = [];
    state.phase = 'resolved';
    state.handsPlayed += 1;
  }

  function doHit() {
    if (!state.legalActions.includes('hit')) return false;
    recordDecision('Hit');
    const hand = activeHand();
    const dr = rulesEngine.drawCard(shoe); shoe = dr.shoeAfter;
    hand.cards.push(dr.card);
    hand.hasHit = true;
    const sc = rulesEngine.scoreHand(hand.cards);
    if (sc.isBust || sc.total === 21) {
      advanceToNextHandOrDealer();
    } else {
      recomputeLegalActions();
    }
    return true;
  }

  function doStand() {
    if (!state.legalActions.includes('stand')) return false;
    recordDecision('Stand');
    advanceToNextHandOrDealer();
    return true;
  }

  function doDouble() {
    if (!state.legalActions.includes('double')) return false;
    recordDecision('Double');
    const hand = activeHand();
    hand.wasDoubled = true;
    const dr = rulesEngine.drawCard(shoe); shoe = dr.shoeAfter;
    hand.cards.push(dr.card);
    hand.hasHit = true;
    advanceToNextHandOrDealer();
    return true;
  }

  function doSplit() {
    if (!state.legalActions.includes('split')) return false;
    recordDecision('Split');
    const hand = activeHand();
    const c1 = hand.cards[0];
    const c2 = hand.cards[1];
    hand.cards = [c1];
    hand.alreadySplit = true;
    hand.isSplitHand = true;
    hand.wasSplit = true;
    hand.hasHit = false;
    const dr1 = rulesEngine.drawCard(shoe); shoe = dr1.shoeAfter;
    hand.cards.push(dr1.card);
    const newHand = {
      cards: [c2],
      isActive: false,
      outcome: null,
      bet: state.bet,
      isSplitHand: true,
      alreadySplit: true,
      hasHit: false,
      wasDoubled: false,
      wasSplit: true
    };
    state.playerHands.splice(state.activeHandIndex + 1, 0, newHand);
    recomputeLegalActions();
    return true;
  }

  function doDeal() {
    if (state.phase !== 'betting') return false;
    startHand();
    return true;
  }

  function doNext() {
    if (state.phase !== 'resolved' && state.phase !== 'review') return false;
    const carriedHands = state.handsPlayed;
    state = freshState();
    state.handsPlayed = carriedHands;
    startHand();
    return true;
  }

  function dispatch(action) {
    if (!action || typeof action !== 'object') return;
    let mutated = false;
    switch (action.type) {
      case 'deal':
        if (state.phase === 'betting') mutated = doDeal();
        else if (state.phase === 'resolved' || state.phase === 'review') mutated = doNext();
        break;
      case 'hit':    mutated = doHit(); break;
      case 'stand':  mutated = doStand(); break;
      case 'double': mutated = doDouble(); break;
      case 'split':  mutated = doSplit(); break;
      case 'next':   mutated = doNext(); break;
      default:       return;
    }
    if (mutated) notify();
  }

  return {
    subscribe,
    dispatch,
    getState,
    getCurrentHintQuery,
    getDecisionLog
  };
}
