/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { registerRoute, setCatchHandler } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

registerRoute(
  ({ request, url }) => request.mode === 'navigate' && url.origin === self.location.origin,
  new NetworkFirst({
    cacheName: 'app-pages',
    networkTimeoutSeconds: 3,
  }),
)

registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'worker'),
  new StaleWhileRevalidate({
    cacheName: 'app-static',
  }),
)

registerRoute(
  ({ request, url }) => url.origin === self.location.origin && request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'app-images',
  }),
)

setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    const offlineFallback =
      (await matchPrecache('offline.html')) ??
      (await matchPrecache('/offline.html'))

    if (offlineFallback instanceof Response) {
      return offlineFallback
    }

    return new Response('Offline', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }

  return Response.error()
})

export {}
