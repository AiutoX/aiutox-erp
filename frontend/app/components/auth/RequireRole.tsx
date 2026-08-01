/**
 * Component that conditionally renders children based on user roles
 */

import type { ReactNode } from "react";
import { useHasRole } from "~/hooks/usePermissions";

export interface RequireRoleProps {
  role: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if user has the required role
 */
export function RequireRole({
  role,
  children,
  fallback = null,
}: RequireRoleProps) {
  const hasRole = useHasRole(role);

  if (hasRole) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
