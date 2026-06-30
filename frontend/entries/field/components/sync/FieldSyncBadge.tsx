/**
 * FieldSyncBadge — persistent sync status chip in the field app header.
 *
 * Visual states:
 *  - Spinning spinner : isSyncing
 *  - Orange + count   : pendingCount > 0 or failedCount > 0
 *  - Green check      : all clear (pendingCount === 0 && failedCount === 0)
 *
 * Tapping the badge opens FieldSyncModal (bottom sheet with queue details).
 */

import { useState } from "react";
import { useFieldSync } from "../../hooks/useFieldSync";
import { useFieldTranslation } from "../../i18n/useFieldTranslation";
import { FieldSyncModal } from "./FieldSyncModal";

export function FieldSyncBadge() {
  const { t } = useFieldTranslation();
  const { pendingCount, isSyncing, lastSyncAt, failedCount, forceSync } =
    useFieldSync();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasIssues = pendingCount > 0 || failedCount > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label={
          isSyncing
            ? t("field.sync.syncing")
            : hasIssues
              ? t("field.sync.pending", { count: pendingCount })
              : t("field.sync.synced")
        }
        className={[
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
          isSyncing
            ? "bg-muted text-muted-foreground"
            : hasIssues
              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        ].join(" ")}
      >
        {isSyncing ? (
          <svg
            className="h-3 w-3 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : hasIssues ? (
          <span
            className="h-2 w-2 rounded-full bg-orange-500"
            aria-hidden="true"
          />
        ) : (
          <svg
            className="h-3 w-3"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span>
          {isSyncing
            ? t("field.sync.syncing")
            : hasIssues
              ? t("field.sync.pending", { count: pendingCount })
              : t("field.sync.synced")}
        </span>
      </button>

      <FieldSyncModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pendingCount={pendingCount}
        failedCount={failedCount}
        isSyncing={isSyncing}
        lastSyncAt={lastSyncAt}
        onForceSync={forceSync}
      />
    </>
  );
}
