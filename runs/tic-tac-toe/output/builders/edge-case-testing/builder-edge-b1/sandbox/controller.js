/**
 * controller.js
 *
 * Composes RulesEngine + AIOpponent + UIRender into a playable single-page
 * tic-tac-toe game.
 *
 * Turn flow:
 *   1. Human (X) clicks a cell.
 *   2. Controller validates legality (cell empty, game not over) and applyMove.
 *   3. checkOutcome: if terminal, render and stop.
 *   4. Otherwise: render with disabled=true and 'Computer thinking...' status,
 *      then setTimeout AI_DELAY_MS before letting the AI move (so the AI's
 *      play is perceptible).
 *   5. AIOpponent.chooseMove -> applyMove -> checkOutcome -> render.
 *
 * Restart: createBoard, render fresh.
 *
 * No persistence, no analytics, no network.
 */
(function () {
  'use strict';

  var RE = window.RulesEngine;
  var AI = window.AIOpponent;
  var UI = window.UIRender;

  if (!RE) throw new Error('controller: RulesEngine missing');
  if (!AI) throw new Error('controller: AIOpponent missing');
  if (!UI) throw new Error('controller: UIRender missing');

  // Tunable per ledger: AI delay must be perceptible but not annoying.
  var AI_DELAY_MS = 350;
  var HUMAN = 'X';
  var COMPUTER = 'O';

  // Live game state.
  var state = null;
  var lastOutcome = null;
  var aiTimer = null;

  function _statusFor(outcome, currentPlayer, awaitingAI) {
    if (outcome.status === 'win') {
      return outcome.winner === HUMAN ? 'You win!' : 'Computer wins!';
    }
    if (outcome.status === 'draw') {
      return 'Draw';
    }
    // in_progress
    if (awaitingAI) return 'Computer thinking...';
    return currentPlayer === HUMAN ? 'Your turn' : 'Computer’s turn';
  }

  function _viewModelFrom(state, outcome, awaitingAI) {
    return {
      cells: state.board.slice(),
      statusText: _statusFor(outcome, state.currentPlayer, !!awaitingAI),
      winningLine: outcome.status === 'win' ? outcome.line.slice() : null,
      disabled: outcome.status !== 'in_progress' || !!awaitingAI
    };
  }

  function _renderCurrent(awaitingAI) {
    UI.render(_viewModelFrom(state, lastOutcome, awaitingAI));
  }

  function _resetGame() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    state = RE.createBoard();
    lastOutcome = RE.checkOutcome(state); // 'in_progress' on a fresh board
    _renderCurrent(false);
  }

  function _handleHumanClick(cellIndex) {
    // Defense in depth: ignore clicks when not human's turn or game is over,
    // even though renderer should already have suppressed them.
    if (lastOutcome.status !== 'in_progress') return;
    if (state.currentPlayer !== HUMAN) return;
    if (state.board[cellIndex] !== null) return;

    try {
      state = RE.applyMove(state, cellIndex, HUMAN);
    } catch (err) {
      // Illegal click somehow slipped through — silently ignore per acceptance criteria.
      return;
    }
    lastOutcome = RE.checkOutcome(state);

    if (lastOutcome.status !== 'in_progress') {
      _renderCurrent(false);
      return;
    }

    // Hand off to AI with a perceptible delay.
    _renderCurrent(true);
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = setTimeout(_runAIMove, AI_DELAY_MS);
  }

  function _runAIMove() {
    aiTimer = null;
    if (lastOutcome.status !== 'in_progress') return; // safety
    if (state.currentPlayer !== COMPUTER) return;     // safety
    var idx;
    try {
      idx = AI.chooseMove(state, COMPUTER);
    } catch (err) {
      // No legal moves shouldn't happen here; bail safely.
      _renderCurrent(false);
      return;
    }
    try {
      state = RE.applyMove(state, idx, COMPUTER);
    } catch (err) {
      // Inconsistent state; render what we have.
      _renderCurrent(false);
      return;
    }
    lastOutcome = RE.checkOutcome(state);
    _renderCurrent(false);
  }

  function _handleRestart() {
    _resetGame();
  }

  function init() {
    UI.mount();
    UI.onCellClick(_handleHumanClick);
    UI.onRestart(_handleRestart);
    _resetGame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose minimal hook for testing/debugging only.
  window.TTTController = {
    _getState: function () { return state; },
    _getOutcome: function () { return lastOutcome; },
    _restart: _handleRestart,
    _humanClick: _handleHumanClick,
    AI_DELAY_MS: AI_DELAY_MS
  };
})();
