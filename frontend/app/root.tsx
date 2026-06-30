// Importar script para suprimir errores de hidratación
import "./suppress-hydration-warnings";

import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";

import type { Route } from "./+types/root";
import "./app.css";
import { ErrorPage } from "~/components/public/ErrorPage";
import NotFoundPage from "~/routes/not-found";
import UnauthorizedPage from "~/routes/unauthorized";
import { AppShell } from "~/components/layout";
import { useAuthStore } from "~/stores/authStore";
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
        {/* Dynamic CSP will be set by JavaScript */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            // Set CSP dynamically based on environment
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.erp.app.aiutox.com/api/v1';
            const csp = \`default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' \${apiBaseUrl} https:; base-uri 'self'; form-action 'self'; worker-src 'self' blob:;\`;
            
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
];

function ThemeConfigBootstrap() {
  useThemeConfig();
  return null;
}

export default function App() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Memoizar la detección de ruta pública para evitar recalcular en cada render
  const isPublicRoute = useMemo(
    () =>
      PUBLIC_ROUTES.some(
        (route) =>
          location.pathname === route ||
          location.pathname.startsWith(`${route}/`)
      ),
    [location.pathname]
  );

  // Memoizar el contenido para evitar re-renderizados innecesarios
  const content = useMemo(
    () => (
      <>
        {isPublicRoute ? (
          <>
            <Outlet />
            {/* <PWAUpdatePrompt /> */}
          </>
        ) : !isAuthenticated ? (
          <>
            <Outlet />
            {/* <PWAUpdatePrompt /> */}
          </>
        ) : (
          <>
            <AppShell>
              <Outlet />
            </AppShell>
            <ToastProvider />
            {/* <PWAUpdatePrompt /> */}
          </>
        )}
      </>
    ),
    [isPublicRoute, isAuthenticated]
  );

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
      error.statusText || "Ha ocurrido un error al cargar la pÃ¡gina.";
    return (
      <ErrorPage
        code={error.status}
        title="Error"
        message={statusText}
        actionLabel="Recargar PÃ¡gina"
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
          actionLabel="Recargar PÃ¡gina"
          actionOnClick={() => window.location.reload()}
        />
        {stack && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-[#3C3A47]">
              Detalles tÃ©cnicos (solo en desarrollo)
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
