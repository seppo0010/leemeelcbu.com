/* eslint-disable no-restricted-globals, @typescript-eslint/triple-slash-reference */
/// <reference lib="webworker" />

import './fake-document'
import { clientsClaim, RouteHandlerCallbackOptions } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'

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

const pendingFiles: Record<string, {
  file: File
}> = {}
const pendingTexts: string[] = []

registerRoute(
  ({ url }: { url: URL }) => url.origin === self.location.origin && url.pathname.startsWith('/income/'),
  async (options: RouteHandlerCallbackOptions) => {
    const path = options.url.pathname.substring('/income/'.length)
    const { file } = pendingFiles[path]
    if (file === undefined) {
      return new Response('not found', { status: 404 })
    }
    return new Response(file, { headers: { 'content-type': file.type } })
  }
)

registerRoute(
  ({ url }: { url: URL }) => url.origin === self.location.origin && url.pathname === '/income',
  async (options: RouteHandlerCallbackOptions) => {
    return new Response(JSON.stringify({
      pendingTexts,
      pendingFiles: Object.keys(pendingFiles)
    }), { headers: { 'content-type': 'application/json' } })
  }
)

registerRoute(
  ({ url }: { url: URL }) => url.origin === self.location.origin && url.pathname === '/income',
  async (options: RouteHandlerCallbackOptions) => {
    const formData = await options.request.formData()
    for (const [key, value] of Array.from(formData.entries())) {
      if (typeof value === 'string') {
        pendingTexts.push(value)
      } else {
        pendingFiles[key] = { file: value }
      }
    }
    return Response.redirect('/')
  },
  'POST'
)
