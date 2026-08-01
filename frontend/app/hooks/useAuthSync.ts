/**
 * Hook to ensure authStore is synchronized with localStorage before checking authentication
 *
 * SIMPLIFIED VERSION: This hook checks localStorage directly on every render.
 * It does NOT wait for Zustand's hydration because that's unreliable.
 *
 * The source of truth for "has token" is localStorage.
 * The source of truth for "is authenticated" is localStorage + store sync.
 */

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "~/stores/authStore";
import apiClient from "~/lib/api/client";

/**
 * Returns true if the JWT `exp` claim is in the past. Any decode failure
 * is treated as "not expired" here — malformed tokens are rejected by the
 * backend on the next request, this check only catches the common case of
 * a stale-but-well-formed token surviving in localStorage.
 */
function isTokenExpired(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const payload = JSON.parse(atob(parts[1] || ""));
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

export function useAuthSync() {
  const [isReady, setIsReady] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const storeIsAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const verifyingToken = useRef<string | null>(null);

  // Check localStorage directly - this is synchronous and always up-to-date
  const rawToken =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const hasToken = !!rawToken && !isTokenExpired(rawToken);

  useEffect(() => {
    if (rawToken && isTokenExpired(rawToken)) {
      // Expired token left over in localStorage - clear it and the store
      useAuthStore.getState().clearAuth();
    } else if (hasToken && !storeIsAuthenticated) {
      // Token in localStorage but store not authenticated - try to sync
      useAuthStore.getState()._syncFromLocalStorage();
    } else if (!hasToken && storeIsAuthenticated) {
      // No valid token but store thinks authenticated - clear
      useAuthStore.getState().clearAuth();
    }

    // Mark ready after first render cycle
    // Use setTimeout to ensure we're after any synchronous store updates
    const timer = setTimeout(() => setIsReady(true), 0);
    return () => clearTimeout(timer);
  }, [hasToken, rawToken, storeIsAuthenticated]);

  // Verify the token against the backend once it's considered valid locally.
  // A token can pass the local exp check yet still be invalid (bad signature,
  // revoked, wrong tenant) — only /auth/me tells us for sure. Without this,
  // the app would mount AppShell on an untrusted token and only discover it's
  // invalid once page data calls start failing with 401s.
  useEffect(() => {
    if (!hasToken || !rawToken) {
      setIsVerified(false);
      verifyingToken.current = null;
      return;
    }

    if (verifyingToken.current === rawToken) {
      // Already verifying (or verified) this exact token
      return;
    }

    verifyingToken.current = rawToken;
    setIsVerified(false);

    apiClient
      .get("/auth/me")
      .then(() => {
        if (verifyingToken.current === rawToken) {
          setIsVerified(true);
        }
      })
      .catch(() => {
        if (verifyingToken.current === rawToken) {
          useAuthStore.getState().clearAuth();
        }
      });
  }, [hasToken, rawToken]);

  // For authentication decision:
  // - If no valid (non-expired) token in localStorage → definitely not authenticated
  // - If token exists → trust the store's isAuthenticated only after the
  //   backend has confirmed the token is actually valid
  const isAuthenticated = hasToken && (isReady ? storeIsAuthenticated && isVerified : true);

  return {
    isAuthenticated,
    isReady: isReady && (!hasToken || isVerified || !storeIsAuthenticated),
    hasToken, // Expose for debugging
  };
}
