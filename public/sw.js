/**
 * xcare Service Worker — Web Push handler (S322)
 *
 * Receives no-payload push signals from the server, fetches pending
 * notifications from /api/push/notifications, and shows them.
 */

self.addEventListener("push", (event) => {
  // Fetch unsent notifications (the push signal carries no payload)
  event.waitUntil(
    fetch("/api/push/notifications", { credentials: "include" })
      .then((res) => res.json())
      .then(({ notifications }) => {
        if (!notifications || notifications.length === 0) return;
        return Promise.all(
          notifications.map((n) =>
            self.registration.showNotification(n.titel, {
              body: n.nachricht,
              icon: "/icon-192.png",
              badge: "/icon-72.png",
              tag: n.id,
              data: { link: n.link ?? "/" },
            })
          )
        );
      })
      .catch(() => {
        // Fallback: show generic notification if fetch fails
        return self.registration.showNotification("xcare", {
          body: "Sie haben eine neue Benachrichtigung.",
          icon: "/icon-192.png",
        });
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing tab if available
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(link);
            return client.focus();
          }
        }
        // Open new tab
        if (clients.openWindow) return clients.openWindow(link);
      })
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
