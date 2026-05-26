// src/leaderboards.js — Weekly/Monthly/All-Time leaderboard surface.
import { db, doc, onSnapshot } from "./firebase.js";

let _unsub = null;
const TABS = [
  { id: "weekly",  label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "alltime", label: "All-Time" }
];

export function renderLeaderboards(root, user) {
  if (_unsub) _unsub();
  root.innerHTML = `
    <section class="leaderboards">
      <div class="leaderboards-header">
        <h2 class="surface-title">Leaderboards</h2>
        <span class="surface-sub">Scores use the Position-Weighted Completion Score (PWCS).</span>
      </div>
      <nav class="lb-tabs">
        ${TABS.map((t,i) => `<button class="lb-tab ${i===0?"active":""}" data-tab="${t.id}" type="button">${t.label}</button>`).join("")}
      </nav>
      <div id="lb-rows" class="lb-rows"></div>
    </section>
  `;
  const rowsRoot = root.querySelector("#lb-rows");
  let activeTab = "weekly";

  function sub(tab) {
    if (_unsub) _unsub();
    const ref = doc(db, "leaderboards", tab);
    _unsub = onSnapshot(ref, (snap) => {
      const data = snap.exists() ? snap.data() : { entries: [] };
      const entries = (data.entries || []).slice().sort((a,b) => (b.score || 0) - (a.score || 0));
      rowsRoot.innerHTML = entries.length === 0
        ? `<div class="lb-empty">No results yet. Play a tournament to populate this leaderboard.</div>`
        : entries.map((e, i) => `
          <div class="lb-row">
            <span class="lb-rank">${i+1}</span>
            <img class="lb-photo" src="${e.photo_url || ""}" alt="" referrerpolicy="no-referrer">
            <span class="lb-name">${escapeHtml(e.display_name || e.nickname || e.google_given_name || "Player")}</span>
            <span class="lb-score">${e.score || 0}</span>
            <span class="lb-detail">${e.tournaments_played || 0} played · ${e.finished || 0} finished</span>
          </div>
        `).join("");
    });
  }
  sub(activeTab);
  root.querySelectorAll(".lb-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".lb-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeTab = btn.dataset.tab;
      sub(activeTab);
    });
  });
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
