// src/tournament/presets.js — three seeded tournament presets (IP1 + IP11).
// Numeric values from research/probes/probe-001-tournament-presets-and-scoring/findings.json:
//   - Friendly Turbo:     C.5 (turbo home-game / online-turbo conventions)
//   - Standard Home Game: C.6 (recreational live-home recommendations)
//   - WSOP-Style Deep Stack: C.1, C.2 (WSOP official blind structure + big-blind-ante format)
//
// Rule corpus: TDA 2024 (C.3, C.4) — applies to in-engine action order, dead-button
// handling, all-in protection. The chosen action-clock seconds per preset come from
// Researcher findings (C.5 Friendly Turbo 15s; C.6 Standard 30s; C.1 WSOP 45s).

export const TOURNAMENT_PRESETS = [
  {
    id: "preset-friendly-turbo",
    display_name: "Friendly Turbo",
    description: "Fast-paced 7-minute levels for a quick session. Big-blind only (no antes) until late.",
    starting_stack_chips: 1500,
    level_duration_minutes: 7,
    action_clock_seconds: 15,
    break_after_levels: 6,
    break_duration_minutes: 5,
    levels: [
      { level: 1,  small_blind: 10,   big_blind: 20,   big_blind_ante: 0 },
      { level: 2,  small_blind: 15,   big_blind: 30,   big_blind_ante: 0 },
      { level: 3,  small_blind: 25,   big_blind: 50,   big_blind_ante: 0 },
      { level: 4,  small_blind: 50,   big_blind: 100,  big_blind_ante: 0 },
      { level: 5,  small_blind: 75,   big_blind: 150,  big_blind_ante: 0 },
      { level: 6,  small_blind: 100,  big_blind: 200,  big_blind_ante: 200 },
      { level: 7,  small_blind: 150,  big_blind: 300,  big_blind_ante: 300 },
      { level: 8,  small_blind: 200,  big_blind: 400,  big_blind_ante: 400 },
      { level: 9,  small_blind: 300,  big_blind: 600,  big_blind_ante: 600 },
      { level: 10, small_blind: 500,  big_blind: 1000, big_blind_ante: 1000 },
      { level: 11, small_blind: 750,  big_blind: 1500, big_blind_ante: 1500 },
      { level: 12, small_blind: 1000, big_blind: 2000, big_blind_ante: 2000 }
    ]
  },
  {
    id: "preset-standard-home-game",
    display_name: "Standard Home Game",
    description: "20-minute levels, balanced pace. Antes introduced at level 5 (TDA big-blind-ante format).",
    starting_stack_chips: 10000,
    level_duration_minutes: 20,
    action_clock_seconds: 30,
    break_after_levels: 5,
    break_duration_minutes: 10,
    levels: [
      { level: 1,  small_blind: 50,    big_blind: 100,   big_blind_ante: 0 },
      { level: 2,  small_blind: 75,    big_blind: 150,   big_blind_ante: 0 },
      { level: 3,  small_blind: 100,   big_blind: 200,   big_blind_ante: 0 },
      { level: 4,  small_blind: 150,   big_blind: 300,   big_blind_ante: 0 },
      { level: 5,  small_blind: 200,   big_blind: 400,   big_blind_ante: 400 },
      { level: 6,  small_blind: 300,   big_blind: 600,   big_blind_ante: 600 },
      { level: 7,  small_blind: 400,   big_blind: 800,   big_blind_ante: 800 },
      { level: 8,  small_blind: 500,   big_blind: 1000,  big_blind_ante: 1000 },
      { level: 9,  small_blind: 700,   big_blind: 1500,  big_blind_ante: 1500 },
      { level: 10, small_blind: 1000,  big_blind: 2000,  big_blind_ante: 2000 },
      { level: 11, small_blind: 1500,  big_blind: 3000,  big_blind_ante: 3000 },
      { level: 12, small_blind: 2000,  big_blind: 4000,  big_blind_ante: 4000 }
    ]
  },
  {
    id: "preset-wsop-deep-stack",
    display_name: "WSOP-Style Deep Stack",
    description: "30-minute levels, 60K starting stack, WSOP-style blind progression with big-blind ante from L1.",
    starting_stack_chips: 60000,
    level_duration_minutes: 30,
    action_clock_seconds: 45,
    break_after_levels: 4,
    break_duration_minutes: 15,
    levels: [
      { level: 1,  small_blind: 100,    big_blind: 200,    big_blind_ante: 200 },
      { level: 2,  small_blind: 100,    big_blind: 300,    big_blind_ante: 300 },
      { level: 3,  small_blind: 200,    big_blind: 400,    big_blind_ante: 400 },
      { level: 4,  small_blind: 300,    big_blind: 500,    big_blind_ante: 500 },
      { level: 5,  small_blind: 300,    big_blind: 600,    big_blind_ante: 600 },
      { level: 6,  small_blind: 400,    big_blind: 800,    big_blind_ante: 800 },
      { level: 7,  small_blind: 500,    big_blind: 1000,   big_blind_ante: 1000 },
      { level: 8,  small_blind: 600,    big_blind: 1200,   big_blind_ante: 1200 },
      { level: 9,  small_blind: 800,    big_blind: 1600,   big_blind_ante: 1600 },
      { level: 10, small_blind: 1000,   big_blind: 2000,   big_blind_ante: 2000 },
      { level: 11, small_blind: 1500,   big_blind: 3000,   big_blind_ante: 3000 },
      { level: 12, small_blind: 2000,   big_blind: 4000,   big_blind_ante: 4000 }
    ]
  }
];

export function getPresetById(id) {
  return TOURNAMENT_PRESETS.find(p => p.id === id) || null;
}

export function presetDisplayNames() {
  return TOURNAMENT_PRESETS.map(p => p.display_name);
}
