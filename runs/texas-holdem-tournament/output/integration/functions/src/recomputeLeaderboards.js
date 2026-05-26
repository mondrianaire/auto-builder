// functions/src/recomputeLeaderboards.js — callable Cloud Function: rebuild leaderboards from tournament history (S4.A7).
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { scoreTournament } = require("./scoring");

exports.recomputeLeaderboards = functions.https.onCall(async (data, context) => {
  // Admin-only.
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
  // Admin gate is also enforced at the Firestore rules layer for /leaderboards/* writes.

  const db = admin.firestore();
  const tsnap = await db.collection("tournaments").get();
  const tournaments = [];
  tsnap.forEach(d => tournaments.push({ id: d.id, ...d.data() }));
  const now = Date.now();
  const weekAgo  = now - 7  * 24 * 3600 * 1000;
  const monthAgo = now - 30 * 24 * 3600 * 1000;
  const buckets = { weekly: {}, monthly: {}, alltime: {} };
  for (const t of tournaments) {
    if (!(t.status === "finished" || t.status === "unfinished")) continue;
    const startingField = (t.seated_players || []).length;
    const endedAt = (t.ended_at && new Date(t.ended_at).getTime()) || now;
    const standings = t.final_standings || (t.seated_players || []).map((p, i) => ({
      uid: p.uid, display_name: p.display_name, photo_url: p.photo_url,
      finish_position: i + 1, chip_stack_at_end: p.chip_stack
    }));
    const eliminated = standings.filter(s => (s.chip_stack_at_end || 0) === 0).length;
    for (const s of standings) {
      const pts = scoreTournament({
        finish_position: s.finish_position,
        field_size: startingField,
        status: t.status,
        starting_field: startingField,
        players_eliminated: eliminated
      });
      const slots = ["alltime"];
      if (endedAt >= weekAgo)  slots.push("weekly");
      if (endedAt >= monthAgo) slots.push("monthly");
      for (const slot of slots) {
        const acc = buckets[slot][s.uid] || {
          uid: s.uid, display_name: s.display_name, photo_url: s.photo_url,
          score: 0, tournaments_played: 0, finished: 0
        };
        acc.score += pts;
        acc.tournaments_played += 1;
        if (t.status === "finished") acc.finished += 1;
        buckets[slot][s.uid] = acc;
      }
    }
  }
  const batch = db.batch();
  for (const slot of Object.keys(buckets)) {
    const entries = Object.values(buckets[slot]).sort((a, b) => b.score - a.score);
    batch.set(db.collection("leaderboards").doc(slot), { updated_at: Date.now(), entries });
  }
  await batch.commit();
  return { ok: true };
});
