// Custom Service Worker para manejar auth y logout
// Workbox se inyecta automáticamente mediante importScripts() al final de este archivo
// Este código se ejecuta ANTES de que Workbox se inicialice

// Listener para mensajes de limpieza de cache
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_AUTH_CACHE") {
    // Cuando el usuario hace logout, limpiar todo el cache de API
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.includes("api-cache"))
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => {
        console.log("[SW] Auth cache cleared");
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      })
      .catch((error) => {
        console.error("[SW] Error clearing auth cache:", error);
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: error.message });
        }
      });
  }

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Workbox se inyecta aquí automáticamente por vite-plugin-pwa
// importScripts() se agrega al final del archivo durante el build

// Placeholder para el manifest de Workbox - REQUERIDO por vite-plugin-pwa
self.__WB_MANIFEST = [];
