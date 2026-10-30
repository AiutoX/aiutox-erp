/**
 * FieldSyncModal — bottom-sheet showing sync queue status for field technicians.
 *
 * Lists up to 20 pending + errored operations from the IndexedDB sync_queue.
 * Provides a "Sync now" button to force a manual flush.
 * Implemented as a pure CSS bottom sheet (no ShadCN Sheet dependency) to keep
 * the field bundle isolated.
 */

import { useEffect, useState } from "react";
import { db, type SyncQueueItem } from "~/features/data_collection/lib/db";
import { useFieldTranslation } from "../../i18n/useFieldTranslation";

interface FieldSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  onForceSync: () => Promise<void>;
}

export function FieldSyncModal({
  isOpen,
  onClose,
  pendingCount,
  failedCount,
  isSyncing,
  lastSyncAt,
  onForceSync,
}: FieldSyncModalProps) {
  const { t } = useFieldTranslation();
  const [items, setItems] = useState<SyncQueueItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    void db.syncQueue
      .where("status")
      .anyOf(["pending", "error"])
      .limit(20)
      .toArray()
      .then(setItems);
  }, [isOpen, pendingCount, failedCount]);

  async function handleForceSync() {
    await onForceSync();
    const updated = await db.syncQueue
      .where("status")
      .anyOf(["pending", "error"])
      .limit(20)
      .toArray();
    setItems(updated);
  }

  if (!isOpen) return null;

  function formatTime(date: Date | null): string {
    if (!date) return t("field.sync.never");
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("field.sync.modalTitle")}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background shadow-xl"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-lg font-semibold text-foreground">
            {t("field.sync.modalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("field.sync.close")}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Meta: last sync + failed count */}
        <div className="px-5 pb-3 flex gap-4 text-xs text-muted-foreground">
          <span>
            {t("field.sync.lastSyncAt", { time: formatTime(lastSyncAt) })}
          </span>
          {failedCount > 0 && (
            <span className="text-destructive">
              {t("field.sync.failedCount", { count: failedCount })}
            </span>
          )}
        </div>

        {/* Queue items list */}
        <div className="max-h-48 overflow-y-auto px-5 pb-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              {t("field.sync.noItems")}
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={[
                  "flex items-center gap-2 rounded-xl border px-3 py-2",
                  item.status === "error"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-muted/30",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-2 w-2 shrink-0 rounded-full",
                    item.status === "error"
                      ? "bg-destructive"
                      : "bg-orange-400",
                  ].join(" ")}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate text-sm text-foreground">
                  {item.entityType} · {item.localId.slice(0, 8)}…
                </span>
                {item.errorMessage && (
                  <span className="max-w-[100px] truncate text-xs text-destructive">
                    {item.errorMessage}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Action buttons */}
        <div className="px-5 pt-2 pb-10 space-y-3">
          <button
            type="button"
            onClick={() => void handleForceSync()}
            disabled={
              isSyncing ||
              (typeof navigator !== "undefined" && !navigator.onLine)
            }
            className="min-h-[56px] w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground active:scale-95 transition-transform disabled:opacity-50"
          >
            {isSyncing ? t("field.sync.syncing") : t("field.sync.forceSync")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[56px] w-full rounded-2xl border border-border text-base font-medium text-foreground active:scale-95 transition-transform"
          >
            {t("field.sync.close")}
          </button>
        </div>
      </div>
    </>
  );
}
