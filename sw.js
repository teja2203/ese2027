/* ESE2027 Study OS — Service Worker
   Cache-first for app shell, network-first for Supabase, offline-ready. */
const VERSION = "ese2027-v15";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/data.js",
  "./js/app.js",
  "./manifest.json",
  "./icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Web Push — fires even when the app is fully closed.
self.addEventListener("push", (event) => {
  let d = { title: "ESE2027", body: "Time to study." };
  try { d = event.data.json(); } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-192.png",
      tag: d.tag || "ese-push",
      renotify: true,
      vibrate: [120, 60, 120]
    })
  );
});

// Tapping a notification opens the app (or focuses it if already open).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) return w.focus();
      }
      return self.clients.openWindow("./index.html");
    })
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept Supabase or non-GET requests — sync must hit the network.
  if (event.request.method !== "GET" || url.hostname.includes("supabase")) return;

  // App shell + same-origin: cache-first with background refresh (stale-while-revalidate).
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetched = fetch(event.request)
          .then((res) => {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(VERSION).then((c) => c.put(event.request, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
    return;
  }

  // Cross-origin (fonts, CDN libs): cache-first, fill cache on first success.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const clone = res.clone();
            caches.open(VERSION).then((c) => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
