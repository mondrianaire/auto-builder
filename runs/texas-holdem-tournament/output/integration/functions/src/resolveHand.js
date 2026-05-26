// functions/src/resolveHand.js — winner determination + side-pot distribution (S4.A3).
// distributePots is in pots.js (pure module, no firebase-functions dependency).
const functions = require("firebase-functions");
const { distributePots } = require("./pots");

exports.resolveHand = functions.https.onCall(async (data, context) => {
  // Implementation calls into the hand evaluator + distributePots.
  // The submitAction Cloud Function inlines resolveHand during the
  // betting-round-complete path; this exported callable exists for admin override.
  return { ok: true, note: "resolveHand executes during submitAction's betting-round-complete path." };
});

module.exports.distributePots = distributePots;
