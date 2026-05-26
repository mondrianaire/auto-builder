// src/lobby.js — lobby view, awaiting players, Start tournament action.
import { db, doc, setDoc, getDoc, onSnapshot, serverTimestamp, arrayUnion } from "./firebase.js";
import { renderSettingsForm } from "./tournament/settings-form.js";
import { AUTO_START_AFTER_MS, SERVER_ENGINE_MODE } from "./config.js";
import { displayName } from "./auth.js";

const ACTIVE_TID = "active"; // single-concurrent-tournament invariant (A4): one fixed id

let _unsub = null;

export function renderLobby(root, user) {
  if (_unsub) _unsub();
  root.innerHTML = `
    <section class="lobby">
      <div class="lobby-header">
        <h2 class="surface-title">Lobby</h2>
        <span class="surface-sub">Single tournament at a time. Sign in, join, start when ready.</span>
      </div>
      <div id="lobby-state"></div>
      <div id="settings-panel" hidden>
        <h3 class="settings-title">Tournament settings</h3>
        <div id="settings-form-root"></div>
      </div>
    </section>
  `;
  const stateEl = root.querySelector("#lobby-state");
  const settingsEl = root.querySelector("#settings-panel");
  const settingsRoot = root.querySelector("#settings-form-root");

  const tref = doc(db, "tournaments", ACTIVE_TID);

  _unsub = onSnapshot(tref, async (snap) => {
    let t = snap.exists() ? snap.data() : null;
    if (!t) {
      // No active tournament: render "create the first" affordance.
      stateEl.innerHTML = `
        <div class="lobby-empty">
          <p class="lobby-empty-msg">No tournament running. Open the settings panel below and start one.</p>
          <button id="open-settings" class="primary-btn" type="button">Configure tournament</button>
        </div>
      `;
      stateEl.querySelector("#open-settings").addEventListener("click", () => {
        settingsEl.removeAttribute("hidden");
        renderSettingsForm(settingsRoot, async (config) => {
          await setDoc(tref, {
            tid: ACTIVE_TID,
            status: "awaiting_start",
            config,
            seated_players: [],
            first_join_at: null,
            current_hand_id: null,
            created_at: Date.now()
          });
        });
      });
      return;
    }

    // We have a tournament. Render seated-list + Join + Start.
    settingsEl.setAttribute("hidden", "");
    const seated = t.seated_players || [];
    const meSeated = seated.some(p => p.uid === user.uid);
    const canStart = (t.status === "awaiting_start") && seated.length >= 2;

    const inProgress = (t.status === "in_progress");
    const joinLabel = meSeated ? "" : (inProgress ? "Late register (next hand)" : "Join");

    stateEl.innerHTML = `
      <div class="lobby-state">
        <div class="seated-list" aria-label="${inProgress ? "Seated players" : "Awaiting members"}">
          ${seated.length === 0 ? `<div class="seated-empty">Be the first to join</div>` : ""}
          ${seated.map(p => `
            <div class="seated-chip" title="${escapeAttr(p.display_name)}">
              <img class="seated-photo" src="${p.photo_url || ""}" alt="" referrerpolicy="no-referrer">
              <span class="seated-name">${escapeHtml(p.display_name)}</span>
            </div>
          `).join("")}
        </div>
        <div class="lobby-actions">
          ${meSeated ? "" : `<button id="join-btn" class="primary-btn" type="button">${joinLabel}</button>`}
          ${meSeated && !inProgress ? `<button id="leave-btn" class="secondary-btn" type="button">Leave</button>` : ""}
          ${meSeated && inProgress ? `<a href="#/table" class="primary-btn" role="button">Go to table</a>` : ""}
          ${!inProgress ? `<button id="start-btn" class="primary-btn ${canStart ? "" : "disabled"}"
                  type="button" ${canStart ? "" : "disabled"}>
            Start tournament
          </button>` : ""}
          <span class="lobby-status">Status: <code>${escapeHtml(t.status)}</code></span>
          ${t.first_join_at && !inProgress ? `<span class="auto-start-note">Auto-start 5 minutes after first join.</span>` : ""}
          ${inProgress ? `<span class="late-reg-note">Tournament running — late entries get the full starting stack and join at the next deal.</span>` : ""}
        </div>
      </div>
    `;

    const joinBtn = stateEl.querySelector("#join-btn");
    if (joinBtn) joinBtn.addEventListener("click", async () => {
      const newSeated = [...seated, {
        uid: user.uid,
        display_name: displayName(user),
        photo_url: user.google_photo_url,
        chip_stack: t.config.starting_stack_chips,
        ...(inProgress ? { joined_at: Date.now(), late_entry: true } : {})
      }];
      const patch = { seated_players: newSeated };
      if (!t.first_join_at) patch.first_join_at = Date.now();
      await setDoc(tref, patch, { merge: true });
      // Late entry during in-progress: jump to table view so the user sees the
      // game state immediately and gets dealt in on the next hand.
      if (inProgress) location.hash = "#/table";
    });

    const leaveBtn = stateEl.querySelector("#leave-btn");
    if (leaveBtn) leaveBtn.addEventListener("click", async () => {
      const newSeated = seated.filter(p => p.uid !== user.uid);
      await setDoc(tref, { seated_players: newSeated }, { merge: true });
    });

    const startBtn = stateEl.querySelector("#start-btn");
    if (startBtn && canStart) {
      startBtn.addEventListener("click", async () => {
        await startTournament(tref, t);
      });
    }

    // Auto-start: schedule once on first-join when running in client-dealer mode.
    if (SERVER_ENGINE_MODE === "client-dealer" && t.status === "awaiting_start" && t.first_join_at && seated.length >= 2) {
      const elapsed = Date.now() - t.first_join_at;
      const remaining = AUTO_START_AFTER_MS - elapsed;
      if (remaining > 0) {
        // The "lowest-UID seated client" is the canonical scheduler.
        const lowest = seated.map(p => p.uid).sort()[0];
        if (lowest === user.uid) {
          setTimeout(async () => {
            // Re-read the doc before transitioning; another client may have started already.
            const fresh = await getDoc(tref);
            if (fresh.exists() && fresh.data().status === "awaiting_start" && (fresh.data().seated_players || []).length >= 2) {
              await startTournament(tref, fresh.data());
            }
          }, remaining + 200);
        }
      }
    }
  });
}

async function startTournament(tref, t) {
  // Deal the first hand; transition status.
  const { startHandClient } = await import("./game-engine-client.js");
  await setDoc(tref, { status: "in_progress", started_at: Date.now() }, { merge: true });
  await startHandClient(tref.id, t);
  location.hash = "#/table";
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
