/* eslint-disable no-restricted-globals, @typescript-eslint/triple-slash-reference */
/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)
// eslint-disable-next-line prefer-regex-literals
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$')
registerRoute(
  ({ request, url }: { request: Request, url: URL }) => {
    if (request.mode !== 'navigate') {
      return false
    }

    if (url.pathname.startsWith('/_')) {
      return false
    }

    if (url.pathname.match(fileExtensionRegexp) != null) {
      return false
    }
    return false
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
)

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting().catch(() => {})
  }
})
