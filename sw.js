self.addEventListener('fetch', (e) => {
  const req = e.request;
  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');
  const isIcon = req.url.includes('/icons/icon-');
  
  if (isHTML || isIcon) {
    // HTML e ÍCONES: network-first (busca do servidor primeiro)
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const ch = await caches.open(isHTML ? CACHE_HTML : CACHE_ASSETS);
        ch.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }
  
  // Outros assets: stale-while-revalidate
  e.respondWith((async () => {
    const cache = await caches.open(CACHE_ASSETS);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});
