// Section 2b: Curated postflop edge-case library + GTO glossary.
// 20+ hands; each with full annotation and dense theory commentary.
// Glossary: 12+ named GTO concepts with short_def + long_explanation.

(function () {
  'use strict';

  // ---------- GLOSSARY ----------
  const GLOSSARY = [
    {
      id: 'range',
      name: 'Range',
      short_def: 'The complete distribution of hands a player could hold given prior action.',
      long_explanation: 'A range is the full set of hand combinations consistent with a player\'s observed actions, weighted by the frequencies the equilibrium strategy plays each hand. GTO play does not look at single hands in isolation; every decision is the response of the entire range to the entire opposing range. When a player opens UTG, that player\'s range is concentrated in premium pairs, suited Broadways, and select offsuit Broadways. When the player checks the turn after raising preflop, that player\'s range is now a subset, weighted toward hands that prefer to control pot or induce. Solid GTO thinking is range-vs-range, never card-vs-card.'
    },
    {
      id: 'equity',
      name: 'Equity',
      short_def: 'A hand\'s share of the pot if all remaining cards run out without further folds.',
      long_explanation: 'Equity is the raw pot share — measured by simulating all possible runouts. AA vs KK on a dry low board has roughly 80% equity. Equity is necessary but not sufficient for value: a hand with 60% equity that cannot realize that equity (faces too much aggression, gets blown off) is worth less than its raw share. Equity drives whether a call is profitable when paired with implied/reverse-implied odds and equity-realization adjustments.'
    },
    {
      id: 'ev',
      name: 'EV (Expected Value)',
      short_def: 'The chip-weighted average outcome of a decision over all possible runouts and opponent responses.',
      long_explanation: 'EV = sum over outcomes of (probability * payoff). A GTO action is one whose EV is at least as high as any alternative, given that the opponent is also playing equilibrium. Critically, EV depends on the entire downstream tree — a check on the turn might have higher EV than a bet because it lets the worst hands of villain bluff or call wider on the river. EV calculations in NLHE are computationally enormous; equilibrium solvers approximate them via iterated CFR.'
    },
    {
      id: 'mes',
      name: 'MES (Minimum Equilibrium Strategy / Mixed Strategy)',
      short_def: 'A strategy that mixes between actions at certain frequencies to maintain unexploitability.',
      long_explanation: 'At many decision points, the equilibrium calls for mixing — for example bluffing 35% and giving up 65% with the same hand. Mixing is unintuitive: a single hand has only one true EV-maximizing line in isolation, but the equilibrium uses the same hand differently across its range to balance the entire strategy. If you always bluff with one bluff candidate and always give up with another, the opponent can exploit this by reading the bet-sizing tell. MES preserves indifference for the opponent.'
    },
    {
      id: 'polarization',
      name: 'Polarization',
      short_def: 'A betting range composed only of strong value and pure bluffs, with marginal hands checking.',
      long_explanation: 'A polarized range is a barbell: strong value at one end, air at the other, with no medium-strength hands in between. Polarization is correct when you want to use a large bet size — value bets benefit from large sizing, and bluffs need the same size to threaten. Medium hands fold to a raise but cannot get called by worse, so they prefer to check. Compare with linear (all your better-than-average hands bet) and merged (capped value + thin bets).'
    },
    {
      id: 'linearity',
      name: 'Linear Range',
      short_def: 'A betting range containing your best hands top-down, without intentional bluffs.',
      long_explanation: 'A linear range bets all hands above some equity threshold. It maximizes value when the opponent\'s range is weak and uncapped (e.g., as a 3bettor in position vs UTG open with 100bb where you target value plus a few bluffs from suited Aces for blocker reasons). Linearity vs polarization is one of the central architectural choices in range construction — it depends on opponent capping, board texture, and SPR.'
    },
    {
      id: 'condensed',
      name: 'Condensed Range',
      short_def: 'A range with strong hands removed — typically what a passive caller represents.',
      long_explanation: 'When a player calls preflop instead of 3-betting, they decline to put in the strongest hands; their resulting range is condensed (capped at the top). A condensed range loves medium-strength boards and hates polarized aggression: it cannot stand multiple barrels because its premium component was filtered out. Knowing your opponent\'s range is condensed is one of the strongest exploit triggers in NLHE.'
    },
    {
      id: 'mdf',
      name: 'MDF (Minimum Defense Frequency)',
      short_def: 'The percentage of your range you must continue to make a bluff break-even for the bettor.',
      long_explanation: 'MDF = pot / (pot + bet). At a half-pot bet, the defender must continue 67% of the time to deny the bluffer profit. MDF is the baseline against which all postflop calling decisions are checked: if you fold more than 1 - MDF of your range, you are over-folding and exploitable. MDF is a defense floor, not a target — equilibrium often defends slightly above it in position because of equity realization advantages.'
    },
    {
      id: 'pot_odds',
      name: 'Pot Odds',
      short_def: 'The price the pot offers on a call, expressed as required equity.',
      long_explanation: 'Required equity to call = bet / (pot + bet + bet) — i.e., the amount you risk over the total pot after your call. A half-pot bet needs ~25% equity to call profitably. Pot odds is the simplest filter in poker, but it ignores future streets, position, and equity realization. Use pot odds as a necessary check; refine with implied and reverse-implied odds.'
    },
    {
      id: 'implied_odds',
      name: 'Implied Odds',
      short_def: 'The expected future winnings when you hit your draw, beyond the immediate pot.',
      long_explanation: 'Implied odds are the chips you expect to win on later streets given that you complete your draw. Suited connectors and small pairs rely on implied odds — their direct equity is poor but they make disguised hands that get paid. Implied odds collapse when stacks are shallow, when villain plays well, or when your hand is face-up (e.g., 56s on a 678 board cannot win another big bet because villain folds). Always discount implied odds against strong opponents.'
    },
    {
      id: 'blockers',
      name: 'Blockers',
      short_def: 'Cards in your hand that reduce the combinations of strong hands in villain\'s range.',
      long_explanation: 'A blocker is a card that removes specific combinations from the opponent\'s range. Holding the Ace of spades on a three-spade board blocks the nut flush — making villain less likely to have it, increasing your bluff EV when the line repper of the nut flush is cheap. Blockers are critical to bluff selection: when picking which non-made-hand to bluff, choose hands that block villain\'s calls and unblock villain\'s folds.'
    },
    {
      id: 'frequency_manipulation',
      name: 'Frequency Manipulation',
      short_def: 'Choosing actions to keep your overall range proportions balanced rather than maximizing one hand.',
      long_explanation: 'In the equilibrium, what each hand does individually is less important than the resulting overall mix. If your bet has too high a value:bluff ratio, villain folds; too low, villain calls. Frequency manipulation means deliberately bluffing some hands to maintain the right ratio, even if a tighter line would be slightly higher EV in isolation. This is the core difference between exploitative play (deviates from equilibrium against specific opponents) and GTO play (maintains balance regardless of opponent).'
    },
    {
      id: 'equity_realization',
      name: 'Equity Realization',
      short_def: 'How much of a hand\'s raw equity it actually captures by showdown given position and skill.',
      long_explanation: 'A hand realizes <100% of its equity when it folds before showdown or fails to extract on later streets. Out-of-position players realize less of their equity than in-position players — even with the same hole cards — because they cannot control the pot, cannot value bet thinly, and cannot bluff catch as effectively. Realized equity drives why position matters and why some marginal hands are profitable in position but unprofitable out of position.'
    },
    {
      id: 'exploitative',
      name: 'Exploitative Deviation',
      short_def: 'Deliberately playing non-GTO to maximize value against a known opponent leak.',
      long_explanation: 'GTO is unexploitable but not maximally exploitative. Against an opponent who folds too much to river bets, GTO bluffs at a balanced frequency; exploitative play bluffs every river. Exploitative deviation is correct when you have a sufficiently strong read; the cost is that you become exploitable yourself. Strong players blend exploitative deviations within a GTO baseline — leaning exploitative against weak players, returning to baseline against strong ones.'
    },
    {
      id: 'gto_baseline',
      name: 'GTO Baseline',
      short_def: 'The equilibrium strategy used as the default that exploitative adjustments deviate from.',
      long_explanation: 'The GTO baseline is the strategy that breaks even (or better) against any opposing strategy, including the worst-case opponent. It is the default fallback when reads are weak or unknown. A strong practical heuristic: play GTO baseline by default; deviate exploitatively only when you have evidence; return to baseline when your opponent adjusts.'
    },
    {
      id: 'spr',
      name: 'SPR (Stack-to-Pot Ratio)',
      short_def: 'Effective stack divided by the pot at the start of a postflop street.',
      long_explanation: 'SPR governs commitment. At SPR < 4, top pair often wants to get all-in; at SPR > 10, top pair is a bluff catcher. SPR drives how polarized your bet sizes can be (high SPR allows multi-street pressure with overbets), how much equity a draw needs to peel (low SPR reduces implied odds), and how much your range needs to protect (low SPR demands more bluffs to balance value).'
    }
  ];

  // ---------- CURATED POSTFLOP HANDS ----------
  // Each: id, title, street, position, hole_cards (2 cards), board (3-5), pot, stacks (effective), action_history,
  // legal_actions (array), gto_mix (action -> frequency), theory_explanation (string with paragraph breaks),
  // concept_tags (glossary ids).

  function H(spec) { return spec; }

  const HANDS = [
    H({
      id: 'h001',
      title: 'BTN vs BB SRP — c-bet on dry A-high board',
      street: 'flop',
      position: 'BTN',
      hole_cards: ['Ks', 'Js'],
      board: ['Ah', '7d', '2c'],
      pot: 5.5,
      stacks: 97.5,
      action_history: 'BTN opens 2.5bb, BB calls. Flop.',
      legal_actions: ['check', 'bet33', 'bet75'],
      gto_mix: { check: 0.35, bet33: 0.6, bet75: 0.05 },
      theory_explanation: 'This is the canonical BTN range bet spot. The board is bone dry — A72r — and BTN\'s preflop range has a massive nut advantage: BTN opens essentially every Ace, while BB\'s call range called with very few Ax (most strong Ax 3-bet preflop). Because BTN has the nut advantage AND the range advantage, BTN can c-bet small (33% pot) at very high frequency.\n\nWhy 33% rather than 75%? Two reasons. First, BB\'s range is condensed and capped — there are no two-pairs, sets are rare, and most of BB\'s range is medium pairs and broadway hands that all play similarly against a small bet. A small bet extracts thin value from second-best Aces, denies equity from underpairs, and blocks BB from check-raising profitably. Second, BTN has zero incentive to polarize on this texture because BB cannot have many calling hands strong enough to call a big bet.\n\nKJs in particular has gutshot equity (any T) plus two over-broadway draws. It can c-bet for thin value (KK/QQ check-jam protection makes KJs uncomfortable on bigger sizes) but it does NOT need to bet — at a check-frequency of 35%, KJs is one of the better candidates to check because it benefits from realizing its overcards on later streets without bloating the pot when a Q or T arrives.\n\nThe glossary concept here is range advantage and the architecture of small c-bets on locked-out boards. A small c-bet is not a value bet or a bluff in isolation — it is a range bet, where the entire range bets together because every hand in the range gains from the action. Polarization is incorrect here precisely because BB cannot defend with anything worth polarizing against.',
      concept_tags: ['range', 'polarization', 'mdf', 'equity_realization', 'blockers']
    }),
    H({
      id: 'h002',
      title: 'CO 3bet pot — c-bet vs BTN call on K-high two-tone',
      street: 'flop',
      position: 'CO',
      hole_cards: ['Qd', 'Qh'],
      board: ['Kh', '8h', '4c'],
      pot: 22,
      stacks: 89,
      action_history: 'BTN opens 2.3bb, CO 3-bets to 9bb, BTN calls. Flop.',
      legal_actions: ['check', 'bet33', 'bet75'],
      gto_mix: { check: 0.55, bet33: 0.30, bet75: 0.15 },
      theory_explanation: 'QQ in a 3bet pot on K84hh is a mid-strength hand that struggles between value-betting and bluff-catching. The textbook trap: amateurs bet QQ for "protection" and get raised by BTN\'s flushes, sets, and floated KQ.\n\nThe equilibrium recognizes that as the 3-bettor, CO has the range advantage but not as overwhelmingly as in single-raised pots — BTN\'s call range is very strong (folded the trash, 4-bet the very top, called with a tight calling range). Importantly, BTN\'s range contains KQ/KJ/AK that we are now flipping or behind. QQ is therefore a check-back candidate at high frequency (~55%): we let BTN\'s missed Aces and weaker pairs bluff into us, and we deny BTN the chance to raise us off our equity.\n\nWhen QQ does bet, it should size small (33%). The small bet collapses BTN\'s range without bloating against BTN\'s monsters — a 75% bet is too committal and turns QQ into a face-up bluff catcher when raised. The small bet also lets us continue to bluff catch on turn and river with control of the SPR.\n\nMixed strategy is essential here. Always-betting QQ exposes you to a check-raise; always-checking QQ removes a value/protection element from your betting range and unbalances your bet-mix. The equilibrium mixes — sometimes you bet small and fold to a raise, sometimes you check-call down. The critical lesson: in 3bet pots out of position, your range is uncapped on top (you can have AA/KK) but vulnerable in the middle (QQ-99). Protect the middle by checking it.',
      concept_tags: ['range', 'mes', 'condensed', 'spr', 'equity_realization', 'frequency_manipulation']
    }),
    H({
      id: 'h003',
      title: 'BB vs BTN SRP — facing 33% c-bet on monotone flop',
      street: 'flop',
      position: 'BB',
      hole_cards: ['Th', '9h'],
      board: ['Js', '6s', '3s'],
      pot: 6,
      stacks: 97,
      action_history: 'BTN opens 2.5bb, BB calls. BTN bets 2bb (33%).',
      legal_actions: ['fold', 'call', 'raise_small', 'raise_pot'],
      gto_mix: { fold: 0.05, call: 0.65, raise_small: 0.20, raise_pot: 0.10 },
      theory_explanation: 'On a monotone flop where BB does not have a flush, MDF math says BB must defend ~75% to a 33% bet. BB\'s defending range is dominated by hands that interact with the spade flush draw indirectly (one-spade hands that can hit equity on the turn) and by gutshot/straight equity hands.\n\nT9hh is a pure equity hand: 4 outs to a straight (any 7 or 8), zero blocker overlap with the made flush. It cannot fold — folding ~95% of these equity hands would let BTN auto-profit. The interesting question is call vs raise.\n\nWhy raise sometimes? Because BTN\'s c-bet range on a monotone flop where BTN is uncapped on the flush nut (BTN can have As/Ks/Qs of suit at high frequency) tends to bet thin and continue with mid-strength hands. A raise denies BTN equity from one-spade overcards, builds the pot for our nut straight when we hit, and adds protection against future flush completion. A small raise (2x-2.5x the c-bet) is preferred because we have no nut blocker and a pot-raise gets us into a face-up bluff with too much pot risk.\n\nThe critical concept is equity realization. T9hh in position would call almost universally because it realizes its equity well. Out of position, with BTN holding the betting initiative, raising sometimes is necessary to maintain balance — otherwise BB\'s calling range is too weak and BTN can barrel turns at very high frequency with impunity. Frequency manipulation: maintain enough raises to keep BTN honest.',
      concept_tags: ['mdf', 'equity', 'pot_odds', 'implied_odds', 'frequency_manipulation', 'equity_realization']
    }),
    H({
      id: 'h004',
      title: 'Polarized 3-bet pot turn barrel — ace blocker bluff',
      street: 'turn',
      position: 'CO',
      hole_cards: ['Ac', 'Js'],
      board: ['Th', '8h', '3d', '2c'],
      pot: 35,
      stacks: 76,
      action_history: 'CO 3-bets preflop, BB calls. CO bets 25% flop, BB calls. Turn.',
      legal_actions: ['check', 'bet50', 'bet100'],
      gto_mix: { check: 0.30, bet50: 0.35, bet100: 0.35 },
      theory_explanation: 'AJo is a textbook large-sizing turn bluff in a 3bet pot on a connecting board. Three forces converge.\n\nFirst, blocker effects: AJo blocks AA, AT, AJ (turning into top pair), and the nut flush draw on the front-door heart. Most importantly, the Ace blocker reduces villain\'s ability to hold the very top of his calling range — AhKh, AhQh, even ATs are removed or reduced in combos. Less of villain\'s nut equity exists, so our bluff is more often run into a foldable hand.\n\nSecond, range polarity: CO\'s 3bet range arrives at this turn capped at one pair plus some overpairs that mostly want to keep the pot small. CO\'s only natural value bets here are sets (88, TT, 33, 22 if defended) — a thin value range. To balance these value combos at any reasonable bluff:value ratio, CO must have many bluffs. AJo high is a perfect candidate: zero showdown value, blocks villain\'s strong calls, has a few outs (5 or 6) to back-door equity.\n\nThird, the turn 2c is a brick that does not improve villain\'s range. Villain\'s flop calling range was capped (he peeled with pairs and draws); a brick turn keeps villain capped, and our overbet exploits that capped range. Polarization with a large size puts maximum pressure on one-pair hands.\n\nThe lesson: bluff selection is not about how bad your hand is. It is about (1) blockers to villain\'s calls, (2) unblockers to villain\'s folds, and (3) board interaction with villain\'s range. AJo passes all three filters. A hand like 76 high with no blockers would be a worse bluff candidate even though it has less showdown value, because it does not block villain\'s strong hands.',
      concept_tags: ['blockers', 'polarization', 'frequency_manipulation', 'ev', 'range']
    }),
    H({
      id: 'h005',
      title: 'Donk lead facing — overpair OOP decision',
      street: 'flop',
      position: 'CO',
      hole_cards: ['As', 'Ah'],
      board: ['9h', '8s', '7d'],
      pot: 12,
      stacks: 94,
      action_history: 'CO opens, BB calls. BB donks pot 12bb into 12bb.',
      legal_actions: ['fold', 'call', 'raise_pot'],
      gto_mix: { fold: 0.05, call: 0.70, raise_pot: 0.25 },
      theory_explanation: 'A donk lead on a wet middling board flips conventional 3bet pot logic. The preflop caller — BB — chooses to seize the betting initiative, which is itself a signal: at the equilibrium, donks are rare and concentrated in two regions of the range — strong made hands (sets, two pair, straights) that want to build pot before the original raiser can protect range, and a small frequency of bluffs for balance.\n\nAA on 987 is uncomfortable. We have 100% equity vs missed hands but are crushed by sets, two pairs (T9? not in BB\'s range typically), and straights (JT, J6, 65, T6 — JTs is heavy, 65s is in BB\'s peel, T6s rare). Folding AA is a leak — donks are also bluff-balanced, and BB\'s range cannot all be straights and sets.\n\nThe decision is between calling and raising. Raising 25% serves two purposes: (1) it punishes BB\'s draws and weak made hands that lead-and-fold — a substantial fraction of the equilibrium donk range — and (2) it preserves stack control if we get re-raised. A call is favored 70% because it keeps BB\'s bluffs in the range and lets us extract on safe turns (any non-T, non-J, non-6 brick) where BB cannot find another bluff. Calling also realizes more of our equity because BB\'s draws barrel turns we beat.\n\nMixed strategy here matters because being predictable lets BB exploit. A donk lead is a probabilistic signal; treat it as one. The critical concept is equity realization: even with AA, we don\'t maximize EV by always raising — we maximize EV by sometimes raising and sometimes calling, picking the action that fits the specific texture and our specific holding (As blocks heart-flush continuations).',
      concept_tags: ['mes', 'frequency_manipulation', 'equity_realization', 'spr', 'blockers', 'gto_baseline']
    }),
    H({
      id: 'h006',
      title: 'River blocker bluff — missed FD picks ace blocker',
      street: 'river',
      position: 'BTN',
      hole_cards: ['Ah', 'Td'],
      board: ['Kh', '9h', '5h', '2c', 'Qs'],
      pot: 60,
      stacks: 65,
      action_history: 'BTN opens, BB calls. Flop check, BTN bets 50%, BB calls. Turn check, BTN bets 60%, BB calls. River BB checks.',
      legal_actions: ['check', 'bet75', 'bet_pot', 'overbet'],
      gto_mix: { check: 0.40, bet75: 0.10, bet_pot: 0.20, overbet: 0.30 },
      theory_explanation: 'Two barrels on K9h-h-2c-Q runout into a checking BB river. BTN\'s range arrives polarized: nut flushes (Ah-X), sets, two pair, KQ for top-two, and a substantial bluffing population that needed to keep barreling on the heart-completion turn.\n\nThe river Q changes nothing for the flush, kills 9x, and adds QJ/JT-no-flush as some marginal made hands. BB\'s range arrived calling twice — capped at flushes (small fraction), straight Jacks/Tens that hit the Q, and trapped sets. BB\'s check on river is mostly a give-up indication: BB has limited value to check-raise with and many missed equity hands.\n\nAhTd is a textbook overbet bluff. Critical features:\n- The Ah blocks the nut flush. Half of the very top of BB\'s range (Ah-X) is removed from BB\'s combo count. BB cannot have AhKx, AhJx, AhTx as flushes.\n- T card has zero showdown value — we cannot win at showdown.\n- Overbet sizing punishes BB\'s capped range. BB called twice with two-pair-or-better; an overbet collapses BB\'s set/two-pair calling range because they are now bluff catchers facing a polarized barrel.\n\nWhy not always overbet? Because BTN must maintain balance. Overbetting always with all bluff candidates makes BTN exploitable to a check-raise (BB can polarize his check-call line to flushes and slow-played Qx). The 30% overbet frequency is not driven by AhTd specifically — AhTd is one of the ~10 best overbet candidates — but by the overall ratio of value combos to bluff combos that BTN has on this runout. Ah blocks villain\'s nut flushes and the Td unblocks villain\'s straights and pairs that fold.\n\nThis is the canonical river spot where blocker selection is everything. AcTd is a worse bluff (no flush blocker). AhJd is comparable but slightly worse because Jd unblocks fewer folds. The exact hand AhTd is near-optimal.',
      concept_tags: ['blockers', 'polarization', 'frequency_manipulation', 'ev', 'spr']
    }),
    H({
      id: 'h007',
      title: 'Check-raise bluff with combo draw — flop',
      street: 'flop',
      position: 'BB',
      hole_cards: ['8s', '7s'],
      board: ['9s', '6h', '2s'],
      pot: 6,
      stacks: 97,
      action_history: 'BTN opens 2.5bb, BB calls. BTN bets 2bb (33%).',
      legal_actions: ['fold', 'call', 'raise_small', 'raise_pot'],
      gto_mix: { fold: 0, call: 0.40, raise_small: 0.10, raise_pot: 0.50 },
      theory_explanation: '87s on 962ss is the dream check-raise hand. We have an open-ended straight draw (any 5 or T = 8 outs), a flush draw (9 outs), and 5/T overlap making this a 14-out monster. Pure equity vs even strong hands: ~55% vs an overpair; ~75% vs top pair.\n\nWhy is the equilibrium check-raise frequency so high (50%)? Because at the equilibrium, BB\'s check-raise range on this texture must contain enough bluff combinations to make BTN indifferent to over-folding to the check-raise. BB\'s natural value combos here are sets, two-pair, and pure made straights — a thin range. To balance, BB needs many semi-bluffs. 87s is the highest-equity semi-bluff possible: even when we get jammed on, we are flipping with a flush+straight draw. We cannot lose a stack on this card.\n\nSizing: the pot-raise is preferred over the small raise because we want to (a) maximize fold equity from one-pair hands that floated, (b) extract maximum chips from sets/two-pair that won\'t let go (we are still 35-50% vs them), and (c) build the pot to set up a profitable shove on most turns. A small raise is more about disguised value with mid-strength two-pair, not draws.\n\nA pure call (40%) is also valid — we can call once with the intent to barrel turns/rivers when we improve, and we keep BTN\'s bluff-catching range engaged for our future value. The mix preserves balance: BTN cannot exploit either line because BB has both at sufficient frequency.\n\nThe deep lesson: check-raise frequency is determined by your value range, not your draw quality. You must check-raise with 87s here precisely because you have strong made hands check-raising too, and 87s\'s equity makes it the cheapest bluff in your range to add.',
      concept_tags: ['mes', 'equity', 'frequency_manipulation', 'spr', 'gto_baseline']
    }),
    H({
      id: 'h008',
      title: 'Facing river overbet with bluff catcher',
      street: 'river',
      position: 'BB',
      hole_cards: ['Kc', 'Qd'],
      board: ['Qh', '7s', '5d', '3c', 'Jh'],
      pot: 40,
      stacks: 95,
      action_history: 'BTN opens, BB calls. Flop bet 33% called. Turn check-check. River BB checks, BTN bets 60 into 40 (1.5x pot overbet).',
      legal_actions: ['fold', 'call'],
      gto_mix: { fold: 0.55, call: 0.45 },
      theory_explanation: 'Top pair second-kicker faces a 1.5x-pot overbet. The math: pot odds demand 60 / (40 + 60 + 60) = 37.5% equity to break even. Our hand beats most of BTN\'s flush draws that bricked, beats all bluffs, loses to flushes on the river, two-pair, sets, and slow-played Qx better.\n\nThe key turn-check is highly informative. BTN\'s check on the turn signals a mostly capped range — KQ would have value-bet for two streets, AA/KK overpairs typically continue. Most overpair value is filtered out by the turn check. What\'s left in BTN\'s value range on this river: J7 (rare), 75s (rare), 53s (almost zero combos), QJs that turned a smaller two-pair, and the Jh-river-pickup of QJh. That\'s genuinely thin value.\n\nBluffs: BTN\'s hearts that missed, Jx that picked up showdown value (would prefer to check), and pure bluffs like A4s, A6s with backdoor equity that took the line of "check turn give up, river bluff at full polarization."\n\nKQ is an above-average bluff catcher because it blocks QJ (one of the few thin-value combos) and unblocks BTN\'s missed flush draws. With balance, the equilibrium calls just over MDF: pot odds demand ~37%, we call ~45% to slightly over-defend (we have showdown value, we benefit slightly from not over-folding to the rare overbet).\n\nThe deep concept: pot odds is a floor, not a target. Equity realization is not at issue here (river decision) but blocker effects matter — KQ blocks Q+ which is exactly the value range we want to block. A hand like K8 with the same showdown value but no blockers should fold more often. Always include blocker effects in your bluff-catching threshold.',
      concept_tags: ['pot_odds', 'mdf', 'blockers', 'polarization', 'condensed', 'gto_baseline']
    }),
    H({
      id: 'h009',
      title: 'Squeeze spot — SB cold 4bet bluff',
      street: 'preflop',
      position: 'SB',
      hole_cards: ['As', '5s'],
      board: [],
      pot: 14,
      stacks: 97.5,
      action_history: 'CO opens 2.3bb, BTN calls. SB acts.',
      legal_actions: ['fold', 'call', 'squeeze_12bb'],
      gto_mix: { fold: 0.55, call: 0.10, squeeze_12bb: 0.35 },
      theory_explanation: 'A5s in the SB facing CO open + BTN flat is a high-frequency squeeze candidate. Squeeze math: with a caller already in, the bettor is incentivized to fold the original raiser more often (the caller is a credibility signal of strong hand), and to fold the caller (whose range is condensed by definition).\n\nA5s passes every squeeze filter:\n- Ace blocker: reduces CO\'s 4-bet shoves and AA/KK in BTN\'s flat range (BTN almost never flats AA but KK/QQ matter). Roughly 16% combinatorial reduction in villain top pairs.\n- Suited: still has equity if called — A5s vs JJ is ~30%, vs AKo is 30% (live to a wheel/back-door flush). Not a death-trap.\n- Wheel-card: 5x makes wheel straights, post-flop playability vs a single caller is reasonable.\n- Out of position: critical to choose hands that bluff well rather than hands that play well postflop. A5s has more "raise or fold" character than "raise or call" character — exactly what we want OOP.\n\nWhy not always squeeze? Because over-squeezing makes us exploitable. CO and BTN can defend wider, 4-bet jam more, etc. The 35% mix is about the upper end of squeeze frequency — A5s is one of the very best squeeze hands; the others (A4s, A3s, KQs, KJs occasionally, plus JJ+ for value) round out the range.\n\nWhy 10% call? OOP cold-calls are rare and bad EV in nearly all cases; A5s with multi-way potential and post-flop SPR considerations gets a small call frequency for balance. Call with A5s about as often as you raise the room\'s eyebrow with an unusual flat.\n\nThe glossary point: squeezing is the canonical "frequency manipulation" preflop spot. Hand selection follows strict rules (Ax suited, KQs, QJs blockers; some mid pairs for value). Squeeze sizing must be large enough to fold out floats — typically 4x the open + 1x per caller.',
      concept_tags: ['blockers', 'frequency_manipulation', 'equity_realization', 'polarization', 'range']
    }),
    H({
      id: 'h010',
      title: 'Multi-street bluff — turn double-barrel pickup',
      street: 'turn',
      position: 'BTN',
      hole_cards: ['Jc', 'Tc'],
      board: ['8d', '6h', '3s', '9s'],
      pot: 14,
      stacks: 91,
      action_history: 'BTN opens, BB calls. Flop bet 33% called. Turn 9s.',
      legal_actions: ['check', 'bet50', 'bet75'],
      gto_mix: { check: 0.20, bet50: 0.45, bet75: 0.35 },
      theory_explanation: 'JTcc on 863-9 turn picked up an open-ended straight draw on the turn (any 7 or Q). Combined with backdoor club draw runners-runners, this is a double-barrel candidate at very high frequency.\n\nWhen the turn improves our equity into a strong drawing hand, equilibrium says: barrel. The reason is twofold. First, fold equity is high — BB\'s flop call range was small pairs, weak Tx, gutshots. The turn 9s does not significantly improve BB\'s range (it adds 9x for top pair but those are largely not in the flop call range), and it adds two-pair fears for hands like 76s.\n\nSecond, semi-bluffing maximizes EV: even when called, we have ~30% equity to improve to the nuts, and our range balance permits aggressive lines. JTcc is the type of hand that keeps barreling because (a) we cannot afford to give up — checking back with a draw concedes equity and lets BB realize equity for free, (b) we generate fold equity now and equity later, (c) when called and we hit, our hand is strongly disguised.\n\nSizing: 50-75% of pot, not overbet. The reason is SPR: we still want to leave river flexibility. A 75% turn bet sets up a near-pot river jam if we hit (extracting maximum value) or fold (preserving showdown value if we miss but BB is capped). An overbet would commit us; a smaller bet underpressures BB\'s middling pairs.\n\nWhy 20% check? Because some semi-bluffs need to slow down for balance — checking back gives us a free river card and protects our checking range from being too weak. The mixed strategy disguises our turn-bet range across many hand types.\n\nDeep concept: equity matters in semi-bluff EV computation. A pure-air bluff with 0 equity needs ~50% fold equity to break even on a half-pot bet. A 30%-equity semi-bluff needs only ~20% fold equity. The improved EV is why hands that pick up equity on the turn are systematically barreled at higher frequency than pure-air carryovers.',
      concept_tags: ['equity', 'frequency_manipulation', 'spr', 'implied_odds', 'ev']
    }),
    H({
      id: 'h011',
      title: 'Triple-barrel scare card — overbet-shove river',
      street: 'river',
      position: 'CO',
      hole_cards: ['Ad', 'Kc'],
      board: ['Qd', '8d', '4c', '7c', '5d'],
      pot: 80,
      stacks: 80,
      action_history: 'CO opens, BB calls. CO bets 33% flop, 60% turn, both called. River 5d completes 3 flushes.',
      legal_actions: ['check', 'bet50', 'shove_pot'],
      gto_mix: { check: 0.50, bet50: 0.10, shove_pot: 0.40 },
      theory_explanation: 'AKo with the Ad on a Q84-7-5 runout where the river completes the flush. We have nut-flush blocker.\n\nThis is one of the most studied river spots in modern theory. BB\'s flop+turn calling range is dominated by Qx, 8x, low pairs, and flush draws. The river 5d completes the front-door flush — every Xd hand wins. BB\'s range now bifurcates: flushes (some) and non-flush bluff catchers (most).\n\nCO\'s value range on this river: any made flush. CO opened with KdXd, AdQd, AdJd, AdTd, AdXd. After 2 streets of betting, the range is biased toward Ad-X flushes (the strongest combos that wanted to keep building pot). Bluffs need to be present to balance these value combos.\n\nThe Ad-K-no-flush is the perfect blocker bluff:\n- Ad blocks the very top of BB\'s flush range (BB cannot have Ad-Xd; the only flushes BB has are Kd-low or sub-K flushes).\n- Kc unblocks BB\'s missed pairs (KK is in BB\'s range and we don\'t block it... wait, K kicker blocks KK partially).\n- Zero showdown value: we lose to any pair.\n- The shove sizing punishes capped bluff catchers (Qx, 8x, sets) by polarizing maximum.\n\nWhy 50% check? Because the equilibrium also requires pure give-ups. Hands that completed equity but cannot bet (mid-pair turning into bluff catchers themselves) check. AKo with Ad nut blocker is borderline — it goes to showdown with king-high which can\'t win, so it must either bluff (high EV from FE) or check-fold. Check-folds 50% of the time because polarizing all blocker hands as bluffs unbalances the river bet.\n\nThe shove price: bet 80 into 80 = pot. BB needs 80/(80+80+80) = 33% equity to call. Against our polarized range (flushes + Ad-blocker bluffs), BB\'s bluff catchers have approximately 0% vs flushes and 100% vs bluffs. If our value:bluff is 2:1 and BB calls 50% of bluff catchers, the shove is +EV with the blocker. Without the Ad blocker, the shove EV plummets.',
      concept_tags: ['blockers', 'polarization', 'frequency_manipulation', 'ev', 'mes']
    }),
    H({
      id: 'h012',
      title: 'Limp-raise BB defense vs steal — wide blocker',
      street: 'preflop',
      position: 'BB',
      hole_cards: ['Kd', '9d'],
      board: [],
      pot: 3.5,
      stacks: 99,
      action_history: 'CO folds, BTN folds, SB limps 1bb. BB acts.',
      legal_actions: ['check', 'raise_3.5', 'raise_5'],
      gto_mix: { check: 0.55, 'raise_3.5': 0.30, raise_5: 0.15 },
      theory_explanation: 'SB limp into BB is a polarized signal in modern equilibrium: SB\'s limps are weak hands that don\'t want to face a 3-bet, plus rare slow-plays (AA-QQ). Most of SB\'s limp range is condensed bluff-catching trash.\n\nK9s in BB facing a limp is roughly 60% favorite vs a random hand. The decision is between checking (let SB realize their weak equity, see a flop heads-up) and raising for value/protection.\n\nWhy raise sometimes? Because letting SB see a free flop with their entire wide limping range concedes equity. By raising 30-45% of the time with K9s, we (a) extract value from SB\'s second-best hands that defend wide because of pot odds, (b) deny equity to SB\'s gappy connectors and weak Aces, (c) build a pot we can win postflop with our K-high range advantage.\n\nWhy 55% check? Two reasons: (1) postflop edge is large for BB with the closing position OOP-but-with-information advantage, so we don\'t need to bloat preflop, (2) raising too much from BB vs limp creates a face-up exploit where SB calls only with strong hands and folds the rest, neutralizing our raise EV.\n\nSizing: 3.5x is preferred for thinner value, 5x for stronger hands and pure air bluffs. K9s sits in the middle — mostly 3.5x for value extraction, occasionally 5x to balance our 5x bluffs.\n\nThis spot teaches the broader principle: actions that look exploitable in isolation (limping) compress your range and let the opponent attack. The defense is to raise with selectively wide value, balanced with bluffs, sized to extract — not to shut down.',
      concept_tags: ['range', 'polarization', 'condensed', 'ev', 'frequency_manipulation']
    }),
    H({
      id: 'h013',
      title: 'Set-mining call vs UTG open in position',
      street: 'preflop',
      position: 'BTN',
      hole_cards: ['5h', '5c'],
      board: [],
      pot: 4,
      stacks: 100,
      action_history: 'UTG opens 2.5bb, folds to BTN.',
      legal_actions: ['fold', 'call', 'threebet_8'],
      gto_mix: { fold: 0.10, call: 0.85, threebet_8: 0.05 },
      theory_explanation: '55 vs UTG open is the canonical set-mining hand. Implied odds drive the play: we hit a set ~12% of the time on the flop (8.5:1 against), and when we hit we typically extract a substantial portion of stacks. The math:\n\nDirect odds: needed equity to call 2bb into a 3.5bb pot is 36%. 55 has approximately 28% equity vs UTG\'s opening range — direct odds reject. But implied odds rescue: when we hit our set, we expect to extract ~10x our preflop call, occasionally more if villain has an overpair. Implied odds compute: if we win 8x our call when hitting (reasonable estimate accounting for missed extraction), then expected extraction is 0.12 * 8 * 2 = 1.92bb on top of direct equity. Combined: profitable call.\n\nWhy not 3-bet? UTG\'s opening range is tight — flopped sets are crushed by strong overpairs that we can stack-off vs, but 3-betting 55 gets us either a fold (small win) or facing a 4-bet that we must fold to. We capture more EV by calling and seeing flops where set-extraction is monetized.\n\nWhy 5% 3-bet? Pure balance. 3-betting only with QQ+/AK is exploitable — UTG can fold to 3-bets profitably. We need a few "advertise" 3-bets with hands like 55 (or A5s, suited connectors) that have postflop playability when called. The 5% frequency is roughly aligned with the bluff-frequency our value 3-bets demand.\n\nThe deeper lesson: implied odds work against weak/unknown opponents better than against strong ones. Strong opponents read flopped sets and pay less; we should weight implied odds by opponent skill. Against an unknown UTG raiser at GTO baseline, set-mining 55 is correct ~85% of the time.',
      concept_tags: ['implied_odds', 'pot_odds', 'equity', 'spr', 'gto_baseline']
    }),
    H({
      id: 'h014',
      title: 'Check-raise turn for protection — vulnerable two-pair',
      street: 'turn',
      position: 'BB',
      hole_cards: ['Td', '9d'],
      board: ['Th', '9s', '4c', 'Jh'],
      pot: 18,
      stacks: 88,
      action_history: 'BTN opens, BB calls. Flop check-call 33% bet. Turn Jh.',
      legal_actions: ['check', 'lead_50', 'check_raise_in_response'],
      gto_mix: { check: 0.85, lead_50: 0.15 },
      theory_explanation: 'T9s on T9-4-J. We have second pair top kicker—wait, we actually have top-and-second pair (TT-99-44 lower pairs hit one of our cards). Actually T9 on T94J = top two-pair from the flop now slightly devalued by the J overcard which makes JT/AJ/QJ better, plus brings straight-completion (KQ, Q8 had a gutshot, now any K-Q/8 plays). We are still the best two-pair here but very vulnerable.\n\nThis spot illustrates protection vs face-up signal. A check-raise after BTN bets the turn is the classic protection move: get pot built before draws/over-pairs realize equity. But check-raising T9 here turns our hand face up — BTN\'s range responds with a tight 4-bet (sets, JT, KQ) and our action becomes -EV.\n\nThe equilibrium prefers check-call (85%): T9 has enough showdown value to bluff catch a single bet on most rivers, and check-call lets BTN\'s bluff range fire turn at higher frequency than they would after a check-raise. 15% lead (donk) for thin value+protection mixing — the lead is sized 50% pot to fold out hands like J8/J7 weak Jx that beat us.\n\nWhy not lead more? Because BB does not lead the turn at high frequency in modern theory — the lead range is concentrated at top of range (slow-played sets, and a small bluff frequency). T9 at the top of BB\'s flop calling range is one of the better lead candidates but still under 20%.\n\nDeep concept: protection bets are valuable when (a) the opponent\'s range contains many drawing hands that might fold or freeroll, and (b) your hand is strong enough that the protection equity outweighs the loss of pot control. T9 is a borderline case — strong but vulnerable. The MES blends actions to keep BTN\'s range engaged and prevent face-up exploitation.',
      concept_tags: ['mes', 'equity_realization', 'spr', 'frequency_manipulation', 'gto_baseline']
    }),
    H({
      id: 'h015',
      title: 'Floating IP with backdoor equity — flop',
      street: 'flop',
      position: 'BTN',
      hole_cards: ['Qc', 'Tc'],
      board: ['9h', '7h', '2d'],
      pot: 6,
      stacks: 97,
      action_history: 'BTN opens, BB calls. BB checks, BTN bets 2bb (33%), BB raises to 8bb.',
      legal_actions: ['fold', 'call', 'reraise_22'],
      gto_mix: { fold: 0.25, call: 0.70, reraise_22: 0.05 },
      theory_explanation: 'QTcc on 972hh-flop facing a check-raise. We have a gutshot (any J = 4 outs) and two over-broadway cards. No flush draw (board is hearts; we are clubs).\n\nMDF for facing a 4x raise (8bb into 8bb pot total): we need to call ~2 to win 16, requiring 33% equity. QTcc vs villain\'s check-raise range (sets, two-pair, straight made, plus draws — open-ended, flush draws) has roughly 32-35% equity. Marginal call.\n\nWhy 70% call? Backdoor equity. QTcc has backdoor straight draws (J turn opens 4 outs, K turn opens 8 outs to a Broadway wheel), backdoor club flush, backdoor pair-equity (any Q or T overpair). These backdoor improvements add ~6% to our realized equity over the rest of the hand. Combined with our position (we close action, can check back turns when we miss), QTcc is a profitable peel.\n\nWhy 25% fold? Because our range needs to fold something to BB\'s check-raise — folding the absolute weakest peels (offsuit gappers, no-equity overcards) lets us defend the rest more aggressively. QTcc is at the boundary of the fold/call decision; the 25% fold reflects that a quarter of our QTcc combos are folded to remove a face-up equity-realization signal.\n\nWhy 5% reraise? Pure balance. Our reraise range is set + nut FD value plus a small bluff frequency including QTcc-type hands with backdoor equity. The reraise sizing is about 22bb (3x the check-raise) to set up SPR commitment.\n\nThe lesson: facing a check-raise is one of the highest-leverage GTO decisions in NLHE. Every call must clear a high MDF bar; folds must protect the value-bet range from being capped; reraises must include the right blocker bluffs. Backdoor equity is the often-underrated tiebreaker that pushes marginal calls into +EV.',
      concept_tags: ['mdf', 'pot_odds', 'implied_odds', 'equity', 'frequency_manipulation', 'spr']
    }),
    H({
      id: 'h016',
      title: 'Cooler avoidance — middle set vs paired board',
      street: 'turn',
      position: 'CO',
      hole_cards: ['7h', '7c'],
      board: ['Kd', '7s', '3h', 'Kh'],
      pot: 14,
      stacks: 91,
      action_history: 'CO opens, BB calls. Flop check, CO bets 33%, BB calls. Turn Kh.',
      legal_actions: ['check', 'bet33', 'bet75'],
      gto_mix: { check: 0.40, bet33: 0.45, bet75: 0.15 },
      theory_explanation: 'Bottom set on K73-K turn. We are massively ahead of all non-K-x-better hands (2 pair, KQ-, 33 lower set), but a K on the turn is the catastrophe card — any Kx in BB\'s range that called the flop now has trips or better, and we are crushed.\n\nThe paired-K turn is what GTO calls a "range-shifting" card: it shifts CO\'s effective value range (we lose top-pair equity, retain set), and reverses the equity advantage if BB has any K. BB\'s flop call range with K is Kx with low kicker (K8s-K2s, paid the 33% c-bet), maybe K-T+ slow-played.\n\nThe 45% small-bet frequency is for thin value extraction from middle-strength hands (33 lower set still dominated us, AA/QQ/JJ overpairs that are now drawing thin, 7x worse-trip-chances). The small bet keeps the pot small enough that we can fold to a check-raise without massive damage.\n\nThe 40% check is critical. Bottom set on a paired board is a check candidate because: (1) we induce bluffs from BB\'s missed flush draws, broadway air, and Ace-high floats, (2) we control the pot when behind a slow-played K, (3) we plan to check-call river on most cards — bluff catchers benefit from passive lines.\n\nThe 15% larger bet is for hands that strongly want to build pot (sets vs 2-pair-BB-doesn\'t-believe-our-K-rep) and bluffs that want to polarize. 77 sits in the value pool that occasionally bets large because BB cannot have many full houses (KK is rare, 33 has one combo, K3 unlikely).\n\nDeep concept: cooler avoidance and pot control. With sets, your equity is highest preflop and degrades as more cards come. Aggressive pot-building with sets is correct on dry boards (flush draws that fold get punished); on coordinated or paired boards, sets transition to pot-control mode. Recognize when your nut hand just got filtered — and play accordingly.',
      concept_tags: ['mes', 'spr', 'equity_realization', 'gto_baseline']
    }),
    H({
      id: 'h017',
      title: 'Stab with showdown value — flop check-back vs check',
      street: 'flop',
      position: 'BTN',
      hole_cards: ['Ah', '7h'],
      board: ['Tc', '8h', '5h', '_', '_'],
      pot: 6,
      stacks: 97,
      action_history: 'BTN opens, BB calls. BB checks. BTN acts.',
      legal_actions: ['check', 'bet33', 'bet75'],
      gto_mix: { check: 0.55, bet33: 0.35, bet75: 0.10 },
      theory_explanation: 'Ace-high with the nut flush draw on T85hh. This is one of the most studied "should I bet big or small or check" spots.\n\nA7hh has roughly 35% equity vs BB\'s flop calling range — 9 outs to nut flush, 3 Ace overcards, 6 outs to backdoor straight draws (any 9, 7, 6). It is a strong semi-bluff but not a value bet (we cannot get called by worse made hands).\n\nWhy 55% check? Two reasons: (1) Equity realization — a check-back lets us see two free cards (turn + river card unless BB leads), realizing our 35% equity with no pot risk. The flush draw is so live that we don\'t need fold equity to print money. (2) Range balance — BTN must check back some semi-bluffs to protect his check-back range from being too weak. If BTN c-bets every flush draw, BB can over-attack the check-back range with bluffs.\n\nWhy 35% small bet? Because A7hh blocks BB\'s nut flush draws (we have the Ah, BB cannot have AhXh as the nut), reducing BB\'s strong draw combos. With this blocker advantage, the small bet has higher fold equity. The small size keeps the pot manageable when called and we miss the turn.\n\nWhy 10% large bet? Polarization mixing. Some semi-bluffs go large to maximize fold equity; A7hh is occasionally one of them, especially when balanced with sets and two-pair value bets that also size up.\n\nDeep concept: with strong draws, betting and checking are both defensible — the equilibrium uses both at calculated frequencies to keep the opponent indifferent. The hand-specific choice depends on (a) blocker effects (Ah blocks villain\'s nut flush — push toward bet), (b) implied odds (deep stacks reward calling — push toward check), (c) range balance (need to keep check-back range strong enough — push toward check more often than your gut says).',
      concept_tags: ['blockers', 'equity_realization', 'mes', 'implied_odds', 'frequency_manipulation']
    }),
    H({
      id: 'h018',
      title: 'River value bet sizing — thin top pair good kicker',
      street: 'river',
      position: 'CO',
      hole_cards: ['Ac', 'Qd'],
      board: ['Qh', '8s', '3d', '7c', '2c'],
      pot: 25,
      stacks: 80,
      action_history: 'CO opens, BB calls. Flop bet 50% called. Turn check-check. River BB checks.',
      legal_actions: ['check', 'bet33', 'bet50', 'bet75'],
      gto_mix: { check: 0.30, bet33: 0.40, bet50: 0.20, bet75: 0.10 },
      theory_explanation: 'AQo with top pair top kicker on Q-83-7-2 brick runout where BB checked twice (flop call, turn check, river check). BB\'s range is now condensed to medium pairs, weak Qx, busted draws, and missed Aces.\n\nValue-bet sizing for top pair on a dry runout follows two rules: (1) bet small enough to extract from the widest portion of villain\'s call range, (2) avoid sizing that turns your hand face-up.\n\n33% pot (8 into 25) is the high-frequency size because it: (a) extracts thin value from 99-66 underpairs that will reluctantly call 1/3, (b) extracts from missed broadway pickup pairs (J7s, T9s if defended), (c) maintains balance with our small-betting bluffs (busted backdoor flush draws polarized to occasional small stabs), (d) keeps the pot manageable — we are still vulnerable to a check-raise from a slow-played Qx better.\n\n50% pot extraction is reserved for stronger value (KK+ overpairs, Qx top-pair-better-kicker), and 75% for the rare polarized line (sets, two-pair). AQo is just below KK+ in value, so it gets 50% sometimes but mostly 33%.\n\n30% check is critical. The turn check-check signals weak ranges from both sides. Always-betting AQo on the river makes our check-back range too weak. By checking AQo 30%, we keep our check-back range strong enough that BB cannot freely turn his bluff catchers into bluff-and-river-bet. The check also induces bluffs from BB\'s busted draws on safe rivers like the 2c.\n\nDeep concept: thin value on the river is a sizing problem more than a frequency problem. The right small bet wins ~3bb against 6-8bb of villain\'s calling range; an oversized bet wins the same combos but loses bluff catchers entirely. The equilibrium picks the size that maximizes EV across villain\'s entire call distribution — almost always small on capped-villain rivers.',
      concept_tags: ['polarization', 'condensed', 'mes', 'spr', 'ev']
    }),
    H({
      id: 'h019',
      title: 'Check-call with overpair — ace high flop',
      street: 'flop',
      position: 'BTN',
      hole_cards: ['Qs', 'Qh'],
      board: ['Ac', '7d', '2h'],
      pot: 6,
      stacks: 97,
      action_history: 'BTN opens, BB calls. BB checks. BTN bets 33%, BB check-raises 8bb.',
      legal_actions: ['fold', 'call', 'reraise_22'],
      gto_mix: { fold: 0.40, call: 0.55, reraise_22: 0.05 },
      theory_explanation: 'QQ on A72r facing a flop check-raise. The Ace is the worst-possible flop card for QQ. BB\'s check-raise range is concentrated in Ax (especially A2s, A7s for two-pair, mid-Ax bluffs), 22 sets, 77 sets, and a few designed bluffs (gutshot air with backdoor equity).\n\nThe MDF math: facing a 4x check-raise, we need ~30% equity to call. QQ vs BB\'s check-raise range has roughly 28-32% equity (very close, depends on BB\'s exact construction). Borderline.\n\nWhy 40% fold? Because our overpair-no-Ace is dominated. AA-7x has us crushed. We are flipping at best vs Ax; we are dead vs sets. Most importantly, even when we are ahead, we have only 2 outs to improve — we will fold turn to a near-pot bet a high fraction of the time, realizing little equity. The fold protects our calling range from being too weak.\n\nWhy 55% call? Because we have to defend something — folding 100% would let BB exploit by check-raising every flop in this spot. The 55% call is concentrated in the QQ combos with the right cards — Qx with backdoor club draws, Qx with no overlap with BB\'s natural blocker hands.\n\nWhy 5% reraise? Balance. If we never reraise, our reraise range is too tight (sets only) and BB can exploit by check-raise-folding wider. A small bluff-3bet with QQ creates the impression that we have AA/sets in our reraise range.\n\nThis is a textbook spot for understanding frequency-based folding. Without face-up reads, the equilibrium does not call every overpair to a check-raise — even strong holdings get folded for range protection. The lesson: defending your range is more important than defending any individual hand.',
      concept_tags: ['mdf', 'equity_realization', 'frequency_manipulation', 'spr', 'gto_baseline']
    }),
    H({
      id: 'h020',
      title: 'Squeeze defense — calling a 3bet OOP with broadway',
      street: 'preflop',
      position: 'CO',
      hole_cards: ['Ad', 'Js'],
      board: [],
      pot: 13.5,
      stacks: 91,
      action_history: 'CO opens 2.5bb, BTN calls, SB squeezes to 11bb, BB folds.',
      legal_actions: ['fold', 'call', 'fourbet_28'],
      gto_mix: { fold: 0.45, call: 0.35, fourbet_28: 0.20 },
      theory_explanation: 'AJo facing a SB squeeze with BTN still in. AJo is a hand that performs poorly multi-way (loses to AQ+/KK+ heads-up, dominated by AK/AQ/JJ in 3-way pots) but performs okay in heads-up situations vs a wide squeezer.\n\nThe equilibrium balances three actions:\n\n45% fold: AJo is dominated by SB\'s value 4bet range (KK+, AKs, mostly). When we play, we are typically flipping or behind. Folding is correct against tight squeezers. Note: SB\'s 11bb squeeze is small (about 4x the open + 1x for caller); a larger squeeze (5x+) would push more folds.\n\n35% call: keep BTN in (multi-way), realize equity in position vs SB. With SPR around 8 postflop, AJo can flop top pair and play smallish pots for value.\n\n20% 4bet: AJo as a leveraged 4bet bluff has the Ace blocker. Value 4bets are concentrated in QQ+/AKs; bluff 4bets need to balance the value range. AJo (or AQo, AsXs) are the natural blocker bluffs — they reduce SB\'s value-shoving combos and pressure his bluffs to fold.\n\nNote BTN\'s presence: with a caller behind, our fold equity on a 4bet is slightly reduced because BTN can also have a strong hand. This pushes the call frequency up vs the headsup-vs-squeezer benchmark.\n\nDeep concept: facing a squeeze is asymmetric — the squeezer\'s range is very wide (lots of bluffs by construction), but we are constrained by the caller behind us. Defending requires picking our spots: hands like AKo/AQs that play well multi-way and have 4bet equity; reducing the cold-call range to suited-broadway and pairs that have implied odds; folding hands that are dominated and lack blocker value.',
      concept_tags: ['blockers', 'frequency_manipulation', 'equity', 'implied_odds', 'mes']
    }),
    H({
      id: 'h021',
      title: 'Probe bet turn — out of position with capped villain',
      street: 'turn',
      position: 'BB',
      hole_cards: ['9c', '9h'],
      board: ['Ks', '7d', '4c', '6s'],
      pot: 12,
      stacks: 92,
      action_history: 'BTN opens, BB calls. BB checks, BTN checks. Turn 6s.',
      legal_actions: ['check', 'bet33', 'bet50'],
      gto_mix: { check: 0.45, bet33: 0.40, bet50: 0.15 },
      theory_explanation: '99 on K74-6 turn after BTN checked back the flop. The flop check-back is highly informative: BTN\'s c-bet range is dense on K-high boards — checking back signals capped (no Kx, very few overpairs). BTN\'s remaining range is small/medium pairs, broadway air, and some set traps that are rare.\n\nWith 99, we are ahead of most of BTN\'s capped range. The probe-bet (donk) on the turn is the equilibrium response: we exploit BTN\'s range cap by leading. Sizing 33% extracts value from BTN\'s 88-66 underpairs and gutshot floats while building toward a profitable river decision.\n\nThe critical concept: when villain telegraphs a capped range (by checking back when their c-bet range would normally be wide), the OOP player should attack with both value and bluffs. 99 is value here. Turn probes also include hands like 8x-with-straight-draw (semi-bluffs) and various Ace-high air bluffs balanced for frequency.\n\n45% check is for reasons of pot control and range protection — BB\'s probe range cannot be all of his strong made hands or BTN can fold his bluff catchers profitably. 99 sits at the value boundary of the probe range; checking sometimes keeps the range balanced.\n\nDeep concept: capped-villain attack is one of the highest-EV spots in NLHE. Recognizing the cap (pre-betting checks, certain river patterns, etc.) and responding with the right polarized aggression converts theoretical knowledge into chip EV. Probe bet sizing is small on dry boards, larger on coordinated boards where draws need to be priced out.',
      concept_tags: ['range', 'condensed', 'polarization', 'frequency_manipulation', 'gto_baseline']
    }),
    H({
      id: 'h022',
      title: 'Limped pot multiway — BB checks straight draw',
      street: 'flop',
      position: 'BB',
      hole_cards: ['6h', '5h'],
      board: ['8c', '7d', '2s'],
      pot: 4,
      stacks: 99,
      action_history: 'CO limps, BTN limps, SB folds. BB checks. Flop comes 8c 7d 2s. SB folded preflop. 3 players.',
      legal_actions: ['check', 'bet33', 'bet75'],
      gto_mix: { check: 0.65, bet33: 0.30, bet75: 0.05 },
      theory_explanation: '65hh on 872 in a multiway limped pot. We have an open-ended straight draw (4-9 = 8 outs) plus a backdoor flush. Roughly 35% equity vs two random hands.\n\nMultiway pots compress equity — even strong hands like sets gain less from aggression because more players see flops and chase draws. Bet frequencies drop across the board.\n\n65% check is the highest-EV line because: (a) we want to realize equity passively when 2 villains are in (one of them might bluff for us), (b) leading for value with 6-high is impossible — we have no made hand, only equity, (c) a bet folds out the worst hands but isolates us against the strong hands, reducing implied odds.\n\n30% small lead serves as a semi-bluff for protection — we deny equity to overcards (any Ace, K, Q, J that has overcard equity vs our 6-high) and build the pot when we hit. The small size limits the cost of being raised. In multiway limped pots, the donk-lead frequency is concentrated in semi-bluffs and thin value (top pair top kicker mostly).\n\nWhy 5% large bet? Polarized rare betting includes flopped sets (very rare in this 6-high range) and pure-air bluffs with strong blocker properties. 65hh is borderline — the larger bet sometimes punishes the multiway field by forcing folds from overcards.\n\nDeep concept: multiway pots invert single-raised-pot logic. Equities compress, bet frequencies drop, and the value of position increases dramatically because more players means more decision points. With strong draws like 65hh, prefer passive lines that maximize equity realization. The aggressive line is correct only when blocker effects or board texture demand it.',
      concept_tags: ['equity', 'equity_realization', 'implied_odds', 'mes', 'frequency_manipulation']
    })
  ];

  function getHand(id) { return HANDS.find(h => h.id === id) || null; }
  function listHands() { return HANDS.slice(); }
  function getGlossaryTerm(id) { return GLOSSARY.find(g => g.id === id) || null; }
  function listGlossary() { return GLOSSARY.slice(); }

  window.GTOData = window.GTOData || {};
  window.GTOData.HANDS = HANDS;
  window.GTOData.GLOSSARY = GLOSSARY;
  window.GTOData.getHand = getHand;
  window.GTOData.listHands = listHands;
  window.GTOData.getGlossaryTerm = getGlossaryTerm;
  window.GTOData.listGlossary = listGlossary;
})();
