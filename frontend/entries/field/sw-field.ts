/// <reference lib="webworker" />
// Service Worker for AiutoX Field App — scope: /field/
// Workbox precache manifest is injected by vite-plugin-pwa (InjectManifest strategy)

import { clientsClaim } from "workbox-core";
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, NetworkOnly, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare let self: ServiceWorkerGlobalScope;

// Take control immediately
self.skipWaiting();
clientsClaim();

// Precache all field app assets (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// Clean up old caches on SW update
cleanupOutdatedCaches();

// SPA navigation fallback — only for /field/* routes
const handler = createHandlerBoundToURL("/field/index.html");
const navigationRoute = new NavigationRoute(handler, {
  allowlist: [/^\/field/],
  denylist: [
    /^\/api\//, // Backend API — never intercept
    /^\/auth\//, // Auth endpoints — never intercept
    /\.[^/]+$/, // Files with extensions (assets)
  ],
});
registerRoute(navigationRoute);

// CRITICAL: Auth endpoints — NetworkOnly, NEVER cache
registerRoute(({ url }) => url.pathname.includes("/auth/"), new NetworkOnly());

// Data Collection API — NetworkFirst with 10s timeout, 5min TTL
registerRoute(
  ({ url }) =>
    url.pathname.startsWith("/api/v1/data-collection/") ||
    url.pathname.startsWith("/api/v1/auth/"),
  new NetworkOnly() // auth paths are always NetworkOnly
);

registerRoute(
  ({ url }) =>
    url.pathname.startsWith("/api/v1/") && !url.pathname.includes("/auth/"),
  new NetworkFirst({
    cacheName: "field-api-cache",
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 5 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Static images — CacheFirst 30 days
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "field-images-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Message handler: clear auth cache on logout
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_AUTH_CACHE") {
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.includes("field-api-cache"))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => {
        event.ports?.[0]?.postMessage({ success: true });
      });
  }

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
