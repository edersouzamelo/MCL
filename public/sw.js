const STATIC_CACHE = "mcl-static-v4";
const MONITOR_CACHE = "mcl-monitor-navigation-v4";
const ASSET_CACHE = "mcl-monitor-assets-v4";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  // Keep older build chunks: an offline monitor may still reference that build.
  event.waitUntil(self.clients.claim());
});

async function saveResponse(cache, request, response) {
  if (response.ok && !response.redirected) {
    try { await cache.put(request, response.clone()); }
    catch (error) { console.warn("MCL: falha ao persistir recurso", error); }
  }
}

async function navigation(request) {
  const cache = await caches.open(MONITOR_CACHE);
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(4500) });
    if (response.status >= 500) throw new Error("Monitor temporariamente indisponível");
    await saveResponse(cache, request, response);
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw new Error("Monitor ainda não preparado para abertura offline");
  }
}

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  await saveResponse(cache, request, response);
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.headers.has("X-MCL-Revalidate")) return;
  if (request.mode === "navigate" && /^\/grupamento\/monitor\/[1-8]\/?$/.test(url.pathname)) {
    event.respondWith(navigation(request));
  } else if (url.pathname.startsWith("/api/grupamento/monitor-content/assets/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  } else if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json") {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
  // APIs deliberately remain network-only. Atomic, organization-scoped snapshots
  // belong to the monitor client; a cached 200 must not report a successful sync.
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "MCL_PREPARE_MONITOR") return;
  event.waitUntil((async () => {
    try {
      const client = event.source;
      const source = client?.url ? new URL(client.url) : null;
      const path = event.data.path;
      if (!source || source.origin !== self.location.origin || source.pathname !== path || !/^\/grupamento\/monitor\/[1-8]\/?$/.test(path)) throw new Error("Monitor inválido");
      const response = await fetch(path, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!response.ok || response.redirected || !response.headers.get("Content-Type")?.includes("text/html")) throw new Error("Navegação não autorizada ou indisponível");
      const html = await response.clone().text();
      const resources = new Set([
        ...(event.data.resources ?? []),
        ...Array.from(html.matchAll(/(?:src|href)="([^" ]+)"/g), (match) => match[1].replaceAll("&amp;", "&")),
      ]);
      const cache = await caches.open(STATIC_CACHE);
      for (const resource of resources) {
        const url = new URL(resource, self.location.origin);
        if (url.origin !== self.location.origin || !(url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))) continue;
        if (await cache.match(url.href)) continue;
        const asset = await fetch(url.href, { signal: AbortSignal.timeout(8000) });
        if (!asset.ok) throw new Error("Recurso do monitor indisponível");
        await cache.put(url.href, asset);
      }
      await (await caches.open(MONITOR_CACHE)).put(path, response);
      event.ports[0]?.postMessage({ ok: true });
    } catch (error) { event.ports[0]?.postMessage({ ok: false, error: String(error) }); }
  })());
});
