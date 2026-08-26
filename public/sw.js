// ─── Marchand Service Worker ──────────────────────────────────────────────────
// Handles Web Push notifications for the merchant dashboard.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Push event ───────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Marchand", body: event.data.text(), type: "default" };
  }

  const { title, body, type, url, icon } = payload;

  const options = {
    body,
    icon:  icon  || "/icon-192.png",
    badge: "/icon-72.png",
    tag:   type  || "marchand-notif",
    renotify: true,
    requireInteraction: type === "new_order",
    data: { url: url || "/dashboard" },
    actions: type === "new_order"
      ? [
          { action: "view",    title: "Voir la commande" },
          { action: "dismiss", title: "Ignorer" },
        ]
      : [],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing dashboard tab if open
      const existing = clients.find((c) => c.url.includes("/dashboard"));
      if (existing) {
        existing.focus();
        existing.navigate(targetUrl);
        return;
      }
      // Otherwise open new tab
      return self.clients.openWindow(targetUrl);
    })
  );
});
