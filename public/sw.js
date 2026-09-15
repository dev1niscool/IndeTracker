const CACHE = 'inde-archive-v2';
const ROOT = new URL('./', self.location.href);
const SHELL = [
  './', './index.html', './styles.css', './app.js', './news-utils.mjs',
  './data/news.json', './data/sources.json', './manifest.webmanifest',
  './icons/favicon-32.png', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];

async function savedResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Inde-Saved-Archive', 'true');
  return new Response(await response.arrayBuffer(), { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(SHELL.map(path => new Request(new URL(path, ROOT).href, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('inde-archive-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  // Versioned assets and archive requests each share one canonical offline copy.
  const cacheKey = new URL(url.pathname, ROOT.origin).href;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(cacheKey, response.clone());
      else {
        const previous = await cache.match(cacheKey);
        if (previous) return savedResponse(previous);
      }
      return response;
    } catch {
      const saved = await cache.match(cacheKey) ||
        (event.request.mode === 'navigate' ? await cache.match(ROOT.href) : null);
      return saved ? savedResponse(saved) : new Response('This item is not available offline.', {
        status: 503, headers: { 'Content-Type': 'text/plain' }
      });
    }
  })());
});
