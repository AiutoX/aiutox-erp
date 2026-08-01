/**
 * Calendar Sync API
 * API client for task-calendar synchronization
 * Sprint 1 - Fase 2
 */

import apiClient from "~/lib/api/client";

interface StandardResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface CalendarSyncResult {
  task_id: string;
  calendar_provider: string;
  calendar_id: string;
  event_data: {
    title: string;
    description: string;
    start?: string;
    end?: string;
    all_day: boolean;
    metadata: Record<string, unknown>;
    color?: string;
  };
  synced_at: string;
}

export interface CalendarSyncStatus {
  synced: boolean;
  calendar_provider?: string;
  calendar_id?: string;
  synced_at?: string;
  synced_by?: string;
  last_updated_by?: string;
  error?: string;
}

export interface BatchSyncResult {
  synced: CalendarSyncResult[];
  failed: Array<{ task_id: string; error: string }>;
  skipped: Array<{ task_id: string; reason: string }>;
}

/**
 * Sincronizar tarea a calendario
 */
export async function syncTaskToCalendar(
  taskId: string,
  calendarProvider: string = "internal",
  calendarId?: string
): Promise<StandardResponse<CalendarSyncResult>> {
  const params = new URLSearchParams();
  params.append("calendar_provider", calendarProvider);
  if (calendarId) {
    params.append("calendar_id", calendarId);
  }

  const response = await apiClient.post(
    `/tasks/${taskId}/sync-calendar?${params.toString()}`
  );
  return response.data;
}

/**
 * Desincronizar tarea del calendario
 */
export async function unsyncTaskFromCalendar(taskId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}/sync-calendar`);
}

/**
 * Obtener estado de sincronización de una tarea
 */
export async function getCalendarSyncStatus(
  taskId: string
): Promise<StandardResponse<CalendarSyncStatus>> {
  const response = await apiClient.get(`/tasks/${taskId}/sync-status`);
  return response.data;
}

/**
 * Sincronizar múltiples tareas en batch
 */
export async function syncBatchTasks(
  taskIds: string[],
  calendarProvider: string = "internal",
  calendarId?: string
): Promise<StandardResponse<BatchSyncResult>> {
  const params = new URLSearchParams();
  taskIds.forEach((id) => params.append("task_ids", id));
  params.append("calendar_provider", calendarProvider);
  if (calendarId) {
    params.append("calendar_id", calendarId);
  }

  const response = await apiClient.post(
    `/api/v1/tasks/sync-batch?${params.toString()}`
  );
  return response.data;
}
