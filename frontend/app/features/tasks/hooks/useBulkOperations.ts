/**
 * useBulkOperations hook
 * Provides TanStack Query mutations for bulk task operations.
 * Backend: BulkTaskService in app/core/tasks/bulk_operations.py
 */

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "~/lib/api/client";
import type { StandardResponse } from "~/lib/api/types/common.types";
import type {
  TaskStatus,
  TaskPriority,
} from "~/features/tasks/types/task.types";

interface BulkOperationResult {
  success_count: number;
  error_count: number;
  errors: string[];
}

export function useBulkOperations() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((taskIds: string[]) => {
    setSelectedIds(new Set(taskIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const bulkUpdateStatus = useMutation({
    mutationFn: async (status: TaskStatus) => {
      const response = await apiClient.post<
        StandardResponse<BulkOperationResult>
      >("/tasks/bulk/status", {
        task_ids: Array.from(selectedIds),
        status,
      });
      return response.data;
    },
    onSuccess: () => {
      clearSelection();
      invalidateAll();
    },
  });

  const bulkUpdatePriority = useMutation({
    mutationFn: async (priority: TaskPriority) => {
      const response = await apiClient.post<
        StandardResponse<BulkOperationResult>
      >("/tasks/bulk/priority", {
        task_ids: Array.from(selectedIds),
        priority,
      });
      return response.data;
    },
    onSuccess: () => {
      clearSelection();
      invalidateAll();
    },
  });

  const bulkAssign = useMutation({
    mutationFn: async (assignedToId: string) => {
      const response = await apiClient.post<
        StandardResponse<BulkOperationResult>
      >("/tasks/bulk/assign", {
        task_ids: Array.from(selectedIds),
        assigned_to_id: assignedToId,
      });
      return response.data;
    },
    onSuccess: () => {
      clearSelection();
      invalidateAll();
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<
        StandardResponse<BulkOperationResult>
      >("/tasks/bulk/delete", {
        task_ids: Array.from(selectedIds),
      });
      return response.data;
    },
    onSuccess: () => {
      clearSelection();
      invalidateAll();
    },
  });

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected: (id: string) => selectedIds.has(id),
    toggleSelection,
    selectAll,
    clearSelection,
    bulkUpdateStatus: (status: TaskStatus) =>
      bulkUpdateStatus.mutateAsync(status),
    bulkUpdatePriority: (priority: TaskPriority) =>
      bulkUpdatePriority.mutateAsync(priority),
    bulkAssign: (assignedToId: string) => bulkAssign.mutateAsync(assignedToId),
    bulkDelete: () => bulkDelete.mutateAsync(),
    isProcessing:
      bulkUpdateStatus.isPending ||
      bulkUpdatePriority.isPending ||
      bulkAssign.isPending ||
      bulkDelete.isPending,
  };
}
