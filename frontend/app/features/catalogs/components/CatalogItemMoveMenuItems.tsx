/**
 * CatalogItemMoveMenuItems -- the mobile (<768px) row-menu entries "Mover
 * arriba" / "Mover abajo" (ISSUE-035, AC-UI-22/27). Mobile has no drag
 * handle, so these are its only reorder path. They are passed to
 * `CatalogItemRowMenu` through its `extraItems` slot (via
 * `CatalogItemsTable`'s `renderCardMenuExtraItems`).
 *
 * "Mover arriba" is disabled on the first reorderable item and "Mover
 * abajo" on the last. Deprecated items are not reorderable (they have no
 * drag handle either), so they do not count as neighbours. Without
 * `onMoveUp` / `onMoveDown` the enabled entries are no-ops; ISSUE-036 passes
 * the reorder handlers, and `disabled` turns both entries off while the item
 * search is non-empty (DEC-20261017-I036-1).
 *
 * AiutoX ERP Core -- Frankpach
 */

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { CatalogAdminItem } from "../types/catalogsAdmin.types";

export interface CatalogItemMoveMenuItemsProps {
  item: CatalogAdminItem;
  /** The items as currently listed, in display order. */
  items: CatalogAdminItem[];
  onMoveUp?: (item: CatalogAdminItem) => void;
  onMoveDown?: (item: CatalogAdminItem) => void;
  /** Disables both entries, e.g. while searching (ISSUE-036). */
  disabled?: boolean;
}

export function CatalogItemMoveMenuItems({
  item,
  items,
  onMoveUp,
  onMoveDown,
  disabled = false,
}: CatalogItemMoveMenuItemsProps) {
  const { t } = useTranslation();
  const reorderable = items.filter((candidate) => !candidate.is_deprecated);
  const position = reorderable.findIndex(
    (candidate) => candidate.code === item.code
  );
  const isFirst = disabled || position <= 0;
  const isLast =
    disabled || position === -1 || position === reorderable.length - 1;

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={isFirst} onSelect={() => onMoveUp?.(item)}>
        {t("catalogs.admin.items.menu.moveUp")}
      </DropdownMenuItem>
      <DropdownMenuItem disabled={isLast} onSelect={() => onMoveDown?.(item)}>
        {t("catalogs.admin.items.menu.moveDown")}
      </DropdownMenuItem>
    </>
  );
}
