/**
 * CatalogItemsTable -- the "Elementos" card of the catalogs admin screen
 * (ISSUE-034, AC-UI-13/15/16/17/18/27).
 *
 * Title, "N visibles de M" summary, toolbar (item search, "Mostrar
 * retirados", "Agregar elemento"), the read-only banner, and the items:
 * a table built on the `components/ui/table.tsx` primitives at >=768px,
 * one `CatalogItemCard` per item below 768px. Not `DataTable`: it renders
 * its own `<tr>` with no row hook, so ISSUE-036's `useSortable` could not
 * attach to its rows.
 *
 * Presentational: the caller owns the data (`useCatalogAdminItems`), the
 * search text and the "Mostrar retirados" flag (which drives
 * `include_deprecated`). The search filters client-side.
 *
 * Extension points for ISSUE-035..038:
 * - `handlers` (`CatalogItemActionHandlers`) enables the visibility switch
 *   and wires the row-menu entries;
 * - `onAddItem` is the "Agregar elemento" click. ISSUE-037: the button is
 *   enabled only from `can_add_items` (AC-UI-03); when disabled,
 *   `disabledAddReason(list)` picks its tooltip (AC-UI-14), shown through a
 *   focusable wrapper;
 * - `CatalogItemRow` forwards its ref and accepts `style`, `className`,
 *   `dragHandleProps` and `menuExtraItems`, so a sortable wrapper can call
 *   `useSortable` and pass `setNodeRef` / transform style / listeners in;
 *   `renderRow` lets the table body render that wrapper instead;
 * - `renderCardMenuExtraItems` adds per-item menu entries on mobile cards
 *   ("Mover arriba" / "Mover abajo").
 *
 * Reorder (ISSUE-036, AC-UI-20/21): with `onReorder`, the table layout
 * (>=768px only; the cards never drag) wraps its rows in dnd-kit's
 * `DndContext` + `SortableContext`, following
 * `data_collection/components/builder/PageNavigator.tsx`, plus a
 * `KeyboardSensor` (Space lifts, arrows move, Space drops, Escape cancels)
 * and translated screen-reader announcements. Only non-deprecated rows are
 * sortable; the drop target gets a teal top line and the rows settle in
 * 150ms. A drop calls `onReorder` with the full new order of the
 * reorderable codes, and only when the order changed. While the item search
 * is non-empty the shown rows are a subset, so reorder is off and the
 * handles stay inert (DEC-20261017-I036-1).
 *
 * AiutoX ERP Core -- Frankpach
 */

import {
  Fragment,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type KeyboardSensorOptions,
  type PointerSensorOptions,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Info, Plus } from "lucide-react";
import { SearchBar } from "~/components/common/SearchBar";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { cn } from "~/lib/utils";
import { disabledAddReason } from "../lib/disabledReason";
import {
  isReorderAvailable,
  moveCode,
  reorderableCodes,
} from "../lib/reorderItems";
import type {
  CatalogAdminItem,
  CatalogListAdmin,
  CatalogViewerCapabilities,
} from "../types/catalogsAdmin.types";
import { CatalogItemCard } from "./CatalogItemCard";
import {
  CatalogItemCodeChip,
  CatalogItemDragHandle,
  CatalogItemOriginBadge,
  CatalogItemRowMenu,
  CatalogItemState,
  fillTokens,
  itemHasDragHandle,
  itemIsDimmed,
  type CatalogItemActionHandlers,
  type CatalogItemDragHandleProps,
} from "./CatalogItemParts";

const TABLET_QUERY = "(min-width: 768px)";
const LOADING_ROWS = 5;

/** Pointer drags start after 5px, so a click on the handle is not a drag. */
export const REORDER_POINTER_SENSOR_OPTIONS: PointerSensorOptions = {
  activationConstraint: { distance: 5 },
};

/** Arrow keys move the lifted row to its sortable neighbours (AC-UI-21). */
export const REORDER_KEYBOARD_SENSOR_OPTIONS: KeyboardSensorOptions = {
  coordinateGetter: sortableKeyboardCoordinates,
};

/** The ~150ms settle animation of the rows (AC-UI-21); dnd-kit's default is 200ms. */
export const REORDER_SETTLE_TRANSITION = { duration: 150, easing: "ease" };

function matchesTablet(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia(TABLET_QUERY).matches;
}

/** Tracks the table / cards breakpoint (Tailwind `md`, >=768px), AC-UI-27. */
function useIsTabletUp(): boolean {
  const [isTabletUp, setIsTabletUp] = useState(matchesTablet);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const media = window.matchMedia(TABLET_QUERY);
    const onChange = (event: MediaQueryListEvent) =>
      setIsTabletUp(event.matches);
    setIsTabletUp(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isTabletUp;
}

/** Lowercases and strips diacritics so "organizacion" matches "Organización". */
function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * The items to show (AC-UI-16/18): deprecated items only with "Mostrar
 * retirados", then the accent/case-insensitive search over `code`,
 * `labels.es` and `labels.en`.
 */
export function filterCatalogItems(
  items: CatalogAdminItem[],
  query: string,
  includeDeprecated: boolean
): CatalogAdminItem[] {
  const normalizedQuery = normalizeForSearch(query.trim());
  return items.filter((item) => {
    if (item.is_deprecated && !includeDeprecated) return false;
    if (!normalizedQuery) return true;
    return [item.code, item.labels.es ?? "", item.labels.en ?? ""].some(
      (value) => normalizeForSearch(value).includes(normalizedQuery)
    );
  });
}

/**
 * "N visibles de M" (AC-UI-13): N counts items neither hidden nor
 * deprecated; M counts non-deprecated items, or every item when "Mostrar
 * retirados" is on. Computed over the whole list, not the search result.
 */
export function summarizeCatalogItems(
  items: CatalogAdminItem[],
  includeDeprecated: boolean
): { visible: number; total: number } {
  const visible = items.filter(
    (item) => !item.is_hidden && !item.is_deprecated
  ).length;
  const total = includeDeprecated
    ? items.length
    : items.filter((item) => !item.is_deprecated).length;
  return { visible, total };
}

export interface CatalogItemRowProps {
  item: CatalogAdminItem;
  /** `viewer_capabilities.can_manage`: false drops the drag-handle column. */
  canManage: boolean;
  handlers?: CatalogItemActionHandlers;
  /** ISSUE-036: `useSortable` attributes + listeners for the handle. */
  dragHandleProps?: CatalogItemDragHandleProps;
  /** ISSUE-036: `useSortable` transform / transition style. */
  style?: CSSProperties;
  className?: string;
  menuExtraItems?: ReactNode;
  /** ISSUE-036: the row a dragged item is over -- drawn with a teal top line. */
  isDropTarget?: boolean;
}

/** One table row. Forwards its ref to the `<tr>` (for `useSortable`'s `setNodeRef`). */
export const CatalogItemRow = forwardRef<
  HTMLTableRowElement,
  CatalogItemRowProps
>(
  (
    {
      item,
      canManage,
      handlers,
      dragHandleProps,
      style,
      className,
      menuExtraItems,
      isDropTarget = false,
    },
    ref
  ) => {
    const dimmed = itemIsDimmed(item) ? "opacity-60" : undefined;

    return (
      <TableRow
        ref={ref}
        style={style}
        className={cn(
          isDropTarget && "[&>td]:border-t-2 [&>td]:border-t-teal-600",
          className
        )}
        data-testid={`catalog-item-row-${item.code}`}
        data-drop-target={isDropTarget || undefined}
        data-hidden={item.is_hidden || undefined}
        data-deprecated={item.is_deprecated || undefined}
      >
        {canManage && (
          <TableCell className={cn("w-10 px-2", dimmed)}>
            {itemHasDragHandle(item, canManage) && (
              <CatalogItemDragHandle
                code={item.code}
                handleProps={dragHandleProps}
              />
            )}
          </TableCell>
        )}
        <TableCell className={dimmed}>
          <CatalogItemCodeChip code={item.code} />
        </TableCell>
        <TableCell className={dimmed}>{item.labels.es ?? ""}</TableCell>
        <TableCell className={dimmed}>{item.labels.en ?? ""}</TableCell>
        <TableCell className={dimmed}>
          <CatalogItemOriginBadge item={item} />
        </TableCell>
        <TableCell>
          <CatalogItemState
            item={item}
            canManage={canManage}
            onToggleVisibility={handlers?.onToggleVisibility}
          />
        </TableCell>
        <TableCell className="w-12 px-2 text-right">
          <CatalogItemRowMenu
            item={item}
            canManage={canManage}
            handlers={handlers}
            extraItems={menuExtraItems}
          />
        </TableCell>
      </TableRow>
    );
  }
);
CatalogItemRow.displayName = "CatalogItemRow";

/**
 * A `CatalogItemRow` wired to `useSortable` (ISSUE-036): the row is the
 * sortable node, the drag handle is the activator (pointer and keyboard).
 */
function SortableCatalogItemRow(props: CatalogItemRowProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: props.item.code,
    transition: REORDER_SETTLE_TRANSITION,
    attributes: {
      roleDescription: t("catalogs.admin.items.reorderRoleDescription"),
    },
  });

  return (
    <CatalogItemRow
      {...props}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-10 bg-background shadow-md")}
      isDropTarget={isOver && !isDragging}
      dragHandleProps={{ ...attributes, ...listeners, className: "touch-none" }}
    />
  );
}

export interface CatalogItemsTableProps {
  list: CatalogListAdmin;
  /** The list's admin items, in the backend's effective order. */
  items: CatalogAdminItem[];
  capabilities: CatalogViewerCapabilities;
  /** Client-side item search text (controlled). */
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  /** "Mostrar retirados" (controlled); drives `include_deprecated`. */
  includeDeprecated: boolean;
  onIncludeDeprecatedChange: (next: boolean) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** "Agregar elemento" click (ISSUE-037). */
  onAddItem?: () => void;
  handlers?: CatalogItemActionHandlers;
  /** `auto` (default) switches at 768px; `table` / `cards` force a layout. */
  layout?: "auto" | "table" | "cards";
  /** ISSUE-036: render a (sortable) row instead of the plain `CatalogItemRow`. */
  renderRow?: (props: CatalogItemRowProps, index: number) => ReactNode;
  /** ISSUE-036: extra row-menu entries per card ("Mover arriba" / "Mover abajo"). */
  renderCardMenuExtraItems?: (
    item: CatalogAdminItem,
    index: number,
    visibleItems: CatalogAdminItem[]
  ) => ReactNode;
  /**
   * ISSUE-036: turns on drag-and-drop / keyboard reorder in the table
   * layout. Called with the full new order of the reorderable codes
   * (non-deprecated, hidden included), only when the order changed. Ignored
   * on a read-only list and while `searchQuery` is non-empty.
   */
  onReorder?: (codes: string[]) => void;
}

export function CatalogItemsTable({
  list,
  items,
  capabilities,
  searchQuery,
  onSearchQueryChange,
  includeDeprecated,
  onIncludeDeprecatedChange,
  isLoading = false,
  isError = false,
  onRetry,
  onAddItem,
  handlers,
  layout = "auto",
  renderRow,
  renderCardMenuExtraItems,
  onReorder,
}: CatalogItemsTableProps) {
  const { t, language } = useTranslation();
  const isTabletUp = useIsTabletUp();
  const showTable = layout === "table" || (layout === "auto" && isTabletUp);
  const canManage = capabilities.can_manage;
  const reorderEnabled =
    Boolean(onReorder) && isReorderAvailable(canManage, searchQuery);

  const summary = useMemo(
    () => summarizeCatalogItems(items, includeDeprecated),
    [items, includeDeprecated]
  );
  const visibleItems = useMemo(
    () => filterCatalogItems(items, searchQuery, includeDeprecated),
    [items, searchQuery, includeDeprecated]
  );
  const sortableCodes = useMemo(
    () => reorderableCodes(visibleItems),
    [visibleItems]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, REORDER_POINTER_SENSOR_OPTIONS),
    useSensor(KeyboardSensor, REORDER_KEYBOARD_SENSOR_OPTIONS)
  );

  // dnd-kit fires onDragOver right after onDragStart with the lifted row
  // itself; skipping an unchanged target keeps the "lifted" announcement.
  const lastAnnouncedOver = useRef<UniqueIdentifier | null>(null);
  const announcements = useMemo<Announcements>(() => {
    const byCode = new Map(visibleItems.map((item) => [item.code, item]));
    const total = sortableCodes.length;
    const name = (id: UniqueIdentifier) => {
      const item = byCode.get(String(id));
      return item ? item.labels[language] || item.code : String(id);
    };
    const position = (id: UniqueIdentifier) =>
      sortableCodes.indexOf(String(id)) + 1;
    const cancelled = (id: UniqueIdentifier) =>
      fillTokens(t("catalogs.admin.items.reorderAnnounceCancel"), {
        name: name(id),
        position: position(id),
      });
    return {
      onDragStart: ({ active }) => {
        lastAnnouncedOver.current = active.id;
        return fillTokens(t("catalogs.admin.items.reorderAnnounceStart"), {
          name: name(active.id),
          position: position(active.id),
          total,
        });
      },
      onDragOver: ({ active, over }) => {
        if (!over || over.id === lastAnnouncedOver.current) return undefined;
        lastAnnouncedOver.current = over.id;
        return fillTokens(t("catalogs.admin.items.reorderAnnounceOver"), {
          name: name(active.id),
          position: position(over.id),
          total,
        });
      },
      onDragEnd: ({ active, over }) =>
        over
          ? fillTokens(t("catalogs.admin.items.reorderAnnounceEnd"), {
              name: name(active.id),
              position: position(over.id),
              total,
            })
          : cancelled(active.id),
      onDragCancel: ({ active }) => cancelled(active.id),
    };
  }, [visibleItems, sortableCodes, language, t]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const next = moveCode(
      sortableCodes,
      String(active.id),
      over ? String(over.id) : null
    );
    if (next) onReorder?.(next);
  };

  const showDeprecatedId = `catalog-items-show-deprecated-${list.key}`;

  // AC-UI-03/14: `can_add_items` alone decides enablement; the TT-01 reason
  // only picks the tooltip, and a disabled button with no reason (e.g. a
  // deprecated list) gets none.
  const canAddItems = capabilities.can_add_items;
  const addReasonKey = canAddItems ? null : disabledAddReason(list);
  const addButton = (
    <Button size="sm" disabled={!canAddItems} onClick={onAddItem}>
      <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
      {t("catalogs.admin.items.addItem")}
    </Button>
  );

  let body: ReactNode;
  if (isLoading) {
    body = (
      <div className="space-y-2" data-testid="catalog-items-loading">
        {Array.from({ length: LOADING_ROWS }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-10 w-full"
            data-testid="catalog-items-loading-row"
          />
        ))}
      </div>
    );
  } else if (isError) {
    body = (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {t("catalogs.admin.items.loadError")}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("catalogs.admin.loadError.retry")}
        </Button>
      </div>
    );
  } else if (summary.total === 0) {
    body = (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("catalogs.admin.items.empty")}
      </p>
    );
  } else if (visibleItems.length === 0) {
    body = (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("catalogs.admin.items.noSearchMatch")}
      </p>
    );
  } else if (showTable) {
    const table = (
      <Table data-testid="catalog-items-table">
        <TableHeader>
          <TableRow>
            {canManage && (
              <TableHead className="w-10 px-2">
                <span className="sr-only">
                  {t("catalogs.admin.items.reorderColumn")}
                </span>
              </TableHead>
            )}
            <TableHead>{t("catalogs.admin.items.codeColumn")}</TableHead>
            <TableHead>{t("catalogs.admin.items.spanishColumn")}</TableHead>
            <TableHead>{t("catalogs.admin.items.englishColumn")}</TableHead>
            <TableHead>{t("catalogs.admin.items.originColumn")}</TableHead>
            <TableHead>{t("catalogs.admin.items.stateColumn")}</TableHead>
            <TableHead className="w-12 px-2">
              <span className="sr-only">
                {t("catalogs.admin.items.actionsColumn")}
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleItems.map((item, index) => {
            const rowProps: CatalogItemRowProps = {
              item,
              canManage,
              handlers,
            };
            let row: ReactNode;
            if (renderRow) {
              row = renderRow(rowProps, index);
            } else if (reorderEnabled && itemHasDragHandle(item, canManage)) {
              row = <SortableCatalogItemRow {...rowProps} />;
            } else {
              row = <CatalogItemRow {...rowProps} />;
            }
            return <Fragment key={item.code}>{row}</Fragment>;
          })}
        </TableBody>
      </Table>
    );
    body = reorderEnabled ? (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable: t("catalogs.admin.items.reorderInstructions"),
          },
        }}
      >
        <SortableContext
          items={sortableCodes}
          strategy={verticalListSortingStrategy}
        >
          {table}
        </SortableContext>
      </DndContext>
    ) : (
      table
    );
  } else {
    body = (
      <div className="space-y-3" data-testid="catalog-items-cards">
        {visibleItems.map((item, index) => (
          <CatalogItemCard
            key={item.code}
            item={item}
            canManage={canManage}
            handlers={handlers}
            menuExtraItems={renderCardMenuExtraItems?.(
              item,
              index,
              visibleItems
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <Card data-testid="catalog-items-card" data-list-key={list.key}>
      <CardHeader className="space-y-4">
        <div className="space-y-1">
          <CardTitle className="text-xl">
            {t("catalogs.admin.items.title")}
          </CardTitle>
          {!isLoading && !isError && (
            <CardDescription data-testid="catalog-items-summary">
              {fillTokens(t("catalogs.admin.items.summary"), summary)}
            </CardDescription>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBar
            className="flex-1"
            value={searchQuery}
            onChange={onSearchQueryChange}
            placeholder={t("catalogs.admin.items.searchPlaceholder")}
            data-testid="catalog-items-search"
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id={showDeprecatedId}
              checked={includeDeprecated}
              onCheckedChange={(checked) =>
                onIncludeDeprecatedChange(checked === true)
              }
            />
            <label htmlFor={showDeprecatedId} className="text-sm">
              {t("catalogs.admin.items.showDeprecated")}
            </label>
          </div>
          {addReasonKey ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* A disabled button gets no pointer or focus events, so a
                      focusable wrapper is the tooltip trigger (AC-UI-28). */}
                  <span
                    tabIndex={0}
                    className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid="catalog-items-add-disabled-trigger"
                  >
                    {addButton}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {t(addReasonKey)}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            addButton
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canManage && (
          <Alert role="status" data-testid="catalog-items-read-only-banner">
            <Info className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              {t("catalogs.admin.items.readOnlyBanner")}
            </AlertDescription>
          </Alert>
        )}
        {body}
      </CardContent>
    </Card>
  );
}
