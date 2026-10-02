const CACHE_NAME = 'indica-gabriel-v1'

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-192x192.svg',
  '/pwa-512x512.svg',
  '/maskable-icon.svg',
]

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Falha tolerante em ativos estáticos
      })
    }),
  )
  self.skipWaiting()
})

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
          return null
        }),
      )
    }),
  )
  self.clients.claim()
})

// Estratégia Stale-While-Revalidate para navegação e ativos
self.addEventListener('fetch', (event) => {
  // Ignora chamadas ao backend PocketBase / APIs externas para não interferir em mutações
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('goskip.dev')
  ) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => {
          // Se offline e requisição de página HTML, entrega a página inicial
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html')
          }
          return cachedResponse
        })

      return cachedResponse || fetchPromise
    }),
  )
})
