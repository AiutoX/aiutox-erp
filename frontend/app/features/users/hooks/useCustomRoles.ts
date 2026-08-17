/**
 * React hooks for custom roles management
 *
 * Provides CRUD operations for custom roles
 * Note: Backend endpoints may not exist yet
 */

import { useCallback, useState, useEffect } from "react";
import {
  listCustomRoles,
  getCustomRole,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
} from "../api/roles.api";
import type {
  CustomRole,
  CustomRoleCreate,
  CustomRoleUpdate,
} from "../types/user.types";

/**
 * Hook to list custom roles
 */
export function useCustomRoles() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await listCustomRoles();
      setRoles(response.data);
    } catch (err) {
      // If endpoint doesn't exist, set empty array (not an error)
      if (err instanceof Error && err.message.includes("404")) {
        setRoles([]);
      } else {
        setError(
          err instanceof Error ? err : new Error("Failed to load custom roles")
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
 * Hook to get a single custom role by ID
 */
export function useCustomRole(roleId: string | null) {
  const [role, setRole] = useState<CustomRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRole = useCallback(async () => {
    if (!roleId) {
      setRole(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getCustomRole(roleId);
      setRole(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load custom role")
      );
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return {
    role,
    loading,
    error,
    refresh: fetchRole,
  };
}

/**
 * Hook to create a custom role
 */
export function useCreateCustomRole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(
    async (data: CustomRoleCreate): Promise<CustomRole | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await createCustomRole(data);
        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to create custom role")
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    create,
    loading,
    error,
  };
}

/**
 * Hook to update a custom role
 */
export function useUpdateCustomRole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (
      roleId: string,
      data: CustomRoleUpdate
    ): Promise<CustomRole | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await updateCustomRole(roleId, data);
        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to update custom role")
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    update,
    loading,
    error,
  };
}

/**
 * Hook to delete a custom role
 */
export function useDeleteCustomRole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(async (roleId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await deleteCustomRole(roleId);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to delete custom role")
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    remove,
    loading,
    error,
  };
}
