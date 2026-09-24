/**
 * useFieldSync — field-app display wrapper over the MVP sync store.
 *
 * Reads from useSyncStore (populated by useSyncWatchdog, mounted once in
 * FieldApp) and adds:
 *  - failedCount  : items with status "error" (polled when pendingCount changes)
 *  - lastSyncAt   : timestamp of last successful full-flush
 *  - forceSync    : manually trigger syncQueue.processQueue()
 *
 * NOTE: useSyncWatchdog is NOT mounted here to avoid duplicate heartbeats.
 * It is mounted once in FieldApp.tsx.
 */

import { useState, useEffect } from "react";
import { useSyncStore } from "~/features/data_collection/lib/sync.store";
import { syncQueue } from "~/features/data_collection/lib/sync-queue";

export interface FieldSyncState {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  failedCount: number;
  forceSync: () => Promise<void>;
}

export function useFieldSync(): FieldSyncState {
  const { pendingCount, isSyncing, setPendingCount, setSyncing } =
    useSyncStore();
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [failedCount, setFailedCount] = useState(0);

  // Refresh failedCount whenever pendingCount changes (watchdog refreshes pendingCount)
  useEffect(() => {
    void syncQueue.errorCount().then(setFailedCount);
  }, [pendingCount]);

  async function forceSync(): Promise<void> {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setSyncing(true);
    try {
      await syncQueue.processQueue();
      const remaining = await syncQueue.pendingCount();
      const errors = await syncQueue.errorCount();
      setPendingCount(remaining + errors);
      setFailedCount(errors);
      if (remaining === 0 && errors === 0) {
        setLastSyncAt(new Date());
      }
    } finally {
      setSyncing(false);
    }
  }

  return { pendingCount, isSyncing, lastSyncAt, failedCount, forceSync };
}
