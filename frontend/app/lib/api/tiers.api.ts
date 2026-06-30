/**
 * API services for commercial tier management
 */

import apiClient from "./client";
import type { StandardResponse } from "./types/common.types";

export type TierLevel = "basic" | "pro" | "enterprise";

export const TIER_ORDER: Record<TierLevel, number> = {
  basic: 1,
  pro: 2,
  enterprise: 3,
};

export type TenantTiers = Record<string, TierLevel>;

/**
 * Get active tiers for current tenant
 * GET /api/v1/tenants/me/tiers
 */
export async function getMyTiers(): Promise<StandardResponse<TenantTiers>> {
  const response = await apiClient.get<StandardResponse<TenantTiers>>(
    "/tenants/me/tiers"
  );
  return response.data;
}

/**
 * Check if a given tier meets the required tier level.
 * Tiers are additive: enterprise satisfies pro, pro satisfies basic.
 */
export function tierMeets(
  current: TierLevel | undefined,
  required: TierLevel
): boolean {
  if (!current) return false;
  return (TIER_ORDER[current] ?? 0) >= (TIER_ORDER[required] ?? 0);
}
