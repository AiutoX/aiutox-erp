/**
 * UpgradeBanner — shown when tenant tier is insufficient for a feature.
 * Uses i18n keys: tier.upgrade.title, tier.upgrade.description, tier.upgrade.cta
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import type { TierLevel } from "~/lib/api/tiers.api";

interface UpgradeBannerProps {
  module: string;
  currentTier: TierLevel;
  requiredTier: TierLevel;
}

export function UpgradeBanner({
  module,
  currentTier,
  requiredTier,
}: UpgradeBannerProps) {
  const { t } = useTranslation();

  return (
    <div
      data-testid="upgrade-banner"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"
      role="alert"
      aria-label={t("tier.upgrade.title")}
    >
      <p className="font-semibold text-amber-800">{t("tier.upgrade.title")}</p>
      <p className="mt-1 text-amber-700">
        {`${t("tier.upgrade.description")} ${module} (${t(`tier.level.${currentTier}`)} → ${t(`tier.level.${requiredTier}`)})`}
      </p>
      <button
        className="mt-3 rounded-md bg-amber-600 px-3 py-1.5 text-white hover:bg-amber-700"
        type="button"
      >
        {t("tier.upgrade.cta")}
      </button>
    </div>
  );
}
