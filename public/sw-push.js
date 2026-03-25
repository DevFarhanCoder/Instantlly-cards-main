// Service Worker for push notifications
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/messaging";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || "Instantly", {
        body: data.body || "You have a new message",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-72.png",
        vibrate: [200, 100, 200],
        tag: data.tag || "instantly-msg",
        renotify: true,
        data: { url: data.url || "/messaging" },
      })
    );
  } catch {
    // Silently fail
  }
});
