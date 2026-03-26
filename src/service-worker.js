const CACHE_NAME = "broadcast-console-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./bundle.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // Handle stream proxy requests
  if (url.pathname === "/api/stream") {
    event.respondWith(handleStreamProxy(event.request));
    return;
  }

  // Handle playlist proxy for CORS
  if (url.pathname === "/api/proxy") {
    event.respondWith(handleProxy(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (event.request.destination === "image") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

/**
 * Handle stream proxy requests
 * Adds CORS headers and pipes the stream
 */
async function handleStreamProxy(request) {
  const url = new URL(request.url);
  const streamUrl = url.searchParams.get("url");

  if (!streamUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const streamRequest = new Request(streamUrl, {
      method: request.method,
      headers: request.headers,
      credentials: "omit",
      redirect: "follow",
    });

    const response = await fetch(streamRequest);

    const headers = new Headers();
    response.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "*");
    headers.set("Access-Control-Expose-Headers", "*");
    headers.delete("content-encoding");
    headers.delete("content-length");
    headers.delete("Content-Security-Policy");
    headers.delete("X-Frame-Options");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("Stream proxy error:", error);
    return new Response(`Stream proxy error: ${error.message}`, {
      status: 502,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "text/plain",
      },
    });
  }
}

/**
 * Handle generic proxy requests for playlists
 */
async function handleProxy(request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const response = await fetch(proxyRequest);

    const headers = new Headers();
    response.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "*");
    headers.delete("content-encoding");
    headers.delete("content-length");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(`Proxy error: ${error.message}`, {
      status: 502,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "text/plain",
      },
    });
  }
}
