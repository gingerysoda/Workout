/* Service worker: precaches the app so it opens with no signal, and caches
   exercise images and fonts the first time they load. */
const VERSION = 'c054ceaa0b';
const APP = 'app-' + VERSION;
const RUNTIME = 'runtime-v1';
const FILES = ["./", "./README.txt", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./index.html", "./main.js", "./manifest.webmanifest", "./styles.css"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('app-') && k !== APP).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // App files: cache first, falling back to the network.
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() => caches.match('./index.html'))),
    );
    return;
  }
  if (/raw\.githubusercontent\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    // Images and fonts: serve from cache, refresh in the background.
    e.respondWith(
      caches.open(RUNTIME).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }),
    );
  }
});
