// Section 4b: Pure decision engine for archetype agents.
// decide(state, profile, seed) -> action — deterministic, never mutates profile.

(function () {
  'use strict';

  // Mulberry32 - deterministic PRNG seeded by integer.
  function mulberry32(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Hash a state object to a stable integer seed prefix
  function stableHash(s) {
    const str = JSON.stringify(s, (k, v) => typeof v === 'number' && !Number.isFinite(v) ? null : v);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
    }
    return h;
  }

  function getPositionBucket(position) {
    if (position === 'UTG' || position === 'UTG1') return 'early';
    if (position === 'MP' || position === 'LJ') return 'middle';
    if (position === 'HJ' || position === 'CO' || position === 'BTN') return 'late';
    if (position === 'SB') return 'sb';
    if (position === 'BB') return 'bb';
    return 'middle';
  }

  // Hand strength rough categories — used by preflop frequency lookup.
  // Returns a number 0-1 indicating how high the hand ranks within all 169 starting hands.
  function preflopHandRank(hole) {
    const RANKS = '23456789TJQKA';
    if (!hole || hole.length !== 2) return 0.3;
    const r1 = hole[0][0], s1 = hole[0][1];
    const r2 = hole[1][0], s2 = hole[1][1];
    const i1 = RANKS.indexOf(r1), i2 = RANKS.indexOf(r2);
    const high = Math.max(i1, i2), low = Math.min(i1, i2);
    const suited = s1 === s2;
    const pair = i1 === i2;
    if (pair) {
      // AA=1.0, KK=0.97, ..., 22=0.55
      return 0.55 + (high / 12) * 0.45;
    }
    let base = (high * 13 + low) / (12 * 13);
    base = base * 0.7 + (low / 12) * 0.1;
    if (suited) base += 0.08;
    if (high - low === 1) base += 0.04; // connector
    if (high === 12) base += 0.05; // Ace high
    return Math.min(0.94, base);
  }

  // Postflop made-hand heuristic. Returns equity-ish proxy in [0,1].
  function postflopHandStrength(hole, board) {
    if (!board || board.length === 0) return preflopHandRank(hole);
    const RANKS = '23456789TJQKA';
    const allCards = hole.concat(board);
    const ranks = allCards.map(c => RANKS.indexOf(c[0]));
    const suits = allCards.map(c => c[1]);

    // Pair counting
    const counts = {};
    ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
    const countVals = Object.values(counts).sort((a, b) => b - a);

    // Suit counting
    const suitCounts = {};
    suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
    const maxSuit = Math.max(...Object.values(suitCounts));

    // Straight check (rough)
    const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
    let straight = false;
    for (let i = 0; i + 4 < uniqueRanks.length; i++) {
      if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) { straight = true; break; }
    }
    if (uniqueRanks.includes(12) && uniqueRanks.includes(0) && uniqueRanks.includes(1) && uniqueRanks.includes(2) && uniqueRanks.includes(3)) straight = true;

    if (countVals[0] === 4) return 0.97; // quads
    if (countVals[0] === 3 && countVals[1] === 2) return 0.92; // boat
    if (maxSuit >= 5) return 0.88; // flush
    if (straight) return 0.83; // straight
    if (countVals[0] === 3) return 0.75; // trips/set
    if (countVals[0] === 2 && countVals[1] === 2) return 0.68; // two-pair

    // One pair — check kicker quality and whether pair includes hole card
    const holeR = hole.map(c => RANKS.indexOf(c[0]));
    const boardR = board.map(c => RANKS.indexOf(c[0]));
    const topBoard = Math.max(...boardR);
    if (countVals[0] === 2) {
      // Pair on board means we need to check if hole interacts
      const holeMaxR = Math.max(...holeR);
      const holePair = holeR[0] === holeR[1];
      if (holePair && holeR[0] > topBoard) return 0.62; // overpair
      if (holePair) return 0.50; // underpair
      // Pair from board+hole
      if (holeMaxR === topBoard) return 0.58; // top pair
      if (boardR.includes(holeR[0]) || boardR.includes(holeR[1])) return 0.45; // weak pair
      return 0.30; // unpaired ace high or lower
    }
    // No pair
    const holeMax = Math.max(...holeR);
    if (holeMax === 12) return 0.25; // ace high
    return 0.18;
  }

  // Decide function — pure.
  function decide(state, profile, rngSeed) {
    if (!state || !profile) return { action: 'fold', sizing: null };

    const seed = (typeof rngSeed === 'number' ? rngSeed : 0) ^ stableHash(state) ^ stableHash({id: profile.id});
    const rng = mulberry32(seed);
    const r = rng();

    const street = state.street || 'preflop';
    const position = state.position || 'CO';
    const bucket = getPositionBucket(position);

    if (street === 'preflop') {
      return decidePreflop(state, profile, bucket, r, rng);
    } else {
      return decidePostflop(state, profile, r, rng);
    }
  }

  function decidePreflop(state, profile, bucket, r, rng) {
    const facing = state.facing || 'open'; // 'open' (no action), 'raise', '3bet'
    const handRank = preflopHandRank(state.hole_cards || []);
    const freqs = profile.preflop_frequencies[bucket] || profile.preflop_frequencies.middle || {};
    const widening = profile.preflop_range_widening_factor || 1.0;

    // Effective threshold for opening: top X% of hands.
    const openWindow = (freqs.open || freqs.defend || 0.2) * widening;
    const threebetWindow = (freqs.threebet_vs_open || 0.05);

    if (facing === 'open' || facing === 'unopened') {
      // Decide whether to open. Higher hand_rank => more likely to enter.
      // We use 1-handRank as percentile-from-top.
      const fromTop = 1 - handRank;
      if (fromTop < openWindow * 0.4) {
        // Premium — open or 3bet... in unopened pot just open
        return { action: 'raise', sizing: 2.5 };
      }
      if (fromTop < openWindow) {
        return { action: 'raise', sizing: 2.5 };
      }
      return { action: 'fold', sizing: null };
    }

    if (facing === 'raise') {
      const fromTop = 1 - handRank;
      // Premium: 3bet
      if (fromTop < threebetWindow * 0.6) {
        return { action: 'raise', sizing: state.raise_to ? state.raise_to * 3 : 9 };
      }
      // Strong but not premium: call
      if (fromTop < (freqs.defend || openWindow * 1.1)) {
        return { action: 'call', sizing: state.to_call || 0 };
      }
      // Add bluff 3bets at small frequency
      if (rng() < threebetWindow * 0.3 && fromTop < 0.4) {
        return { action: 'raise', sizing: state.raise_to ? state.raise_to * 3 : 9 };
      }
      return { action: 'fold', sizing: null };
    }

    if (facing === '3bet') {
      const fromTop = 1 - handRank;
      const foldFreq = profile.postflop_heuristics.fold_to_threebet_pf || 0.65;
      if (fromTop < 0.05) return { action: 'raise', sizing: state.raise_to ? state.raise_to * 2.5 : 24 }; // 4bet QQ+/AK
      if (fromTop < 0.15 && rng() > foldFreq) return { action: 'call', sizing: state.to_call || 0 };
      return { action: 'fold', sizing: null };
    }

    return { action: 'fold', sizing: null };
  }

  function decidePostflop(state, profile, r, rng) {
    const heur = profile.postflop_heuristics || {};
    const facing = state.facing || 'check'; // 'check' (we open action), 'bet', 'raise'
    const street = state.street;
    const strength = postflopHandStrength(state.hole_cards || [], state.board || []);
    const potOdds = state.pot_odds || 0.33;

    // Bet size preference -> sizing fraction of pot
    const sizePref = heur.bet_size_pref || 'medium';
    const sizing = sizePref === 'small' ? 0.33 : sizePref === 'medium' ? 0.55 : sizePref === 'large' ? 0.75 : sizePref === 'overbet' ? 1.2 : (rng() < 0.5 ? 0.33 : 0.75);

    if (facing === 'check' || facing === 'open') {
      // Choose bet vs check
      const isWet = state.board_texture === 'wet';
      const cbetFreq = isWet ? (heur.cbet_freq_wet || 0.5) : (heur.cbet_freq_dry || 0.7);
      // Strong hand: bet more often
      let betProb;
      if (strength >= heur.value_threshold) betProb = Math.min(0.95, cbetFreq + 0.2);
      else if (strength >= 0.45) betProb = cbetFreq * 0.7;
      else betProb = cbetFreq * (heur.bluff_freq || 0.2);
      if (street === 'turn') betProb *= (heur.double_barrel_freq || 0.5) / 0.6;
      if (street === 'river') betProb *= (heur.triple_barrel_freq || 0.3) / 0.5;
      if (rng() < betProb) {
        return { action: 'bet', sizing: sizing };
      }
      return { action: 'check', sizing: null };
    }

    if (facing === 'bet') {
      // Decide call/raise/fold
      const foldThreshold = heur.fold_to_cbet || 0.5;
      // If pot odds are good and hand has equity, call
      if (strength >= heur.value_threshold) {
        // Strong: raise or call
        if (rng() < (heur.check_raise_freq || 0.1) * 1.5) {
          return { action: 'raise', sizing: sizing * 2.5 };
        }
        return { action: 'call', sizing: state.to_call || 0 };
      }
      if (strength >= 0.40) {
        // Marginal: depends on pot odds and fold tendency
        if (potOdds < 0.30 && rng() > foldThreshold * 0.6) {
          return { action: 'call', sizing: state.to_call || 0 };
        }
        if (rng() > foldThreshold) return { action: 'call', sizing: state.to_call || 0 };
        return { action: 'fold', sizing: null };
      }
      // Weak: occasional bluff raise, otherwise fold
      if (rng() < (heur.check_raise_freq || 0.1) * (heur.bluff_freq || 0.2)) {
        return { action: 'raise', sizing: sizing * 2.5 };
      }
      return { action: 'fold', sizing: null };
    }

    if (facing === 'raise') {
      // Tighter response
      if (strength >= 0.78) {
        return { action: 'call', sizing: state.to_call || 0 };
      }
      return { action: 'fold', sizing: null };
    }

    return { action: 'check', sizing: null };
  }

  window.AgentEngine = window.AgentEngine || {};
  window.AgentEngine.decide = decide;
  window.AgentEngine.preflopHandRank = preflopHandRank;
  window.AgentEngine.postflopHandStrength = postflopHandStrength;
})();
