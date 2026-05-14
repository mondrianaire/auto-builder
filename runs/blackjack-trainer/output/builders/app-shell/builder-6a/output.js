// app.js — Section 6, Builder 6a (bootstrap)
// Wires the modules and starts the trainer.

import * as rulesEngine from './rules-engine.js';
import * as strategyTable from './strategy-table.js';
import { createGameStateMachine } from './game-state-machine.js';
import { mountUI } from './ui-render.js';
import { wireHintAndReview } from './hint-and-review.js';

function boot() {
  const root = document.getElementById('app');
  if (!root) {
    console.error('app-shell: #app root not found');
    return;
  }
  const stateMachine = createGameStateMachine({ rulesEngine, strategyTable });
  const ui = mountUI(root, stateMachine);
  wireHintAndReview({
    stateMachine,
    strategyTable,
    dom: {
      btnHint: ui.elements.btnHint,
      hintDisplay: ui.elements.hintDisplay,
      reviewPanel: ui.elements.reviewPanel
    },
    helpers: {
      renderHint: ui.renderHint,
      renderReviewRows: ui.renderReviewRows
    }
  });

  // Footer counter: subscribe to state and update hands played.
  const handsPlayedEl = document.getElementById('hands-played');
  if (handsPlayedEl) {
    stateMachine.subscribe((state) => {
      handsPlayedEl.textContent = String(state.handsPlayed || 0);
    });
  }

  // Expose for in-browser debugging / test harness.
  window.__bj = { stateMachine, ui, rulesEngine, strategyTable };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
