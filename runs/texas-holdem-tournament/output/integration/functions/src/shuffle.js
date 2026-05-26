// functions/src/shuffle.js — cryptographic shuffle using Node's crypto.randomBytes (TD-IP-C, S4.A1).
const crypto = require("crypto");

function randomInt(maxExclusive) {
  return crypto.randomInt(0, maxExclusive);
}

function shuffleDeck(deck) {
  // Fisher-Yates with CSPRNG (no non-cryptographic random anywhere in this file — S4.A1).
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
  }
  return deck;
}

function freshDeck() {
  const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  const SUITS = ["s","h","d","c"];
  const out = [];
  for (const r of RANKS) for (const s of SUITS) out.push({ rank: r, suit: s });
  return out;
}

module.exports = { shuffleDeck, freshDeck, randomInt };
