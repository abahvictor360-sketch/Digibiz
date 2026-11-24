// digibiz service worker: app shell offline, fresh cards when online.
const VERSION = 'v1'
const SHELL = `digibiz-shell-${VERSION}`
const RUNTIME = `digibiz-runtime-${VERSION}`
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, RUNTIME].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

async function networkFirst(req, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(fallbackUrl || req, res.clone())
    return res
  } catch {
    const hit = await cache.match(fallbackUrl || req, { ignoreVary: true })
    if (hit) return hit
    throw new Error('offline')
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Page navigations: always try the network so deploys show up, fall back to the cached shell.
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL, '/index.html'))
    return
  }
  // Published cards: fresh when online, last copy when offline.
  if (url.pathname.startsWith('/api/cards/')) {
    e.respondWith(networkFirst(req, RUNTIME))
    return
  }
  if (url.pathname.startsWith('/api/')) return
  // Hashed build assets and icons never change: cache first.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(req, { ignoreVary: true }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(RUNTIME).then((c) => c.put(req, res.clone()))
            return res
          })
      )
    )
  }
})
