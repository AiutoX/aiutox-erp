/**
 * Filter Preview Component
 * Shows a human-readable description of the filter configuration.
 */

import { Eye, Info } from "lucide-react";
import type { FilterConfig, FieldConfig } from "../types/savedFilter.types";
import { buildFilterDescription } from "../utils/filterUtils";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface FilterPreviewProps {
  filterConfig: FilterConfig;
  fields: FieldConfig[];
  estimatedCount?: number; // Optional: estimated number of results
}

/**
 * Filter Preview component
 */
export function FilterPreview({
  filterConfig,
  fields,
  estimatedCount,
}: FilterPreviewProps) {
  const description = buildFilterDescription(filterConfig, fields);
  const hasConditions = Object.keys(filterConfig).length > 0;
  const { t } = useTranslation();

  if (!hasConditions) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        {t("filterEditor.noConditions")}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/50 p-4">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-semibold">{t("filterEditor.preview")}</h4>
      </div>

      <div className="space-y-2">
        <p className="text-sm">
          <span className="font-medium">
            {t("filterEditor.previewDescription")}
          </span>
        </p>
        <div className="rounded-md bg-[hsl(var(--background))] p-3 text-sm">
          {description}
        </div>
      </div>

      {estimatedCount !== undefined && (
        <div className="flex items-center gap-2 rounded-md border bg-blue-50 p-2 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
          <Info className="h-4 w-4" />
          <span>
            <strong>{t("filterEditor.estimatedResults")}</strong> ~
            {estimatedCount} {t("filterEditor.records")}
          </span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p>{t("filterEditor.tip")}</p>
      </div>
    </div>
  );
}
