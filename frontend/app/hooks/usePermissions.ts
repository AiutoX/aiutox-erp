/**
 * Hooks for permission and role checking
 * Provides utilities to check user permissions and roles throughout the app
 *
 * Extended with multi-tenant and multi-module support
 */

import { useMemo, useState, useEffect } from "react";
import { useAuthStore } from "~/stores/authStore";
import { getModulePermissions, getAllPermissions } from "~/lib/api/modules.api";

/**
 * Hook to get current user's permissions and roles
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  const hasPermission = useMemo(() => {
    return (permission: string) => {
      if (!user?.permissions) return false;
      // Check exact permission or wildcard permissions
      return (
        user.permissions.includes(permission) ||
        user.permissions.includes("*") ||
        user.permissions.some((p) => {
          // Support module.* pattern (e.g., "inventory.*" matches "inventory.view")
          if (p.endsWith(".*")) {
            const module = p.slice(0, -2);
            return permission.startsWith(`${module}.`);
          }
          return false;
        })
      );
    };
  }, [user?.permissions]);

  return useMemo(
    () => ({
      permissions: user?.permissions || [],
      roles: user?.roles || [],
      hasPermission,
      hasRole: (role: string) => {
        if (!user?.roles) return false;
        return user.roles.some((r) => r.role === role); // Compare role string to UserRole.role
      },
      hasAnyPermission: (permissions: string[]) => {
        if (!user?.permissions) return false;
        return permissions.some((p) => {
          // Check exact permission or wildcard
          return (
            user.permissions?.includes(p) ||
            user.permissions?.includes("*") ||
            user.permissions?.some((userPerm) => {
              if (userPerm.endsWith(".*")) {
                const module = userPerm.slice(0, -2);
                return p.startsWith(`${module}.`);
              }
              return false;
            })
          );
        });
      },
      hasAnyRole: (roles: string[]) => {
        if (!user?.roles) return false;
        return roles.some((r) => user.roles?.some((ur) => ur.role === r)); // Compare role string to UserRole.role
      },
      hasAllPermissions: (permissions: string[]) => {
        if (!user?.permissions) return false;
        return permissions.every((p) => {
          return hasPermission(p);
        });
      },
      /**
       * Check if user has permission for a specific module
       * @param moduleId - Module identifier
       * @param permission - Permission string (e.g., "view", "create")
       * @param tenantId - Optional tenant ID (defaults to current user's tenant)
       */
      hasModulePermission: (
        moduleId: string,
        permission: string,
        tenantId?: string
      ) => {
        if (!user?.permissions) return false;
        const fullPermission = `${moduleId}.${permission}`;
        // Check if tenant matches (if specified)
        if (tenantId && user.tenant_id !== tenantId) {
          return false;
        }
        return hasPermission(fullPermission);
      },
      /**
       * Get permissions for a specific module
       * @param moduleId - Module identifier
       * @param tenantId - Optional tenant ID
       */
      getModulePermissions: (moduleId: string, tenantId?: string) => {
        if (!user?.permissions) return [];
        // Check if tenant matches (if specified)
        if (tenantId && user.tenant_id !== tenantId) {
          return [];
        }
        return user.permissions.filter(
          (p) =>
            p === `${moduleId}.*` || p.startsWith(`${moduleId}.`) || p === "*"
        );
      },
    }),
    [user, hasPermission]
  );
}

/**
 * Hook to check if user has a specific permission
 * @param permission - Permission string (e.g., "inventory.view")
 */
export function useHasPermission(permission: string): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

/**
 * Hook to check if user has a specific role
 * @param role - Role string (e.g., "admin", "inventory.leader")
 */
export function useHasRole(role: string): boolean {
  const { hasRole } = usePermissions();
  return hasRole(role);
}

/**
 * Hook to check if user has any of the specified permissions
 * @param permissions - Array of permission strings
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const { hasAnyPermission } = usePermissions();
  return hasAnyPermission(permissions);
}

/**
 * Hook to check if user has any of the specified roles
 * @param roles - Array of role strings
 */
export function useHasAnyRole(roles: string[]): boolean {
  const { hasAnyRole } = usePermissions();
  return hasAnyRole(roles);
}

/**
 * Hook to get permissions by module from backend
 *
 * This hook fetches permissions from the backend API, optionally filtered by module and tenant.
 * Useful when you need to display all available permissions or check permissions for a different tenant.
 *
 * @param moduleId - Optional module ID to filter permissions
 * @param tenantId - Optional tenant ID to filter permissions
 */
export function usePermissionsByModule(moduleId?: string, tenantId?: string) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getModulePermissions(moduleId, tenantId);
        const permissionStrings = response.data.map((p: unknown) => {
          if (p && typeof p === "object" && "permission" in p) {
            return String((p as Record<string, unknown>).permission);
          }
          return String(p);
        });
        setPermissions(permissionStrings);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load permissions")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [moduleId, tenantId]);

  return { permissions, loading, error };
}

/**
 * Hook to get all permissions grouped by module
 *
 * Fetches all permissions from backend and groups them by module.
 *
 * @param tenantId - Optional tenant ID to filter permissions
 */
export function useAllPermissionsByModule(tenantId?: string) {
  const [permissionGroups, setPermissionGroups] = useState<
    Array<{ moduleId: string; moduleName: string; permissions: string[] }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getAllPermissions(tenantId);

        // Group permissions by module
        const groupsMap = new Map<
          string,
          { moduleId: string; moduleName: string; permissions: string[] }
        >();

        for (const perm of response.data) {
          const permissionString =
            typeof perm === "string"
              ? perm
              : perm && typeof perm === "object" && "permission" in perm
                ? String((perm as Record<string, unknown>).permission)
                : "";
          const moduleId = permissionString.split(".")[0] || "unknown";
          const moduleName =
            moduleId.charAt(0).toUpperCase() + moduleId.slice(1);

          if (!groupsMap.has(moduleId)) {
            groupsMap.set(moduleId, {
              moduleId,
              moduleName,
              permissions: [],
            });
          }

          groupsMap.get(moduleId)!.permissions.push(permissionString);
        }

        setPermissionGroups(Array.from(groupsMap.values()));
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load permissions")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [tenantId]);

  return { permissionGroups, loading, error };
}
