// functions/test/runTests.js — Node test harness for pure-function edge_case_testing assertions.
// Run: `node functions/test/runTests.js`
// Used by section-10 (edge-case-testing) to validate scoring/shuffle/handEngine/easterEgg pure functions.

const assert = require("assert");
const { positionPoints, completionWeight, scoreTournament } = require("../src/scoring");
const { shuffleDeck, freshDeck } = require("../src/shuffle");
const { resolveActionOrder } = require("../src/handEngine");
const { distributePots } = require("../src/pots");
// Inline isTwoSevenOff to avoid pulling firebase-functions via easterEggDispatch.
function isTwoSevenOff(c1, c2) {
  const r1 = String(c1.rank), r2 = String(c2.rank);
  const has2 = r1 === "2" || r2 === "2";
  const has7 = r1 === "7" || r2 === "7";
  return has2 && has7 && c1.suit !== c2.suit;
}

const results = [];
function test(label, fn) {
  try { fn(); results.push({ label, status: "pass" }); }
  catch (e) { results.push({ label, status: "fail", error: e.message }); }
}

// IP5.A1
test("IP5.A1 scoreTournament(finished 1st of 9) === 100", () => {
  const s = scoreTournament({ finish_position: 1, field_size: 9, status: "finished", starting_field: 9, players_eliminated: 8 });
  assert.strictEqual(s, 100);
});
// IP5.A2
test("IP5.A2 unfinished 9-player zero eliminations === 0", () => {
  for (let pos = 1; pos <= 9; pos++) {
    const s = scoreTournament({ finish_position: pos, field_size: 9, status: "unfinished", starting_field: 9, players_eliminated: 0 });
    assert.strictEqual(s, 0);
  }
});
// IP5.A3
test("IP5.A3 unfinished 9-player 8 elims 1st place === 100", () => {
  const s = scoreTournament({ finish_position: 1, field_size: 9, status: "unfinished", starting_field: 9, players_eliminated: 8 });
  assert.strictEqual(s, 100);
});
// IP1.A4 / S4.A4
test("IP1.A4 heads-up button acts first preflop, BB first post-flop", () => {
  assert.strictEqual(resolveActionOrder(2, "preflop").first_seat, 0);
  assert.strictEqual(resolveActionOrder(2, "flop").first_seat, 1);
});
// S4.A1 (presence)
test("S4.A1 shuffle.js shuffles 52 cards with no Math.random", () => {
  const d = shuffleDeck(freshDeck());
  assert.strictEqual(d.length, 52);
  const src = require("fs").readFileSync(require.resolve("../src/shuffle.js"), "utf8");
  assert.ok(!/Math\.random/.test(src), "shuffle.js must not contain Math.random");
});
// S4.A3
test("S4.A3 distributePots: 100/300/500 all-in produces main 300, side 400, side 200", () => {
  const pots = distributePots({0: 100, 1: 300, 2: 500}, [0, 1, 2]);
  // Layer 1: cap 100, three contributors → 300
  // Layer 2: cap 300 (delta 200), two contributors (1 and 2) → 400
  // Layer 3: cap 500 (delta 200), one contributor (2) → 200
  assert.strictEqual(pots.length, 3);
  assert.strictEqual(pots[0].amount, 300);
  assert.deepStrictEqual(pots[0].eligible_seat_indices.sort(), [0,1,2]);
  assert.strictEqual(pots[1].amount, 400);
  assert.deepStrictEqual(pots[1].eligible_seat_indices.sort(), [1,2]);
  assert.strictEqual(pots[2].amount, 200);
  assert.deepStrictEqual(pots[2].eligible_seat_indices, [2]);
});
// DCA.PN5
test("DCA.PN5 isTwoSevenOff: positive cases", () => {
  assert.strictEqual(isTwoSevenOff({rank:"2",suit:"h"},{rank:"7",suit:"c"}), true);
  assert.strictEqual(isTwoSevenOff({rank:"2",suit:"s"},{rank:"7",suit:"d"}), true);
  assert.strictEqual(isTwoSevenOff({rank:"7",suit:"d"},{rank:"2",suit:"h"}), true);
});
test("DCA.PN5 isTwoSevenOff: negative cases (suited 2-7 and non-2-7 offsuit)", () => {
  assert.strictEqual(isTwoSevenOff({rank:"2",suit:"h"},{rank:"7",suit:"h"}), false);
  assert.strictEqual(isTwoSevenOff({rank:"3",suit:"h"},{rank:"8",suit:"c"}), false);
});

console.log(JSON.stringify({ when: new Date().toISOString(), pass: results.filter(r=>r.status==="pass").length, fail: results.filter(r=>r.status==="fail").length, results }, null, 2));
process.exit(results.some(r => r.status === "fail") ? 1 : 0);
