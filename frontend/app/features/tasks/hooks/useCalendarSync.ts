/**
 * Calendar Sync Hooks
 * TanStack Query hooks for task-calendar synchronization
 * Sprint 1 - Fase 2
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  syncTaskToCalendar,
  unsyncTaskFromCalendar,
  getCalendarSyncStatus,
  syncBatchTasks,
} from "../api/calendar-sync.api";

/**
 * Hook para obtener estado de sincronización de una tarea
 */
export function useCalendarSyncStatus(taskId: string) {
  return useQuery({
    queryKey: ["tasks", taskId, "calendar-sync-status"],
    queryFn: () => getCalendarSyncStatus(taskId),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2,
    enabled: !!taskId,
  });
}

/**
 * Hook para sincronizar tarea a calendario
 */
export function useSyncTaskToCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      calendarProvider,
      calendarId,
    }: {
      taskId: string;
      calendarProvider?: string;
      calendarId?: string;
    }) => syncTaskToCalendar(taskId, calendarProvider, calendarId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId, "calendar-sync-status"],
      });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to sync task to calendar:", error);
    },
  });
}

/**
 * Hook para desincronizar tarea del calendario
 */
export function useUnsyncTaskFromCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => unsyncTaskFromCalendar(taskId),
    onSuccess: (_, taskId) => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });
      void queryClient.invalidateQueries({
        queryKey: ["tasks", taskId, "calendar-sync-status"],
      });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to unsync task from calendar:", error);
    },
  });
}

/**
 * Hook para sincronizar múltiples tareas en batch
 */
export function useSyncBatchTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskIds,
      calendarProvider,
      calendarId,
    }: {
      taskIds: string[];
      calendarProvider?: string;
      calendarId?: string;
    }) => syncBatchTasks(taskIds, calendarProvider, calendarId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to sync batch tasks:", error);
    },
  });
}

/**
 * Hook combinado para gestión completa de sincronización
 */
export function useCalendarSync(taskId: string) {
  const { data: statusData, isLoading: statusLoading } =
    useCalendarSyncStatus(taskId);
  const syncMutation = useSyncTaskToCalendar();
  const unsyncMutation = useUnsyncTaskFromCalendar();

  const status = statusData?.data;

  return {
    // Estado
    isSynced: status?.synced ?? false,
    calendarProvider: status?.calendar_provider,
    calendarId: status?.calendar_id,
    syncedAt: status?.synced_at,
    syncedBy: status?.synced_by,
    lastUpdatedBy: status?.last_updated_by,
    isLoading: statusLoading,

    // Mutaciones
    sync: (calendarProvider?: string, calendarId?: string) =>
      syncMutation.mutate({ taskId, calendarProvider, calendarId }),
    unsync: () => unsyncMutation.mutate(taskId),
    isSyncing: syncMutation.isPending,
    isUnsyncing: unsyncMutation.isPending,

    // Errores
    syncError: syncMutation.error,
    unsyncError: unsyncMutation.error,
  };
}
