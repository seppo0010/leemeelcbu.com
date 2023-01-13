/* eslint-disable no-restricted-globals, @typescript-eslint/triple-slash-reference */
/// <reference lib="webworker" />

import { clientsClaim, RouteHandlerCallbackOptions } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import {
  findCBUsInText,
  readBlob,
  fileListToFileArray
} from './cbu'

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

    return true
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
)

registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.endsWith('.png'),
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50 })
    ]
  })
)

registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname === '/income',
  async (options: RouteHandlerCallbackOptions) => {
    const formData = await options.request.formData()
    Array.from(formData.values()).forEach(async (value: string | Blob) => {
      if (typeof value === 'string') {
        (await findCBUsInText(value)).forEach((cbu: string) => {
          self.registration.showNotification('¡CBU leido!', {
            body: cbu,
            data: JSON.stringify({ cbu })
          }).catch((err) => { console.error({ err }) })
        })
      } else {
        (await readBlob(value)).forEach((cbu: string) => {
          self.registration.showNotification('¡CBU leido!', {
            body: cbu,
            data: JSON.stringify({ cbu })
          }).catch((err) => { console.error({ err }) })
        })
      }
    })
    return new Response('')
  },
  'POST'
)

self.addEventListener('notificationclick', (event) => {
  const { data } = event.notification
  const { cbu }: { cbu: string } = JSON.parse(data)
  event.notification.close()

  if (self.clients.openWindow !== undefined) {
    self.clients.openWindow(`/?${cbu}`).catch((err) => { console.error({ err }) })
  }
})
