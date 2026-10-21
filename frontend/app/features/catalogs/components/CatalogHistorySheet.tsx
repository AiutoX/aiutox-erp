/**
 * CatalogHistorySheet -- the right-side history sheet of the catalogs admin
 * screen (ISSUE-038, AC-UI-25, H-01).
 *
 * Two modes, per the PRD-resolved H-01 (two-level history, no new
 * endpoint):
 * - no `code`: the catalog's list-level history (`useCatalogListHistory`),
 *   opened from the detail header's "Historial" -- creation, declaration
 *   syncs, governance changes, deprecation and reactivation;
 * - `code`: that item's history (`useCatalogItemHistory`), opened from the
 *   row menu's "Ver historial" -- including every tenant action on it.
 *
 * Each entry, newest first: the actor ("Sincronización del sistema" when
 * `changed_by` is null, the platform-actor label for `is_platform_actor`,
 * otherwise the user's name), the relative time with the absolute timestamp
 * on hover, the change type (raw value for a type this UI does not know),
 * the "Antes" / "Después" snapshots, and the reason in italics when present.
 * Older entries load with "Cargar más" (see `useCatalogHistoryPages`); they
 * are appended below the loaded ones, so the scroll position stays put.
 *
 * The caller mounts the sheet while it is open, like `CatalogItemDialog`.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { format, formatDistanceToNow } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { CatalogHistoryPages } from "../hooks/useCatalogHistoryPages";
import { useCatalogItemHistory } from "../hooks/useCatalogItemHistory";
import { useCatalogListHistory } from "../hooks/useCatalogListHistory";
import { useReturnFocus } from "../hooks/useReturnFocus";
import type {
  CatalogItemVersion,
  CatalogListVersion,
  CatalogVersionChangedBy,
} from "../types/catalogsAdmin.types";

const LOADING_ENTRIES = 3;

type HistoryEntry = CatalogItemVersion | CatalogListVersion;

/**
 * i18n keys of the item change types written by the backend
 * (`ITEM_CHANGE_TYPES`, backend/app/core/catalogs/models.py).
 */
const ITEM_CHANGE_TYPE_KEYS: Record<string, string> = {
  created: "catalogs.history.changeTypes.items.created",
  synced: "catalogs.history.changeTypes.items.synced",
  labels_updated: "catalogs.history.changeTypes.items.labels_updated",
  reordered: "catalogs.history.changeTypes.items.reordered",
  hidden: "catalogs.history.changeTypes.items.hidden",
  unhidden: "catalogs.history.changeTypes.items.unhidden",
  reset: "catalogs.history.changeTypes.items.reset",
  deprecated: "catalogs.history.changeTypes.items.deprecated",
  reactivated: "catalogs.history.changeTypes.items.reactivated",
};

/**
 * i18n keys of the list change types written by the backend
 * (`LIST_CHANGE_TYPES`, backend/app/core/catalogs/models.py).
 */
const LIST_CHANGE_TYPE_KEYS: Record<string, string> = {
  created: "catalogs.history.changeTypes.lists.created",
  declaration_synced: "catalogs.history.changeTypes.lists.declaration_synced",
  governance_updated: "catalogs.history.changeTypes.lists.governance_updated",
  deprecated: "catalogs.history.changeTypes.lists.deprecated",
  reactivated: "catalogs.history.changeTypes.lists.reactivated",
};

/** i18n keys of the snapshot fields the backend writes (sync.py / service.py snapshots). */
const FIELD_KEYS: Record<string, string> = {
  code: "catalogs.history.fields.code",
  labels: "catalogs.history.fields.labels",
  sort_order: "catalogs.history.fields.sort_order",
  attributes: "catalogs.history.fields.attributes",
  is_hidden: "catalogs.history.fields.is_hidden",
  tenant_can_manage: "catalogs.history.fields.tenant_can_manage",
  is_extensible: "catalogs.history.fields.is_extensible",
  is_locked: "catalogs.history.fields.is_locked",
  manage_permission: "catalogs.history.fields.manage_permission",
};

const EMPTY_VALUE = "—";

export interface CatalogHistorySheetProps {
  listKey: string;
  /** An item code: item history. Absent: the list's own history. */
  code?: string;
  /** Defaults to true: the caller mounts the sheet while it is open. */
  open?: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CatalogHistorySheet({
  listKey,
  code,
  open = true,
  onOpenChange,
}: CatalogHistorySheetProps) {
  const { t } = useTranslation();
  const isItemMode = Boolean(code);
  // No SheetTrigger: return focus to "Historial" or the row menu (AC-UI-28).
  const returnFocus = useReturnFocus(open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        onCloseAutoFocus={returnFocus}
        className="w-full overflow-y-auto sm:max-w-lg"
        data-testid="catalog-history-sheet"
        data-mode={isItemMode ? "item" : "list"}
      >
        <SheetHeader className="pr-8">
          <SheetTitle>
            {t(
              isItemMode
                ? "catalogs.history.itemTitle"
                : "catalogs.history.listTitle"
            )}
          </SheetTitle>
          <SheetDescription>
            <span
              className="font-mono text-xs"
              data-testid="catalog-history-subject"
            >
              {code ?? listKey}
            </span>
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {code ? (
            <ItemHistory listKey={listKey} code={code} />
          ) : (
            <ListHistory listKey={listKey} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ListHistory({ listKey }: { listKey: string }) {
  const history = useCatalogListHistory(listKey);
  return (
    <HistoryTimeline history={history} changeTypeKeys={LIST_CHANGE_TYPE_KEYS} />
  );
}

function ItemHistory({ listKey, code }: { listKey: string; code: string }) {
  const history = useCatalogItemHistory(listKey, code);
  return (
    <HistoryTimeline history={history} changeTypeKeys={ITEM_CHANGE_TYPE_KEYS} />
  );
}

function HistoryTimeline({
  history,
  changeTypeKeys,
}: {
  history: CatalogHistoryPages<HistoryEntry>;
  changeTypeKeys: Record<string, string>;
}) {
  const { t } = useTranslation();

  if (history.isLoading) {
    return (
      <div className="space-y-3" data-testid="catalog-history-loading">
        {Array.from({ length: LOADING_ENTRIES }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (history.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {t("catalogs.history.loadError")}
        </p>
        <Button variant="outline" size="sm" onClick={history.retry}>
          {t("catalogs.admin.loadError.retry")}
        </Button>
      </div>
    );
  }

  if (history.entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("catalogs.history.emptyState")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-4">
        {history.entries.map((entry) => (
          <HistoryEntryCard
            key={entry.id}
            entry={entry}
            changeTypeKeys={changeTypeKeys}
          />
        ))}
      </ol>
      {history.isLoadMoreError && (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">
            {t("catalogs.history.loadMoreError")}
          </p>
          <Button variant="outline" size="sm" onClick={history.retry}>
            {t("catalogs.admin.loadError.retry")}
          </Button>
        </div>
      )}
      {(history.hasMore || history.isFetchingMore) && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={history.isFetchingMore}
            onClick={history.loadMore}
          >
            {t(
              history.isFetchingMore
                ? "catalogs.history.loadingMore"
                : "catalogs.history.loadMore"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function useActorName(changedBy: CatalogVersionChangedBy | null): string {
  const { t } = useTranslation();
  if (changedBy === null) return t("catalogs.history.systemSync");
  if (changedBy.is_platform_actor) return t("catalogs.history.platformActor");
  return changedBy.full_name || t("catalogs.history.unknownActor");
}

function HistoryEntryCard({
  entry,
  changeTypeKeys,
}: {
  entry: HistoryEntry;
  changeTypeKeys: Record<string, string>;
}) {
  const { t } = useTranslation();
  const actor = useActorName(entry.changed_by);
  const changeTypeKey = changeTypeKeys[entry.change_type];

  return (
    <li
      className="space-y-3 rounded-lg border p-4"
      data-testid="catalog-history-entry"
      data-version={entry.version_number}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{actor}</span>
        <RelativeTime value={entry.created_at} />
      </div>
      <p className="text-sm">
        {changeTypeKey ? t(changeTypeKey) : entry.change_type}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SnapshotBox
          testId="catalog-history-before"
          label={t("catalogs.history.beforeLabel")}
          snapshot={entry.before}
        />
        <SnapshotBox
          testId="catalog-history-after"
          label={t("catalogs.history.afterLabel")}
          snapshot={entry.after}
        />
      </div>
      {entry.change_reason && (
        <p
          className="text-sm italic text-muted-foreground"
          data-testid="catalog-history-reason"
        >
          {entry.change_reason}
        </p>
      )}
    </li>
  );
}

/** Relative time ("hace 3 días"), with the absolute date and time as its tooltip. */
function RelativeTime({ value }: { value: string }) {
  const { language } = useTranslation();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return <span className="text-xs text-muted-foreground">{value}</span>;
  }
  const locale = language === "en" ? enUS : es;

  return (
    <time
      dateTime={value}
      title={format(date, "PPpp", { locale })}
      className="text-xs text-muted-foreground"
    >
      {formatDistanceToNow(date, { addSuffix: true, locale })}
    </time>
  );
}

function SnapshotBox({
  testId,
  label,
  snapshot,
}: {
  testId: string;
  label: string;
  snapshot: Record<string, unknown> | null;
}) {
  const { t } = useTranslation();
  const fields = snapshot ? Object.entries(snapshot) : [];

  return (
    <div className="rounded-md bg-muted/50 p-3" data-testid={testId}>
      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">{EMPTY_VALUE}</p>
      ) : (
        <dl className="space-y-1.5 text-sm">
          {fields.map(([field, value]) => (
            <div key={field}>
              <dt className="text-xs text-muted-foreground">
                {FIELD_KEYS[field] ? t(FIELD_KEYS[field]) : field}
              </dt>
              <dd className="break-words">
                <SnapshotValue value={value} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

/**
 * A snapshot value: booleans as "Sí" / "No", a labels-like object as one
 * `language: text` line each, any other object as compact JSON, and the
 * rest as-is.
 */
function SnapshotValue({ value }: { value: unknown }) {
  const { t } = useTranslation();

  if (value === null || value === undefined || value === "") {
    return <>{EMPTY_VALUE}</>;
  }
  if (typeof value === "boolean") {
    return (
      <>
        {t(
          value ? "catalogs.history.values.yes" : "catalogs.history.values.no"
        )}
      </>
    );
  }
  if (isStringRecord(value)) {
    const lines = Object.entries(value);
    if (lines.length === 0) return <>{EMPTY_VALUE}</>;
    return (
      <span className="block space-y-0.5">
        {lines.map(([language, text]) => (
          <span key={language} className="flex gap-1.5">
            <span className="font-mono text-xs uppercase text-muted-foreground">
              {language}
            </span>
            <span>{text}</span>
          </span>
        ))}
      </span>
    );
  }
  if (typeof value === "object") {
    return <span className="font-mono text-xs">{JSON.stringify(value)}</span>;
  }
  return <>{String(value)}</>;
}
