// sw.js — curto com network-first para HTML
const CACHE = 'precificador-v5';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const wantsHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (wantsHTML) {
    // HTML: tenta REDE primeiro; se falhar, usa cache (offline)
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('./index.html')) || new Response('Offline', {status: 503});
      }
    })());
  } else {
    // Outros arquivos: cache-first
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
  }
});
