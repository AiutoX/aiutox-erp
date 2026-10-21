/**
 * Hook to fetch effective permissions for several users at once, for the
 * permissions audit table (per-user x per-module comparison).
 */

import { useEffect, useMemo, useState } from "react";
import { getUserEffectivePermissions } from "../api/permissions.api";

export interface AuditUserPermissions {
  userId: string;
  effectivePermissions: Set<string>;
}

export function useAuditPermissions(userIds: string[]) {
  const [data, setData] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(false);
  const userIdsKey = useMemo(() => userIds.join(","), [userIds]);

  useEffect(() => {
    if (userIds.length === 0) {
      setData(new Map());
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      userIds.map(async (userId) => {
        try {
          const response = await getUserEffectivePermissions(userId);
          return [userId, new Set(response.data.effective_permissions)] as const;
        } catch {
          return [userId, new Set<string>()] as const;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setData(new Map(results));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIdsKey]);

  return { data, loading };
}
