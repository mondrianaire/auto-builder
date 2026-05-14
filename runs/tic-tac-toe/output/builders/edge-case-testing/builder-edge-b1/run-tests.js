/**
 * Edge case test harness for the assembled tic-tac-toe artifact.
 *
 * Runs in plain node (no test framework) against:
 *   - sandbox/rules-engine.js (loaded via require -- the module is
 *     CommonJS-compatible)
 *   - sandbox/ai-opponent.js  (same)
 *   - sandbox/ui-render.js     (loaded under a minimal DOM stub since the
 *     module assumes a window and document; we exercise the rendering
 *     contract logically rather than visually)
 *   - sandbox/controller.js + sandbox/index.html: static inspection only
 *
 * Per the briefing, the Integrator has not run yet, so this exercises the
 * staged bundle the controller-and-shell builder produced (already copied
 * into sandbox/).
 */
'use strict';

var path = require('path');
var fs = require('fs');

var SANDBOX = path.join(__dirname, 'sandbox');
var report = {
  generated_at: new Date().toISOString(),
  cases: [],
  pass_count: 0,
  fail_count: 0
};

function record(name, ok, detail) {
  report.cases.push({ name: name, status: ok ? 'pass' : 'fail', detail: detail || '' });
  if (ok) report.pass_count++; else report.fail_count++;
}

function run(name, fn) {
  try {
    fn();
    record(name, true, '');
  } catch (e) {
    record(name, false, (e && e.stack) ? e.stack.split('\n')[0] : String(e));
  }
}

function assertEq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error('Expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a) + (msg ? ' :: ' + msg : ''));
  }
}
function assertTrue(v, msg) {
  if (!v) throw new Error('Expected truthy' + (msg ? ' :: ' + msg : ''));
}

// -------------------- LOAD MODULES --------------------
var RE = require(path.join(SANDBOX, 'rules-engine.js'));
var AI = require(path.join(SANDBOX, 'ai-opponent.js'));

// -------------------- RULES ENGINE: ALL 8 WINNING LINES --------------------
var lineDescs = [
  { idx: [0,1,2], name: 'row 1' },
  { idx: [3,4,5], name: 'row 2' },
  { idx: [6,7,8], name: 'row 3' },
  { idx: [0,3,6], name: 'col 1' },
  { idx: [1,4,7], name: 'col 2' },
  { idx: [2,5,8], name: 'col 3' },
  { idx: [0,4,8], name: 'diag TL-BR' },
  { idx: [2,4,6], name: 'diag TR-BL' }
];
['X','O'].forEach(function (sym) {
  lineDescs.forEach(function (L) {
    run('win line ' + L.name + ' for ' + sym, function () {
      var b = [null,null,null,null,null,null,null,null,null];
      L.idx.forEach(function (i) { b[i] = sym; });
      var o = RE.checkOutcome({ board: b, currentPlayer: sym === 'X' ? 'O' : 'X', moveCount: 3 });
      assertEq(o.status, 'win');
      assertEq(o.winner, sym);
      assertEq(o.line, L.idx);
    });
  });
});

// -------------------- DRAW DETECTION --------------------
run('draw detection on full non-winning board', function () {
  var draw = ['X','O','X','X','O','O','O','X','X'];
  var o = RE.checkOutcome({ board: draw, currentPlayer: 'X', moveCount: 9 });
  assertEq(o.status, 'draw');
  assertEq(o.winner, null);
  assertEq(o.line, null);
});

// -------------------- ILLEGAL INPUT IGNORE (rules-engine error contract) --------------------
run('illegal click on filled cell rejected via WRONG-state error', function () {
  var s = RE.createBoard();
  var s1 = RE.applyMove(s, 0, 'X');
  var threw = false;
  try { RE.applyMove(s1, 0, 'O'); } catch (e) { threw = (e.code === 'CELL_OCCUPIED'); }
  assertTrue(threw, 'expected CELL_OCCUPIED on filled cell');
});

run('illegal click out of range rejected', function () {
  var s = RE.createBoard();
  var threw = false;
  try { RE.applyMove(s, 9, 'X'); } catch (e) { threw = (e.code === 'OUT_OF_RANGE'); }
  assertTrue(threw, 'expected OUT_OF_RANGE');
});

run('wrong player rejected', function () {
  var s = RE.createBoard();
  var threw = false;
  try { RE.applyMove(s, 0, 'O'); } catch (e) { threw = (e.code === 'WRONG_PLAYER'); }
  assertTrue(threw, 'expected WRONG_PLAYER');
});

run('input not mutated by applyMove', function () {
  var s = RE.createBoard();
  var snap = JSON.stringify(s);
  RE.applyMove(s, 4, 'X');
  assertEq(JSON.parse(snap), s, 'input mutated');
});

run('legalMoves returns ascending indices', function () {
  var s = { board: [null,'X',null,'O',null,null,null,null,null], currentPlayer: 'X', moveCount: 2 };
  assertEq(RE.legalMoves(s), [0,2,4,5,6,7,8]);
});

run('legalMoves on full board is empty', function () {
  var draw = ['X','O','X','X','O','O','O','X','X'];
  assertEq(RE.legalMoves({ board: draw, currentPlayer: 'X', moveCount: 9 }), []);
});

// -------------------- AI WIN-TAKE --------------------
run('AI takes immediate win when available (row)', function () {
  var s = { board: ['O','O',null,null,'X',null,'X',null,null], currentPlayer: 'O', moveCount: 4 };
  assertEq(AI.chooseMove(s, 'O'), 2);
});

run('AI takes immediate win when available (column)', function () {
  var s = { board: ['O',null,null,'O','X',null,null,null,'X'], currentPlayer: 'O', moveCount: 4 };
  assertEq(AI.chooseMove(s, 'O'), 6);
});

run('AI takes immediate win when available (diagonal)', function () {
  var s = { board: ['O','X',null,null,'O',null,null,'X',null], currentPlayer: 'O', moveCount: 4 };
  assertEq(AI.chooseMove(s, 'O'), 8);
});

// -------------------- AI BLOCK-LOSS --------------------
run('AI blocks immediate loss (row)', function () {
  var s = { board: ['X','X',null,null,'O',null,null,null,null], currentPlayer: 'O', moveCount: 3 };
  assertEq(AI.chooseMove(s, 'O'), 2);
});

run('AI blocks immediate loss (column)', function () {
  var s = { board: ['X',null,null,'X','O',null,null,null,null], currentPlayer: 'O', moveCount: 3 };
  assertEq(AI.chooseMove(s, 'O'), 6);
});

run('AI blocks immediate loss (diagonal)', function () {
  // X threatens TL-BR diagonal: cells 0 and 4 are X, cell 8 is empty.
  // O is elsewhere (cell 1) and not blocking yet. AI must block at 8.
  var s = { board: ['X','O',null,null,'X',null,null,null,null], currentPlayer: 'O', moveCount: 3 };
  assertEq(AI.chooseMove(s, 'O'), 8);
});

// -------------------- AI HEURISTIC LADDER FALL-THROUGH --------------------
run('AI takes center when nothing forces it', function () {
  var s = RE.createBoard();
  s.currentPlayer = 'O';
  assertEq(AI.chooseMove(s, 'O'), 4);
});

run('AI takes corner when center is filled', function () {
  var s = { board: [null,null,null,null,'X',null,null,null,null], currentPlayer: 'O', moveCount: 1 };
  assertEq(AI.chooseMove(s, 'O'), 0);
});

run('AI takes edge when no win/block, center taken, no free corner', function () {
  // X O X / . X . / O X O   -- center X, corners 0,2,6,8 all filled, no current
  // 3-in-a-row threat anywhere, edges 3 and 5 free. AI must pick an edge.
  var s = { board: ['X','O','X', null,'X',null, 'O','X','O'], currentPlayer: 'O', moveCount: 7 };
  var oc = RE.checkOutcome(s);
  assertEq(oc.status, 'in_progress');
  var m = AI.chooseMove(s, 'O');
  assertTrue(m === 3 || m === 5, 'AI should pick from edges, got ' + m);
});

run('AI win-priority beats block-priority', function () {
  // O can win at 2; X threatens win at 5. AI must pick 2.
  var s = { board: ['O','O',null,'X','X',null,null,null,null], currentPlayer: 'O', moveCount: 4 };
  assertEq(AI.chooseMove(s, 'O'), 2);
});

run('AI does not mutate input state', function () {
  var s = { board: ['X','X',null,null,'O',null,null,null,null], currentPlayer: 'O', moveCount: 3 };
  var snap = JSON.stringify(s);
  AI.chooseMove(s, 'O');
  assertEq(JSON.parse(snap), s);
});

run('AI returns a legal move on a near-full board', function () {
  var s = { board: ['X','O','X', 'O','X','O', 'X','O',null], currentPlayer: 'O', moveCount: 8 };
  var m = AI.chooseMove(s, 'O');
  assertEq(m, 8);
});

// -------------------- UI-RENDER UNDER MINIMAL DOM STUB --------------------
// We only need to exercise the contract surface: mount injects DOM, render
// accepts the documented ViewModel, classes flip with disabled/winningLine,
// onCellClick fires on empty enabled cells but not on filled or disabled.
function makeStubDom() {
  var listeners = new Map();
  function el(tag) {
    var node = {
      tagName: String(tag).toUpperCase(),
      children: [],
      attrs: {},
      _classes: [],
      _eventListeners: {},
      textContent: '',
      disabled: false,
      // ui-render sets these as properties (el.id = ..., el.className = ...);
      // we mirror them through to attrs so attribute-style reads still work.
      get id() { return node.attrs.id; },
      set id(v) { node.attrs.id = String(v); },
      classList: {
        add: function () { for (var i=0;i<arguments.length;i++) if (node._classes.indexOf(arguments[i]) === -1) node._classes.push(arguments[i]); },
        remove: function () { for (var i=0;i<arguments.length;i++) { var k = node._classes.indexOf(arguments[i]); if (k !== -1) node._classes.splice(k, 1); } },
        contains: function (c) { return node._classes.indexOf(c) !== -1; }
      },
      get className() { return node._classes.join(' '); },
      set className(v) { node._classes = v ? String(v).split(/\s+/) : []; },
      setAttribute: function (k, v) { node.attrs[k] = String(v); },
      getAttribute: function (k) { return node.attrs[k]; },
      appendChild: function (c) { node.children.push(c); c.parentNode = node; return c; },
      removeChild: function (c) { var i = node.children.indexOf(c); if (i !== -1) node.children.splice(i, 1); c.parentNode = null; return c; },
      addEventListener: function (ev, fn) { (node._eventListeners[ev] = node._eventListeners[ev] || []).push(fn); },
      _click: function () { (node._eventListeners.click || []).forEach(function (f) { f({ target: node }); }); },
      get parentNode() { return node._parent || null; },
      set parentNode(v) { node._parent = v; }
    };
    return node;
  }
  var body = el('body');
  var doc = {
    createElement: el,
    body: body,
    getElementById: function (id) {
      // Walk children to find by id; we never use this in render path.
      function walk(n) {
        if (!n) return null;
        if (n.attrs && n.attrs.id === id) return n;
        for (var i = 0; i < n.children.length; i++) {
          var f = walk(n.children[i]);
          if (f) return f;
        }
        return null;
      }
      return walk(body);
    },
    addEventListener: function () {}
  };
  return { document: doc, body: body };
}

run('ui-render: mount + initial render produces 9 empty cells, status, restart', function () {
  var stub = makeStubDom();
  global.window = { document: stub.document, RulesEngine: RE };
  global.document = stub.document;
  // Re-load ui-render under our stub by clearing the require cache.
  delete require.cache[require.resolve(path.join(SANDBOX, 'ui-render.js'))];
  var UI = require(path.join(SANDBOX, 'ui-render.js'));
  UI.mount();
  // Find ttt-root
  var root = stub.body.children[0];
  assertEq(root.attrs.id, 'ttt-root');
  // Children: status, board, restart
  assertEq(root.children.length, 3);
  var statusNode = root.children[0];
  var boardNode = root.children[1];
  var restartNode = root.children[2];
  assertEq(statusNode.attrs.id, 'ttt-status');
  assertEq(boardNode.attrs.id, 'ttt-board');
  assertEq(restartNode.attrs.id, 'ttt-restart');
  assertEq(boardNode.children.length, 9);
  // Render an empty viewModel.
  UI.render({
    cells: [null,null,null,null,null,null,null,null,null],
    statusText: 'Your turn',
    winningLine: null,
    disabled: false
  });
  assertEq(statusNode.textContent, 'Your turn');
  // All cells empty class, none filled
  boardNode.children.forEach(function (c) {
    assertTrue(c.classList.contains('ttt-cell--empty'));
    assertTrue(!c.classList.contains('ttt-cell--filled'));
    assertEq(c.textContent, '');
    assertEq(c.disabled, false);
  });
  UI._unmountForTesting();
});

run('ui-render: filled cell shows symbol, has --filled and --x/--o, button.disabled=true', function () {
  var stub = makeStubDom();
  global.window = { document: stub.document, RulesEngine: RE };
  global.document = stub.document;
  delete require.cache[require.resolve(path.join(SANDBOX, 'ui-render.js'))];
  var UI = require(path.join(SANDBOX, 'ui-render.js'));
  UI.mount();
  UI.render({
    cells: ['X',null,'O',null,null,null,null,null,null],
    statusText: 'Computer thinking...',
    winningLine: null,
    disabled: true
  });
  var root = stub.body.children[0];
  var board = root.children[1];
  assertTrue(root.classList.contains('ttt-root--disabled'));
  assertTrue(board.classList.contains('ttt-board--disabled'));
  assertEq(board.children[0].textContent, 'X');
  assertTrue(board.children[0].classList.contains('ttt-cell--filled'));
  assertTrue(board.children[0].classList.contains('ttt-cell--x'));
  assertEq(board.children[2].textContent, 'O');
  assertTrue(board.children[2].classList.contains('ttt-cell--o'));
  assertEq(board.children[0].disabled, true);
  assertEq(board.children[2].disabled, true);
  UI._unmountForTesting();
});

run('ui-render: winning line applies --win class to the 3 indices', function () {
  var stub = makeStubDom();
  global.window = { document: stub.document, RulesEngine: RE };
  global.document = stub.document;
  delete require.cache[require.resolve(path.join(SANDBOX, 'ui-render.js'))];
  var UI = require(path.join(SANDBOX, 'ui-render.js'));
  UI.mount();
  UI.render({
    cells: ['X','X','X',null,'O',null,null,'O',null],
    statusText: 'You win!',
    winningLine: [0,1,2],
    disabled: true
  });
  var root = stub.body.children[0];
  var board = root.children[1];
  [0,1,2].forEach(function (i) {
    assertTrue(board.children[i].classList.contains('ttt-cell--win'), 'cell ' + i + ' should be --win');
  });
  [3,4,5,6,7,8].forEach(function (i) {
    assertTrue(!board.children[i].classList.contains('ttt-cell--win'), 'cell ' + i + ' should NOT be --win');
  });
  UI._unmountForTesting();
});

run('ui-render: cell click on empty enabled cell fires handler with index; ignored when disabled', function () {
  var stub = makeStubDom();
  global.window = { document: stub.document, RulesEngine: RE };
  global.document = stub.document;
  delete require.cache[require.resolve(path.join(SANDBOX, 'ui-render.js'))];
  var UI = require(path.join(SANDBOX, 'ui-render.js'));
  UI.mount();
  var seen = [];
  UI.onCellClick(function (i) { seen.push(i); });
  UI.render({
    cells: [null,null,null,null,null,null,null,null,null],
    statusText: 'Your turn',
    winningLine: null,
    disabled: false
  });
  var root = stub.body.children[0];
  var board = root.children[1];
  board.children[3]._click(); // empty + enabled => fires
  // Now disabled
  UI.render({
    cells: [null,null,null,'X',null,null,null,null,null],
    statusText: 'Computer thinking...',
    winningLine: null,
    disabled: true
  });
  board.children[5]._click(); // disabled => suppressed by handler guard
  // Filled cell
  UI.render({
    cells: ['X',null,null,null,null,null,null,null,null],
    statusText: 'Your turn',
    winningLine: null,
    disabled: false
  });
  board.children[0]._click(); // filled => suppressed
  assertEq(seen, [3]);
  UI._unmountForTesting();
});

run('ui-render: restart handler fires on restart click', function () {
  var stub = makeStubDom();
  global.window = { document: stub.document, RulesEngine: RE };
  global.document = stub.document;
  delete require.cache[require.resolve(path.join(SANDBOX, 'ui-render.js'))];
  var UI = require(path.join(SANDBOX, 'ui-render.js'));
  UI.mount();
  var fired = 0;
  UI.onRestart(function () { fired++; });
  var root = stub.body.children[0];
  var restart = root.children[2];
  restart._click();
  restart._click();
  assertEq(fired, 2);
  UI._unmountForTesting();
});

// -------------------- CONTROLLER + INDEX.HTML STATIC INSPECTION --------------------
run('index.html: loads CSS + 4 JS in correct order, no external URLs', function () {
  var html = fs.readFileSync(path.join(SANDBOX, 'index.html'), 'utf8');
  var srcs = (html.match(/<script[^>]*src="([^"]+)"/g) || []).map(function (s) {
    return s.match(/src="([^"]+)"/)[1];
  });
  assertEq(srcs, ['rules-engine.js','ai-opponent.js','ui-render.js','controller.js']);
  assertTrue(/<link[^>]+href="ui-render\.css"/.test(html), 'css link present');
  assertTrue(html.indexOf('http://') === -1 && html.indexOf('https://') === -1, 'no external URLs');
  assertTrue(html.indexOf('<main id="app">') !== -1, '#app mount target present');
});

run('controller.js: composes RE + AI + UI; uses setTimeout for AI delay; no DOM mutation outside UI', function () {
  var js = fs.readFileSync(path.join(SANDBOX, 'controller.js'), 'utf8');
  ['RulesEngine','AIOpponent','UIRender','setTimeout','clearTimeout','AI_DELAY_MS','UI.mount','UI.onCellClick','UI.onRestart','UI.render','RE.applyMove','RE.checkOutcome','RE.createBoard','AI.chooseMove'].forEach(function (t) {
    assertTrue(js.indexOf(t) !== -1, 'controller missing: ' + t);
  });
  // Controller should not directly query/mutate DOM (renderer-only DOM rule)
  assertTrue(js.indexOf('document.querySelector') === -1, 'controller must not querySelector');
  assertTrue(js.indexOf('document.getElementById(') === -1 || js.indexOf('document.getElementById(') > -1 && false, 'unexpected getElementById in controller');
  // Allow document.addEventListener for DOMContentLoaded gating only
  // (no further assertion needed; that is the contract-allowed boot path).
});

run('controller.js: defensive ignore of clicks on filled cell or after game-over', function () {
  var js = fs.readFileSync(path.join(SANDBOX, 'controller.js'), 'utf8');
  // Look for guards on lastOutcome status and cell occupancy.
  assertTrue(/lastOutcome\.status\s*!==\s*'in_progress'/.test(js), 'guard on outcome status missing');
  assertTrue(/state\.board\[cellIndex\]\s*!==\s*null/.test(js), 'guard on cell occupancy missing');
});

run('no-network / no-persistence: no fetch/XMLHttpRequest/localStorage in any artifact', function () {
  ['rules-engine.js','ai-opponent.js','ui-render.js','controller.js','index.html'].forEach(function (f) {
    var src = fs.readFileSync(path.join(SANDBOX, f), 'utf8');
    ['fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'indexedDB', 'navigator.sendBeacon'].forEach(function (banned) {
      assertTrue(src.indexOf(banned) === -1, f + ' contains banned token: ' + banned);
    });
  });
});

run('integrated turn flow simulation (controller-level) using rules-engine + ai-opponent', function () {
  // Logical re-implementation of the controller's turn-flow, exercising the
  // real RE + AI modules. This validates that the composition produces a
  // playable game terminating in a valid outcome from a deterministic seed.
  var s = RE.createBoard();
  var oc = RE.checkOutcome(s);
  // Human plays corner (0), AI takes center, etc.
  var humanMoves = [0, 1, 6]; // sequence of human picks
  var idx = 0;
  while (oc.status === 'in_progress') {
    if (s.currentPlayer === 'X') {
      // Pick first humanMove that is still legal; otherwise pick first legal.
      var legal = RE.legalMoves(s);
      var pick = humanMoves.find(function (m) { return legal.indexOf(m) !== -1; });
      if (pick === undefined) pick = legal[0];
      s = RE.applyMove(s, pick, 'X');
    } else {
      var aimv = AI.chooseMove(s, 'O');
      // AI must return a legal move
      assertTrue(RE.legalMoves(s).indexOf(aimv) !== -1, 'AI returned illegal move ' + aimv);
      s = RE.applyMove(s, aimv, 'O');
    }
    oc = RE.checkOutcome(s);
    if (++idx > 9) throw new Error('turn flow did not terminate within 9 moves');
  }
  assertTrue(oc.status === 'win' || oc.status === 'draw', 'final outcome must be terminal');
});

run('restart logic: createBoard from any state returns clean GameState', function () {
  // Mid-game state, then "restart" via createBoard.
  var dirty = { board: ['X','O','X','O','X','O','X',null,null], currentPlayer: 'O', moveCount: 7 };
  var fresh = RE.createBoard();
  assertEq(fresh.board, [null,null,null,null,null,null,null,null,null]);
  assertEq(fresh.currentPlayer, 'X');
  assertEq(fresh.moveCount, 0);
  // checkOutcome on fresh is in_progress with no winning line.
  var oc = RE.checkOutcome(fresh);
  assertEq(oc.status, 'in_progress');
  assertEq(oc.winner, null);
  assertEq(oc.line, null);
  // dirty wasn't touched.
  assertEq(dirty.moveCount, 7);
});

// -------------------- EMIT REPORT --------------------
fs.writeFileSync(
  path.join(__dirname, 'test-report.json'),
  JSON.stringify(report, null, 2)
);

var lines = [];
lines.push('# Edge Case Test Report');
lines.push('Generated: ' + report.generated_at);
lines.push('');
lines.push('Pass: ' + report.pass_count + ' / ' + (report.pass_count + report.fail_count));
lines.push('');
report.cases.forEach(function (c) {
  lines.push((c.status === 'pass' ? '[PASS] ' : '[FAIL] ') + c.name + (c.detail ? '  -- ' + c.detail : ''));
});
fs.writeFileSync(path.join(__dirname, 'test-report.md'), lines.join('\n') + '\n');

console.log('Pass: ' + report.pass_count + ' / ' + (report.pass_count + report.fail_count));
if (report.fail_count > 0) {
  console.log('FAILURES:');
  report.cases.filter(function (c) { return c.status === 'fail'; }).forEach(function (c) {
    console.log('  - ' + c.name + ': ' + c.detail);
  });
  process.exit(1);
}
process.exit(0);
