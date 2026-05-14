// Section 1: App Shell, Navigation, Storage Adapter
// Provides: registerRoute, navigateTo, navigateHome, storage adapter, event bus.
// All other sections register via window.AppShell.

(function () {
  'use strict';

  // ----- Storage Adapter -----
  const NAMESPACE = 'gto-trainer/v1/';
  const SCHEMA_VERSION = 1;
  let memoryFallback = null;
  let storageMode = 'localStorage';

  function probeStorage() {
    try {
      const k = NAMESPACE + '__probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  if (!probeStorage()) {
    memoryFallback = {};
    storageMode = 'memory';
    console.warn('[storage] localStorage unavailable; using in-memory fallback (data will not persist).');
  }

  function rawSet(key, val) {
    if (storageMode === 'localStorage') {
      window.localStorage.setItem(key, val);
    } else {
      memoryFallback[key] = val;
    }
  }
  function rawGet(key) {
    if (storageMode === 'localStorage') {
      return window.localStorage.getItem(key);
    }
    return Object.prototype.hasOwnProperty.call(memoryFallback, key) ? memoryFallback[key] : null;
  }
  function rawDelete(key) {
    if (storageMode === 'localStorage') {
      window.localStorage.removeItem(key);
    } else {
      delete memoryFallback[key];
    }
  }
  function rawKeys() {
    if (storageMode === 'localStorage') {
      const out = [];
      for (let i = 0; i < window.localStorage.length; i++) out.push(window.localStorage.key(i));
      return out;
    }
    return Object.keys(memoryFallback);
  }

  const storage = {
    get(suffix) {
      const key = NAMESPACE + suffix;
      const raw = rawGet(key);
      if (raw == null) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },
    set(suffix, value) {
      const key = NAMESPACE + suffix;
      rawSet(key, JSON.stringify(value));
    },
    remove(suffix) {
      rawDelete(NAMESPACE + suffix);
    },
    clear(prefix) {
      const fullPrefix = NAMESPACE + (prefix || '');
      const keys = rawKeys();
      keys.forEach(k => { if (k && k.indexOf(fullPrefix) === 0) rawDelete(k); });
    },
    namespace: NAMESPACE,
    version: SCHEMA_VERSION,
    mode: storageMode
  };

  // ----- Event Bus -----
  const listeners = {};
  const bus = {
    on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); },
    emit(evt, payload) { (listeners[evt] || []).forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } }); }
  };

  // ----- Router -----
  const routes = {};
  let currentRoute = null;

  function registerRoute(id, mountFn, unmountFn) {
    routes[id] = { mount: mountFn, unmount: unmountFn || (() => {}) };
  }
  function navigateTo(id) {
    const container = document.getElementById('route-container');
    if (currentRoute && routes[currentRoute]) {
      try { routes[currentRoute].unmount(); } catch (e) { console.error(e); }
    }
    container.innerHTML = '';
    currentRoute = id;
    updateNav();
    if (id === 'home') {
      mountHome(container);
      return;
    }
    if (routes[id]) {
      routes[id].mount(container);
    } else {
      container.innerHTML = '<p>Route not found: ' + id + '</p>';
    }
  }
  function navigateHome() { navigateTo('home'); }

  function updateNav() {
    const nav = document.getElementById('app-nav');
    const items = [
      { id: 'home', label: 'Home' },
      { id: 'walkthrough', label: 'Walkthrough' },
      { id: 'table', label: 'Table' },
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'glossary', label: 'Glossary' }
    ];
    nav.innerHTML = '';
    items.forEach(it => {
      const btn = document.createElement('button');
      btn.textContent = it.label;
      btn.dataset.route = it.id;
      if (currentRoute === it.id) btn.className = 'active';
      btn.addEventListener('click', () => navigateTo(it.id));
      nav.appendChild(btn);
    });
  }

  function mountHome(container) {
    container.innerHTML =
      '<div class="home-hero">' +
      '<h2>GTO Poker Trainer</h2>' +
      '<p>9-max NLHE cash, 100bb. A local-only practice tool: walk a curated library of edge-case spots with deep GTO theory commentary, then play live against archetype agents while your stats persist across sessions.</p>' +
      '<div class="home-grid">' +
      '<div class="home-card" data-route="walkthrough"><h3>Walkthrough</h3><p>20+ curated postflop edge-case spots. Decide first; reveal the GTO frequency mix and theory after.</p></div>' +
      '<div class="home-card" data-route="table"><h3>9-Handed Table</h3><p>Sit hero in seat 1 of 9; eight archetype agents fill the rest. Play full NLHE hands, learn each archetype by contrast.</p></div>' +
      '<div class="home-card" data-route="dashboard"><h3>Stats Dashboard</h3><p>Hands played, VPIP, PFR, 3bet%, WTSD, W$SD, BB/100, GTO-deviation. Session and all-time.</p></div>' +
      '</div></div>';
    container.querySelectorAll('.home-card').forEach(c => {
      c.addEventListener('click', () => navigateTo(c.dataset.route));
    });
  }

  // ----- Boot -----
  window.AppShell = {
    storage,
    bus,
    registerRoute,
    navigateTo,
    navigateHome,
    SCHEMA_VERSION,
    REFERENCE_STACK_BB: 100
  };

  function boot() {
    document.getElementById('storage-status').textContent = 'storage: ' + storageMode;
    updateNav();
    navigateTo('home');
    bus.emit('shell:ready', {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
