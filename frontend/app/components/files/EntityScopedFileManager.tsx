import { useMemo } from "react";
import { FileManager, type FileManagerProps } from "./FileManager";
import { useTranslation } from "~/lib/i18n/useTranslation";

interface EntityScopedFileManagerProps
  extends Omit<FileManagerProps, "entityType"> {
  entityType?: string;
  entityId?: string;
}

/**
 * Wrapper for FileManager that provides entity-scoped file viewing.
 * When entityType is provided, hides the admin filter dropdown.
 * When entityType is undefined, shows the full filter dropdown (admin mode).
 */
export function EntityScopedFileManager({
  entityType,
  entityId,
  ...props
}: EntityScopedFileManagerProps) {
  const { t } = useTranslation();

  // Memoize the label to prevent unnecessary re-renders
  const scopedLabel = useMemo(() => {
    if (!entityType) return null;

    const typeLabel: Record<string, string> = {
      property: t("files.entityType.property"),
      product: t("files.entityType.product"),
      order: t("files.entityType.order"),
    };

    return typeLabel[entityType] || entityType;
  }, [entityType, t]);

  // If entityType provided: render scoped view with label instead of dropdown
  if (entityType && entityId) {
    return (
      <div className="space-y-4">
        {scopedLabel && (
          <div className="text-sm font-medium text-muted-foreground">
            {scopedLabel}
          </div>
        )}
        {/* Pass entityType and entityId to FileManager - it filters internally */}
        <FileManager
          entityType={entityType}
          entityId={entityId}
          {...props}
        />
      </div>
    );
  }

  // No entityType: show admin UI with full filter dropdown
  return <FileManager {...props} />;
}
