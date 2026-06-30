/**
 * useTimeTracking hook
 * Provides TanStack Query hooks for time tracking operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import apiClient from "~/lib/api/client";
import type {
  StandardListResponse,
  StandardResponse,
} from "~/lib/api/types/common.types";

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  notes: string | null;
  entry_type: "manual" | "timer";
  created_at: string;
  updated_at: string;
}

interface StartSessionPayload {
  notes?: string;
}

interface ManualEntryPayload {
  start_time: string;
  end_time: string;
  notes?: string;
}

async function listTimeEntries(
  taskId: string
): Promise<StandardListResponse<TimeEntry>> {
  const response = await apiClient.get<StandardListResponse<TimeEntry>>(
    `/tasks/${taskId}/time-entries`
  );
  return response.data;
}

async function getActiveSession(
  taskId: string
): Promise<StandardResponse<TimeEntry | null>> {
  const response = await apiClient.get<StandardResponse<TimeEntry | null>>(
    `/tasks/${taskId}/time-entries/active`
  );
  return response.data;
}

export function useTimeTracking(taskId: string | undefined) {
  const queryClient = useQueryClient();
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const entriesQuery = useQuery({
    queryKey: ["tasks", taskId, "time-entries"],
    queryFn: () => listTimeEntries(taskId!),
    enabled: !!taskId,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const activeSessionQuery = useQuery({
    queryKey: ["tasks", taskId, "time-entries", "active"],
    queryFn: () => getActiveSession(taskId!),
    enabled: !!taskId,
    staleTime: 1000 * 30,
    refetchInterval: 30000, // Auto-refresh every 30s while tracking
    retry: 1,
  });

  const startMutation = useMutation({
    mutationFn: async (payload: StartSessionPayload) => {
      const response = await apiClient.post<StandardResponse<TimeEntry>>(
        `/tasks/${taskId}/time-entries`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", taskId, "time-entries"],
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiClient.put<StandardResponse<TimeEntry>>(
        `/tasks/${taskId}/time-entries/${entryId}`,
        {}
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", taskId, "time-entries"],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiClient.delete<StandardResponse<null>>(
        `/tasks/${taskId}/time-entries/${entryId}`
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", taskId, "time-entries"],
      });
    },
  });

  const manualEntryMutation = useMutation({
    mutationFn: async (payload: ManualEntryPayload) => {
      const response = await apiClient.post<StandardResponse<TimeEntry>>(
        `/tasks/${taskId}/time-entries/manual`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", taskId, "time-entries"],
      });
    },
  });

  const activeSession = activeSessionQuery.data?.data ?? null;
  const isTracking = !!activeSession;

  // Cleanup interval on unmount
  useEffect(() => {
    const interval = autoSaveRef.current;
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // Calculate total hours from entries
  const totalHours =
    entriesQuery.data?.data?.reduce((acc, entry) => {
      return acc + (entry.duration_seconds ?? 0) / 3600;
    }, 0) ?? 0;

  return {
    entries: entriesQuery.data?.data ?? [],
    activeSession,
    isTracking,
    isLoading: entriesQuery.isLoading,
    totalHours: Math.round(totalHours * 100) / 100,
    startTracking: (notes?: string) => startMutation.mutateAsync({ notes }),
    stopTracking: (entryId: string) => stopMutation.mutateAsync(entryId),
    deleteEntry: (entryId: string) => deleteMutation.mutateAsync(entryId),
    addManualEntry: (payload: ManualEntryPayload) =>
      manualEntryMutation.mutateAsync(payload),
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
}
