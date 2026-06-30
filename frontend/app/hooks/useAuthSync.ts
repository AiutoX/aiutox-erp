/**
 * Hook to ensure authStore is synchronized with localStorage before checking authentication
 *
 * SIMPLIFIED VERSION: This hook checks localStorage directly on every render.
 * It does NOT wait for Zustand's hydration because that's unreliable.
 *
 * The source of truth for "has token" is localStorage.
 * The source of truth for "is authenticated" is localStorage + store sync.
 */

import { useEffect, useState } from "react";
import { useAuthStore } from "~/stores/authStore";

export function useAuthSync() {
  const [isReady, setIsReady] = useState(false);
  const storeIsAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Check localStorage directly - this is synchronous and always up-to-date
  const hasToken =
    typeof window !== "undefined" && !!localStorage.getItem("auth_token");

  useEffect(() => {
    // Sync store with localStorage on mount
    if (hasToken && !storeIsAuthenticated) {
      // Token in localStorage but store not authenticated - try to sync
      useAuthStore.getState()._syncFromLocalStorage();
    } else if (!hasToken && storeIsAuthenticated) {
      // No token but store thinks authenticated - clear
      useAuthStore.getState().clearAuth();
    }

    // Mark ready after first render cycle
    // Use setTimeout to ensure we're after any synchronous store updates
    const timer = setTimeout(() => setIsReady(true), 0);
    return () => clearTimeout(timer);
  }, [hasToken, storeIsAuthenticated]);

  // For authentication decision:
  // - If no token in localStorage → definitely not authenticated
  // - If token exists → trust the store's isAuthenticated after sync
  const isAuthenticated = hasToken && (isReady ? storeIsAuthenticated : true);

  return {
    isAuthenticated,
    isReady,
    hasToken, // Expose for debugging
  };
}
