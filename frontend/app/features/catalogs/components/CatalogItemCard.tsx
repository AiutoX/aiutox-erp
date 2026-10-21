/**
 * CatalogItemCard -- one catalog item in the mobile (<768px) layout of the
 * "Elementos" card (ISSUE-034, AC-UI-27): the code chip and row menu on
 * top, both labels stacked, and the origin badge + state in the footer.
 *
 * It renders the same parts as a `CatalogItemsTable` row and honours the
 * same row states: a hidden item is dimmed except its state and menu, a
 * deprecated item shows "Retirado" with no switch and no menu, and a
 * read-only list shows the state as text. Mobile reorders through the row
 * menu only (AC-UI-27), so the card has no drag handle; ISSUE-036 passes
 * its "Mover arriba" / "Mover abajo" entries through `menuExtraItems`.
 *
 * AiutoX ERP Core -- Frankpach
 */

import type { ReactNode } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { cn } from "~/lib/utils";
import type { CatalogAdminItem } from "../types/catalogsAdmin.types";
import {
  CatalogItemCodeChip,
  CatalogItemOriginBadge,
  CatalogItemRowMenu,
  CatalogItemState,
  itemIsDimmed,
  type CatalogItemActionHandlers,
} from "./CatalogItemParts";

export interface CatalogItemCardProps {
  item: CatalogAdminItem;
  /** `viewer_capabilities.can_manage` of the item's list. */
  canManage: boolean;
  handlers?: CatalogItemActionHandlers;
  /** Extra row-menu entries (ISSUE-036 "Mover arriba" / "Mover abajo"). */
  menuExtraItems?: ReactNode;
  className?: string;
}

export function CatalogItemCard({
  item,
  canManage,
  handlers,
  menuExtraItems,
  className,
}: CatalogItemCardProps) {
  const { t } = useTranslation();
  const dimmed = itemIsDimmed(item) ? "opacity-60" : undefined;

  return (
    <Card
      className={className}
      data-testid={`catalog-item-card-${item.code}`}
      data-hidden={item.is_hidden || undefined}
      data-deprecated={item.is_deprecated || undefined}
    >
      <CardContent className="space-y-3 p-4">
        <div
          className="flex items-center justify-between gap-2"
          data-testid="catalog-item-card-top"
        >
          <div className={dimmed} data-testid="catalog-item-card-code">
            <CatalogItemCodeChip code={item.code} />
          </div>
          <CatalogItemRowMenu
            item={item}
            canManage={canManage}
            handlers={handlers}
            extraItems={menuExtraItems}
          />
        </div>
        <dl
          className={cn("space-y-1 text-sm", dimmed)}
          data-testid="catalog-item-card-labels"
        >
          <div>
            <dt className="text-xs text-muted-foreground">
              {t("catalogs.admin.items.spanishColumn")}
            </dt>
            <dd>{item.labels.es ?? ""}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t("catalogs.admin.items.englishColumn")}
            </dt>
            <dd>{item.labels.en ?? ""}</dd>
          </div>
        </dl>
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"
          data-testid="catalog-item-card-footer"
        >
          <div className={dimmed} data-testid="catalog-item-card-origin">
            <CatalogItemOriginBadge item={item} />
          </div>
          <div data-testid="catalog-item-card-state">
            <CatalogItemState
              item={item}
              canManage={canManage}
              onToggleVisibility={handlers?.onToggleVisibility}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
