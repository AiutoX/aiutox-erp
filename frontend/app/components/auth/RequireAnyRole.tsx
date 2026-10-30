/**
 * Component that conditionally renders children if user has any of the specified roles
 */

import type { ReactNode } from "react";
import { useHasAnyRole } from "~/hooks/usePermissions";

export interface RequireAnyRoleProps {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if user has at least one of the required roles
 */
export function RequireAnyRole({
  roles,
  children,
  fallback = null,
}: RequireAnyRoleProps) {
  const hasAnyRole = useHasAnyRole(roles);

  if (hasAnyRole) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
