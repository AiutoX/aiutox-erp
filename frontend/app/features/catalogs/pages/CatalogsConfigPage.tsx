/**
 * CatalogsConfigPage -- the catalogs admin screen shell (ISSUE-031).
 *
 * Master-detail layout (AC-UI-27): the catalog list on the left
 * (CatalogListNav) and the selected catalog's detail on the right. The
 * selection lives in the `?list=` query param (AC-UI-02, see
 * useSelectedCatalogList). The right column is a slot holding the detail
 * header and governance panel (ISSUE-032/033), the items card
 * (ISSUE-034) and the history sheet (ISSUE-038).
 *
 * This page owns its ConfigPageLayout (instead of the route file) because
 * the narrow-screen detail view must render without the page title
 * (AC-UI-27), which depends on the selection and the breakpoint.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, List } from "lucide-react";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";
import { ConfigEmptyState } from "~/components/config/ConfigEmptyState";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { CatalogDetailHeader } from "../components/CatalogDetailHeader";
import { CatalogGovernancePanel } from "../components/CatalogGovernancePanel";
import { unknownListMessage } from "../lib/unknownListMessage";
import { CatalogHistorySheet } from "../components/CatalogHistorySheet";
import { CatalogItemDialog } from "../components/CatalogItemDialog";
import { CatalogItemMoveMenuItems } from "../components/CatalogItemMoveMenuItems";
import type { CatalogItemActionHandlers } from "../components/CatalogItemParts";
import { CatalogItemsTable } from "../components/CatalogItemsTable";
import { CatalogListNav } from "../components/CatalogListNav";
import { useCatalogAdminItems } from "../hooks/useCatalogAdminItems";
import { useCatalogLists } from "../hooks/useCatalogLists";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { useReorderCatalogItems } from "../hooks/useReorderCatalogItems";
import { useResetCatalogItem } from "../hooks/useResetCatalogItem";
import { useSelectedCatalogList } from "../hooks/useSelectedCatalogList";
import { useUpdateCatalogItem } from "../hooks/useUpdateCatalogItem";
import {
  isReorderAvailable,
  moveCodeBy,
  reorderableCodes,
} from "../lib/reorderItems";
import type {
  CatalogAdminItem,
  CatalogListAdmin,
} from "../types/catalogsAdmin.types";

const LOADING_LIST_ROWS = 6;
const LOADING_DETAIL_ROWS = 5;

/** The open item dialog of the items card (ISSUE-037). */
type ItemDialogState =
  { mode: "edit"; item: CatalogAdminItem } | { mode: "add" };

/** The open history sheet (ISSUE-038): an item's history when `code` is set, else the list's. */
interface HistorySheetState {
  code?: string;
}

function CatalogsLoadingSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]"
      data-testid="catalogs-loading"
    >
      <Card>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: LOADING_LIST_ROWS }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-11 w-full"
              data-testid="catalogs-loading-list-row"
            />
          ))}
        </CardContent>
      </Card>
      <Card className="hidden lg:block">
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          {Array.from({ length: LOADING_DETAIL_ROWS }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-10 w-full"
              data-testid="catalogs-loading-detail-row"
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * The "Elementos" card of the selected catalog (ISSUE-034). Owns the item
 * search text (client-side filter) and the "Mostrar inactivos" flag (drives
 * `include_deprecated`); the slot keys it by list, so both reset when
 * another catalog is selected. Capabilities come from the lists query, like
 * the governance panel's.
 *
 * ISSUE-035 wires the item actions: the Estado switch runs
 * `useUpdateCatalogItem` with `is_hidden`, "Restaurar predeterminado" runs
 * `useResetCatalogItem`, and the mobile cards get "Mover arriba" / "Mover
 * abajo". The switch stays
 * controlled by the server data: a refused change (e.g. 409
 * `CATALOG_LAST_VISIBLE_ITEM`) leaves it where it was, and the hooks'
 * invalidation re-renders the rows. A new action is ignored while the same
 * mutation is still in flight.
 *
 * ISSUE-036 wires reorder through `useReorderCatalogItems`, keyed to the
 * same query parameters as the items query so its optimistic write and
 * rollback hit the rows on screen: drag and drop / keyboard in the table
 * (`onReorder`) and "Mover arriba" / "Mover abajo" on the cards, which send
 * the reorderable codes with the item moved one position. Both are off while
 * the item search is non-empty (DEC-20261017-I036-1); an unchanged order
 * sends nothing.
 *
 * ISSUE-037 wires `CatalogItemDialog`: "Editar" opens it in edit mode with
 * the row's item, "Agregar elemento" in add mode, previewing the code
 * against the codes currently loaded. The dialog is mounted only while
 * open, so each opening starts from fresh form state.
 *
 * ISSUE-038 wires "Ver historial" to `onViewHistory`, which the detail slot
 * turns into the item-mode history sheet for that row's code.
 */
function CatalogItemsSection({
  list,
  onViewHistory,
}: {
  list: CatalogListAdmin;
  onViewHistory: (code: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [includeDeprecated, setIncludeDeprecated] = useState(false);
  const [itemDialog, setItemDialog] = useState<ItemDialogState | null>(null);
  const { data, isLoading, isError, refetch } = useCatalogAdminItems(list.key, {
    includeDeprecated,
  });
  const updateItem = useUpdateCatalogItem(list.key);
  const resetItem = useResetCatalogItem(list.key);
  const reorderItems = useReorderCatalogItems(list.key, { includeDeprecated });
  const canManage = list.viewer_capabilities.can_manage;
  const canReorder = isReorderAvailable(canManage, searchQuery);

  const reorder = (codes: string[]) => {
    if (reorderItems.isPending) return;
    reorderItems.mutate({ codes });
  };

  const moveBy = (
    item: CatalogAdminItem,
    shownItems: CatalogAdminItem[],
    offset: number
  ) => {
    const codes = moveCodeBy(reorderableCodes(shownItems), item.code, offset);
    if (codes) reorder(codes);
  };

  const items = useMemo(() => data?.data?.items ?? [], [data]);
  const loadedCodes = useMemo(
    () => new Set(items.map((item) => item.code)),
    [items]
  );

  const handlers: CatalogItemActionHandlers = {
    onEdit: (item) => setItemDialog({ mode: "edit", item }),
    onViewHistory: (item) => onViewHistory(item.code),
    onToggleVisibility: (item, nextVisible) => {
      if (updateItem.isPending) return;
      updateItem.mutate({ code: item.code, is_hidden: !nextVisible });
    },
    onRestoreDefault: (item) => {
      if (resetItem.isPending) return;
      resetItem.mutate({ code: item.code });
    },
  };

  const renderCardMenuExtraItems = canManage
    ? (
        item: CatalogAdminItem,
        _index: number,
        visibleItems: CatalogAdminItem[]
      ) => (
        <CatalogItemMoveMenuItems
          item={item}
          items={visibleItems}
          disabled={!canReorder}
          onMoveUp={(moved) => moveBy(moved, visibleItems, -1)}
          onMoveDown={(moved) => moveBy(moved, visibleItems, 1)}
        />
      )
    : undefined;

  return (
    <>
      <CatalogItemsTable
        list={list}
        items={items}
        capabilities={list.viewer_capabilities}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        includeDeprecated={includeDeprecated}
        onIncludeDeprecatedChange={setIncludeDeprecated}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onAddItem={() => setItemDialog({ mode: "add" })}
        handlers={handlers}
        renderCardMenuExtraItems={renderCardMenuExtraItems}
        onReorder={canManage ? reorder : undefined}
      />
      {itemDialog && (
        <CatalogItemDialog
          mode={itemDialog.mode}
          list={list}
          item={itemDialog.mode === "edit" ? itemDialog.item : undefined}
          existingCodes={loadedCodes}
          onOpenChange={(open) => {
            if (!open) setItemDialog(null);
          }}
        />
      )}
    </>
  );
}

/**
 * Right-column slot (ISSUE-032): the selected catalog's detail header and
 * governance panel, then the items card (ISSUE-034). ISSUE-038: the
 * header's "Historial" opens `CatalogHistorySheet` in list mode and a row's
 * "Ver historial" in item mode for that code (H-01). The sheet is mounted
 * only while open and keyed by list and code, so each opening starts from
 * page 1.
 */
function CatalogDetailSlot({ list }: { list: CatalogListAdmin | null }) {
  const [historySheet, setHistorySheet] = useState<HistorySheetState | null>(
    null
  );

  if (!list) {
    return (
      <Card data-testid="catalog-detail-slot" data-list-key="">
        <CardContent className="p-6">
          <div className="min-h-40" aria-hidden="true" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="space-y-6"
      data-testid="catalog-detail-slot"
      data-list-key={list.key}
    >
      <Card>
        <CardContent className="p-6">
          <CatalogDetailHeader
            list={list}
            onHistoryClick={() => setHistorySheet({})}
          />
        </CardContent>
      </Card>
      <CatalogGovernancePanel
        list={list}
        capabilities={list.viewer_capabilities}
      />
      <CatalogItemsSection
        key={list.key}
        list={list}
        onViewHistory={(code) => setHistorySheet({ code })}
      />
      {historySheet && (
        <CatalogHistorySheet
          key={`${list.key}:${historySheet.code ?? ""}`}
          listKey={list.key}
          code={historySheet.code}
          onOpenChange={(open) => {
            if (!open) setHistorySheet(null);
          }}
        />
      )}
    </div>
  );
}

export function CatalogsConfigPage() {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const { data, isLoading, isError, refetch } = useCatalogLists();
  const { selectedKey, selectList, clearSelection } = useSelectedCatalogList();

  const lists = useMemo(() => data?.data ?? [], [data]);
  const selectedList = useMemo(
    () => lists.find((list) => list.key === selectedKey) ?? null,
    [lists, selectedKey]
  );

  // AC-UI-02: on desktop, with no (or an unknown) `list` param, select the
  // first catalog in the backend's default order without adding a history entry.
  // An unknown key is told to the user before the fallback (phase 250
  // walkthrough, RUTA-45): a stale link must not land silently elsewhere.
  const firstKey = lists[0]?.key;
  useEffect(() => {
    if (isDesktop && firstKey && !selectedList) {
      if (selectedKey) {
        showToast(unknownListMessage(t, selectedKey), "info");
      }
      selectList(firstKey, { replace: true });
    }
  }, [isDesktop, firstKey, selectedList, selectedKey, selectList, t]);

  const title = t("catalogs.admin.title");
  const layoutProps = {
    title,
    description: t("catalogs.admin.subtitle"),
    breadcrumb: [
      { label: t("catalogs.admin.breadcrumbConfig") },
      { label: title },
    ],
  };

  if (isLoading) {
    return (
      <ConfigPageLayout {...layoutProps}>
        <CatalogsLoadingSkeleton />
      </ConfigPageLayout>
    );
  }

  if (isError) {
    return (
      <ConfigPageLayout {...layoutProps}>
        <ConfigErrorState
          title={t("catalogs.admin.loadError.title")}
          message={t("catalogs.admin.loadError.message")}
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {t("catalogs.admin.loadError.retry")}
            </Button>
          }
        />
      </ConfigPageLayout>
    );
  }

  if (lists.length === 0) {
    return (
      <ConfigPageLayout {...layoutProps}>
        <ConfigEmptyState
          title={t("catalogs.admin.empty.title")}
          description=""
          icon={
            <List
              className="mb-4 h-12 w-12 text-muted-foreground"
              aria-hidden="true"
            />
          }
        />
      </ConfigPageLayout>
    );
  }

  // AC-UI-27 narrow layout, catalog selected: detail only, with a back link
  // to the list and no page title.
  if (!isDesktop && selectedList) {
    return (
      <div className="container mx-auto space-y-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={clearSelection}
        >
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("catalogs.admin.backToList")}
        </Button>
        <CatalogDetailSlot list={selectedList} />
      </div>
    );
  }

  const onSelect = (key: string) => {
    if (key !== selectedKey) selectList(key);
  };

  return (
    <ConfigPageLayout {...layoutProps}>
      {isDesktop ? (
        <div
          className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]"
          data-testid="catalogs-master-detail"
        >
          <div>
            <CatalogListNav
              lists={lists}
              selectedKey={selectedKey}
              onSelect={onSelect}
            />
          </div>
          <div className="min-w-0">
            <CatalogDetailSlot list={selectedList} />
          </div>
        </div>
      ) : (
        <CatalogListNav
          lists={lists}
          selectedKey={selectedKey}
          onSelect={onSelect}
          showChevrons
        />
      )}
    </ConfigPageLayout>
  );
}

export default CatalogsConfigPage;
