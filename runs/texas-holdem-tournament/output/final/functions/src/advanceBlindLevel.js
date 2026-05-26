// functions/src/advanceBlindLevel.js — scheduled function: advance the blind level when due (S4.A5).
const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.advanceBlindLevel = functions.pubsub.schedule("every 1 minutes").onRun(async () => {
  const db = admin.firestore();
  const tsnap = await db.collection("tournaments").where("status", "==", "in_progress").get();
  for (const doc of tsnap.docs) {
    const t = doc.data();
    if (!t.config || !t.config.level_duration_minutes) continue;
    const startedMs = t.level_started_at ? new Date(t.level_started_at).getTime() : 0;
    const elapsed = Date.now() - startedMs;
    const due = (t.config.level_duration_minutes * 60 * 1000);
    if (elapsed >= due && (t.current_level || 1) < t.config.levels.length) {
      await doc.ref.update({
        current_level: (t.current_level || 1) + 1,
        level_started_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
  return null;
});
