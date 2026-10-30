import { QueryClient } from "@tanstack/react-query";

/**
 * Builds the app-wide QueryClient. Kept out of root.tsx so a test can build
 * the exact same client and pin its defaults.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false, // No refetch al cambiar de pestaña
        retry: 1, // Solo 1 retry
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      },
      mutations: {
        // A failed write is never sent again by default: a POST that committed
        // server-side would be duplicated and a 4xx business answer repeated.
        // An idempotent mutation that needs a retry declares it in its own hook.
        retry: false,
      },
    },
  });
}
