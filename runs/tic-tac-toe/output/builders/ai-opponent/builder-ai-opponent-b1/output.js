/**
 * ai-opponent.js
 *
 * Beatable heuristic AI for tic-tac-toe (per inflection I1).
 *
 * Contract:
 *   contracts/original/ai-opponent--controller-and-shell.json
 *   contracts/original/rules-engine--ai-opponent.json (consumer side)
 *
 * Heuristic ladder (first match wins):
 *   1. Take an immediate winning move.
 *   2. Block the opponent's immediate winning move.
 *   3. Take center (cell 4) if free.
 *   4. Take a free corner (0, 2, 6, 8) — first-encountered.
 *   5. Take a free edge (1, 3, 5, 7) — first-encountered.
 *
 * Tie-breaks within priority levels are deterministic: scan cells in ascending
 * row-major order and pick the first qualifying one. Determinism is desirable
 * here because (a) it makes the AI testable and (b) the human-vs-computer
 * casual feel is preserved by the heuristic ladder; perfect play was rejected
 * in I1.
 *
 * The module relies on RulesEngine for legality and outcome detection. It does
 * NOT reimplement win-line logic.
 *
 * Loading: vanilla <script> tag exposes window.AIOpponent. CommonJS-friendly
 * for headless tests.
 */
(function (root, factory) {
  // Resolve dependency on rules-engine. In the browser, rules-engine.js loads
  // first and sets window.RulesEngine. In node tests, we require it.
  var RulesEngine;
  if (typeof window !== 'undefined' && window.RulesEngine) {
    RulesEngine = window.RulesEngine;
  } else if (typeof require === 'function') {
    // Try several plausible layouts so node tests work whether the bundle is
    // staged in a single sandbox dir (./rules-engine.js) or sitting in the
    // builder-output tree (../../rules-engine/builder-rules-engine-b1/output.js).
    var candidates = [
      './rules-engine.js',
      '../../rules-engine/builder-rules-engine-b1/output.js'
    ];
    for (var i = 0; i < candidates.length; i++) {
      try { RulesEngine = require(candidates[i]); break; } catch (_) { /* try next */ }
    }
  }
  var mod = factory(RulesEngine);
  root.AIOpponent = mod;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (RulesEngine) {
  'use strict';

  function _re() {
    // Late-bound resolution so the controller can re-inject RulesEngine if
    // needed (and so test harnesses can swap it).
    if (RulesEngine) return RulesEngine;
    if (typeof window !== 'undefined' && window.RulesEngine) return window.RulesEngine;
    throw new Error('AIOpponent: RulesEngine not available; load rules-engine.js first.');
  }

  var CENTER = 4;
  var CORNERS = [0, 2, 6, 8];
  var EDGES = [1, 3, 5, 7];

  function opponentOf(player) {
    return player === 'X' ? 'O' : 'X';
  }

  /**
   * Find a move for `player` that, if applied, immediately wins the game.
   * Returns the cell index, or -1 if none.
   */
  function _findWinningMove(state, player, RE) {
    var moves = RE.legalMoves(state);
    for (var i = 0; i < moves.length; i++) {
      var idx = moves[i];
      // Construct a hypothetical state-as-if-it's-`player`s-turn so applyMove
      // accepts the move regardless of state.currentPlayer.
      var hypo = {
        board: state.board.slice(),
        currentPlayer: player,
        moveCount: state.moveCount
      };
      var next = RE.applyMove(hypo, idx, player);
      var outcome = RE.checkOutcome(next);
      if (outcome.status === 'win' && outcome.winner === player) {
        return idx;
      }
    }
    return -1;
  }

  /**
   * chooseMove(state, aiSymbol) -> number
   */
  function chooseMove(state, aiSymbol) {
    var RE = _re();
    if (!state || !Array.isArray(state.board) || state.board.length !== 9) {
      throw new Error('AIOpponent.chooseMove: invalid state');
    }
    if (aiSymbol !== 'X' && aiSymbol !== 'O') {
      throw new Error('AIOpponent.chooseMove: aiSymbol must be X or O');
    }

    var legal = RE.legalMoves(state);
    if (legal.length === 0) {
      throw new Error('AIOpponent.chooseMove: no legal moves (board is full)');
    }

    // 1. Win
    var winMove = _findWinningMove(state, aiSymbol, RE);
    if (winMove !== -1) return winMove;

    // 2. Block opponent's immediate win
    var blockMove = _findWinningMove(state, opponentOf(aiSymbol), RE);
    if (blockMove !== -1) return blockMove;

    // 3. Center
    if (state.board[CENTER] === null) return CENTER;

    // 4. Free corner (deterministic first-encountered)
    for (var i = 0; i < CORNERS.length; i++) {
      if (state.board[CORNERS[i]] === null) return CORNERS[i];
    }

    // 5. Free edge (deterministic first-encountered)
    for (var j = 0; j < EDGES.length; j++) {
      if (state.board[EDGES[j]] === null) return EDGES[j];
    }

    // Should be unreachable given legal.length > 0 above, but fall back to
    // first legal as a final safety net.
    return legal[0];
  }

  return {
    chooseMove: chooseMove,
    // exported for tests
    _findWinningMove: function (state, player) { return _findWinningMove(state, player, _re()); }
  };
});
GES[j];
    }

    // Should be unreachable given legal.length > 0 above, but fall back to
    // first legal as a final safety net.
    return legal[0];
  }

  return {
    chooseMove: chooseMove,
    // exported for tests
    _findWinningMove: function (state, player) { return _findWinningMove(state, player, _re()); }
  };
});
