// src/notifications.js — browser Notifications API + in-app banner fallback (IP9, TD-IP-G).
// No FCM, no service worker (per TD-IP-G.A1).

let _permission = (typeof Notification !== "undefined") ? Notification.permission : "denied";

export async function ensureNotificationPermission() {
  if (typeof Notification === "undefined") return "denied";
  if (_permission === "default") {
    _permission = await Notification.requestPermission();
  }
  return _permission;
}

export function notify(title, body) {
  if (typeof Notification !== "undefined" && _permission === "granted") {
    try {
      new Notification(title, { body: body || "" });
      return;
    } catch (e) {
      // Fall through to banner.
    }
  }
  showInAppBanner(title, body);
}

function showInAppBanner(title, body) {
  const banner = document.createElement("div");
  banner.className = "inapp-banner";
  banner.innerHTML = `
    <div class="banner-title"></div>
    <div class="banner-body"></div>
    <button class="banner-close" type="button" aria-label="Dismiss">&times;</button>
  `;
  banner.querySelector(".banner-title").textContent = title || "";
  banner.querySelector(".banner-body").textContent  = body || "";
  document.body.appendChild(banner);
  banner.querySelector(".banner-close").addEventListener("click", () => banner.remove());
  setTimeout(() => banner.remove(), 6000);
}
