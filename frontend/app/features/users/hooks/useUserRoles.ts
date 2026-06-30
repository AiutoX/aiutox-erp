/**
 * React hooks for user roles management
 *
 * Provides operations for assigning/removing roles to/from users
 */

import { useCallback, useState, useEffect } from "react";
import {
  getUserRoles,
  assignRole,
  removeRole,
  listRoles,
  type RoleWithPermissions,
} from "../api/roles.api";
import type { UserRole, GlobalRole } from "../types/user.types";

/**
 * Hook to get user roles
 */
export function useUserRoles(userId: string | null) {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!userId) {
      setRoles([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getUserRoles(userId);
      setRoles(response.roles);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load user roles")
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    roles,
    loading,
    error,
    refresh: fetchRoles,
  };
}

/**
 * Hook to get available roles with permissions
 */
export function useAvailableRoles() {
  const [availableRoles, setAvailableRoles] = useState<RoleWithPermissions[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await listRoles();
      setAvailableRoles(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load available roles")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    availableRoles,
    loading,
    error,
    refresh: fetchRoles,
  };
}

/**
 * Hook to assign a role to a user
 */
export function useAssignRole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const assign = useCallback(
    async (userId: string, role: GlobalRole): Promise<UserRole | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await assignRole(userId, role);
        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to assign role")
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    assign,
    loading,
    error,
  };
}

/**
 * Hook to remove a role from a user
 */
export function useRemoveRole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(
    async (userId: string, role: GlobalRole): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        await removeRole(userId, role);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to remove role")
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    remove,
    loading,
    error,
  };
}
