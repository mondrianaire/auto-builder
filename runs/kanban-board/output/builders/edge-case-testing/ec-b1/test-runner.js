/**
 * Edge-case test harness for kanban-board.
 *
 * Covers every acceptance assertion with verifier=edge_case_testing across
 * sections 1-5. Loads the integrated artifact files via jsdom so the test
 * subject is the actual deployed code.
 *
 * Output: report.json next to this script with each assertion id's pass/fail.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/tmp/node_modules/jsdom');

const INTEGRATION_DIR = path.resolve(__dirname, '../../../integration');
const OUT_DIR = __dirname;

function readModule(name) {
  return fs.readFileSync(path.join(INTEGRATION_DIR, name), 'utf8');
}

function makeDom() {
  const dom = new JSDOM('<!doctype html><html><body><main id="app"></main></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
    runScripts: 'outside-only'
  });
  const win = dom.window;
  win.eval(readModule('state-model.js'));
  win.eval(readModule('persistence.js'));
  win.eval(readModule('ui-render.js'));
  win.eval(readModule('dnd.js'));
  win.eval(readModule('interactions.js'));
  return dom;
}

const results = [];
function record(id, statement, passed, info) {
  results.push({
    assertion_id: id,
    statement: statement,
    passed: !!passed,
    info: info || ''
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function dispatchDragEvent(win, target, type, init) {
  const ev = new win.Event(type, { bubbles: true, cancelable: true });
  ev.dataTransfer = { effectAllowed: '', dropEffect: '', setData: function () {}, getData: function () { return ''; }, types: [] };
  Object.assign(ev, init || {});
  target.dispatchEvent(ev);
  return ev;
}

// S1.A2 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const sm = dom.window.StateModel.createStateModel(null);
    const s = sm.getState();
    assert(s && Array.isArray(s.lists), 'lists is array');
    assert(s.lists.length === 3, 'default seed has 3 lists');
    for (const l of s.lists) {
      assert(typeof l.id === 'string', 'list.id string');
      assert(typeof l.name === 'string', 'list.name string');
      assert(Array.isArray(l.cards), 'list.cards array');
    }
    record('S1.A2', 'getState returns BoardState shape', true, 'shape verified on default seed');
  } catch (e) {
    record('S1.A2', 'getState returns BoardState shape', false, e.message);
  }
})();

// S1.A3 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const sm = dom.window.StateModel.createStateModel(null);
    let calls = 0;
    let lastState = null;
    sm.subscribe(function (s) { calls += 1; lastState = s; });
    sm.createList('Foo');
    assert(calls >= 1, 'subscriber called at least once');
    assert(lastState && lastState.lists.some(function (l) { return l.name === 'Foo'; }), 'state contains Foo');
    record('S1.A3', 'subscribe fires on mutation', true, 'calls=' + calls);
  } catch (e) {
    record('S1.A3', 'subscribe fires on mutation', false, e.message);
  }
})();

// S1.A4 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const sm = dom.window.StateModel.createStateModel(null);
    const before = JSON.stringify(sm.getState());
    const r1 = sm.createCard(sm.getState().lists[0].id, '');
    const r2 = sm.createCard(sm.getState().lists[0].id, '   ');
    const r3 = sm.moveCard('nope', 'nope', 'nope', 0);
    const r4 = sm.deleteList('does-not-exist');
    const after = JSON.stringify(sm.getState());
    assert(r1 === null, 'empty title rejected');
    assert(r2 === null, 'whitespace title rejected');
    assert(r3 === false, 'moveCard with bad ids returns false');
    assert(r4 === false, 'deleteList missing returns false');
    assert(before === after, 'state unchanged after invalid ops');
    const cardId = sm.createCard(sm.getState().lists[0].id, 'Hi');
    assert(typeof cardId === 'string', 'valid createCard returned id');
    record('S1.A4', 'invalid inputs rejected, valid produce delta', true, '');
  } catch (e) {
    record('S1.A4', 'invalid inputs rejected, valid produce delta', false, e.message);
  }
})();

// S1.A6 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const sm = dom.window.StateModel.createStateModel({ lists: [
      { id: 'L1', name: 'A', cards: [] },
      { id: 'L2', name: 'B', cards: [] }
    ]});
    const cId = sm.createCard('L1', 'C');
    const ok = sm.moveCard(cId, 'L1', 'L2', 0);
    assert(ok === true, 'moveCard returns true');
    const s = sm.getState();
    const L1 = s.lists.find(function (x) { return x.id === 'L1'; });
    const L2 = s.lists.find(function (x) { return x.id === 'L2'; });
    assert(L1.cards.length === 0, 'L1 empty');
    assert(L2.cards.length === 1 && L2.cards[0].id === cId, 'L2 has the card at index 0');
    record('S1.A6', 'moveCard moves card across lists', true, '');
  } catch (e) {
    record('S1.A6', 'moveCard moves card across lists', false, e.message);
  }
})();

// S1.A7 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const sm = dom.window.StateModel.createStateModel({ lists: [
      { id: 'L', name: 'L', cards: [
        { id: 'A', title: 'A' },
        { id: 'B', title: 'B' },
        { id: 'C', title: 'C' }
      ] }
    ]});
    const ok = sm.reorderCard('C', 'L', 0);
    assert(ok === true, 'reorderCard returns true');
    const s = sm.getState();
    const order = s.lists[0].cards.map(function (c) { return c.id; });
    assert(deepEqual(order, ['C','A','B']), 'order is [C,A,B] but got ' + JSON.stringify(order));
    record('S1.A7', 'reorderCard reorders within list', true, '');
  } catch (e) {
    record('S1.A7', 'reorderCard reorders within list', false, e.message);
  }
})();

// S1.A8 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const sm = dom.window.StateModel.createStateModel({ lists: [
      { id: 'L', name: 'L', cards: [] }
    ]});
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      const lid = sm.createList('L' + i);
      assert(typeof lid === 'string', 'list id is string');
      assert(!ids.has(lid), 'list id collision: ' + lid);
      ids.add(lid);
    }
    for (let i = 0; i < 100; i++) {
      const cid = sm.createCard('L', 'C' + i);
      assert(typeof cid === 'string', 'card id is string');
      assert(!ids.has(cid), 'card id collision: ' + cid);
      ids.add(cid);
    }
    record('S1.A8', 'ids unique across 100 lists + 100 cards', true, 'total=' + ids.size);
  } catch (e) {
    record('S1.A8', 'ids unique across 100 lists + 100 cards', false, e.message);
  }
})();

// S2.A1 / S2.A5 -----------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const win = dom.window;
    win.localStorage.clear();
    let r1 = win.Persistence.load();
    assert(r1 === null, 'load with empty storage returns null');
    win.localStorage.setItem(win.Persistence.STORAGE_KEY, 'not-json{{{');
    let threw = false;
    let r2;
    try { r2 = win.Persistence.load(); } catch (e) { threw = true; }
    assert(!threw, 'corrupt JSON did not throw');
    assert(r2 === null, 'corrupt JSON returns null');
    record('S2.A1', 'load returns null on absent or corrupt', true, '');
    record('S2.A5', 'corrupt JSON does not throw', true, '');
  } catch (e) {
    record('S2.A1', 'load returns null on absent or corrupt', false, e.message);
    record('S2.A5', 'corrupt JSON does not throw', false, e.message);
  }
})();

// S2.A2 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const win = dom.window;
    win.localStorage.clear();
    const state = { lists: [{ id: 'l1', name: 'X', cards: [] }] };
    win.Persistence.save(state);
    const raw = win.localStorage.getItem(win.Persistence.STORAGE_KEY);
    assert(typeof raw === 'string', 'raw is string');
    const parsed = JSON.parse(raw);
    assert(deepEqual(parsed, state), 'parsed deep-equals state');
    record('S2.A2', 'save serializes state under STORAGE_KEY', true, '');
  } catch (e) {
    record('S2.A2', 'save serializes state under STORAGE_KEY', false, e.message);
  }
})();

// S2.A3 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const win = dom.window;
    win.Persistence.save({ lists: [] });
    win.Persistence.clear();
    const r = win.Persistence.load();
    assert(r === null, 'load is null after clear');
    record('S2.A3', 'clear removes the key', true, '');
  } catch (e) {
    record('S2.A3', 'clear removes the key', false, e.message);
  }
})();

// S3.A1 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const win = dom.window;
    const sm = win.StateModel.createStateModel({ lists: [
      { id: 'A', name: 'A', cards: [{ id: 'a1', title: 'a1' }, { id: 'a2', title: 'a2' }] },
      { id: 'B', name: 'B', cards: [{ id: 'b1', title: 'b1' }] }
    ]});
    const root = win.document.getElementById('app');
    win.UiRender.mountRenderer(root, sm);
    const lists = root.querySelectorAll('.list[data-list-id]');
    const cards = root.querySelectorAll('.card[data-card-id]');
    assert(lists.length === 2, 'expected 2 lists, got ' + lists.length);
    assert(cards.length === 3, 'expected 3 cards, got ' + cards.length);
    const cardIds = Array.from(cards).map(function (c) { return c.getAttribute('data-card-id'); });
    assert(deepEqual(cardIds, ['a1','a2','b1']), 'card document order matches state order; got ' + JSON.stringify(cardIds));
    record('S3.A1', 'columns and cards rendered in order', true, '');
  } catch (e) {
    record('S3.A1', 'columns and cards rendered in order', false, e.message);
  }
})();

// S3.A2 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const win = dom.window;
    const sm = win.StateModel.createStateModel({ lists: [
      { id: 'L1', name: 'L', cards: [{ id: 'card-only', title: 'X' }] }
    ]});
    const root = win.document.getElementById('app');
    win.UiRender.mountRenderer(root, sm);
    const card = root.querySelector('.card[data-card-id="card-only"]');
    assert(card, 'card element exists');
    assert(card.getAttribute('draggable') === 'true', 'draggable=true');
    assert(card.getAttribute('data-card-id') === 'card-only', 'data-card-id matches');
    assert(card.getAttribute('data-list-id') === 'L1', 'data-list-id matches its list');
    record('S3.A2', 'cards have draggable=true and data ids', true, '');
  } catch (e) {
    record('S3.A2', 'cards have draggable=true and data ids', false, e.message);
  }
})();

// S3.A4 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const win = dom.window;
    const sm = win.StateModel.createStateModel({ lists: [] });
    const root = win.document.getElementById('app');
    win.UiRender.mountRenderer(root, sm);
    const addList = root.querySelector("[data-action='add-list']");
    assert(addList, 'add-list affordance present');
    record('S3.A4', 'empty board still shows add-list affordance', true, '');
  } catch (e) {
    record('S3.A4', 'empty board still shows add-list affordance', false, e.message);
  }
})();

// S4.A3 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const win = dom.window;
    const sm = win.StateModel.createStateModel({ lists: [
      { id: 'L1', name: 'L1', cards: [{ id: 'cX', title: 'X' }] }
    ]});
    const root = win.document.getElementById('app');
    win.UiRender.mountRenderer(root, sm);

    let moveCalls = 0, reorderCalls = 0;
    const origMove = sm.moveCard, origReorder = sm.reorderCard;
    sm.moveCard = function () { moveCalls++; return origMove.apply(sm, arguments); };
    sm.reorderCard = function () { reorderCalls++; return origReorder.apply(sm, arguments); };
    win.Dnd.wireDnd(root, sm);

    const card = root.querySelector('.card[data-card-id="cX"]');
    dispatchDragEvent(win, card, 'dragstart');
    dispatchDragEvent(win, win.document.body, 'drop', { clientY: 0 });
    dispatchDragEvent(win, card, 'dragend');

    assert(moveCalls === 0, 'moveCard not called on drop outside zone');
    assert(reorderCalls === 0, 'reorderCard not called on drop outside zone');
    const s = sm.getState();
    assert(s.lists[0].cards.length === 1 && s.lists[0].cards[0].id === 'cX', 'state unchanged');
    record('S4.A3', 'drop outside any drop zone is a no-op', true, '');
  } catch (e) {
    record('S4.A3', 'drop outside any drop zone is a no-op', false, e.message);
  }
})();

// S4.A4 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const win = dom.window;
    const sm = win.StateModel.createStateModel({ lists: [
      { id: 'L1', name: 'L1', cards: [{ id: 'cX', title: 'X' }] },
      { id: 'L2', name: 'L2', cards: [] }
    ]});
    const root = win.document.getElementById('app');
    win.UiRender.mountRenderer(root, sm);
    win.Dnd.wireDnd(root, sm);

    let card = root.querySelector('.card[data-card-id="cX"]');
    let list2 = root.querySelector('.list[data-list-id="L2"]');

    dispatchDragEvent(win, card, 'dragstart');
    dispatchDragEvent(win, list2, 'dragenter');
    assert(list2.classList.contains('drag-over'), 'drag-over class added on dragenter');
    dispatchDragEvent(win, list2, 'dragover', { clientY: 0 });
    assert(list2.classList.contains('drag-over'), 'drag-over class still present during dragover');
    // Cancel path: dragleave to body
    dispatchDragEvent(win, list2, 'dragleave', { relatedTarget: win.document.body });
    assert(!list2.classList.contains('drag-over'), 'drag-over class removed on dragleave');
    // Drop path: re-enter, drop, then verify the freshly rendered list element has no drag-over
    dispatchDragEvent(win, list2, 'dragenter');
    dispatchDragEvent(win, list2, 'drop', { clientY: 0 });
    const freshList2 = root.querySelector('.list[data-list-id="L2"]');
    assert(freshList2, 'list2 re-rendered');
    assert(!freshList2.classList.contains('drag-over'), 'drag-over class absent from re-rendered list after drop');
    record('S4.A4', 'drag-over class lifecycle', true, '');
  } catch (e) {
    record('S4.A4', 'drag-over class lifecycle', false, e.message);
  }
})();

// S5.A7 -------------------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    const win = dom.window;
    const sm = win.StateModel.createStateModel({ lists: [
      { id: 'L1', name: 'L1', cards: [] }
    ]});
    let createCalls = 0;
    const orig = sm.createCard;
    sm.createCard = function () { createCalls++; return orig.apply(sm, arguments); };

    const root = win.document.getElementById('app');
    win.UiRender.mountRenderer(root, sm);
    win.Interactions.wireInteractions(root, sm);

    const before = sm.getState().lists[0].cards.length;

    const addCardBtn = root.querySelector(".list[data-list-id='L1'] [data-action='add-card']");
    addCardBtn.click();
    const input = root.querySelector(".list[data-list-id='L1'] .inline-add");
    assert(input, 'inline input present after add-card click');
    input.value = '';
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    const addCardBtn2 = root.querySelector(".list[data-list-id='L1'] [data-action='add-card']");
    addCardBtn2.click();
    const input2 = root.querySelector(".list[data-list-id='L1'] .inline-add");
    input2.value = '   ';
    input2.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    const after = sm.getState().lists[0].cards.length;
    assert(after === before, 'no card added after empty/whitespace submissions');
    assert(createCalls === 0, 'createCard not called for empty/whitespace; calls=' + createCalls);
    record('S5.A7', 'empty/whitespace titles rejected client-side', true, '');
  } catch (e) {
    record('S5.A7', 'empty/whitespace titles rejected client-side', false, e.message);
  }
})();

// ---- write report --------------------------------------------------------
const passed = results.filter(function (r) { return r.passed; }).length;
const failed = results.filter(function (r) { return !r.passed; }).length;
const report = {
  generated_at: new Date().toISOString(),
  total: results.length,
  passed: passed,
  failed: failed,
  results: results
};
fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: results.length, passed: passed, failed: failed }));
results.forEach(function (r) {
  console.log((r.passed ? 'PASS ' : 'FAIL ') + r.assertion_id + ' :: ' + r.statement + (r.passed ? '' : ' - ' + r.info));
});
process.exit(failed === 0 ? 0 : 1);
