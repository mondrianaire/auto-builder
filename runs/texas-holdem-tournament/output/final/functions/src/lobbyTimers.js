// functions/src/lobbyTimers.js — auto-start tournament 5 minutes after first join (IP4.A2).
const functions = require("firebase-functions");
const admin = require("firebase-admin");

const AUTO_START_AFTER_MS = 5 * 60 * 1000;

exports.lobbyTimers = exports.autoStartTimer = functions.pubsub.schedule("every 1 minutes").onRun(async () => {
  const db = admin.firestore();
  const snap = await db.collection("tournaments").where("status", "==", "awaiting_start").get();
  for (const doc of snap.docs) {
    const t = doc.data();
    if (!t.first_join_at) continue;
    const firstJoinMs = new Date(t.first_join_at).getTime();
    const elapsed = Date.now() - firstJoinMs;
    if (elapsed >= AUTO_START_AFTER_MS && (t.seated_players || []).length >= 2) {
      await doc.ref.update({
        status: "in_progress",
        started_at: admin.firestore.FieldValue.serverTimestamp(),
        level_started_at: admin.firestore.FieldValue.serverTimestamp(),
        current_level: 1
      });
    }
  }
  return null;
});
