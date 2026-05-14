// Section 6a: Stats writer + dashboard.
// Subscribes to hand_result and decision_result events. Persists via storage adapter.

(function () {
  'use strict';

  const STATS_KEY_ALLTIME = 'stats/all-time';
  const STATS_KEY_SESSION_PREFIX = 'stats/session/';

  // Generate session id at boot — separate from all-time
  const SESSION_ID = 'sess-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

  function emptyStats() {
    return {
      hands_played: 0,
      vpip_hands: 0,
      pfr_hands: 0,
      threebet_opps: 0,
      threebet_hands: 0,
      saw_showdown: 0,
      won_at_showdown: 0,
      total_pnl_bb: 0,
      decision_count: 0,
      total_deviation: 0,
      schema_version: 1
    };
  }

  function loadStats(key) {
    if (!window.AppShell || !window.AppShell.storage) return emptyStats();
    const stored = window.AppShell.storage.get(key);
    if (!stored || stored.schema_version !== 1) return emptyStats();
    return stored;
  }
  function saveStats(key, s) {
    if (!window.AppShell || !window.AppShell.storage) return;
    window.AppShell.storage.set(key, s);
  }

  let allTime = loadStats(STATS_KEY_ALLTIME);
  let session = emptyStats();

  function applyHandResult(stats, hr) {
    stats.hands_played += 1;
    if (hr.vpip) stats.vpip_hands += 1;
    if (hr.pfr) stats.pfr_hands += 1;
    // 3bet opportunity: any preflop facing-raise position counts; threebet-flag means we did 3bet
    stats.threebet_opps += 1; // simplified — every hand counts as a possible 3bet opp
    if (hr.threebet) stats.threebet_hands += 1;
    if (hr.saw_showdown) stats.saw_showdown += 1;
    if (hr.won_at_showdown) stats.won_at_showdown += 1;
    stats.total_pnl_bb += (hr.hero_pnl_bb || 0);
  }
  function applyDecisionResult(stats, dr) {
    stats.decision_count += 1;
    stats.total_deviation += (dr.deviation_score || 0);
  }

  function onHandResult(hr) {
    applyHandResult(session, hr);
    applyHandResult(allTime, hr);
    saveStats(STATS_KEY_ALLTIME, allTime);
    saveStats(STATS_KEY_SESSION_PREFIX + SESSION_ID, session);
    // Trigger dashboard update if mounted
    if (currentRouteIsDash) renderDashboard(currentRouteContainer);
  }
  function onDecisionResult(dr) {
    applyDecisionResult(session, dr);
    applyDecisionResult(allTime, dr);
    saveStats(STATS_KEY_ALLTIME, allTime);
    saveStats(STATS_KEY_SESSION_PREFIX + SESSION_ID, session);
    if (currentRouteIsDash) renderDashboard(currentRouteContainer);
  }

  // Compute derived metrics
  function metrics(s) {
    const hp = s.hands_played || 0;
    return {
      hands_played: hp,
      vpip: hp > 0 ? (100 * s.vpip_hands / hp).toFixed(1) : '0.0',
      pfr: hp > 0 ? (100 * s.pfr_hands / hp).toFixed(1) : '0.0',
      three_bet: s.threebet_opps > 0 ? (100 * s.threebet_hands / s.threebet_opps).toFixed(1) : '0.0',
      wtsd: hp > 0 ? (100 * s.saw_showdown / hp).toFixed(1) : '0.0',
      w_dollar_sd: s.saw_showdown > 0 ? (100 * s.won_at_showdown / s.saw_showdown).toFixed(1) : '0.0',
      bb_per_100: hp > 0 ? (100 * s.total_pnl_bb / hp).toFixed(1) : '0.0',
      gto_deviation: s.decision_count > 0 ? (s.total_deviation / s.decision_count).toFixed(3) : '0.000'
    };
  }

  let currentRouteContainer = null;
  let currentRouteIsDash = false;
  let scope = 'session'; // or 'alltime'

  function renderDashboard(container) {
    if (!container) return;
    container.innerHTML =
      '<div class="dash-layout">' +
      '<h2 style="margin-top:0">Stats Dashboard</h2>' +
      '<div class="dash-toggle"><button id="dash-session">Session</button><button id="dash-alltime">All-time</button></div>' +
      '<div class="dash-grid" id="dash-grid"></div>' +
      '<div style="margin-top:16px;color:var(--fg-dim);font-size:11px">Session id: ' + SESSION_ID + '</div>' +
      '</div>';
    container.querySelector('#dash-session').className = scope === 'session' ? 'active' : '';
    container.querySelector('#dash-alltime').className = scope === 'alltime' ? 'active' : '';
    container.querySelector('#dash-session').addEventListener('click', () => { scope = 'session'; renderDashboard(container); });
    container.querySelector('#dash-alltime').addEventListener('click', () => { scope = 'alltime'; renderDashboard(container); });

    const grid = container.querySelector('#dash-grid');
    const stats = scope === 'session' ? session : allTime;
    const m = metrics(stats);
    const cards = [
      { label: 'Hands Played', value: m.hands_played, sub: '' },
      { label: 'VPIP', value: m.vpip + '%', sub: 'voluntary put $ in pot' },
      { label: 'PFR', value: m.pfr + '%', sub: 'preflop raise %' },
      { label: '3-bet %', value: m.three_bet + '%', sub: 'preflop 3bet freq' },
      { label: 'WTSD', value: m.wtsd + '%', sub: 'went to showdown' },
      { label: 'W$SD', value: m.w_dollar_sd + '%', sub: 'won at showdown' },
      { label: 'BB / 100', value: m.bb_per_100, sub: 'win rate big blinds' },
      { label: 'GTO-Deviation', value: m.gto_deviation, sub: 'avg per decision' }
    ];
    cards.forEach(c => {
      const el = document.createElement('div');
      el.className = 'dash-card';
      el.innerHTML = '<h4>' + c.label + '</h4><div class="value">' + c.value + '</div>' +
        (c.sub ? '<div class="sub">' + c.sub + '</div>' : '');
      grid.appendChild(el);
    });
  }

  function mountDashboard(container) {
    currentRouteContainer = container;
    currentRouteIsDash = true;
    renderDashboard(container);
  }
  function unmountDashboard() {
    currentRouteIsDash = false;
    currentRouteContainer = null;
  }

  function registerAll() {
    if (!window.AppShell) { setTimeout(registerAll, 10); return; }
    window.AppShell.registerRoute('dashboard', mountDashboard, unmountDashboard);
    window.AppShell.bus.on('hand_result', onHandResult);
    window.AppShell.bus.on('decision_result', onDecisionResult);
  }
  registerAll();

  // Expose for testing/inspection
  window.Stats = window.Stats || {};
  window.Stats.applyHandResult = applyHandResult;
  window.Stats.applyDecisionResult = applyDecisionResult;
  window.Stats.metrics = metrics;
  window.Stats.getSession = () => session;
  window.Stats.getAllTime = () => allTime;
  window.Stats.injectHandResult = onHandResult;
  window.Stats.injectDecisionResult = onDecisionResult;
})();
