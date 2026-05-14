/**
 * ui-render.js
 *
 * Pure presentation/projection layer for tic-tac-toe.
 * Holds NO game logic. Contract:
 *   contracts/original/ui-render--controller-and-shell.json
 *
 * ViewModel:
 *   {
 *     cells:       Array<'X'|'O'|null> length 9
 *     statusText:  string
 *     winningLine: number[3] | null
 *     disabled:    boolean
 *   }
 *
 * API:
 *   mount(rootElement?)        - injects DOM. Defaults to #app, falling back to body.
 *   render(viewModel)          - idempotent DOM update.
 *   onCellClick(handler)       - registers (or replaces) cell-click handler.
 *   onRestart(handler)         - registers (or replaces) restart handler.
 *
 * Loading: vanilla <script> tag. Exposes window.UIRender. Also CommonJS-friendly.
 *
 * The renderer does NOT import rules-engine or ai-opponent.
 */
(function (root, factory) {
  var mod = factory();
  root.UIRender = mod;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  // ----- internal mutable state (renderer-local; not game state) -----
  var _root = null;
  var _boardEl = null;
  var _statusEl = null;
  var _restartEl = null;
  var _cellEls = [];
  var _cellHandler = null;
  var _restartHandler = null;
  var _mounted = false;

  // Cache of last-rendered values, used for idempotency. We still write the DOM
  // unconditionally (it's cheap and keeps the renderer trivially correct), but
  // the cache is available for instrumentation/diagnostics.
  var _last = { cells: null, statusText: null, winningLine: null, disabled: null };

  function _isBrowser() {
    return typeof document !== 'undefined' && !!document;
  }

  function _ensureMounted() {
    if (!_mounted) {
      throw new Error('UIRender: render() called before mount()');
    }
  }

  function _createEl(tag, opts) {
    var el = document.createElement(tag);
    if (!opts) return el;
    if (opts.className) el.className = opts.className;
    if (opts.id) el.id = opts.id;
    if (opts.text) el.textContent = opts.text;
    if (opts.attrs) {
      for (var k in opts.attrs) {
        if (Object.prototype.hasOwnProperty.call(opts.attrs, k)) {
          el.setAttribute(k, opts.attrs[k]);
        }
      }
    }
    return el;
  }

  /**
   * mount(rootElement?)
   *   Injects renderer DOM. If rootElement is omitted, looks for #app, then
   *   falls back to document.body.
   */
  function mount(rootElement) {
    if (!_isBrowser()) {
      throw new Error('UIRender.mount: no DOM available');
    }
    if (_mounted) return;
    var host = rootElement;
    if (!host) {
      host = document.getElementById('app') || document.body;
    }
    _root = _createEl('div', { className: 'ttt-root', id: 'ttt-root' });

    _statusEl = _createEl('div', {
      className: 'ttt-status',
      id: 'ttt-status',
      attrs: { 'role': 'status', 'aria-live': 'polite' }
    });

    _boardEl = _createEl('div', {
      className: 'ttt-board',
      id: 'ttt-board',
      attrs: { 'role': 'grid', 'aria-label': 'Tic-tac-toe board' }
    });

    for (var i = 0; i < 9; i++) {
      (function (idx) {
        var cell = _createEl('button', {
          className: 'ttt-cell ttt-cell--empty',
          attrs: {
            'type': 'button',
            'role': 'gridcell',
            'data-index': String(idx),
            'aria-label': 'Cell ' + (idx + 1) + ', empty'
          }
        });
        cell.addEventListener('click', function () {
          // Defensive: ignore clicks on disabled board or filled cells even if
          // CSS pointer-events fail (e.g. older browsers).
          if (_root.classList.contains('ttt-root--disabled')) return;
          if (cell.classList.contains('ttt-cell--filled')) return;
          if (typeof _cellHandler === 'function') {
            _cellHandler(idx);
          }
        });
        _cellEls.push(cell);
        _boardEl.appendChild(cell);
      })(i);
    }

    _restartEl = _createEl('button', {
      className: 'ttt-restart',
      id: 'ttt-restart',
      text: 'Restart',
      attrs: { 'type': 'button' }
    });
    _restartEl.addEventListener('click', function () {
      if (typeof _restartHandler === 'function') _restartHandler();
    });

    _root.appendChild(_statusEl);
    _root.appendChild(_boardEl);
    _root.appendChild(_restartEl);

    host.appendChild(_root);
    _mounted = true;
  }

  /**
   * render(viewModel) - idempotent DOM update.
   */
  function render(viewModel) {
    _ensureMounted();
    if (!viewModel || !Array.isArray(viewModel.cells) || viewModel.cells.length !== 9) {
      throw new Error('UIRender.render: viewModel.cells must be Array of length 9');
    }
    var cells = viewModel.cells;
    var statusText = viewModel.statusText == null ? '' : String(viewModel.statusText);
    var winningLine = Array.isArray(viewModel.winningLine) ? viewModel.winningLine : null;
    var disabled = !!viewModel.disabled;

    // status
    _statusEl.textContent = statusText;

    // root disabled flag
    if (disabled) {
      _root.classList.add('ttt-root--disabled');
      _boardEl.classList.add('ttt-board--disabled');
    } else {
      _root.classList.remove('ttt-root--disabled');
      _boardEl.classList.remove('ttt-board--disabled');
    }

    // cells
    var winSet = {};
    if (winningLine) {
      for (var w = 0; w < winningLine.length; w++) winSet[winningLine[w]] = true;
    }
    for (var i = 0; i < 9; i++) {
      var cell = _cellEls[i];
      var val = cells[i];
      // text
      cell.textContent = val == null ? '' : val;
      // base classes
      cell.classList.remove('ttt-cell--empty', 'ttt-cell--filled', 'ttt-cell--x', 'ttt-cell--o', 'ttt-cell--win');
      if (val == null) {
        cell.classList.add('ttt-cell--empty');
        cell.disabled = disabled; // empty + disabled => unclickable
        cell.setAttribute('aria-label', 'Cell ' + (i + 1) + ', empty');
      } else {
        cell.classList.add('ttt-cell--filled');
        cell.classList.add(val === 'X' ? 'ttt-cell--x' : 'ttt-cell--o');
        cell.disabled = true; // filled cells never clickable
        cell.setAttribute('aria-label', 'Cell ' + (i + 1) + ', ' + val);
      }
      if (winSet[i]) cell.classList.add('ttt-cell--win');
    }

    _last.cells = cells.slice();
    _last.statusText = statusText;
    _last.winningLine = winningLine ? winningLine.slice() : null;
    _last.disabled = disabled;
  }

  function onCellClick(handler) {
    if (handler != null && typeof handler !== 'function') {
      throw new Error('UIRender.onCellClick: handler must be a function or null');
    }
    _cellHandler = handler || null;
  }

  function onRestart(handler) {
    if (handler != null && typeof handler !== 'function') {
      throw new Error('UIRender.onRestart: handler must be a function or null');
    }
    _restartHandler = handler || null;
  }

  // Test-only reset so a controller (or test harness) can re-mount cleanly.
  // Not part of the contract surface; prefixed with underscore.
  function _unmountForTesting() {
    if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
    _root = null; _boardEl = null; _statusEl = null; _restartEl = null;
    _cellEls = []; _cellHandler = null; _restartHandler = null; _mounted = false;
    _last = { cells: null, statusText: null, winningLine: null, disabled: null };
  }

  return {
    mount: mount,
    render: render,
    onCellClick: onCellClick,
    onRestart: onRestart,
    _unmountForTesting: _unmountForTesting
  };
});
