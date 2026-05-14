// Section 4a: Archetype roster — 8 distinct profiles with frequency tables and contrast-with-GTO commentary.
// Static data only. All profiles frozen.

(function () {
  'use strict';

  const ARCHETYPES = [
    {
      id: 'TAG',
      display_name: 'TAG (Tight-Aggressive)',
      vpip_target: 22,
      pfr_target: 18,
      aggression_factor: 3.2,
      preflop_range_widening_factor: 1.0,
      preflop_frequencies: {
        early: { open: 0.13, threebet_vs_open: 0.05 },
        middle: { open: 0.18, threebet_vs_open: 0.07 },
        late: { open: 0.32, threebet_vs_open: 0.10 },
        sb: { open: 0.30, threebet_vs_open: 0.10 },
        bb: { defend: 0.55, threebet_vs_open: 0.10 }
      },
      postflop_heuristics: {
        cbet_freq_dry: 0.75, cbet_freq_wet: 0.55,
        fold_to_cbet: 0.50,
        double_barrel_freq: 0.55, triple_barrel_freq: 0.30,
        check_raise_freq: 0.10,
        value_threshold: 0.62, bluff_freq: 0.30,
        fold_to_threebet_pf: 0.65,
        bet_size_pref: 'medium'
      },
      description: 'Plays tight ranges, rarely bluffs without good reason, value-bets relentlessly when ahead. The default winning archetype at low-to-mid stakes.',
      contrast_with_gto: 'TAG approximates GTO closer than any other archetype but tends to over-fold to aggression on rivers (slightly above MDF on most spots) and under-bluff with appropriate blockers. Exploit by (a) over-bluffing rivers when their range is capped — they fold the marginal value-spot 5-10% above equilibrium, (b) value-betting thinner against them because they call MDF-correct on flop and turn, (c) recognizing they 3-bet too narrow from late position and stealing more aggressively from the cutoff and button.\n\nA TAG who has read modern theory may be near-GTO in single-raised pots but typically deviates in multi-way and 3-bet pots, where the equilibrium is more polarized than human intuition suggests.'
    },
    {
      id: 'LAG',
      display_name: 'LAG (Loose-Aggressive)',
      vpip_target: 30,
      pfr_target: 26,
      aggression_factor: 4.0,
      preflop_range_widening_factor: 1.4,
      preflop_frequencies: {
        early: { open: 0.18, threebet_vs_open: 0.10 },
        middle: { open: 0.25, threebet_vs_open: 0.13 },
        late: { open: 0.45, threebet_vs_open: 0.18 },
        sb: { open: 0.42, threebet_vs_open: 0.18 },
        bb: { defend: 0.65, threebet_vs_open: 0.15 }
      },
      postflop_heuristics: {
        cbet_freq_dry: 0.85, cbet_freq_wet: 0.65,
        fold_to_cbet: 0.40,
        double_barrel_freq: 0.65, triple_barrel_freq: 0.45,
        check_raise_freq: 0.18,
        value_threshold: 0.55, bluff_freq: 0.45,
        fold_to_threebet_pf: 0.50,
        bet_size_pref: 'large'
      },
      description: 'Plays many hands aggressively, applies relentless pressure, generates fold equity by sheer volume of bets. High variance, theoretically the closest to modern GTO when well-implemented.',
      contrast_with_gto: 'LAG over-bluffs at most decision points relative to equilibrium — particularly turn double-barrels and river overbets without proper blocker selection. The GTO baseline bluffs at frequencies determined by value-combo counts; LAG bluffs by reflex. Exploit by (a) calling down lighter, especially on rivers where their bluff:value ratio is often >1, (b) check-raising flops with merged value because they barrel at >70% (light raise gets folds + value), (c) flatting more preflop in position to set up profitable post-flop spots.\n\nA strong LAG approximates equilibrium polarization but typically over-bluffs because the equilibrium\'s mixing is uncomfortable to execute consistently — they bluff every river with a missed draw rather than mixing in the correct give-up frequency.'
    },
    {
      id: 'Nit',
      display_name: 'Nit',
      vpip_target: 14,
      pfr_target: 11,
      aggression_factor: 2.0,
      preflop_range_widening_factor: 0.7,
      preflop_frequencies: {
        early: { open: 0.08, threebet_vs_open: 0.02 },
        middle: { open: 0.10, threebet_vs_open: 0.03 },
        late: { open: 0.18, threebet_vs_open: 0.04 },
        sb: { open: 0.15, threebet_vs_open: 0.04 },
        bb: { defend: 0.30, threebet_vs_open: 0.03 }
      },
      postflop_heuristics: {
        cbet_freq_dry: 0.65, cbet_freq_wet: 0.40,
        fold_to_cbet: 0.65,
        double_barrel_freq: 0.35, triple_barrel_freq: 0.10,
        check_raise_freq: 0.05,
        value_threshold: 0.72, bluff_freq: 0.10,
        fold_to_threebet_pf: 0.85,
        bet_size_pref: 'small'
      },
      description: 'Folds nearly everything preflop, never bluffs without nuts, value-bets only top-tier hands. Easy to read, hard to extract from.',
      contrast_with_gto: 'Nit ranges are far tighter than equilibrium — the Nit folds 30%+ of MDF-required defenses preflop and on flops. Their bet-when-strong, fold-otherwise pattern makes them readable: any aggression from a Nit is overwhelmingly value. Exploit by (a) folding to 3-bets at near-100% with anything weaker than KK+ unless implied odds are huge, (b) bluffing rivers freely against a Nit\'s capped check-back range — they fold any non-pair to a half-pot bet, (c) value-betting thinner because they over-fold the river — small bets extract more total value than big bets.\n\nThe core Nit leak: range protection. They never bluff their bluff-candidate combos, so their checking range becomes a face-up "no-pair-or-better" advertisement. Equilibrium attacks this by polarized bluffing every street.'
    },
    {
      id: 'CallingStation',
      display_name: 'Calling Station',
      vpip_target: 45,
      pfr_target: 9,
      aggression_factor: 0.9,
      preflop_range_widening_factor: 2.2,
      preflop_frequencies: {
        early: { open: 0.10, threebet_vs_open: 0.01 },
        middle: { open: 0.13, threebet_vs_open: 0.02 },
        late: { open: 0.22, threebet_vs_open: 0.03 },
        sb: { open: 0.20, threebet_vs_open: 0.03 },
        bb: { defend: 0.85, threebet_vs_open: 0.03 }
      },
      postflop_heuristics: {
        cbet_freq_dry: 0.45, cbet_freq_wet: 0.30,
        fold_to_cbet: 0.20,
        double_barrel_freq: 0.20, triple_barrel_freq: 0.05,
        check_raise_freq: 0.04,
        value_threshold: 0.78, bluff_freq: 0.05,
        fold_to_threebet_pf: 0.40,
        bet_size_pref: 'small'
      },
      description: 'Calls almost everything preflop, calls flops with any pair or draw, calls turns on equity, calls rivers because they don\'t want to be bluffed. Almost never raises.',
      contrast_with_gto: 'The Calling Station is the polar opposite of equilibrium: their fold frequency is far below MDF on every street. Where the equilibrium folds 30-40% to a half-pot bet, the Station folds 10-15%. Exploit by (a) abandoning all bluffs against them — bluffing a Station is set-money-on-fire, (b) value-betting thin to absurd levels — they call top pair down on three-flush-completing rivers, (c) sizing up for value because they call any size with any pair, (d) inducing a rare bluff by checking strong hands on dry boards (they sometimes fire when the action checks twice).\n\nThe equilibrium adjustment against any Station-like opponent: thin value, no bluffs, large sizings.'
    },
    {
      id: 'Maniac',
      display_name: 'Maniac',
      vpip_target: 55,
      pfr_target: 45,
      aggression_factor: 6.0,
      preflop_range_widening_factor: 2.5,
      preflop_frequencies: {
        early: { open: 0.30, threebet_vs_open: 0.20 },
        middle: { open: 0.40, threebet_vs_open: 0.25 },
        late: { open: 0.65, threebet_vs_open: 0.35 },
        sb: { open: 0.60, threebet_vs_open: 0.35 },
        bb: { defend: 0.75, threebet_vs_open: 0.30 }
      },
      postflop_heuristics: {
        cbet_freq_dry: 0.95, cbet_freq_wet: 0.85,
        fold_to_cbet: 0.30,
        double_barrel_freq: 0.85, triple_barrel_freq: 0.70,
        check_raise_freq: 0.30,
        value_threshold: 0.45, bluff_freq: 0.65,
        fold_to_threebet_pf: 0.30,
        bet_size_pref: 'overbet'
      },
      description: 'Bets and raises constantly, three-bets light, four-bet bluffs, barrels every street with whatever they have. Hyper-LAG taken to a leak-filled extreme.',
      contrast_with_gto: 'Maniacs over-bluff at every decision point — preflop 3-bet frequency is 3x equilibrium, postflop bluff frequency is 2x. Their check-raises are heavily weighted toward bluffs without blocker selection. Exploit by (a) calling down with bluff catchers far below the GTO threshold — even ace-high beats 50%+ of their river bets, (b) trapping with strong hands by check-calling (they barrel into your strength), (c) 4-betting wider preflop because their 3-bets fold to action a high fraction of the time, (d) avoiding bluffs entirely because they call too much and re-raise too much to make bluffs profitable.\n\nThe equilibrium response to a Maniac is to polarize toward bluff-catching value: every pair is a calldown candidate, every draw is a peel, every overpair is a stack-off. Skip the bluffs.'
    },
    {
      id: 'Rock',
      display_name: 'Rock',
      vpip_target: 11,
      pfr_target: 8,
      aggression_factor: 1.6,
      preflop_range_widening_factor: 0.6,
      preflop_frequencies: {
        early: { open: 0.06, threebet_vs_open: 0.02 },
        middle: { open: 0.08, threebet_vs_open: 0.02 },
        late: { open: 0.13, threebet_vs_open: 0.03 },
        sb: { open: 0.10, threebet_vs_open: 0.02 },
        bb: { defend: 0.22, threebet_vs_open: 0.02 }
      },
      postflop_heuristics: {
        cbet_freq_dry: 0.55, cbet_freq_wet: 0.30,
        fold_to_cbet: 0.70,
        double_barrel_freq: 0.25, triple_barrel_freq: 0.05,
        check_raise_freq: 0.03,
        value_threshold: 0.78, bluff_freq: 0.05,
        fold_to_threebet_pf: 0.92,
        bet_size_pref: 'small'
      },
      description: 'Even tighter than a Nit. Plays only the absolute premium, will not put more than a small amount in without a near-lock hand. Often passive postflop.',
      contrast_with_gto: 'Rocks have the tightest preflop ranges seen at the table. Their VPIP barely exceeds 10%, meaning they fold AJo, KQo, mid pairs in early position routinely — far tighter than equilibrium. Exploit by (a) stealing every pot when they show weakness — c-bet vs Rock check-fold is print-money, (b) folding to 3-bets always (their 3-bet range is QQ+/AK only), (c) ignoring their value bets on the river entirely (they have it, fold non-monsters), (d) over-folding to their rare aggression to maximize total session EV.\n\nThe Rock\'s leak is a non-existent bluffing range. They literally do not have bluff combos in their decision tree, so any bet is value. The equilibrium attacks the absent bluff range by over-folding to all aggression.'
    },
    {
      id: 'Whale',
      display_name: 'Whale (Wealthy Recreational)',
      vpip_target: 60,
      pfr_target: 12,
      aggression_factor: 1.8,
      preflop_range_widening_factor: 2.8,
      preflop_frequencies: {
        early: { open: 0.18, threebet_vs_open: 0.04 },
        middle: { open: 0.22, threebet_vs_open: 0.05 },
        late: { open: 0.32, threebet_vs_open: 0.07 },
        sb: { open: 0.30, threebet_vs_open: 0.06 },
        bb: { defend: 0.90, threebet_vs_open: 0.05 }
      },
      postflop_heuristics: {
        cbet_freq_dry: 0.50, cbet_freq_wet: 0.45,
        fold_to_cbet: 0.25,
        double_barrel_freq: 0.40, triple_barrel_freq: 0.30,
        check_raise_freq: 0.10,
        value_threshold: 0.65, bluff_freq: 0.25,
        fold_to_threebet_pf: 0.55,
        bet_size_pref: 'random'
      },
      description: 'Plays for entertainment with a lot of money to lose. Calls wide preflop, sometimes shoves with second pair, sometimes folds top pair on a brick river. Erratic.',
      contrast_with_gto: 'Whales are the highest-EV opponent in the room because their decisions are not anchored to equilibrium logic at all — they play by emotion, by entertainment value, and by pattern. Exploit by (a) targeting them in every isolation spot, (b) over-betting for value because they pay off any size with any pair, (c) bluffing strategically — they fold to large bets randomly but tend to call small bets, so polarize hard with bluffs, (d) avoiding fancy plays — straightforward value extraction wins more than complicated lines.\n\nThe Whale exploit checklist: identify, isolate, never bluff unless polarized, value-bet aggressively. The equilibrium does not apply because they are not playing equilibrium themselves — pure exploitation maximizes EV.'
    },
    {
      id: 'NitReg',
      display_name: 'Nitty Reg',
      vpip_target: 18,
      pfr_target: 15,
      aggression_factor: 2.4,
      preflop_range_widening_factor: 0.85,
      preflop_frequencies: {
        early: { open: 0.10, threebet_vs_open: 0.04 },
        middle: { open: 0.13, threebet_vs_open: 0.05 },
        late: { open: 0.25, threebet_vs_open: 0.08 },
        sb: { open: 0.22, threebet_vs_open: 0.07 },
        bb: { defend: 0.42, threebet_vs_open: 0.08 }
      },
      postflop_heuristics: {
        cbet_freq_dry: 0.70, cbet_freq_wet: 0.45,
        fold_to_cbet: 0.55,
        double_barrel_freq: 0.45, triple_barrel_freq: 0.25,
        check_raise_freq: 0.08,
        value_threshold: 0.65, bluff_freq: 0.25,
        fold_to_threebet_pf: 0.70,
        bet_size_pref: 'medium'
      },
      description: 'A regular grinder running theory-light, slightly-tight ranges. Plays solid but not creative; reads basic aggression well, but predictable.',
      contrast_with_gto: 'NitReg ranges are slightly tighter than TAG and significantly tighter than equilibrium — they fold thin value spots, under-bluff rivers with proper blockers, and rarely overbet. Exploit by (a) overbetting rivers when their range is capped — they fold one-pair-no-kicker to overbets at high frequency, (b) check-raising flops in 3bet pots because they continue cbet too often when they have the betting initiative, (c) 4-betting bluffs preflop with blocker hands — they fold to 4-bets at >75% with anything below QQ.\n\nNitRegs typically have one solid leak and one or two improving holes; they are competent but not GTO. The equilibrium adjustments are smaller than against fish but larger than against true GTO opponents.'
    }
  ];

  function deepFreeze(o) {
    Object.freeze(o);
    Object.values(o).forEach(v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); });
    return o;
  }
  ARCHETYPES.forEach(deepFreeze);

  function getArchetype(id) { return ARCHETYPES.find(a => a.id === id) || null; }
  function listArchetypes() { return ARCHETYPES.slice(); }

  window.Archetypes = window.Archetypes || {};
  window.Archetypes.ARCHETYPES = ARCHETYPES;
  window.Archetypes.getArchetype = getArchetype;
  window.Archetypes.listArchetypes = listArchetypes;
})();
