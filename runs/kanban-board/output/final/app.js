/**
 * app.js — entry point. Boots the kanban board.
 *
 *   1. Persistence.load() -> initial state (or null)
 *   2. createStateModel(initial) — uses DEFAULT_SEED if null
 *   3. mountRenderer on #app
 *   4. wireDnd, wireInteractions
 *   5. Subscribe Persistence.save so every mutation autosaves
 */
(function () {
  'use strict';

  function boot() {
    var rootEl = document.getElementById('app');
    if (!rootEl) {
      console.error('app: #app root element not found');
      return;
    }

    var initial = Persistence.load();
    var stateModel = StateModel.createStateModel(initial);

    UiRender.mountRenderer(rootEl, stateModel);
    Dnd.wireDnd(rootEl, stateModel);
    Interactions.wireInteractions(rootEl, stateModel);

    // Autosave on every mutation
    stateModel.subscribe(function (state) {
      Persistence.save(state);
    });

    // Save the initial state too (so a fresh seed persists immediately)
    Persistence.save(stateModel.getState());

    // Expose for manual debugging / tests
    window.__kanban = {
      stateModel: stateModel,
      Persistence: Persistence,
      rootEl: rootEl
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
