/**
 * persistence: localStorage adapter for kanban board state.
 * Pure JS, no DOM. Exposes load(), save(state), clear(), STORAGE_KEY.
 *
 * Corrupt/missing data -> load() returns null (no throw).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Persistence = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STORAGE_KEY = 'kanban-board:v1';

  function getStorage() {
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (e) { /* access denied / unavailable */ }
    return null;
  }

  function isValidBoardState(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (!Array.isArray(obj.lists)) return false;
    for (var i = 0; i < obj.lists.length; i++) {
      var l = obj.lists[i];
      if (!l || typeof l !== 'object') return false;
      if (typeof l.id !== 'string' || typeof l.name !== 'string') return false;
      if (!Array.isArray(l.cards)) return false;
      for (var j = 0; j < l.cards.length; j++) {
        var c = l.cards[j];
        if (!c || typeof c !== 'object') return false;
        if (typeof c.id !== 'string' || typeof c.title !== 'string') return false;
      }
    }
    return true;
  }

  function load() {
    var storage = getStorage();
    if (!storage) return null;
    var raw;
    try { raw = storage.getItem(STORAGE_KEY); } catch (e) { return null; }
    if (raw == null) return null;
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { return null; }
    if (!isValidBoardState(parsed)) return null;
    return parsed;
  }

  function save(state) {
    var storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* quota exceeded or other; swallow */ }
  }

  function clear() {
    var storage = getStorage();
    if (!storage) return;
    try { storage.removeItem(STORAGE_KEY); } catch (e) { /* swallow */ }
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    load: load,
    save: save,
    clear: clear
  };
}));
