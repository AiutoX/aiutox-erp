/**
 * useSubtasks hook
 * Provides TanStack Query hooks for subtask CRUD operations.
 * Following frontend-api.md rules.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "~/lib/api/client";
import type {
  StandardListResponse,
  StandardResponse,
} from "~/lib/api/types/common.types";
import type {
  Task,
  TaskCreate,
  TaskUpdate,
} from "~/features/tasks/types/task.types";

/**
 * Fetch subtasks for a given parent task.
 * GET /api/v1/tasks?parent_task_id={parentTaskId}
 */
async function listSubtasks(
  parentTaskId: string
): Promise<StandardListResponse<Task>> {
  const response = await apiClient.get<StandardListResponse<Task>>("/tasks", {
    params: { parent_task_id: parentTaskId, page_size: 100 },
  });
  return response.data;
}

/**
 * Hook for subtask operations on a parent task.
 */
export function useSubtasks(parentTaskId: string | undefined) {
  const queryClient = useQueryClient();

  const subtasksQuery = useQuery({
    queryKey: ["tasks", parentTaskId, "subtasks"],
    queryFn: () => listSubtasks(parentTaskId!),
    enabled: !!parentTaskId,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async (data: Partial<TaskCreate> & { title: string }) => {
      const payload: TaskCreate = {
        description: "",
        assigned_to_id: null,
        status: "todo",
        priority: "medium",
        ...data,
        parent_task_id: parentTaskId ?? null,
      };
      const response = await apiClient.post<StandardResponse<Task>>(
        "/tasks",
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", parentTaskId, "subtasks"],
      });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const moveToParentMutation = useMutation({
    mutationFn: async ({
      taskId,
      newParentId,
    }: {
      taskId: string;
      newParentId: string | null;
    }) => {
      const payload: TaskUpdate = { parent_task_id: newParentId };
      const response = await apiClient.put<StandardResponse<Task>>(
        `/tasks/${taskId}`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", parentTaskId, "subtasks"],
      });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    subtasks: subtasksQuery.data?.data ?? [],
    isLoading: subtasksQuery.isLoading,
    error: subtasksQuery.error,
    createSubtask: (data: Partial<TaskCreate> & { title: string }) =>
      createSubtaskMutation.mutateAsync(data),
    moveToParent: (taskId: string, newParentId: string | null) =>
      moveToParentMutation.mutateAsync({ taskId, newParentId }),
    isCreating: createSubtaskMutation.isPending,
    isMoving: moveToParentMutation.isPending,
  };
}
