/**
 * Building blocks shared by the desktop items table (`CatalogItemsTable`)
 * and the mobile item card (`CatalogItemCard`) -- ISSUE-034, AC-UI-15/16/17.
 *
 * Every interactive control here is rendered in its static form: the
 * visibility switch is disabled and the row-menu entries are no-ops unless
 * the caller passes the matching handler in `CatalogItemActionHandlers`.
 * ISSUE-035 (visibility, restore), ISSUE-036 (reorder), ISSUE-037 (edit)
 * and ISSUE-038 (history) wire them by passing handlers -- not by editing
 * these components.
 *
 * AiutoX ERP Core -- Frankpach
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Ellipsis, GripVertical } from "lucide-react";
import { showToast } from "~/components/common/Toast";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { cn } from "~/lib/utils";
import type { CatalogAdminItem } from "../types/catalogsAdmin.types";

/**
 * Callbacks that turn the static controls into real actions. Each one is
 * optional; a missing handler leaves its control in the ISSUE-034 static
 * form (switch disabled, menu entry a no-op).
 */
export interface CatalogItemActionHandlers {
  /** ISSUE-035: the visibility switch; `nextVisible` is the requested state. */
  onToggleVisibility?: (item: CatalogAdminItem, nextVisible: boolean) => void;
  /** ISSUE-037: row menu "Editar". */
  onEdit?: (item: CatalogAdminItem) => void;
  /** ISSUE-038: row menu "Ver historial". */
  onViewHistory?: (item: CatalogAdminItem) => void;
  /** ISSUE-035: row menu "Restaurar predeterminado". */
  onRestoreDefault?: (item: CatalogAdminItem) => void;
}

export type CatalogItemMenuAction = "edit" | "history" | "restore";

/**
 * The row-menu entries an item gets (AC-UI-16/17/22): none on a deprecated
 * item; "Editar" only when the viewer can manage the list; "Ver historial"
 * always; "Restaurar predeterminado" only on a modified system item of a
 * list the viewer can manage.
 */
export function getCatalogItemMenuActions(
  item: CatalogAdminItem,
  canManage: boolean
): CatalogItemMenuAction[] {
  if (item.is_deprecated) return [];
  const actions: CatalogItemMenuAction[] = [];
  if (canManage) actions.push("edit");
  actions.push("history");
  if (canManage && item.is_system && item.is_modified) actions.push("restore");
  return actions;
}

/** Whether an item shows a drag handle (AC-UI-16/17): never read-only, never deprecated. */
export function itemHasDragHandle(
  item: CatalogAdminItem,
  canManage: boolean
): boolean {
  return canManage && !item.is_deprecated;
}

/** Whether an item renders dimmed (AC-UI-16): hidden and not deprecated. */
export function itemIsDimmed(item: CatalogAdminItem): boolean {
  return item.is_hidden && !item.is_deprecated;
}

/** `t()` has no interpolation parameter, so `{token}` placeholders are replaced here. */
export function fillTokens(
  template: string,
  values: Record<string, string | number>
): string {
  return Object.entries(values).reduce(
    (text, [token, value]) => text.split(`{${token}}`).join(String(value)),
    template
  );
}

/** Monospace code chip; a click copies the code and toasts "Código copiado". */
export function CatalogItemCodeChip({ code }: { code: string }) {
  const { t } = useTranslation();

  const copy = () => {
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard
      .writeText(code)
      .then(() => showToast(t("catalogs.admin.items.codeCopied"), "success"))
      .catch(() => undefined);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {code}
    </button>
  );
}

/** "Sistema" (neutral) for declared items, "Personalizado" (teal) for tenant items. */
export function CatalogItemOriginBadge({ item }: { item: CatalogAdminItem }) {
  const { t } = useTranslation();

  if (item.is_system) {
    return (
      <Badge variant="secondary">{t("catalogs.admin.items.systemBadge")}</Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-teal-600/40 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
    >
      {t("catalogs.admin.items.customBadge")}
    </Badge>
  );
}

/** The "Modificado" dot badge, with an explaining tooltip (AC-UI-15). */
export function CatalogItemModifiedBadge() {
  const { t } = useTranslation();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex rounded-full">
            <Badge variant="outline" className="gap-1.5 font-normal">
              <span
                className="h-1.5 w-1.5 rounded-full bg-teal-600"
                aria-hidden="true"
              />
              {t("catalogs.admin.items.modifiedBadge")}
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {t("catalogs.admin.items.modifiedTooltip")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export interface CatalogItemStateProps {
  item: CatalogAdminItem;
  canManage: boolean;
  onToggleVisibility?: CatalogItemActionHandlers["onToggleVisibility"];
}

/**
 * The Estado cell: "Retirado" for a deprecated item; plain "Visible" /
 * "Oculto" text on a read-only list; otherwise the visibility switch
 * (disabled until `onToggleVisibility` is passed). Plus "Modificado".
 */
export function CatalogItemState({
  item,
  canManage,
  onToggleVisibility,
}: CatalogItemStateProps) {
  const { t } = useTranslation();

  let control: ReactNode;
  if (item.is_deprecated) {
    control = (
      <Badge variant="outline" className="text-muted-foreground">
        {t("catalogs.admin.items.retiredBadge")}
      </Badge>
    );
  } else if (!canManage) {
    control = (
      <span className="text-sm">
        {item.is_hidden
          ? t("catalogs.admin.items.hiddenText")
          : t("catalogs.admin.items.visibleText")}
      </span>
    );
  } else {
    control = (
      <Switch
        checked={!item.is_hidden}
        disabled={!onToggleVisibility}
        aria-label={fillTokens(t("catalogs.admin.items.visibilitySwitch"), {
          code: item.code,
        })}
        onCheckedChange={(next) => onToggleVisibility?.(item, next)}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {control}
      {item.is_modified && <CatalogItemModifiedBadge />}
    </div>
  );
}

export type CatalogItemDragHandleProps =
  ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * The `grip-vertical` drag handle. Inert (disabled) until ISSUE-036 passes
 * `handleProps` -- typically `{ ...attributes, ...listeners }` from
 * `useSortable` -- which are spread onto the button.
 */
export function CatalogItemDragHandle({
  code,
  handleProps,
}: {
  code: string;
  handleProps?: CatalogItemDragHandleProps;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      disabled={!handleProps}
      aria-label={fillTokens(t("catalogs.admin.items.dragHandle"), { code })}
      {...handleProps}
      className={cn(
        "inline-flex h-8 w-6 items-center justify-center rounded text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        handleProps ? "cursor-grab" : "cursor-default",
        handleProps?.className
      )}
    >
      <GripVertical className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export interface CatalogItemRowMenuProps {
  item: CatalogAdminItem;
  canManage: boolean;
  handlers?: CatalogItemActionHandlers;
  /**
   * Extra entries appended after the standard ones -- e.g. ISSUE-036's
   * mobile "Mover arriba" / "Mover abajo" (`DropdownMenuItem` elements).
   */
  extraItems?: ReactNode;
}

/**
 * The row menu (`DropdownMenu`). Renders nothing for a deprecated item
 * (AC-UI-16). Entries follow `getCatalogItemMenuActions`; each calls its
 * handler when one is passed and is a no-op otherwise.
 */
export function CatalogItemRowMenu({
  item,
  canManage,
  handlers,
  extraItems,
}: CatalogItemRowMenuProps) {
  const { t } = useTranslation();
  const actions = getCatalogItemMenuActions(item, canManage);
  if (actions.length === 0) return null;

  const entries: Record<
    CatalogItemMenuAction,
    { label: string; onSelect?: (item: CatalogAdminItem) => void }
  > = {
    edit: {
      label: t("catalogs.admin.items.menu.edit"),
      onSelect: handlers?.onEdit,
    },
    history: {
      label: t("catalogs.admin.items.menu.history"),
      onSelect: handlers?.onViewHistory,
    },
    restore: {
      label: t("catalogs.admin.items.menu.restore"),
      onSelect: handlers?.onRestoreDefault,
    },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={fillTokens(t("catalogs.admin.items.rowMenu"), {
            code: item.code,
          })}
        >
          <Ellipsis className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action}
            onSelect={() => entries[action].onSelect?.(item)}
          >
            {entries[action].label}
          </DropdownMenuItem>
        ))}
        {extraItems}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
