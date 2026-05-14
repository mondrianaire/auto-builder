// PNV.1 Production-Fidelity Exercise via jsdom (CommonJS)
// Loads output/integration/index.html with all scripts manually injected from disk (no HTTP server, no network).
// Drives Table mode programmatically: 10 hands -> reload (preserve localStorage) -> 5 more hands.
//
// jsdom treats raw file:// URLs as opaque (no localStorage). We use a synthetic
// http://gto.local/ URL purely to satisfy localStorage's same-origin rule. NO actual
// network is made: the Window's fetch is hard-shimmed to throw for any non-file URL,
// and all scripts are loaded from the local filesystem and run via window.eval.

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const INTEGRATION_DIR = '/sessions/intelligent-quirky-rubin/mnt/Auto Builder/runs/gto-poker-trainer/output/integration';
const INDEX_HTML = path.join(INTEGRATION_DIR, 'index.html');

let networkCalls = 0;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const SCRIPT_ORDER = [
  'shell.js',
  'data/preflop-ranges.js',
  'data/curated-hands.js',
  'archetypes.js',
  'agent-engine.js',
  'hand-eval.js',
  'table-engine.js',
  'walkthrough.js',
  'table-ui.js',
  'stats.js'
];

async function bootJSDOM(persistedLocalStorage) {
  // Read the index.html, strip its <script src> tags, and execute the scripts manually.
  // This lets us use a synthetic http URL (so localStorage works) while still 100% loading
  // the production code from disk in the production load order.
  const rawHtml = fs.readFileSync(INDEX_HTML, 'utf8');
  const stripped = rawHtml.replace(/<script[^>]*src=[^>]*><\/script>/g, '');

  const dom = new JSDOM(stripped, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://gto.local/integration/index.html'
  });

  // Hard-shim network primitives to refuse any call.
  const w = dom.window;
  const origFetch = w.fetch;
  w.fetch = function (...args) {
    networkCalls += 1;
    return Promise.reject(new Error('Network blocked: ' + args[0]));
  };
  if (w.XMLHttpRequest) {
    const OrigXHR = w.XMLHttpRequest;
    w.XMLHttpRequest = function () {
      networkCalls += 1;
      throw new Error('XMLHttpRequest blocked');
    };
  }

  // Restore localStorage if provided
  if (persistedLocalStorage) {
    for (const [k, v] of Object.entries(persistedLocalStorage)) {
      w.localStorage.setItem(k, v);
    }
  }

  // Wait for DOMContentLoaded to fire — JSDOM fires it shortly after construction
  await sleep(50);

  // Load each script from disk and eval in the window context (production code paths).
  for (const rel of SCRIPT_ORDER) {
    const src = fs.readFileSync(path.join(INTEGRATION_DIR, rel), 'utf8');
    // Use vm-style by attaching a script element and inserting it; but the simplest is window.eval.
    w.eval(src);
  }

  // Trigger boot — shell.js's boot() registered itself on DOMContentLoaded which already fired
  // before we eval'd the scripts. We need to call boot manually OR re-trigger DOMContentLoaded.
  // Easiest: call AppShell.navigateTo('home') after a tick to set up the home screen.
  // Actually shell.js checks document.readyState — if not 'loading', boot() runs immediately on
  // eval. So by the time we reach here, AppShell should exist and boot has run.

  // Wait until everything is wired
  for (let i = 0; i < 50; i++) {
    if (w.AppShell && w.AppShell.storage && w.TableEngine && w.AgentEngine && w.Stats && w.GTOData && w.Archetypes && w.HandEval) break;
    await sleep(20);
  }

  if (!w.AppShell) throw new Error('AppShell did not boot');
  if (!w.GTOData) throw new Error('GTOData missing');
  if (!w.Stats) throw new Error('Stats missing');
  if (!w.HandEval) throw new Error('HandEval missing');
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

async function playOneHand(dom, table, heroSeatId) {
  const w = dom.window;
  w.TableEngine.startHand(table);
  let preActionSnapshot = null;
  const startingStack = table.seats[heroSeatId].stack + table.seats[heroSeatId].committed_total;

  let safety = 1000;
  while (table.street !== 'idle' && table.street !== 'showdown' && safety-- > 0) {
    const sid = table.current_seat;
    if (sid < 0) break;
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
      const street = table.street;
      const toCall = Math.max(0, table.current_bet - seat.bet);
      const action = toCall === 0 ? 'check' : 'fold';

      if (street === 'preflop' && !preActionSnapshot) {
        preActionSnapshot = {
          hero_hole: seat.cards.slice(),
          hero_actions: [],
          vpip_flag: false, pfr_flag: false, threebet_flag: false,
          starting_stack: startingStack,
          hero_position: w.TableEngine.getPositionLabel(table, heroSeatId)
        };
      }
      if (preActionSnapshot) preActionSnapshot.hero_actions.push({ street, action, sizing: null });
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

  const heroSeat = table.seats[heroSeatId];
  const heroDelta = (heroSeat.stack + heroSeat.bet) - (preActionSnapshot ? preActionSnapshot.starting_stack : startingStack);
  const hr = {
    hand_id: 'h' + table.hand_number,
    hero_seat: heroSeatId,
    hero_position: preActionSnapshot ? preActionSnapshot.hero_position : 'unknown',
    board: table.board.slice(),
    hero_actions: preActionSnapshot ? preActionSnapshot.hero_actions : [],
    hero_won: result.winners.some(wn => wn.seat_id === heroSeatId && wn.amount > 0),
    hero_delta_chips: heroDelta,
    hero_pnl_bb: heroDelta / table.bb,
    pot_size: table.pot,
    vpip: preActionSnapshot ? preActionSnapshot.vpip_flag : false,
    pfr: preActionSnapshot ? preActionSnapshot.pfr_flag : false,
    threebet: preActionSnapshot ? preActionSnapshot.threebet_flag : false,
    saw_showdown: live.length > 1 && !heroSeat.folded,
    won_at_showdown: live.length > 1 && !heroSeat.folded && result.winners.some(wn => wn.seat_id === heroSeatId),
    gto_deviations: []
  };
  w.AppShell.bus.emit('hand_result', hr);
  return hr;
}

function makeTable(dom) {
  const w = dom.window;
  const archetypes = w.Archetypes.listArchetypes();
  const names = []; const archAssignments = [];
  let arcIdx = 0;
  for (let i = 0; i < 9; i++) {
    if (i === 0) { names.push('Hero'); archAssignments.push(null); }
    else { const a = archetypes[arcIdx % archetypes.length]; names.push(a.display_name); archAssignments.push(a.id); arcIdx++; }
  }
  return w.TableEngine.newTable(9, { names, archetypes: archAssignments, hero_seat: 0, seed: 42 });
}

async function readDashboard(dom) {
  const w = dom.window;
  w.AppShell.navigateTo('dashboard');
  await sleep(80);
  const session = w.Stats.getSession();
  const allTime = w.Stats.getAllTime();
  const dashGrid = dom.window.document.querySelector('#dash-grid');
  const renderedTexts = [];
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
    home_screen_console_errors: 0,
    ip1_a1_home_screen: false,
    s1_a2_routes_reachable: {},
    s1_a4_storage_persists: false,
    s2_a4_deterministic_gto: false,
    s3_a3_walkthrough_reveal: false,
    dca6_deterministic_ref: false,
    dca8_archetype_count: 0,
    dca10_dashboard_metrics_count: 0,
    dca12_seat_count: 0,
    dca12_hero_count: 0,
    archetype_seat_count: 0,
    console_errors_sample: []
  };

  console.log('Phase 1: Boot fresh JSDOM');
  let dom = await bootJSDOM(null);
  const consoleErrors = [];
  const origErr = dom.window.console.error;
  dom.window.console.error = (...args) => { consoleErrors.push(args.map(String).join(' ')); origErr.apply(dom.window.console, args); };
  dom.window.addEventListener('error', e => consoleErrors.push(e.message || String(e)));

  // S1.A2 routes reachable
  for (const r of ['walkthrough', 'table', 'dashboard', 'glossary', 'home']) {
    dom.window.AppShell.navigateTo(r);
    await sleep(20);
    const child = dom.window.document.querySelector('#route-container').firstChild;
    results.s1_a2_routes_reachable[r] = !!child;
  }
  dom.window.AppShell.navigateTo('home');
  await sleep(20);

  // Home screen check (3 cards)
  const homeCards = dom.window.document.querySelectorAll('.home-card');
  results.ip1_a1_home_screen = homeCards.length === 3;

  // Clear localStorage and start fresh
  dom.window.localStorage.clear();
  dom.window.AppShell.storage.set('cv-sentinel', { ok: true });

  // DCA.6 / S2.A4 deterministic GTO reference
  const hand1a = dom.window.GTOData.getHand('h001');
  const hand1b = dom.window.GTOData.getHand('h001');
  results.dca6_deterministic_ref = JSON.stringify(hand1a) === JSON.stringify(hand1b);
  results.s2_a4_deterministic_gto = results.dca6_deterministic_ref;

  // Walkthrough commit gate (S3.A3)
  dom.window.AppShell.navigateTo('walkthrough');
  await sleep(50);
  const detEl = dom.window.document.querySelector('.wt-detail');
  const revealBefore = detEl ? detEl.querySelector('.reveal-panel') : null;
  const actBtn = detEl ? detEl.querySelector('.action-row .action-btn') : null;
  if (actBtn) actBtn.click();
  await sleep(30);
  const revealAfter = detEl ? detEl.querySelector('.reveal-panel') : null;
  results.s3_a3_walkthrough_reveal = (revealBefore == null && revealAfter != null);

  // Table & archetype/seat checks
  const table = makeTable(dom);
  results.dca12_seat_count = table.seats.length;
  results.dca12_hero_count = table.seats.filter(s => s.is_hero).length;
  results.archetype_seat_count = table.seats.filter(s => !s.is_hero && s.archetype_id).length;
  const distinctArchs = new Set(table.seats.filter(s => s.archetype_id).map(s => s.archetype_id));
  results.dca8_archetype_count = distinctArchs.size;

  console.log('Phase 1: Play 10 hands');
  for (let i = 0; i < 10; i++) {
    await playOneHand(dom, table, 0);
  }
  const dash1 = await readDashboard(dom);
  results.pnv.phases.push({ phase: '10 hands fresh', session_hands: dash1.session.hands_played, alltime_hands: dash1.allTime.hands_played });
  results.dca10_dashboard_metrics_count = dash1.rendered.length;

  const lsSnapshot = snapshotLocalStorage(dom);
  const phase1Hands = dash1.allTime.hands_played;

  console.log('Phase 2: Reload (preserve localStorage)');
  dom.window.close();
  dom = await bootJSDOM(lsSnapshot);
  const sentinel = dom.window.AppShell.storage.get('cv-sentinel');
  results.s1_a4_storage_persists = !!(sentinel && sentinel.ok === true);
  const dash2 = await readDashboard(dom);
  results.pnv.phases.push({ phase: 'after reload (no play)', session_hands: dash2.session.hands_played, alltime_hands: dash2.allTime.hands_played });
  const persistedAllTime = dash2.allTime.hands_played;

  console.log('Phase 3: Play 5 more hands');
  const table2 = makeTable(dom);
  for (let i = 0; i < 5; i++) {
    await playOneHand(dom, table2, 0);
  }
  const dash3 = await readDashboard(dom);
  results.pnv.phases.push({ phase: 'after 5 more hands', session_hands: dash3.session.hands_played, alltime_hands: dash3.allTime.hands_played });

  const delta = dash3.allTime.hands_played - persistedAllTime;
  results.pnv.pass = (
    phase1Hands >= 10 &&
    persistedAllTime === phase1Hands &&
    delta === 5 &&
    networkCalls === 0
  );
  results.pnv.details = 'phase1 alltime=' + phase1Hands + ' (>=10 required); after-reload alltime=' + persistedAllTime + ' (must match phase1 ' + phase1Hands + '); after-5-more alltime=' + dash3.allTime.hands_played + ' (delta=' + delta + ' must be 5); network_calls=' + networkCalls + ' (must be 0)';

  results.network_calls = networkCalls;
  results.home_screen_console_errors = consoleErrors.length;
  results.console_errors_sample = consoleErrors.slice(0, 5);

  console.log('===RESULTS===');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(function (e) {
  console.error('ERROR:', e.stack || e.message || String(e));
  process.exit(1);
});
