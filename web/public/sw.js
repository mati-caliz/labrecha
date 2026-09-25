const CACHE_VERSION = "v5";
const STATIC_CACHE = `labrecha-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `labrecha-dynamic-${CACHE_VERSION}`;
const CHUNKS_CACHE = `labrecha-chunks-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/indicadores",
  "/brechas",
  "/calculadoras",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

const KEPT_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, CHUNKS_CACHE];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)));
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return !KEPT_CACHES.includes(name);
          })
          .map((name) => {
            return caches.delete(name);
          }),
      );
    }),
  );
  self.clients.claim();
});

const cacheStrategies = {
  cacheFirst: async (request) => {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok && request.method === "GET") {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      return new Response("Offline", { status: 503 });
    }
  },

  networkFirst: async (request) => {
    try {
      const response = await fetch(request);
      if (response.ok && request.method === "GET") {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
      return new Response("Offline", { status: 503 });
    }
  },
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.protocol === "chrome-extension:") {
    return;
  }

  if (request.method !== "GET") {
    return;
  }

  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style"
  ) {
    event.respondWith(cacheStrategies.cacheFirst(request));
    return;
  }

  if (
    request.destination === "script" &&
    (url.pathname.includes("/_next/static/") || url.pathname.includes("/_next/chunks/"))
  ) {
    event.respondWith(
      caches.open(CHUNKS_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      }),
    );
    return;
  }

  event.respondWith(cacheStrategies.networkFirst(request));
});
