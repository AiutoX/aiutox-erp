/**
 * Resolves a report column's display label.
 *
 * Data sources declare both a `label` (English fallback) and a `label_key`
 * (i18n key), the same contract ModuleNavigationItem and WidgetManifest use.
 * This hook resolves the key and falls back to the literal.
 *
 * The fallback is not just for a missing `label_key`: this project's `t()`
 * returns the key itself when it is absent from the catalog, so a stale key
 * would render raw `reporting.columns.foo.bar` text in the table header.
 * Comparing the result against the key catches that and degrades to the
 * English literal instead — readable, if untranslated.
 *
 * Fixes UX-008, where column headers rendered in English inside an otherwise
 * Spanish UI because the backend sent display text with no locale mechanism.
 */

import { useCallback } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface LabelledColumn {
  label: string;
  label_key?: string | null;
}

export function useColumnLabel(): (column: LabelledColumn) => string {
  const { t } = useTranslation();

  return useCallback(
    (column: LabelledColumn) => {
      if (!column.label_key) return column.label;
      const translated = t(column.label_key);
      return translated === column.label_key ? column.label : translated;
    },
    [t]
  );
}
