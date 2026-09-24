const STATIC_CACHE = "mcl-static-v3";
const MONITOR_CACHE = "mcl-monitor-v3";
const CURRENT_CACHES = new Set([STATIC_CACHE, MONITOR_CACHE]);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith("mcl-") && !CURRENT_CACHES.has(name)).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline-and-not-cached");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    void fetch(request).then((response) => {
      if (response && response.ok) return cache.put(request, response.clone());
    }).catch(() => undefined);
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isMonitorNavigation = request.mode === "navigate" && url.pathname.startsWith("/grupamento/monitor/");
  const isMonitorApi =
    url.pathname === "/api/grupamento/sag/latest" ||
    url.pathname.startsWith("/api/grupamento/monitor-content/playlist");
  const isMonitorAsset = url.pathname.startsWith("/api/grupamento/monitor-content/assets/");
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json";

  if (isMonitorNavigation || isMonitorApi) {
    event.respondWith(networkFirst(request, MONITOR_CACHE));
    return;
  }

  if (isMonitorAsset || isStatic) {
    event.respondWith(cacheFirst(request, isStatic ? STATIC_CACHE : MONITOR_CACHE));
  }
});
