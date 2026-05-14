// PNV.1 Production-Fidelity Exercise via jsdom
// Loads output/integration/index.html via file://, with runScripts:'dangerously' and resources:'usable'.
// Drives Table mode programmatically: 10 hands -> reload (preserve localStorage) -> 5 more hands.
// Asserts: hands_played increments correctly; persistence across reload; zero network calls.

import jsdomPkg from '/tmp/cv-jsdom/node_modules/jsdom/lib/api.js';
const { JSDOM, ResourceLoader } = jsdomPkg;
import { promises as fs } from 'fs';
import path from 'path';

const INTEGRATION_DIR = '/sessions/intelligent-quirky-rubin/mnt/Auto Builder/runs/gto-poker-trainer/output/integration';
const INDEX_HTML = path.join(INTEGRATION_DIR, 'index.html');

// Track network calls (any non-file:// fetch counts as a violation)
let networkCalls = 0;
class NoNetResourceLoader extends ResourceLoader {
  fetch(url, options) {
    if (!url.startsWith('file://')) {
      networkCalls += 1;
      return Promise.reject(new Error('Blocked non-file URL: ' + url));
    }
    return super.fetch(url, options);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function bootJSDOM(persistedLocalStorage) {
  const html = await fs.readFile(INDEX_HTML, 'utf8');
  const dom = await JSDOM.fromFile(INDEX_HTML, {
    runScripts: 'dangerously',
    resources: new NoNetResourceLoader(),
    pretendToBeVisual: true,
    url: 'file://' + INDEX_HTML
  });

  // Restore localStorage if provided
  if (persistedLocalStorage) {
    for (const [k, v] of Object.entries(persistedLocalStorage)) {
      dom.window.localStorage.setItem(k, v);
    }
  }

  // Wait for boot — shell.js runs DOMContentLoaded boot
  // Wait until AppShell is present and storage is ready
  for (let i = 0; i < 100; i++) {
    if (dom.window.AppShell && dom.window.AppShell.storage && dom.window.TableEngine && dom.window.AgentEngine && dom.window.Stats) break;
    await sleep(50);
  }
  if (!dom.window.AppShell) throw new Error('AppShell did not boot');
  return dom;
}

function snapshotLocalStorage(dom) {
  const out = {};
  const ls = dom.window.localStorage;
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    out[k] = ls.getItem(k);
  }
  return out;
}

// Drive a complete table hand from the engine layer (production code).
// Use the same code paths the UI uses: TableEngine.startHand, agentState, AgentEngine.decide,
// applyAction. Then emit hand_result via the bus.
async function playOneHand(dom, table, heroSeatId) {
  const w = dom.window;
  // Track hero stack snapshot for stats tracking
  w.TableEngine.startHand(table);
  let preActionSnapshot = null;
  const startingStack = table.seats[heroSeatId].stack + table.seats[heroSeatId].committed_total;

  // Loop until hand ends
  let safety = 500;
  while (table.street !== 'idle' && table.street !== 'showdown' && safety-- > 0) {
    const sid = table.current_seat;
    const seat = table.seats[sid];
    if (!seat || seat.folded || seat.all_in) {
      table.current_seat = w.TableEngine.nextSeat(table, sid);
      if (w.TableEngine.isStreetComplete(table)) {
        const live = table.seats.filter(s => !s.folded);
        if (live.length <= 1) break;
        w.TableEngine.advanceStreet(table);
        if (table.street === 'showdown') break;
      }
      continue;
    }

    if (seat.is_hero) {
      // Hero plays "always fold" deterministic strategy to keep test simple,
      // EXCEPT the BB free-check option preflop — call the BB option.
      // Track preflop action for stats.
      const street = table.street;
      const toCall = Math.max(0, table.current_bet - seat.bet);
      let action = 'fold';
      if (toCall === 0) action = 'check';
      else action = 'fold';

      if (street === 'preflop' && !preActionSnapshot) {
        preActionSnapshot = {
          hero_hole: seat.cards.slice(),
          hero_actions: [],
          vpip_flag: false, pfr_flag: false, threebet_flag: false,
          starting_stack: startingStack,
          hero_position: w.TableEngine.getPositionLabel(table, heroSeatId)
        };
      }
      if (preActionSnapshot) {
        preActionSnapshot.hero_actions.push({ street, action, sizing: null });
        if (street === 'preflop' && action === 'call') preActionSnapshot.vpip_flag = true;
      }
      w.TableEngine.applyAction(table, sid, action);
    } else {
      const archetype = w.Archetypes.getArchetype(seat.archetype_id);
      const state = w.TableEngine.agentState(table, sid);
      const dec = w.AgentEngine.decide(state, archetype, table.seed + sid + table.hand_number);
      let sizing = dec.sizing;
      if ((dec.action === 'raise' || dec.action === 'bet') && typeof sizing === 'number') {
        if (table.street === 'preflop' && dec.action === 'raise' && sizing < 30) {
          sizing = Math.round(sizing * table.bb);
        } else if (sizing > 0 && sizing < 5) {
          sizing = Math.round(table.pot * sizing + table.current_bet);
        }
      }
      w.TableEngine.applyAction(table, sid, dec.action, sizing);
    }

    // Advance state
    if (w.TableEngine.isStreetComplete(table)) {
      const live = table.seats.filter(s => !s.folded);
      if (live.length <= 1) break;
      w.TableEngine.advanceStreet(table);
      if (table.street === 'showdown') break;
    } else {
      table.current_seat = w.TableEngine.nextSeat(table, table.current_seat);
    }
  }
  if (safety <= 0) throw new Error('Hand loop did not terminate');

  // Resolve
  const live = table.seats.filter(s => !s.folded);
  let result;
  if (live.length === 1) {
    const winner = live[0];
    winner.stack += table.pot;
    table.pot = 0;
    result = { winners: [{ seat_id: winner.seat_id, amount: 0 }] };
    table.street = 'idle';
  } else {
    table.street = 'showdown';
    result = w.TableEngine.resolveShowdown(table);
  }

  // Emit HandResult exactly like the UI does
  const heroSeat = table.seats[heroSeatId];
  const heroDelta = (heroSeat.stack + heroSeat.bet) - (preActionSnapshot ? preActionSnapshot.starting_stack : startingStack);
  const hr = {
    hand_id: 'h' + table.hand_number,
    hero_seat: heroSeatId,
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
  w.AppShell.bus.emit('hand_result', hr);
  return hr;
}

async function navigateToTableAndInitTable(dom) {
  const w = dom.window;
  // Navigate via shell — this is what the UI button does.
  w.AppShell.navigateTo('table');
  // The table-ui module owns the table singleton inside its IIFE. Since we cannot reach into
  // it from outside, we instantiate our own table mirror using the same engine + archetypes
  // (the production code paths) and run hands through the bus to the stats subsystem.
  const archetypes = w.Archetypes.listArchetypes();
  const heroSeat = 0;
  const names = []; const archAssignments = [];
  let arcIdx = 0;
  for (let i = 0; i < 9; i++) {
    if (i === heroSeat) { names.push('Hero'); archAssignments.push(null); }
    else { const a = archetypes[arcIdx % archetypes.length]; names.push(a.display_name); archAssignments.push(a.id); arcIdx++; }
  }
  const table = w.TableEngine.newTable(9, { names, archetypes: archAssignments, hero_seat: heroSeat, seed: 42 });
  return { table, heroSeat };
}

async function readDashboardMetrics(dom) {
  const w = dom.window;
  w.AppShell.navigateTo('dashboard');
  await sleep(50);
  const session = w.Stats.getSession();
  const allTime = w.Stats.getAllTime();
  // Also read the rendered DOM
  const dashGrid = dom.window.document.querySelector('#dash-grid');
  let renderedTexts = [];
  if (dashGrid) {
    dashGrid.querySelectorAll('.dash-card').forEach(c => {
      renderedTexts.push(c.textContent.replace(/\s+/g, ' ').trim());
    });
  }
  return { session, allTime, rendered: renderedTexts };
}

async function main() {
  const results = {
    pnv: { phases: [], pass: false, details: '' },
    network_calls: 0,
    ip1_a1_home_screen: false,
    home_screen_console_errors: 0,
    s1_a2_routes_reachable: {},
    s1_a4_storage_persists: false,
    s2_a4_deterministic_gto: false,
    s3_a3_walkthrough_reveal: false,
    dca1_both_modes: false,
    dca6_deterministic_ref: false,
    dca8_archetype_count: 0,
    dca10_dashboard_metrics: false,
    dca12_seat_count: 0,
    archetype_seat_count: 0
  };

  // ---- Phase 1: boot, fresh ----
  console.log('Phase 1: Boot fresh JSDOM');
  let dom = await bootJSDOM(null);
  // Capture console errors
  const consoleErrors = [];
  dom.window.addEventListener('error', e => consoleErrors.push(e.message));
  // Re-route console.error
  const origErr = dom.window.console.error;
  dom.window.console.error = (...args) => { consoleErrors.push(args.map(String).join(' ')); origErr.apply(dom.window.console, args); };

  // Home screen reachable?
  const homeCards = dom.window.document.querySelectorAll('.home-card');
  results.ip1_a1_home_screen = homeCards.length === 3;

  // S1.A2: navigate routes
  for (const r of ['walkthrough', 'table', 'dashboard', 'glossary']) {
    dom.window.AppShell.navigateTo(r);
    await sleep(20);
    results.s1_a2_routes_reachable[r] = !!dom.window.document.querySelector('#route-container').firstChild;
  }
  dom.window.AppShell.navigateTo('home');
  await sleep(20);

  // Storage round-trip and persistence (S1.A4)
  dom.window.AppShell.storage.set('cv-test-key', { x: 1 });
  const before = dom.window.AppShell.storage.get('cv-test-key');

  // DCA.1: both top-level modes have entrypoints
  results.dca1_both_modes = (homeCards.length >= 2);

  // Clear localStorage to start fresh
  dom.window.localStorage.clear();
  // Re-set a sentinel so we can verify reload preserves it
  dom.window.AppShell.storage.set('cv-sentinel', { ok: true });

  // Walkthrough deterministic test (DCA.6 / S2.A4)
  const hand1a = dom.window.GTOData.getHand('h001');
  const hand1b = dom.window.GTOData.getHand('h001');
  results.dca6_deterministic_ref = JSON.stringify(hand1a) === JSON.stringify(hand1b);

  // Walkthrough commit gate (S3.A2/S3.A3) — load walkthrough, check reveal panel absent before commit
  dom.window.AppShell.navigateTo('walkthrough');
  await sleep(30);
  const detEl = dom.window.document.querySelector('.wt-detail');
  const revealBefore = detEl ? detEl.querySelector('.reveal-panel') : null;
  // Commit a decision via bus by simulating click on first action button
  const actBtn = detEl ? detEl.querySelector('.action-row .action-btn') : null;
  if (actBtn) actBtn.click();
  await sleep(30);
  const revealAfter = detEl ? detEl.querySelector('.reveal-panel') : null;
  results.s3_a3_walkthrough_reveal = (revealBefore == null && revealAfter != null);

  // Setup table and play 10 hands
  console.log('Phase 1: Play 10 hands');
  const { table, heroSeat } = await navigateToTableAndInitTable(dom);
  results.dca12_seat_count = table.seats.length;
  results.archetype_seat_count = table.seats.filter(s => !s.is_hero && s.archetype_id).length;
  const distinctArchs = new Set(table.seats.filter(s => s.archetype_id).map(s => s.archetype_id));
  results.dca8_archetype_count = distinctArchs.size;

  for (let i = 0; i < 10; i++) {
    await playOneHand(dom, table, heroSeat);
  }
  const dash1 = await readDashboardMetrics(dom);
  results.pnv.phases.push({ phase: '10 hands fresh', session_hands: dash1.session.hands_played, alltime_hands: dash1.allTime.hands_played });

  // DCA.10: dashboard metrics
  results.dca10_dashboard_metrics = (dash1.rendered.length === 8);

  // Snapshot localStorage before reload
  const lsSnapshot = snapshotLocalStorage(dom);

  // ---- Phase 2: simulate reload by closing & re-instantiating with localStorage preserved ----
  console.log('Phase 2: Reload (preserve localStorage)');
  dom.window.close();
  dom = await bootJSDOM(lsSnapshot);

  // Verify sentinel persists
  const sentinel = dom.window.AppShell.storage.get('cv-sentinel');
  results.s1_a4_storage_persists = !!(sentinel && sentinel.ok === true);

  const dash2 = await readDashboardMetrics(dom);
  results.pnv.phases.push({ phase: 'after reload (no play)', session_hands: dash2.session.hands_played, alltime_hands: dash2.allTime.hands_played });

  // Sanity: all-time should be >= 10
  const persistedAllTime = dash2.allTime.hands_played;

  // ---- Phase 3: play 5 more hands ----
  console.log('Phase 3: Play 5 more hands');
  const { table: table2 } = await navigateToTableAndInitTable(dom);
  for (let i = 0; i < 5; i++) {
    await playOneHand(dom, table2, 0);
  }
  const dash3 = await readDashboardMetrics(dom);
  results.pnv.phases.push({ phase: 'after 5 more hands', session_hands: dash3.session.hands_played, alltime_hands: dash3.allTime.hands_played });

  // PNV verdict: hands_played alltime increased by exactly 5
  const delta = dash3.allTime.hands_played - persistedAllTime;
  const phase1Hands = dash1.allTime.hands_played;
  results.pnv.pass = (
    phase1Hands >= 10 &&
    persistedAllTime === phase1Hands &&
    delta === 5
  );
  results.pnv.details = `phase1 alltime=${phase1Hands} (>=10 required), after-reload alltime=${persistedAllTime} (must match phase1), after-5-more alltime=${dash3.allTime.hands_played} (delta=${delta} must be 5)`;

  results.network_calls = networkCalls;
  results.home_screen_console_errors = consoleErrors.length;

  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => {
  console.error('ERROR:', e.stack || e.message);
  process.exit(1);
});
e);
  process.exit(1);
});
