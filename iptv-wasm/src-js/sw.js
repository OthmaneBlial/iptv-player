/**
 * Service Worker for IPTV Player
 * Handles stream proxy for CORS and caching
 */

const CACHE_NAME = 'iptv-player-v1';
const STREAM_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        // Add other static assets as needed
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - handle stream proxy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle stream proxy requests
  if (url.pathname === '/api/stream') {
    event.respondWith(handleStreamProxy(event.request));
    return;
  }

  // Handle playlist proxy for CORS
  if (url.pathname === '/api/proxy') {
    event.respondWith(handleProxy(event.request));
    return;
  }

  // Default: network first, then cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request);
      })
  );
});

/**
 * Handle stream proxy requests
 * Adds CORS headers and pipes the stream
 */
async function handleStreamProxy(request) {
  const url = new URL(request.url);
  const streamUrl = url.searchParams.get('url');

  if (!streamUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const streamRequest = new Request(streamUrl, {
      method: request.method,
      headers: request.headers,
      // Don't include credentials for cross-origin streams
      credentials: 'omit',
      redirect: 'follow',
    });

    const response = await fetch(streamRequest);

    // Create new headers with CORS
    const headers = new Headers();
    response.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    // Add CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Access-Control-Expose-Headers', '*');

    // Remove problematic headers
    headers.delete('Content-Security-Policy');
    headers.delete('X-Frame-Options');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error('Stream proxy error:', error);
    return new Response(`Stream proxy error: ${error.message}`, {
      status: 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      },
    });
  }
}

/**
 * Handle generic proxy requests for playlists
 */
async function handleProxy(request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const response = await fetch(proxyRequest);

    const headers = new Headers();
    response.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(`Proxy error: ${error.message}`, {
      status: 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      },
    });
  }
}
