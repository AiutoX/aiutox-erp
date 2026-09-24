/**
 * useActiveTier — TanStack Query hook for commercial tier gating.
 *
 * Fetches all active tiers for the current tenant and exposes
 * per-module tier information with comparison helpers.
 */

import { useQuery } from "@tanstack/react-query";
import {
  getMyTiers,
  tierMeets,
  type TierLevel,
} from "~/lib/api/tiers.api";

const TIERS_QUERY_KEY = ["tiers", "me"] as const;
const TIERS_STALE_TIME = 5 * 60 * 1000; // 5 minutes — matches Redis TTL

export interface UseActiveTierResult {
  tier: TierLevel | undefined;
  isLoading: boolean;
  isError: boolean;
  hasTier: (required: TierLevel) => boolean;
}

/**
 * Hook to get and check the active commercial tier for a specific module.
 *
 * @param moduleId - Module ID to check (e.g. 'products', 'maintenance')
 */
export function useActiveTier(moduleId: string): UseActiveTierResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...TIERS_QUERY_KEY, moduleId],
    queryFn: async () => {
      const response = await getMyTiers();
      return response.data ?? {};
    },
    staleTime: TIERS_STALE_TIME,
    retry: 1,
  });

  const tier = (data?.[moduleId]) ?? (data ? "basic" : undefined);

  const hasTier = (required: TierLevel): boolean => {
    if (!tier) return false;
    return tierMeets(tier, required);
  };

  return { tier, isLoading, isError, hasTier };
}
