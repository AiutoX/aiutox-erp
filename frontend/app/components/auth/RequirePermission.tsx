/**
 * Component that conditionally renders children based on user permissions
 */

import type { ReactNode } from "react";
import { useHasPermission } from "~/hooks/usePermissions";

export interface RequirePermissionProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if user has the required permission
 */
export function RequirePermission({
  permission,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const hasPermission = useHasPermission(permission);

  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
