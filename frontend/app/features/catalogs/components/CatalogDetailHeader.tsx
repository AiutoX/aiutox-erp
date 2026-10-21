/**
 * CatalogDetailHeader -- label, description, owner-module and key badges,
 * and the "Historial" button for the selected catalog (ISSUE-032, AC-UI-06).
 *
 * The "Historial" button forwards to `onHistoryClick`; the page opens the
 * list-level `CatalogHistorySheet` from it (ISSUE-038). Without the prop the
 * button is a no-op.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { History } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { resolveLabel } from "~/lib/catalogs";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useOwnerModuleName } from "../hooks/useOwnerModuleName";
import type { CatalogListAdmin } from "../types/catalogsAdmin.types";

export interface CatalogDetailHeaderProps {
  list: CatalogListAdmin;
  onHistoryClick?: () => void;
}

export function CatalogDetailHeader({
  list,
  onHistoryClick,
}: CatalogDetailHeaderProps) {
  const { t, language } = useTranslation();
  const ownerModuleName = useOwnerModuleName();

  const description = list.description
    ? resolveLabel(list.description, language, "")
    : "";

  return (
    <div
      className="flex flex-wrap items-start justify-between gap-4"
      data-testid="catalog-detail-header"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">
          {resolveLabel(list.labels, language, list.key)}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{ownerModuleName(list.owner_module)}</Badge>
          <Badge variant="outline" className="font-mono">
            {list.key}
          </Badge>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onHistoryClick}>
        <History className="mr-1.5 h-4 w-4" aria-hidden="true" />
        {t("catalogs.admin.detail.historyButton")}
      </Button>
    </div>
  );
}
