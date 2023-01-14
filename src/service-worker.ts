/* eslint-disable no-restricted-globals, @typescript-eslint/triple-slash-reference */
/// <reference lib="webworker" />

import './fake-document'
import { clientsClaim, RouteHandlerCallbackOptions } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import {
  findCBUsInText,
  readBlob
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
  ({ url }: { url: URL }) => url.origin === self.location.origin && url.pathname.endsWith('.png'),
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50 })
    ]
  })
)

const notifyCBUs = (cbus: string[]): void => {
  if (cbus.length === 0) {
    self.registration.showNotification('Ningún CBU leído :(').catch((err: unknown) => { console.error({ err }) })
    return
  }
  cbus.forEach((cbu: string) => {
    self.registration.showNotification('¡CBU leido!', {
      body: cbu,
      data: JSON.stringify({ cbu })
    }).catch((err: unknown) => { console.error({ err }) })
  })
}

registerRoute(
  ({ url }: { url: URL }) => url.origin === self.location.origin && url.pathname === '/income',
  async (options: RouteHandlerCallbackOptions) => {
    (async () => {
      const formData = await options.request.formData()
      const cbus: string[] = (await Promise.all(Array.from(formData.values()).map(async (value: string | Blob) => {
        return typeof value === 'string' ? findCBUsInText(value) : await readBlob(value)
      }))).flat()
      notifyCBUs(cbus)
    })().catch((err: Error) => { console.error({ err }) })
    return Response.redirect('/')
  },
  'POST'
)

self.addEventListener('notificationclick', (event) => {
  const { data } = event.notification
  const { cbu }: { cbu: string } = JSON.parse(data)
  event.notification.close()

  if (self.clients.openWindow !== undefined) {
    self.clients.openWindow(`/?cbu=${cbu}`).catch((err: unknown) => { console.error({ err }) })
  }
})
