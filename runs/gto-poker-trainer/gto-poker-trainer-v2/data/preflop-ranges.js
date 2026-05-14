// Section 2a: Preflop ranges + reference data
// Position-keyed opening / 3bet / call ranges at 100bb. Frequencies in [0,1].
// All data is static — no computation, no solver.

(function () {
  'use strict';

  const REFERENCE_STACK_BB = 100;

  // Standard 9-max positions
  const POSITIONS = ['UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

  // Full 13x13 hand grid notation. Each entry: { open: f, call?: f, threebet?: f, fourbet?: f }
  // Frequencies represent equilibrium-baseline play at 100bb.
  // Where omitted, default = 0 (fold).

  function R(open, threebet, call, fourbet) {
    const o = {};
    if (open) o.open = open;
    if (threebet) o.threebet = threebet;
    if (call) o.call = call;
    if (fourbet) o.fourbet = fourbet;
    return o;
  }

  // UTG (tightest open)
  const UTG_OPEN = {
    'AA': R(1.0,0,0,1.0), 'KK': R(1.0,0,0,1.0), 'QQ': R(1.0,0,0,0.95), 'JJ': R(1.0,0,0,0.5),
    'TT': R(1.0,0,0,0.2), '99': R(1.0), '88': R(1.0), '77': R(1.0), '66': R(0.85), '55': R(0.6), '44': R(0.4), '33': R(0.3), '22': R(0.2),
    'AKs': R(1.0,0,0,1.0), 'AQs': R(1.0,0,0,0.4), 'AJs': R(1.0,0,0,0.1), 'ATs': R(1.0), 'A9s': R(0.7), 'A8s': R(0.5), 'A7s': R(0.4), 'A6s': R(0.3), 'A5s': R(0.95), 'A4s': R(0.8), 'A3s': R(0.5), 'A2s': R(0.3),
    'KQs': R(1.0,0,0,0.2), 'KJs': R(1.0), 'KTs': R(0.95), 'K9s': R(0.5), 'K8s': R(0.2), 'K7s': R(0.1), 'K6s': R(0.05), 'K5s': R(0.0),
    'QJs': R(1.0), 'QTs': R(0.95), 'Q9s': R(0.5), 'Q8s': R(0.2), 'Q7s': R(0.05),
    'JTs': R(1.0), 'J9s': R(0.7), 'J8s': R(0.3),
    'T9s': R(0.95), 'T8s': R(0.5), 'T7s': R(0.1),
    '98s': R(0.7), '97s': R(0.3), '87s': R(0.6), '86s': R(0.15), '76s': R(0.5), '75s': R(0.1), '65s': R(0.4), '54s': R(0.25), '43s': R(0.05),
    'AKo': R(1.0,0,0,0.6), 'AQo': R(1.0,0,0,0.1), 'AJo': R(0.9), 'ATo': R(0.5), 'A9o': R(0.05),
    'KQo': R(0.95), 'KJo': R(0.6), 'KTo': R(0.2),
    'QJo': R(0.4), 'QTo': R(0.1),
    'JTo': R(0.2)
  };

  // UTG1 (slightly wider)
  const UTG1_OPEN = {
    ...UTG_OPEN,
    '66': R(1.0), '55': R(0.85), '44': R(0.7), '33': R(0.55), '22': R(0.45),
    'A9s': R(1.0), 'A8s': R(0.85), 'A7s': R(0.7), 'A6s': R(0.55), 'A4s': R(1.0), 'A3s': R(0.8), 'A2s': R(0.55),
    'K9s': R(0.85), 'K8s': R(0.55), 'K7s': R(0.3), 'K6s': R(0.15),
    'Q9s': R(0.85), 'Q8s': R(0.5), 'Q7s': R(0.15),
    'J9s': R(1.0), 'J8s': R(0.6),
    'T8s': R(0.85), 'T7s': R(0.3),
    '98s': R(1.0), '97s': R(0.6), '87s': R(0.95), '86s': R(0.4), '76s': R(0.85), '75s': R(0.3), '65s': R(0.7), '54s': R(0.5), '43s': R(0.2),
    'AJo': R(1.0), 'ATo': R(0.85), 'A9o': R(0.3),
    'KJo': R(0.95), 'KTo': R(0.6),
    'QJo': R(0.85), 'QTo': R(0.4),
    'JTo': R(0.6)
  };

  // MP (wider still)
  const MP_OPEN = {
    ...UTG1_OPEN,
    '22': R(0.7), '33': R(0.8),
    'A6s': R(0.85), 'A8s': R(1.0), 'A7s': R(0.95),
    'K7s': R(0.6), 'K6s': R(0.4), 'K5s': R(0.25),
    'Q8s': R(0.7), 'Q7s': R(0.3),
    'J8s': R(0.85), 'J7s': R(0.3),
    'T9s': R(1.0), 'T8s': R(1.0), 'T7s': R(0.55),
    '97s': R(0.85), '86s': R(0.7), '75s': R(0.55), '65s': R(0.95), '54s': R(0.8), '43s': R(0.4),
    'A9o': R(0.7), 'A8o': R(0.3),
    'KTo': R(0.85),
    'QTo': R(0.7), 'Q9o': R(0.2),
    'JTo': R(0.85), 'J9o': R(0.3),
    'T9o': R(0.3)
  };

  // LJ
  const LJ_OPEN = {
    ...MP_OPEN,
    '22': R(0.85), '33': R(0.95),
    'A2s': R(0.85), 'A3s': R(1.0), 'A4s': R(1.0),
    'K6s': R(0.7), 'K5s': R(0.55), 'K4s': R(0.3), 'K3s': R(0.15),
    'Q7s': R(0.55), 'Q6s': R(0.25),
    'J7s': R(0.55), 'J6s': R(0.2),
    'T7s': R(0.85), 'T6s': R(0.25),
    '96s': R(0.4),
    '85s': R(0.3),
    '74s': R(0.2), '64s': R(0.3), '53s': R(0.3), '42s': R(0.05), '32s': R(0.1),
    'A8o': R(0.7), 'A7o': R(0.3),
    'K9o': R(0.5),
    'Q9o': R(0.5),
    'J9o': R(0.6),
    'T9o': R(0.7), 'T8o': R(0.2)
  };

  // HJ
  const HJ_OPEN = {
    ...LJ_OPEN,
    '22': R(1.0), '33': R(1.0),
    'K5s': R(0.85), 'K4s': R(0.7), 'K3s': R(0.55), 'K2s': R(0.4),
    'Q6s': R(0.65), 'Q5s': R(0.4), 'Q4s': R(0.2),
    'J6s': R(0.45), 'J5s': R(0.25),
    'T6s': R(0.55), 'T5s': R(0.15),
    '96s': R(0.7), '95s': R(0.25),
    '85s': R(0.6), '84s': R(0.15),
    '74s': R(0.45), '64s': R(0.6), '53s': R(0.55), '52s': R(0.15), '43s': R(0.7), '42s': R(0.2), '32s': R(0.3),
    'A7o': R(0.7), 'A6o': R(0.3), 'A5o': R(0.4),
    'K9o': R(0.85), 'K8o': R(0.4),
    'Q9o': R(0.85), 'Q8o': R(0.3),
    'J9o': R(0.95), 'J8o': R(0.3),
    'T9o': R(0.95), 'T8o': R(0.5),
    '98o': R(0.4)
  };

  // CO
  const CO_OPEN = {
    ...HJ_OPEN,
    'K2s': R(0.85), 'K3s': R(1.0), 'K4s': R(1.0),
    'Q4s': R(0.7), 'Q3s': R(0.4), 'Q2s': R(0.2),
    'J5s': R(0.7), 'J4s': R(0.3), 'J3s': R(0.1),
    'T5s': R(0.5), 'T4s': R(0.2),
    '94s': R(0.2),
    '84s': R(0.45), '83s': R(0.1),
    '73s': R(0.2), '63s': R(0.2),
    'A6o': R(0.85), 'A5o': R(0.95), 'A4o': R(0.7), 'A3o': R(0.4), 'A2o': R(0.25),
    'K8o': R(0.85), 'K7o': R(0.4),
    'Q8o': R(0.7), 'Q7o': R(0.2),
    'J8o': R(0.7), 'J7o': R(0.2),
    'T8o': R(0.85), 'T7o': R(0.2),
    '98o': R(0.85), '97o': R(0.3),
    '87o': R(0.4)
  };

  // BTN (widest)
  const BTN_OPEN = {
    ...CO_OPEN,
    'Q2s': R(0.7), 'Q3s': R(0.95),
    'J3s': R(0.6), 'J2s': R(0.3),
    'T4s': R(0.6), 'T3s': R(0.3), 'T2s': R(0.15),
    '95s': R(0.65), '94s': R(0.5), '93s': R(0.25),
    '84s': R(0.85), '83s': R(0.4), '82s': R(0.15),
    '73s': R(0.55), '72s': R(0.15),
    '63s': R(0.55), '62s': R(0.15),
    '52s': R(0.55), '42s': R(0.55),
    '32s': R(0.55),
    'A4o': R(0.95), 'A3o': R(0.85), 'A2o': R(0.7),
    'K7o': R(0.85), 'K6o': R(0.55), 'K5o': R(0.3), 'K4o': R(0.15),
    'Q7o': R(0.6), 'Q6o': R(0.3), 'Q5o': R(0.15),
    'J7o': R(0.55), 'J6o': R(0.2),
    'T7o': R(0.55), 'T6o': R(0.2),
    '97o': R(0.7), '96o': R(0.3),
    '87o': R(0.7), '86o': R(0.25),
    '76o': R(0.5), '65o': R(0.4), '54o': R(0.25)
  };

  // SB (mixed open/3bet — open is open-raise vs unopened)
  const SB_OPEN = {
    ...BTN_OPEN,
    // SB is highly polarized in modern theory: heavy 3bet from BB cold-call resistance, but here we model as opens
    'AA': R(1.0,0,0,1.0), 'KK': R(1.0,0,0,1.0), 'QQ': R(1.0,0,0,1.0), 'JJ': R(1.0,0,0,0.95),
    'TT': R(1.0,0,0,0.7), 'AKs': R(1.0,0,0,1.0), 'AKo': R(1.0,0,0,0.95)
  };

  // BB (defending — 'open' here represents call-vs-open frequency baseline)
  const BB_OPEN = {
    'AA': R(1.0,0,0,1.0), 'KK': R(1.0,0,0,1.0), 'QQ': R(1.0,0,0,0.95), 'JJ': R(1.0,0,0,0.7),
    'TT': R(1.0), '99': R(1.0), '88': R(1.0), '77': R(1.0), '66': R(1.0), '55': R(1.0), '44': R(1.0), '33': R(1.0), '22': R(1.0),
    'AKs': R(1.0,0,0,1.0), 'AQs': R(1.0,0,0,0.7), 'AJs': R(1.0,0,0,0.4), 'ATs': R(1.0,0,0,0.2),
    'A9s': R(1.0), 'A8s': R(1.0), 'A7s': R(1.0), 'A6s': R(1.0), 'A5s': R(1.0,0.5), 'A4s': R(1.0,0.4), 'A3s': R(1.0,0.3), 'A2s': R(1.0,0.2),
    'KQs': R(1.0,0,0,0.4), 'KJs': R(1.0,0,0,0.2), 'KTs': R(1.0), 'K9s': R(1.0), 'K8s': R(1.0), 'K7s': R(1.0), 'K6s': R(1.0), 'K5s': R(0.9), 'K4s': R(0.8), 'K3s': R(0.7), 'K2s': R(0.6),
    'QJs': R(1.0), 'QTs': R(1.0), 'Q9s': R(1.0), 'Q8s': R(0.95), 'Q7s': R(0.7), 'Q6s': R(0.55), 'Q5s': R(0.4), 'Q4s': R(0.3), 'Q3s': R(0.2), 'Q2s': R(0.15),
    'JTs': R(1.0), 'J9s': R(1.0), 'J8s': R(0.95), 'J7s': R(0.6), 'J6s': R(0.3),
    'T9s': R(1.0), 'T8s': R(1.0), 'T7s': R(0.7), 'T6s': R(0.4),
    '98s': R(1.0), '97s': R(0.95), '96s': R(0.6), '95s': R(0.3),
    '87s': R(1.0), '86s': R(0.85), '85s': R(0.55),
    '76s': R(1.0), '75s': R(0.8), '74s': R(0.4),
    '65s': R(1.0), '64s': R(0.7),
    '54s': R(0.95), '53s': R(0.6), '43s': R(0.7), '42s': R(0.3), '32s': R(0.4),
    'AKo': R(1.0,0,0,0.85), 'AQo': R(1.0,0,0,0.4), 'AJo': R(1.0,0,0,0.15), 'ATo': R(1.0), 'A9o': R(0.95), 'A8o': R(0.85), 'A7o': R(0.7), 'A6o': R(0.55), 'A5o': R(0.65), 'A4o': R(0.5), 'A3o': R(0.4), 'A2o': R(0.3),
    'KQo': R(1.0), 'KJo': R(1.0), 'KTo': R(0.95), 'K9o': R(0.7), 'K8o': R(0.5), 'K7o': R(0.3),
    'QJo': R(1.0), 'QTo': R(0.95), 'Q9o': R(0.7), 'Q8o': R(0.4),
    'JTo': R(0.95), 'J9o': R(0.7), 'J8o': R(0.4),
    'T9o': R(0.85), 'T8o': R(0.5),
    '98o': R(0.7), '87o': R(0.55), '76o': R(0.4)
  };

  const PREFLOP_RANGES = {
    UTG: { open: UTG_OPEN, threebet_vs_open: subset(UTG_OPEN, 'fourbet') },
    UTG1: { open: UTG1_OPEN, threebet_vs_open: subset(UTG1_OPEN, 'fourbet') },
    MP: { open: MP_OPEN, threebet_vs_open: subset(MP_OPEN, 'fourbet') },
    LJ: { open: LJ_OPEN, threebet_vs_open: subset(LJ_OPEN, 'fourbet') },
    HJ: { open: HJ_OPEN, threebet_vs_open: subset(HJ_OPEN, 'fourbet') },
    CO: { open: CO_OPEN, threebet_vs_open: subset(CO_OPEN, 'fourbet') },
    BTN: { open: BTN_OPEN, threebet_vs_open: subset(BTN_OPEN, 'fourbet') },
    SB: { open: SB_OPEN, threebet_vs_open: subset(SB_OPEN, 'fourbet') },
    BB: { defend: BB_OPEN, threebet_vs_open: subset(BB_OPEN, 'threebet') }
  };

  function subset(range, key) {
    const out = {};
    Object.keys(range).forEach(h => {
      if (range[h] && range[h][key]) out[h] = { freq: range[h][key] };
    });
    return out;
  }

  // Lookup helper: get the frequency mix for hero's hand at a given (position, situation).
  function getPreflopMix(position, situation, hand) {
    const r = PREFLOP_RANGES[position];
    if (!r) return null;
    let bucket;
    if (situation === 'open') bucket = r.open || r.defend;
    else if (situation === 'threebet') bucket = r.threebet_vs_open;
    else if (situation === 'defend') bucket = r.defend || r.open;
    else bucket = r.open;
    if (!bucket) return null;
    const entry = bucket[hand];
    if (!entry) return { fold: 1.0 };
    // Convert into action mix
    const mix = { fold: 0 };
    let total = 0;
    if (entry.open) { mix.raise = entry.open; total += entry.open; }
    if (entry.threebet) { mix.threebet = entry.threebet; total += entry.threebet; }
    if (entry.call) { mix.call = entry.call; total += entry.call; }
    if (entry.fourbet) { mix.fourbet = entry.fourbet; }
    if (typeof entry.freq === 'number') { mix.raise = entry.freq; total += entry.freq; }
    mix.fold = Math.max(0, 1 - total);
    return mix;
  }

  function listPositions() { return POSITIONS.slice(); }

  // Expose under a global.
  window.GTOData = window.GTOData || {};
  window.GTOData.REFERENCE_STACK_BB = REFERENCE_STACK_BB;
  window.GTOData.POSITIONS = POSITIONS;
  window.GTOData.PREFLOP_RANGES = PREFLOP_RANGES;
  window.GTOData.getPreflopMix = getPreflopMix;
  window.GTOData.listPositions = listPositions;
})();
