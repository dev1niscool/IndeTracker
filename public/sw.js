const CACHE = 'inde-archive-v1';
const ROOT = new URL('./', self.location.href);
async function savedResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Inde-Saved-Archive', 'true');
  return new Response(await response.arrayBuffer(), {status:response.status,statusText:response.statusText,headers});
}
const SHELL = ['./','./index.html','./styles.css','./app.js','./data/news.json','./data/sources.json','./manifest.webmanifest','./favicon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(path => new URL(path,ROOT).href))).then(() => self.skipWaiting()));});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('inde-archive-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if(event.request.method !== 'GET' || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if(response.ok) await cache.put(event.request,response.clone());
      else {const previous = await cache.match(event.request);if(previous)return savedResponse(previous);}
      return response;
    } catch(error) {
      const saved = await cache.match(event.request) || (event.request.mode === 'navigate' ? await cache.match(ROOT.href) : null);
      return saved ? savedResponse(saved) : new Response('This item has not been saved for offline use.', {status:503,headers:{'Content-Type':'text/plain'}});
    }
  })());
});
