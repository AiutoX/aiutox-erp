import path from "path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rollupOptions: {
      // Field App is built as a second entry alongside the main React Router app.
      // Activated only when VITE_BUILD_FIELD=1 (CI or separate field build step).
      // Main app entry is managed by the reactRouter() plugin.
      ...(process.env.VITE_BUILD_FIELD === "1"
        ? {
            input: {
              field: path.resolve(__dirname, "entries/field/index.html"),
            },
          }
        : {}),
      output: {
        manualChunks(id) {
          // react/react-dom/react-router-dom are external in SSR — skip them
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/")
          ) {
            return undefined;
          }
          if (id.includes("node_modules/@tanstack/react-query")) {
            return "vendor-query";
          }
          if (
            id.includes("node_modules/@radix-ui/react-dialog") ||
            id.includes("node_modules/@radix-ui/react-select") ||
            id.includes("node_modules/@radix-ui/react-dropdown-menu")
          ) {
            return "vendor-ui";
          }
          if (id.includes("node_modules/date-fns")) {
            return "vendor-date";
          }
          if (id.includes("app/features/tasks/components/TaskList")) {
            return "tasks-core";
          }
          if (id.includes("app/features/tasks/components/BoardView")) {
            return "tasks-board";
          }
          if (id.includes("app/features/tasks/components/TaskCalendar")) {
            return "tasks-calendar";
          }
          if (id.includes("node_modules/@xyflow/react")) {
            return "vendor-xyflow";
          }
          if (
            id.includes("node_modules/maplibre-gl") ||
            id.includes("node_modules/maplibre")
          ) {
            return "vendor-maplibre";
          }
          if (id.includes("node_modules/pmtiles")) {
            return "vendor-pmtiles";
          }
          if (id.includes("node_modules/@zxcvbn-ts/")) {
            return "vendor-zxcvbn";
          }
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 1800,
  },
  server: {
    host: "127.0.0.1", // Use IPv4 only to avoid ::1 issues
    port: 3000, // Changed port to avoid permission issues
    strictPort: false, // Allow fallback to next available port
    proxy: {
      // Proxy file requests to backend
      "/files": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    // Polyfill process for browser compatibility (needed for some packages)
    "process.env": "{}",
    "process.platform": JSON.stringify("browser"),
    "process.version": JSON.stringify(""),
    global: "globalThis",
  },
  optimizeDeps: {},
  plugins: [
    tailwindcss(),
    // Field build does not use reactRouter (it's a standalone SPA, not a React Router framework app)
    ...(process.env.VITE_BUILD_FIELD === "1" ? [] : [reactRouter()]),
    tsconfigPaths(),
    // Field build uses a dedicated PWA config scoped to /field/
    ...(process.env.VITE_BUILD_FIELD === "1"
      ? [
          VitePWA({
            registerType: "autoUpdate",
            strategies: "injectManifest",
            srcDir: "entries/field",
            filename: "sw-field.ts",
            outDir: "dist/field",
            manifestFilename: "manifest.webmanifest",
            injectManifest: {
              // Only precache field app chunks
              globPatterns: ["field/**/*.{js,css,png,svg,woff,woff2}"],
              globIgnores: ["**/node_modules/**"],
              swDest: "dist/field/sw.js",
            },
            manifest: {
              name: "AiutoX Field",
              short_name: "Field",
              description: "Recolección de datos en campo",
              theme_color: "#023E87",
              background_color: "#ffffff",
              display: "standalone",
              scope: "/field",
              start_url: "/field",
              icons: [
                {
                  src: "field/icons/field-192.png",
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "maskable any",
                },
                {
                  src: "field/icons/field-512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "maskable any",
                },
              ],
            },
            devOptions: { enabled: false },
          }),
        ]
      : []),
    // Main ERP app PWA (skipped when building field app)
    ...(process.env.VITE_BUILD_FIELD === "1"
      ? []
      : [
          VitePWA({
            registerType: "prompt", // Cambiado para notificar al usuario de actualizaciones
            includeAssets: ["favicon.ico", "apple-touch-icon.png", "logo.png"],

            // Usar injectManifest para combinar SW custom con Workbox
            strategies: "injectManifest",
            srcDir: "public",
            filename: "sw-custom.js",

            // Especificar el nombre del archivo manifest para evitar errores 404 en /__manifest
            manifestFilename: "manifest.webmanifest",

            workbox: {
              // Incluir solo assets estáticos (NO HTML dinámico)
              globPatterns: ["**/*.{js,css,ico,png,svg,woff,woff2}"],

              globIgnores: [
                "**/node_modules/**",
                "**/index.html",
              ],

              // Aumentar límite a 3MB para chunks grandes como treemap/cytoscape
              maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,

              // CRÍTICO: Manejo de navegación para SPA
              // Todas las rutas de navegación deben servir el index.html
              navigateFallback: "/index.html",
              navigateFallbackDenylist: [
                // NO aplicar fallback a:
                /^\/api\//, // Llamadas a API
                /^\/auth\//, // Rutas de auth del backend
                /\.[^/]+$/, // Archivos con extensión (assets)
              ],

              // Estrategias de runtime caching
              runtimeCaching: [
                // 1. Google Fonts - Cache First (estáticos, nunca cambian)
                {
                  urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                  handler: "CacheFirst",
                  options: {
                    cacheName: "google-fonts-cache",
                    expiration: {
                      maxEntries: 10,
                      maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
                    },
                    cacheableResponse: {
                      statuses: [0, 200],
                    },
                  },
                },
                {
                  urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                  handler: "CacheFirst",
                  options: {
                    cacheName: "gstatic-fonts-cache",
                    expiration: {
                      maxEntries: 10,
                      maxAgeSeconds: 60 * 60 * 24 * 365,
                    },
                    cacheableResponse: {
                      statuses: [0, 200],
                    },
                  },
                },

                // 2. API - Network First (siempre intentar red primero)
                // ⚠️ CRÍTICO: NO cachear endpoints de auth
                {
                  urlPattern: ({ url }) => {
                    // Solo cachear API, EXCEPTO rutas de auth
                    const isApi = url.pathname.startsWith("/api/v1/");
                    const isAuth = url.pathname.includes("/auth/");
                    return isApi && !isAuth;
                  },
                  handler: "NetworkFirst",
                  options: {
                    cacheName: "api-cache",
                    networkTimeoutSeconds: 10,
                    expiration: {
                      maxEntries: 50,
                      maxAgeSeconds: 60 * 5, // Solo 5 minutos
                    },
                    cacheableResponse: {
                      statuses: [0, 200],
                    },
                    // Plugin para invalidar cache si hay token expirado
                    plugins: [
                      {
                        cacheKeyWillBeUsed: async ({ request }) => {
                          // No cachear requests con Authorization header
                          // (cada usuario tiene su propio cache implícitamente)
                          if (request.headers.get("Authorization")) {
                            const url = new URL(request.url);
                            // Agregar un identificador único para evitar conflictos
                            url.searchParams.set("_sw_auth", "1");
                            return url.toString();
                          }
                          return request.url;
                        },
                      },
                    ],
                  },
                },

                // 3. Auth endpoints - NUNCA cachear
                {
                  urlPattern: ({ url }) => url.pathname.includes("/auth/"),
                  handler: "NetworkOnly", // SIEMPRE red, nunca cache
                },

                // 4. Assets estáticos de la app - Cache First con network fallback
                {
                  urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
                  handler: "CacheFirst",
                  options: {
                    cacheName: "images-cache",
                    expiration: {
                      maxEntries: 60,
                      maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
                    },
                  },
                },
              ],

              // Limpiar caches viejos automáticamente
              cleanupOutdatedCaches: true,
            },

            manifest: {
              name: "AiutoX ERP",
              short_name: "AiutoX",
              description:
                "Sistema ERP modular y extensible para gestión empresarial",
              theme_color: "#3C3A47", // Color primario AiutoX
              background_color: "#ffffff",
              display: "standalone",
              orientation: "portrait",
              scope: "/",
              start_url: "/",
              icons: [
                {
                  src: "icon-72x72.png",
                  sizes: "72x72",
                  type: "image/png",
                  purpose: "maskable any",
                },
                {
                  src: "icon-96x96.png",
                  sizes: "96x96",
                  type: "image/png",
                  purpose: "maskable any",
                },
                {
                  src: "icon-128x128.png",
                  sizes: "128x128",
                  type: "image/png",
                  purpose: "maskable any",
                },
                {
                  src: "icon-144x144.png",
                  sizes: "144x144",
                  type: "image/png",
                  purpose: "maskable any",
                },
                {
                  src: "icon-152x152.png",
                  sizes: "152x152",
                  type: "image/png",
                  purpose: "maskable any",
                },
                {
                  src: "icon-192x192.png",
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "maskable any",
                },
                {
                  src: "icon-384x384.png",
                  sizes: "384x384",
                  type: "image/png",
                  purpose: "maskable any",
                },
                {
                  src: "icon-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "maskable any",
                },
              ],
            },

            devOptions: {
              enabled: true, // Habilitar PWA en desarrollo
              type: "module",
            },
          }),
        ]),
  ],
});
