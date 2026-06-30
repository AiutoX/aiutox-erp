/**
 * TierGate — renders children only when the tenant has the required commercial tier.
 * Shows an UpgradeBanner otherwise.
 */

import type { ReactNode } from "react";
import { useActiveTier } from "~/hooks/useActiveTier";
import type { TierLevel } from "~/lib/api/tiers.api";
import { UpgradeBanner } from "./UpgradeBanner";

interface TierGateProps {
  module: string;
  tier: TierLevel;
  children: ReactNode;
  fallback?: ReactNode;
}

export function TierGate({
  module,
  tier,
  children,
  fallback,
}: TierGateProps) {
  const { hasTier, isLoading, tier: currentTier } = useActiveTier(module);

  if (isLoading) return null;

  if (!hasTier(tier)) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <UpgradeBanner
        module={module}
        currentTier={currentTier ?? "basic"}
        requiredTier={tier}
      />
    );
  }

  return <>{children}</>;
}
