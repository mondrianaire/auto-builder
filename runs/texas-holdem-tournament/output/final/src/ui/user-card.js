// src/ui/user-card.js — top-right user account card + panel.
import { displayName, setNickname, setNotificationPref, setFourColorDeck, signOutCurrentUser } from "../auth.js";
import { ensureNotificationPermission } from "../notifications.js";

export function renderUserCard(root, user) {
  if (!root || !user) return;
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "user-card-wrap";
  wrap.innerHTML = `
    <button class="user-card-trigger" type="button" aria-expanded="false">
      <img class="user-photo" src="${user.google_photo_url || ""}" alt="" referrerpolicy="no-referrer">
      <span class="user-name">${escapeHtml(displayName(user))}</span>
    </button>
    <div class="user-card-panel" hidden>
      <div class="panel-row">
        <label class="panel-label" for="nickname-input">NICKNAME</label>
        <input id="nickname-input" class="panel-input" type="text" maxlength="24"
               placeholder="${escapeHtml(user.google_given_name)}"
               value="${escapeHtml(user.nickname || "")}">
        <button class="panel-save" id="nickname-save" type="button">Save</button>
      </div>
      <div class="panel-row toggle-row">
        <label class="toggle-label" for="notif-cur">Notify me about current game events</label>
        <input id="notif-cur" type="checkbox" class="toggle" ${user.notification_prefs.current_game ? "checked" : ""}>
      </div>
      <div class="panel-row toggle-row">
        <label class="toggle-label" for="notif-new">Notify me about new tournaments</label>
        <input id="notif-new" type="checkbox" class="toggle" ${user.notification_prefs.new_tournaments ? "checked" : ""}>
      </div>
      <div class="panel-row toggle-row">
        <label class="toggle-label" for="fourcolor">4-color deck</label>
        <input id="fourcolor" type="checkbox" class="toggle" ${user.four_color_deck ? "checked" : ""}>
      </div>
      <div class="panel-row">
        <button class="panel-signout" id="signout-btn" type="button">Sign out</button>
      </div>
    </div>
  `;
  root.appendChild(wrap);

  const trig  = wrap.querySelector(".user-card-trigger");
  const panel = wrap.querySelector(".user-card-panel");
  trig.addEventListener("click", () => {
    const open = panel.hasAttribute("hidden");
    if (open) { panel.removeAttribute("hidden"); trig.setAttribute("aria-expanded", "true"); }
    else      { panel.setAttribute("hidden", ""); trig.setAttribute("aria-expanded", "false"); }
  });
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) { panel.setAttribute("hidden", ""); trig.setAttribute("aria-expanded", "false"); }
  });

  wrap.querySelector("#nickname-save").addEventListener("click", async () => {
    const v = wrap.querySelector("#nickname-input").value.trim();
    await setNickname(v);
  });
  wrap.querySelector("#notif-cur").addEventListener("change", async (e) => {
    if (e.target.checked) await ensureNotificationPermission();
    await setNotificationPref("current_game", e.target.checked);
  });
  wrap.querySelector("#notif-new").addEventListener("change", async (e) => {
    if (e.target.checked) await ensureNotificationPermission();
    await setNotificationPref("new_tournaments", e.target.checked);
  });
  wrap.querySelector("#fourcolor").addEventListener("change", async (e) => {
    await setFourColorDeck(e.target.checked);
  });
  wrap.querySelector("#signout-btn").addEventListener("click", () => signOutCurrentUser());
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
