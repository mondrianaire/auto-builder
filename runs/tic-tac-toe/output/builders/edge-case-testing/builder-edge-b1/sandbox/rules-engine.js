/**
 * rules-engine.js
 *
 * Pure tic-tac-toe rules engine. Single source of truth for legal positions,
 * legal moves, and game outcome.
 *
 * Contracts:
 *   contracts/original/rules-engine--ai-opponent.json
 *   contracts/original/rules-engine--controller-and-shell.json
 *
 * Data shapes:
 *   Cell      = 'X' | 'O' | null
 *   Player    = 'X' | 'O'
 *   Board     = Cell[9], row-major, indices 0..8
 *   GameState = { board: Board, currentPlayer: Player, moveCount: number }
 *   Outcome   = { status: 'in_progress' | 'win' | 'draw',
 *                 winner: Player | null,
 *                 line: number[3] | null }
 *
 * Loading conventions:
 *   - Browser: include via a plain <script> tag. The module exposes itself as
 *     window.RulesEngine.
 *   - Node / test harness: also exported via module.exports when available.
 *   - Illegal-move contract: applyMove THROWS an Error (subclass-free, with a
 *     `.code` property) when the move is illegal. The controller must wrap
 *     applyMove in a try/catch (or pre-check via legalMoves).
 */
(function (root, factory) {
  var mod = factory();
  root.RulesEngine = mod;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var BOARD_SIZE = 9;
  var PLAYERS = ['X', 'O'];
  var WINNING_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];

  function isPlayer(p) {
    return p === 'X' || p === 'O';
  }

  function cloneBoard(board) {
    return board.slice();
  }

  function cloneState(state) {
    return {
      board: cloneBoard(state.board),
      currentPlayer: state.currentPlayer,
      moveCount: state.moveCount
    };
  }

  /**
   * Returns a fresh GameState with all cells null, currentPlayer='X', moveCount=0.
   */
  function createBoard() {
    var board = new Array(BOARD_SIZE);
    for (var i = 0; i < BOARD_SIZE; i++) board[i] = null;
    return {
      board: board,
      currentPlayer: 'X',
      moveCount: 0
    };
  }

  /**
   * Returns a new GameState with the cell filled.
   * Throws an Error with a `.code` of:
   *   'OUT_OF_RANGE'   - index not an integer in [0..8]
   *   'CELL_OCCUPIED'  - target cell is non-null
   *   'WRONG_PLAYER'   - player !== state.currentPlayer
   *   'INVALID_PLAYER' - player not 'X' or 'O'
   */
  function applyMove(state, index, player) {
    if (!Number.isInteger(index) || index < 0 || index >= BOARD_SIZE) {
      var e1 = new Error('Illegal move: index ' + index + ' out of range');
      e1.code = 'OUT_OF_RANGE';
      throw e1;
    }
    if (!isPlayer(player)) {
      var e2 = new Error('Illegal move: invalid player ' + JSON.stringify(player));
      e2.code = 'INVALID_PLAYER';
      throw e2;
    }
    if (player !== state.currentPlayer) {
      var e3 = new Error('Illegal move: it is ' + state.currentPlayer + "'s turn, not " + player + "'s");
      e3.code = 'WRONG_PLAYER';
      throw e3;
    }
    if (state.board[index] !== null) {
      var e4 = new Error('Illegal move: cell ' + index + ' is already occupied');
      e4.code = 'CELL_OCCUPIED';
      throw e4;
    }
    var nextBoard = cloneBoard(state.board);
    nextBoard[index] = player;
    return {
      board: nextBoard,
      currentPlayer: player === 'X' ? 'O' : 'X',
      moveCount: state.moveCount + 1
    };
  }

  /**
   * Returns Outcome { status, winner, line }.
   */
  function checkOutcome(state) {
    var board = state.board;
    for (var i = 0; i < WINNING_LINES.length; i++) {
      var line = WINNING_LINES[i];
      var a = board[line[0]];
      var b = board[line[1]];
      var c = board[line[2]];
      if (a !== null && a === b && b === c) {
        return { status: 'win', winner: a, line: line.slice() };
      }
    }
    var full = true;
    for (var j = 0; j < BOARD_SIZE; j++) {
      if (board[j] === null) { full = false; break; }
    }
    if (full) return { status: 'draw', winner: null, line: null };
    return { status: 'in_progress', winner: null, line: null };
  }

  /**
   * Returns indices of empty cells in ascending order.
   */
  function legalMoves(state) {
    var out = [];
    for (var i = 0; i < BOARD_SIZE; i++) {
      if (state.board[i] === null) out.push(i);
    }
    return out;
  }

  return {
    // primary API
    createBoard: createBoard,
    applyMove: applyMove,
    checkOutcome: checkOutcome,
    legalMoves: legalMoves,
    // helpers exposed for ai-opponent convenience (cloning hypothetical state).
    // Not part of the contract surface but documented as a convenience export.
    _cloneState: cloneState,
    // constants exposed for testing
    _WINNING_LINES: WINNING_LINES,
    _BOARD_SIZE: BOARD_SIZE
  };
});
