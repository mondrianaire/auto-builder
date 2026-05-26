// src/admin.js — light maintenance dashboard, gated on ADMIN_UID.
import { db, doc, collection, getDocs, onSnapshot, setDoc, updateDoc } from "./firebase.js";
import { ADMIN_UID, SERVER_ENGINE_MODE } from "./config.js";
import { scoreTournament } from "./scoring.js";

let _unsub = null;

export async function renderAdmin(root, user) {
  if (_unsub) _unsub();
  if (!user || user.uid !== ADMIN_UID) {
    root.innerHTML = `
      <section class="admin-denied">
        <h2 class="surface-title">Access denied</h2>
        <p>This dashboard is restricted to the project administrator. If you are the project owner, set <code>ADMIN_UID</code> in <code>src/config.js</code> to your Google uid and redeploy.</p>
      </section>
    `;
    return;
  }
  root.innerHTML = `
    <section class="admin">
      <div class="admin-header">
        <h2 class="surface-title">Maintenance dashboard</h2>
        <span class="surface-sub">Light edits only — single administrator.</span>
      </div>
      <div class="admin-actions">
        <button id="recompute-btn" class="primary-btn" type="button">Recompute leaderboards</button>
      </div>
      <div id="admin-tournaments" class="admin-tournaments"></div>
    </section>
  `;

  const tsRoot = root.querySelector("#admin-tournaments");
  // For single-tournament-at-launch the doc id is "active"; we also scan the collection
  // in case the admin wants to inspect prior tournaments archived via force-end.
  const colRef = collection(db, "tournaments");
  _unsub = onSnapshot(colRef, (qsnap) => {
    const docs = [];
    qsnap.forEach(d => docs.push({ id: d.id, ...d.data() }));
    const groups = {
      in_progress: docs.filter(d => d.status === "in_progress"),
      awaiting:    docs.filter(d => d.status === "awaiting_start"),
      finished:    docs.filter(d => d.status === "finished"),
      unfinished:  docs.filter(d => d.status === "unfinished")
    };
    tsRoot.innerHTML = `
      ${groupBlock("In progress", groups.in_progress, true)}
      ${groupBlock("Awaiting start", groups.awaiting, true)}
      ${groupBlock("Finished", groups.finished, false)}
      ${groupBlock("Unfinished", groups.unfinished, false)}
    `;
    tsRoot.querySelectorAll(".force-end-btn").forEach(b => {
      b.addEventListener("click", async () => {
        const id = b.dataset.id;
        await updateDoc(doc(db, "tournaments", id), { status: "unfinished", ended_at: Date.now() });
      });
    });
  });

  root.querySelector("#recompute-btn").addEventListener("click", async () => {
    if (SERVER_ENGINE_MODE === "cloud-functions") {
      const { recomputeLeaderboardsCallable } = await import("./game-engine-cloud-shim.js");
      await recomputeLeaderboardsCallable();
    } else {
      await recomputeLeaderboardsInProcess();
    }
    alert("Leaderboards recomputed.");
  });
}

function groupBlock(label, items, withForceEnd) {
  return `
    <div class="admin-group">
      <h3 class="admin-group-h">${label} <span class="admin-group-count">(${items.length})</span></h3>
      <div class="admin-rows">
        ${items.length === 0 ? `<div class="admin-empty">No tournaments.</div>` : ""}
        ${items.map(t => `
          <div class="admin-row">
            <span class="admin-tid">${escapeHtml(t.id)}</span>
            <span class="admin-status">${escapeHtml(t.status || "")}</span>
            <span class="admin-seated">${(t.seated_players || []).length} players</span>
            ${withForceEnd ? `<button class="force-end-btn secondary-btn" data-id="${escapeHtml(t.id)}" type="button">Force end</button>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function recomputeLeaderboardsInProcess() {
  // Walk every tournament; aggregate PWCS per player across windows.
  const colRef = collection(db, "tournaments");
  const qsnap = await getDocs(colRef);
  const tournaments = [];
  qsnap.forEach(d => tournaments.push({ id: d.id, ...d.data() }));
  const now = Date.now();
  const weekAgo  = now - 7  * 24 * 3600 * 1000;
  const monthAgo = now - 30 * 24 * 3600 * 1000;
  const buckets = { weekly: {}, monthly: {}, alltime: {} };
  for (const t of tournaments) {
    if (!(t.status === "finished" || t.status === "unfinished")) continue;
    const startingField = (t.seated_players || []).length;
    const endedAt = t.ended_at || t.started_at || now;
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
  for (const slot of Object.keys(buckets)) {
    const entries = Object.values(buckets[slot]).sort((a,b) => b.score - a.score);
    await setDoc(doc(db, "leaderboards", slot), { updated_at: Date.now(), entries });
  }
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
