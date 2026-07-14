/* Trening PWA service worker
   Strategia: nawigacja network-first (świeży index po deployu, cache offline),
   zasoby cache-first z douzupełnianiem. Podbij CACHE przy większych zmianach. */
const CACHE = 'trening-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Nawigacja: najpierw sieć (żeby aktualizacje wchodziły), offline z cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Zasoby (ikony, fonty): cache-first, dopisywanie do cache po drodze
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        const url = req.url;
        if (res.ok && (url.startsWith(self.location.origin) || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com'))) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      });
    })
  );
});
