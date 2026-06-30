/**
 * Route guard component that protects routes based on authentication
 */

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuthSync } from "~/hooks/useAuthSync";

export interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Component that protects routes - only renders children if user is authenticated
 * Redirects to login if not authenticated, preserving the original route for redirect after login
 *
 * CRITICAL: This component checks localStorage DIRECTLY first for immediate redirect.
 * If no token exists in localStorage, redirect immediately without waiting for store hydration.
 * This prevents the "blank page" issue where the component returns null while waiting.
 */
export function ProtectedRoute({
  children,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { isAuthenticated, isReady } = useAuthSync();
  const location = useLocation();

  // CRITICAL: Check localStorage directly for immediate redirect decision
  // This runs on every render and reflects the current state of localStorage
  const hasToken =
    typeof window !== "undefined" && !!localStorage.getItem("auth_token");

  // If no token in localStorage, redirect IMMEDIATELY (no need to wait for store)
  // This is the key fix: don't return null, return a redirect
  if (!hasToken) {
    const redirectPath = location.pathname + location.search;
    return (
      <Navigate
        to={`${redirectTo}?redirect=${encodeURIComponent(redirectPath)}`}
        replace
      />
    );
  }

  // If we have a token, wait for store to sync before rendering content
  // This prevents showing content before we've verified the token is valid
  if (!isReady) {
    // Show nothing while loading (token exists but store is syncing)
    return null;
  }

  // After sync, if store says not authenticated (e.g., invalid/expired token), redirect
  if (!isAuthenticated) {
    const redirectPath = location.pathname + location.search;
    return (
      <Navigate
        to={`${redirectTo}?redirect=${encodeURIComponent(redirectPath)}`}
        replace
      />
    );
  }

  // Authenticated - render protected content
  return <>{children}</>;
}
