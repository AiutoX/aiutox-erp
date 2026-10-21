/**
 * Centralized toast hook with i18n support
 *
 * Provides a consistent way to show toast messages with translations
 */

import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";

export function useToast() {
  const { t } = useTranslation();

  return {
    success: (key: string, fallback?: string) => {
      const message = t(key) || fallback || key;
      showToast(message, "success");
    },
    error: (key: string, fallback?: string) => {
      const message = t(key) || fallback || key;
      showToast(message, "error");
    },
    info: (key: string, fallback?: string) => {
      const message = t(key) || fallback || key;
      showToast(message, "info");
    },
    warning: (key: string, fallback?: string) => {
      const message = t(key) || fallback || key;
      showToast(message, "warning");
    },
  };
}
