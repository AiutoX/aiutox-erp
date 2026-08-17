/**
 * Centralized VITE_ environment variable access with type safety.
 * All variables must be defined at build time via docker-compose build args or .env files.
 */

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string,
  wsUrl: import.meta.env.VITE_WS_URL as string,
  publicUrl: import.meta.env.VITE_PUBLIC_URL as string,
  ssr: import.meta.env.VITE_SSR === "true",
  pwa: import.meta.env.VITE_PWA === "true",
} as const;
