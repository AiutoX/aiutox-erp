/**
 * AiutoX Field App — standalone PWA entry point.
 *
 * Architecture:
 *  - Completely separate from the main ERP app (no React Router framework)
 *  - Mobile-first, works offline via service worker (/field/sw.js)
 *  - PIN authentication tied to ERP JWT session
 *  - Accessed at /field for authenticated field technicians
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FieldApp } from "./FieldApp";
// Tailwind CSS is processed via the vite tailwindcss plugin scanning all source files.
// The field app's HTML entry links to the generated CSS chunk automatically.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const container = document.getElementById("field-root");
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <FieldApp />
      </QueryClientProvider>
    </React.StrictMode>
  );
}
