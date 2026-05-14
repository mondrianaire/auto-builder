/**
 * Convergence Verifier artifact-exercise runner.
 *
 * Exercises the integrated artifact end-to-end via jsdom. Covers the
 * acceptance assertions tagged verifier=cv_artifact_exercise plus the
 * required user_flow scenarios listed in the CV briefing.
 *
 * Output: cv-runner-report.json next to this script.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/tmp/node_modules/jsdom');

const INTEGRATION_DIR = path.resolve(__dirname, '../integration');
const OUT_DIR = __dirname;

function readModule(name) {
  return fs.readFileSync(path.join(INTEGRATION_DIR, name), 'utf8');
}

function makeDom() {
  const html = '<!doctype html><html><body><main id="app"></main></body></html>';
  const dom = new JSDOM(html, {
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

function bootApp(dom) {
  const win = dom.window;
  const root = win.document.getElementById('app');
  const initial = win.Persistence.load();
  const sm = win.StateModel.createStateModel(initial);
  const renderer = win.UiRender.mountRenderer(root, sm);
  const dnd = win.Dnd.wireDnd(root, sm);
  const inter = win.Interactions.wireInteractions(root, sm);
  sm.subscribe(function (state) { win.Persistence.save(state); });
  win.Persistence.save(sm.getState());
  return { win: win, root: root, sm: sm, renderer: renderer, dnd: dnd, inter: inter };
}

function dispatchDragEvent(win, target, type, init) {
  const ev = new win.Event(type, { bubbles: true, cancelable: true });
  ev.dataTransfer = {
    effectAllowed: '',
    dropEffect: '',
    setData: function () {},
    getData: function () { return ''; },
    types: []
  };
  Object.assign(ev, init || {});
  target.dispatchEvent(ev);
  return ev;
}

const results = [];
function record(scenario, passed, detail) {
  results.push({ scenario: scenario, passed: !!passed, detail: detail || '' });
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

// --- a. First-load seed ----------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    dom.window.localStorage.clear();
    const app = bootApp(dom);
    const titles = Array.from(app.root.querySelectorAll('.list .list-title'))
      .map(function (t) { return t.textContent; });
    assert(titles.length === 3, 'expected 3 lists, got ' + titles.length);
    assert(titles[0] === 'To Do', 'list 0 = ' + titles[0]);
    assert(titles[1] === 'Doing', 'list 1 = ' + titles[1]);
    assert(titles[2] === 'Done', 'list 2 = ' + titles[2]);
    const cards = app.root.querySelectorAll('.card[data-card-id]');
    assert(cards.length === 0, 'expected 0 cards on first load, got ' + cards.length);
    const addList = app.root.querySelector("[data-action='add-list']");
    assert(addList, 'add-list affordance present');
    record('a. first-load seed', true,
      'rendered ["To Do","Doing","Done"] with 0 cards and add-list affordance');
  } catch (e) {
    record('a. first-load seed', false, e.message);
  }
})();

// --- b. Add card persists across reload -----------------------------------
(function () {
  try {
    const dom1 = makeDom();
    dom1.window.localStorage.clear();
    const app1 = bootApp(dom1);
    const todoListId = app1.sm.getState().lists[0].id;
    app1.sm.createCard(todoListId, 'My Card');
    const stored = dom1.window.localStorage.getItem(app1.win.Persistence.STORAGE_KEY);
    assert(typeof stored === 'string' && stored.length > 0, 'persisted JSON written');

    const dom2 = makeDom();
    dom2.window.localStorage.setItem(dom2.window.Persistence.STORAGE_KEY, stored);
    const app2 = bootApp(dom2);
    const titles = Array.from(app2.root.querySelectorAll('.card .card-title'))
      .map(function (n) { return n.textContent; });
    assert(titles.indexOf('My Card') >= 0, 'My Card visible after reload; titles=' + JSON.stringify(titles));
    const s2 = app2.sm.getState();
    const todo2 = s2.lists.find(function (l) { return l.name === 'To Do'; });
    assert(todo2 && todo2.cards.length === 1 && todo2.cards[0].title === 'My Card',
      'card persists in correct list');
    record('b. add card persists across reload', true,
      'card "My Card" still in "To Do" after simulated reload');
  } catch (e) {
    record('b. add card persists across reload', false, e.message);
  }
})();

// --- c. DnD between lists changes state -----------------------------------
(function () {
  try {
    const dom = makeDom();
    dom.window.localStorage.clear();
    const win = dom.window;
    const sm = win.StateModel.createStateModel({ lists: [
      { id: 'L1', name: 'A', cards: [{ id: 'cA', title: 'CardA' }] },
      { id: 'L2', name: 'B', cards: [] }
    ]});
    const root = win.document.getElementById('app');
    win.UiRender.mountRenderer(root, sm);
    win.Dnd.wireDnd(root, sm);

    const card = root.querySelector('.card[data-card-id="cA"]');
    const listB = root.querySelector('.list[data-list-id="L2"]');
    assert(card && listB, 'card and target list found');

    dispatchDragEvent(win, card, 'dragstart');
    dispatchDragEvent(win, listB, 'dragenter');
    dispatchDragEvent(win, listB, 'dragover', { clientY: 100 });
    dispatchDragEvent(win, listB, 'drop', { clientY: 100 });

    const s = sm.getState();
    const Aafter = s.lists.find(function (l) { return l.id === 'L1'; });
    const Bafter = s.lists.find(function (l) { return l.id === 'L2'; });
    assert(Aafter.cards.length === 0, 'A is empty after drop; got ' + Aafter.cards.length);
    assert(Bafter.cards.length === 1 && Bafter.cards[0].id === 'cA', 'B has cA');
    record('c. dnd between lists changes state', true,
      'cA moved L1 -> L2 via dragstart/drop sequence');
  } catch (e) {
    record('c. dnd between lists changes state', false, e.message);
  }
})();

// --- d. Reorder within list ------------------------------------------------
// Note: jsdom does not perform CSS layout, so getBoundingClientRect() returns
// zeros and the y-based drop-index calculation cannot pin a specific position
// in jsdom. We verify the wired-up contract instead:
//   (1) Same-list drop dispatches reorderCard with the correct (cardId, listId).
//       moveCard is NOT called.
//   (2) reorderCard, called directly with toIndex=0, produces order [B,A]
//       (state-model behavior; also covered by edge-case S1.A7).
(function () {
  try {
    const dom = makeDom();
    const win = dom.window;
    const sm = win.StateModel.createStateModel({ lists: [
      { id: 'L', name: 'L', cards: [
        { id: 'A', title: 'A' },
        { id: 'B', title: 'B' }
      ]}
    ]});
    const root = win.document.getElementById('app');
    win.UiRender.mountRenderer(root, sm);

    let reorderArgs = null, moveCalls = 0;
    const origReorder = sm.reorderCard, origMove = sm.moveCard;
    sm.reorderCard = function () { reorderArgs = [].slice.call(arguments); return origReorder.apply(sm, arguments); };
    sm.moveCard = function () { moveCalls++; return origMove.apply(sm, arguments); };
    win.Dnd.wireDnd(root, sm);

    const cardB = root.querySelector('.card[data-card-id="B"]');
    const list = root.querySelector('.list[data-list-id="L"]');
    dispatchDragEvent(win, cardB, 'dragstart');
    dispatchDragEvent(win, list, 'dragenter');
    dispatchDragEvent(win, list, 'dragover', { clientY: 0 });
    dispatchDragEvent(win, list, 'drop', { clientY: 0 });

    assert(reorderArgs !== null, 'reorderCard was invoked on same-list drop');
    assert(reorderArgs[0] === 'B' && reorderArgs[1] === 'L',
      'reorderCard called with (cardId=B, listId=L); got ' + JSON.stringify(reorderArgs));
    assert(moveCalls === 0, 'moveCard NOT called on same-list drop');

    const ok = origReorder.call(sm, 'B', 'L', 0);
    assert(ok === true, 'reorderCard returned true');
    const order = sm.getState().lists[0].cards.map(function (c) { return c.id; });
    assert(JSON.stringify(order) === JSON.stringify(['B','A']),
      'after reorderCard(B,L,0) order=[B,A]; got ' + JSON.stringify(order));
    record('d. reorder within list', true,
      'reorderCard wired on same-list drop with (B,L,...); state-model produces [B,A] when toIndex=0');
  } catch (e) {
    record('d. reorder within list', false, e.message);
  }
})();

// --- e. Delete card --------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    dom.window.localStorage.clear();
    const win = dom.window;
    const sm = win.StateModel.createStateModel({ lists: [
      { id: 'L', name: 'L', cards: [{ id: 'cZ', title: 'Z' }] }
    ]});
    const root = win.document.getElementById('app');
    win.UiRender.mountRenderer(root, sm);
    win.Interactions.wireInteractions(root, sm);
    sm.subscribe(function (s) { win.Persistence.save(s); });

    const delBtn = root.querySelector('.card[data-card-id="cZ"] [data-action="delete-card"]');
    assert(delBtn, 'delete-card button exists');
    delBtn.click();

    const remaining = root.querySelectorAll('.card[data-card-id]');
    assert(remaining.length === 0, 'card removed from DOM');
    const stored = JSON.parse(win.localStorage.getItem(win.Persistence.STORAGE_KEY));
    assert(stored.lists[0].cards.length === 0, 'localStorage updated');
    record('e. delete card', true, 'card removed from DOM and localStorage');
  } catch (e) {
    record('e. delete card', false, e.message);
  }
})();

// --- f. Rename list --------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    dom.window.localStorage.clear();
    const win = dom.window;
    const sm = win.StateModel.createStateModel({ lists: [
      { id: 'L', name: 'OldName', cards: [] }
    ]});
    const root = win.document.getElementById('app');
    win.UiRender.mountRenderer(root, sm);
    win.Interactions.wireInteractions(root, sm);
    sm.subscribe(function (s) { win.Persistence.save(s); });

    const titleEl = root.querySelector(".list[data-list-id='L'] [data-role='list-title']");
    assert(titleEl, 'title element found');
    titleEl.click();
    const input = root.querySelector(".list[data-list-id='L'] .inline-edit");
    assert(input, 'inline-edit input present');
    input.value = 'NewName';
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    const newTitle = root.querySelector(".list[data-list-id='L'] [data-role='list-title']");
    assert(newTitle && newTitle.textContent === 'NewName',
      'rendered title is NewName; got ' + (newTitle && newTitle.textContent));
    const stored = JSON.parse(win.localStorage.getItem(win.Persistence.STORAGE_KEY));
    assert(stored.lists[0].name === 'NewName', 'name persisted');
    record('f. rename list', true, 'OldName -> NewName, persisted to localStorage');
  } catch (e) {
    record('f. rename list', false, e.message);
  }
})();

// --- g. Add list -----------------------------------------------------------
(function () {
  try {
    const dom = makeDom();
    dom.window.localStorage.clear();
    const win = dom.window;
    const sm = win.StateModel.createStateModel({ lists: [
      { id: 'L1', name: 'Existing', cards: [] }
    ]});
    const root = win.document.getElementById('app');
    win.UiRender.mountRenderer(root, sm);
    win.Interactions.wireInteractions(root, sm);
    sm.subscribe(function (s) { win.Persistence.save(s); });

    const addBtn = root.querySelector("[data-action='add-list']");
    assert(addBtn, 'add-list button present');
    addBtn.click();
    const input = root.querySelector('.inline-add');
    assert(input, 'inline-add input present');
    input.value = 'Backlog';
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    const titles = Array.from(root.querySelectorAll('.list .list-title')).map(function (t) { return t.textContent; });
    assert(titles.length === 2, 'two lists; got ' + titles.length);
    assert(titles[titles.length - 1] === 'Backlog', 'Backlog is rightmost; titles=' + JSON.stringify(titles));
    const stored = JSON.parse(win.localStorage.getItem(win.Persistence.STORAGE_KEY));
    assert(stored.lists.length === 2 && stored.lists[1].name === 'Backlog', 'Backlog persisted');
    record('g. add list (rightmost + persisted)', true, 'Backlog appended; persisted');
  } catch (e) {
    record('g. add list (rightmost + persisted)', false, e.message);
  }
})();

// --- h. Delete list (with cards) -------------------------------------------
(function () {
  try {
    const dom = makeDom();
    dom.window.localStorage.clear();
    const win = dom.window;
    win.confirm = function () { return true; };
    const sm = win.StateModel.createStateModel({ lists: [
      { id: 'L', name: 'Doomed', cards: [{ id: 'c1', title: 'X' }] }
    ]});
    const root = win.document.getElementById('app');
    win.UiRender.mountRenderer(root, sm);
    win.Interactions.wireInteractions(root, sm);
    sm.subscribe(function (s) { win.Persistence.save(s); });

    const delBtn = root.querySelector(".list[data-list-id='L'] [data-action='delete-list']");
    assert(delBtn, 'delete-list button found');
    delBtn.click();

    const stillThere = root.querySelector(".list[data-list-id='L']");
    assert(!stillThere, 'list removed from DOM');
    const stored = JSON.parse(win.localStorage.getItem(win.Persistence.STORAGE_KEY));
    assert(stored.lists.length === 0, 'no lists in storage');
    record('h. delete list with cards', true, 'list and its cards removed; persisted');
  } catch (e) {
    record('h. delete list with cards', false, e.message);
  }
})();

// --- write report ----------------------------------------------------------
const passed = results.filter(function (r) { return r.passed; }).length;
const failed = results.filter(function (r) { return !r.passed; }).length;
const report = {
  generated_at: new Date().toISOString(),
  total: results.length,
  passed: passed,
  failed: failed,
  results: results
};
fs.writeFileSync(path.join(OUT_DIR, 'cv-runner-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: results.length, passed: passed, failed: failed }));
results.forEach(function (r) {
  console.log((r.passed ? 'PASS ' : 'FAIL ') + r.scenario + (r.passed ? '' : ' - ' + r.detail));
});
process.exit(failed === 0 ? 0 : 1);
sted');
  } catch (e) {
    record('h. delete list with cards', false, e.message);
  }
})();

// --- write report ----------------------------------------------------------
const passed = results.filter(function (r) { return r.passed; }).length;
const failed = results.filter(function (r) { return !r.passed; }).length;
const report = {
  generated_at: new Date().toISOString(),
  total: results.length,
  passed: passed,
  failed: failed,
  results: results
};
fs.writeFileSync(path.join(OUT_DIR, 'cv-runner-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: results.length, passed: passed, failed: failed }));
results.forEach(function (r) {
  console.log((r.passed ? 'PASS ' : 'FAIL ') + r.scenario + (r.passed ? '' : ' - ' + r.detail));
});
process.exit(failed === 0 ? 0 : 1);
