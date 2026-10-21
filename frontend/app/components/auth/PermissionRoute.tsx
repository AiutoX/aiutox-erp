/**
 * Route guard component that protects routes based on permissions
 */

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useHasPermission } from "~/hooks/usePermissions";

export interface PermissionRouteProps {
  permission: string;
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
}

/**
 * Component that protects routes based on permissions
 * Only renders children if user has the required permission
 * Redirects or shows fallback if permission is missing
 *
 * When redirecting to /unauthorized, preserves the attempted route in query params
 */
export function PermissionRoute({
  permission,
  children,
  redirectTo,
  fallback = null,
}: PermissionRouteProps) {
  const hasPermission = useHasPermission(permission);
  const location = useLocation();

  if (!hasPermission) {
    if (redirectTo) {
      // If redirecting to /unauthorized, preserve the attempted route
      if (
        redirectTo === "/unauthorized" ||
        redirectTo.startsWith("/unauthorized")
      ) {
        const attemptedRoute = location.pathname + location.search;
        return (
          <Navigate
            to={`/unauthorized?attempted=${encodeURIComponent(attemptedRoute)}`}
            replace
          />
        );
      }
      return <Navigate to={redirectTo} replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
