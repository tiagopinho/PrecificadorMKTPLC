// sw.js — v6 (HTML network-first + assets stale-while-revalidate)
const CACHE_HTML   = 'precificador-html-v6';
const CACHE_ASSETS = 'precificador-assets-v6';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instala e pré-cacheia assets estáticos
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_ASSETS).then((c) => c.addAll(ASSETS)));
});

// Ativa e limpa caches antigos
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (
      k === CACHE_HTML || k === CACHE_ASSETS ? Promise.resolve() : caches.delete(k)
    )));
    await self.clients.claim();
  })());
});

// Estratégias de fetch
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    // HTML: network-first (garante que o index.html novo venha quando online)
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const ch = await caches.open(CACHE_HTML);
        ch.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match('./index.html');
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Assets: stale-while-revalidate (rápido e atualiza em background)
  e.respondWith((async () => {
    const cache = await caches.open(CACHE_ASSETS);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached); // se offline, usa cache
    return cached || fetchPromise;
  })());
});
