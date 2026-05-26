// functions/src/easterEggDispatch.js — 2-7o detection + Cloud Function trigger (DCA.PN5, IP7.A2).
const functions = require("firebase-functions");
const admin = require("firebase-admin");

function isTwoSevenOff(c1, c2) {
  const r1 = String(c1.rank), r2 = String(c2.rank);
  const has2 = r1 === "2" || r2 === "2";
  const has7 = r1 === "7" || r2 === "7";
  return has2 && has7 && c1.suit !== c2.suit;
}

exports.fireEasterEgg = functions.https.onCall(async (data, context) => {
  const { tid, hid } = data || {};
  if (!tid || !hid) throw new functions.https.HttpsError("invalid-argument", "tid + hid required");
  const ref = admin.firestore().doc(`tournaments/${tid}/hands/${hid}`);
  await ref.update({
    "easter_egg.triggered": true,
    "easter_egg.kind": "two-seven-off",
    "easter_egg.started_at": admin.firestore.FieldValue.serverTimestamp(),
    "action_clock.is_paused": true
  });
  setTimeout(async () => {
    await ref.update({
      "easter_egg.triggered": false,
      "action_clock.is_paused": false
    });
  }, 5200);
  return { ok: true };
});

module.exports.isTwoSevenOff = isTwoSevenOff;
