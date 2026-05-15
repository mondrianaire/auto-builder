// sw.js — service worker for GTO Duel
//
// Handles the Web Push 'push' event by rendering a notification, and the
// 'notificationclick' event by focusing or opening the game tab.
//
// The service worker is intentionally minimal — we do not implement
// offline caching, because GitHub Pages serves over HTTPS and the static
// assets are small. The single responsibility here is Web Push.

self.addEventListener("install", (event) => {
  // Activate immediately on first install so push events route to the
  // current worker.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "Your turn", body: "Your opponent just submitted. It's your move." };
  try {
    if (event.data) {
      const text = event.data.text();
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.title) payload.title = parsed.title;
        if (parsed.body) payload.body = parsed.body;
        if (parsed.url) payload.url = parsed.url;
      }
    }
  } catch (_) {
    // Payload was empty or not JSON — use defaults.
  }
  const options = {
    body: payload.body,
    tag: "gto-duel-turn",
    renotify: true,
    icon: "./icons/icon-192.png",
    badge: "./icons/badge-72.png",
    data: { url: payload.url || "./" },
  };
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      // If a tab is already open at the app, focus it.
      for (const client of clientsArr) {
        if ("focus" in client) {
          client.focus();
          // Best-effort: try to navigate it to the target URL.
          if ("navigate" in client) {
            try {
              client.navigate(new URL(targetUrl, self.location.href).toString());
            } catch (_) {}
          }
          return;
        }
      }
      // Otherwise open a new window.
      if (self.clients.openWindow) {
        return self.clients.openWindow(new URL(targetUrl, self.location.href).toString());
      }
    })
  );
});
