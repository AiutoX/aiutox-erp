/**
 * Hook to list users assigned a given global role (system role)
 */

import { useCallback, useEffect, useState } from "react";
import { listUsersWithRole } from "../api/roles.api";
import type { User } from "../types/user.types";

export function useUsersWithRole(role: string | null) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!role) {
      setUsers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await listUsersWithRole(role);
      setUsers(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load users with role")
      );
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refresh: fetchUsers };
}
