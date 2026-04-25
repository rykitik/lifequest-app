const CACHE_NAME = 'lifequest-shell-v2'
const STATIC_CACHE_NAME = 'lifequest-static-v2'
const SHELL_ASSETS = ['/index.html', '/manifest.webmanifest', '/lifequest-icon.svg']

function isSuccessfulResponse(response) {
  return response && response.ok
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('lifequest-') && ![CACHE_NAME, STATIC_CACHE_NAME].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)

  try {
    const response = await fetch(request)

    if (isSuccessfulResponse(response)) {
      await cache.put('/index.html', response.clone())
    }

    return response
  } catch {
    return (await cache.match('/index.html')) || Response.error()
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)

  const networkPromise = fetch(request)
    .then((response) => {
      if (isSuccessfulResponse(response)) {
        void cache.put(request, response.clone())
      }

      return response
    })
    .catch(() => null)

  return cachedResponse || (await networkPromise) || Response.error()
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE_NAME)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  const response = await fetch(request)

  if (isSuccessfulResponse(response)) {
    await cache.put(request, response.clone())
  }

  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  if (url.pathname === '/sw.js') {
    event.respondWith(fetch(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (url.pathname === '/manifest.webmanifest' || url.pathname === '/lifequest-icon.svg') {
    event.respondWith(staleWhileRevalidate(request))
    return
  }
})
