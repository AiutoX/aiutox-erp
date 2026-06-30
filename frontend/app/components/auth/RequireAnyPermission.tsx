/**
 * Component that conditionally renders children if user has any of the specified permissions
 */

import type { ReactNode } from "react";
import { useHasAnyPermission } from "~/hooks/usePermissions";

export interface RequireAnyPermissionProps {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if user has at least one of the required permissions
 */
export function RequireAnyPermission({
  permissions,
  children,
  fallback = null,
}: RequireAnyPermissionProps) {
  const hasAnyPermission = useHasAnyPermission(permissions);

  if (hasAnyPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
