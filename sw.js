// ─────────────────────────────────────────────
//  AURA MUSIC PLAYER — Service Worker
//  Change VERSION whenever you deploy new files.
//  That's the only line you ever need to edit.
// ─────────────────────────────────────────────
const VERSION    = '2.0';
const CACHE_NAME = 'aura-v' + VERSION;
const ASSETS     = ['./index.html', './manifest.json'];

// ── INSTALL: pre-cache core assets ───────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting(); // activate immediately
});

// ── ACTIVATE: delete old caches, claim clients ─
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
  // Tell every open tab what version is now running
  self.clients.matchAll({ includeUncontrolled: true }).then(clients =>
    clients.forEach(c => c.postMessage({ type: 'SW_VERSION', version: VERSION }))
  );
});

// ── FETCH: network-first for HTML, cache-first for rest ─
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always try network first for the main document so updates land immediately
  if (url.endsWith('index.html') || url.endsWith('/') || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for everything else (manifest, icons, fonts, etc.)
  e.respondWith(
    caches.match(e.request).then(r =>
      r || fetch(e.request)
            .then(res => {
              const clone = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
              return res;
            })
            .catch(() => caches.match('./index.html'))
    )
  );
});

// ── MESSAGE: allow page to request skipWaiting ─
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SW_SKIP_WAITING') self.skipWaiting();
});
