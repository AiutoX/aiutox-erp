// Importar script para suprimir errores de hidratación
import "./suppress-hydration-warnings";

import {
  isRouteErrorResponse,
  Links,
  Meta,
  Navigate,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useMatches,
} from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";

import type { Route } from "./+types/root";
import "./app.css";
import { ErrorPage } from "~/components/public/ErrorPage";
import NotFoundPage from "~/routes/not-found";
import UnauthorizedPage from "~/routes/unauthorized";
import { AppShell } from "~/components/layout";
import { useAuthSync } from "~/hooks/useAuthSync";
import { ToastProvider } from "~/components/common/Toast";
// import { PWAUpdatePrompt } from "~/components/common/PWAUpdatePrompt"; // PWA deshabilitado temporalmente
import { ThemeProvider } from "~/providers";
import { useThemeConfig } from "~/hooks/useThemeConfig";

// Create QueryClient with optimized configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false, // No refetch al cambiar de pestaña
      retry: 1, // Solo 1 retry
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
    mutations: {
      retry: 1,
    },
  },
});

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap",
  },
  { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/manifest.webmanifest" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head suppressHydrationWarning>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#3C3A47" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="AiutoX ERP" />
        <meta
          name="description"
          content="Sistema ERP modular y extensible para gestión empresarial"
        />

        {/* Security Headers - Note: X-Frame-Options and frame-ancestors must be set via HTTP headers, not meta tags */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta
          httpEquiv="Referrer-Policy"
          content="strict-origin-when-cross-origin"
        />
        <meta
          httpEquiv="Permissions-Policy"
          content="geolocation=(), microphone=(), camera=()"
        />
        {/* Content Security Policy - Basic
            Note: 'unsafe-inline' and 'unsafe-eval' are needed for Vite/React Router
            frame-ancestors is ignored in meta tags and must be set via HTTP headers
            In production, configure these headers in your web server (nginx, Apache, etc.) */}
        {/* Dynamic CSP will be set by JavaScript.
            apiBaseOrigin is resolved at build time by Vite (JSX, not the inline script) because
            import.meta is only valid inside ES modules -- an inline non-module <script> using
            import.meta throws "Cannot use 'import.meta' outside a module" in every page load.
            connect-src takes an origin, not a full URL with path -- passing the full API base
            URL (including /api/v1) makes the directive invalid and the browser silently drops
            it, which blocks every real fetch/XHR to the backend (e.g. login). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            // Set CSP dynamically based on environment
            const apiBaseOrigin = ${JSON.stringify(new URL(import.meta.env.VITE_API_BASE_URL || "https://api.erp.app.aiutox.com/api/v1").origin)};
            const csp = \`default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' \${apiBaseOrigin} https:; base-uri 'self'; form-action 'self'; worker-src 'self' blob:;\`;

            // Remove existing CSP meta if any
            const existingCsp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
            if (existingCsp) {
              existingCsp.remove();
            }

            // Add new CSP meta
            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = csp;
            document.head.appendChild(meta);
          `,
          }}
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Lista de rutas públicas que NO deben usar AppShell
 */
const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/maintenance",
  "/unauthorized",
  "/admin/setup",
];

/**
 * Prefijos de rutas públicas (para paths dinámicos, ej. /f/:slug)
 */
const PUBLIC_ROUTE_PREFIXES = ["/f/"];

function ThemeConfigBootstrap() {
  useThemeConfig();
  return null;
}

export default function App() {
  const location = useLocation();
  const matches = useMatches();
  const { isAuthenticated, isReady, hasToken } = useAuthSync();

  // La ruta catch-all ("*") resuelve a routes/not-found.tsx: es pública (404 estático, sin datos)
  const isNotFoundRoute = matches.some((match) =>
    match.id.endsWith("routes/not-found")
  );

  // Memoizar la detección de ruta pública para evitar recalcular en cada render
  const isPublicRoute = useMemo(
    () =>
      isNotFoundRoute ||
      PUBLIC_ROUTES.some(
        (route) =>
          location.pathname === route ||
          location.pathname.startsWith(`${route}/`)
      ) ||
      PUBLIC_ROUTE_PREFIXES.some((prefix) =>
        location.pathname.startsWith(prefix)
      ),
    [location.pathname, isNotFoundRoute]
  );

  // Memoizar el contenido para evitar re-renderizados innecesarios
  const content = useMemo(() => {
    if (isPublicRoute) {
      return (
        <>
          <Outlet />
          {/* <PWAUpdatePrompt /> */}
        </>
      );
    }

    // Sin token: redirigir de inmediato a /login, sin esperar sincronización del store
    if (!hasToken) {
      const redirectPath = location.pathname + location.search;
      return (
        <Navigate
          to={`/login?redirect=${encodeURIComponent(redirectPath)}`}
          replace
        />
      );
    }

    // Hay token pero el store aún no terminó de sincronizar: no renderizar nada
    // (evita mostrar contenido sin AppShell mientras se resuelve el estado real)
    if (!isReady) {
      return null;
    }

    // Store sincronizado y confirma que no está autenticado (token inválido/expirado)
    if (!isAuthenticated) {
      const redirectPath = location.pathname + location.search;
      return (
        <Navigate
          to={`/login?redirect=${encodeURIComponent(redirectPath)}`}
          replace
        />
      );
    }

    return (
      <>
        <AppShell>
          <Outlet />
        </AppShell>
        <ToastProvider />
        {/* <PWAUpdatePrompt /> */}
      </>
    );
  }, [isPublicRoute, isAuthenticated, isReady, hasToken, location.pathname, location.search]);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {isAuthenticated && !isPublicRoute ? <ThemeConfigBootstrap /> : null}
        {content}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    // Handle 404 - redirect to not-found page
    if (error.status === 404) {
      return <NotFoundPage />;
    }

    // Handle 403 - redirect to unauthorized page
    if (error.status === 403) {
      return <UnauthorizedPage />;
    }

    // Other HTTP errors
    const statusText =
      error.statusText || "Ha ocurrido un error al cargar la página.";
    return (
      <ErrorPage
        code={error.status}
        title="Error"
        message={statusText}
        actionLabel="Recargar Página"
        actionOnClick={() => window.location.reload()}
      />
    );
  }

  // Runtime errors
  const errorMessage =
    error && error instanceof Error
      ? error.message
      : "Ha ocurrido un error inesperado.";

  // Show stack trace only in development
  const stack =
    import.meta.env.DEV && error && error instanceof Error
      ? error.stack
      : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-6">
        <ErrorPage
          code={500}
          title="Error del Sistema"
          message={errorMessage}
          actionLabel="Recargar Página"
          actionOnClick={() => window.location.reload()}
        />
        {stack && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-[#3C3A47]">
              Detalles técnicos (solo en desarrollo)
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-x-auto">
              <code>{stack}</code>
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
