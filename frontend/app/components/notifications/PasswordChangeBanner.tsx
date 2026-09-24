/**
 * PasswordChangeBanner
 * Persistent (non-blocking) top banner shown when must_change_password === true.
 * Provides a CTA that navigates to /profile where the ChangePasswordForm lives.
 */

import { Link } from "react-router";
import { AlertTriangle } from "lucide-react";
import { useAuthStore } from "~/stores/authStore";
import { useTranslation } from "~/lib/i18n/useTranslation";

export function PasswordChangeBanner() {
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();

  if (!user?.must_change_password) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 bg-yellow-500 px-4 py-2 text-sm font-medium text-yellow-950"
    >
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t("passwordChangeBanner.title")} —{" "}
        {t("passwordChangeBanner.description")}
      </span>
      <Link
        to="/profile"
        className="whitespace-nowrap rounded bg-yellow-950 px-3 py-1 text-xs font-semibold text-yellow-50 hover:bg-yellow-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-950"
      >
        {t("passwordChangeBanner.cta")}
      </Link>
    </div>
  );
}
