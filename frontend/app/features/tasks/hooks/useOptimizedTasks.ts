/**
 * Optimized React Query hooks for Tasks
 * Implements caching strategies and query optimization
 */

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { listTasks, getTask, createTask, updateTask } from "../api/tasks.api";
import type {
  Task,
  TaskListParams,
  TaskCreate,
  TaskUpdate,
} from "../types/task.types";

const TASKS_QUERY_KEY = ["tasks"];
const TASK_DETAIL_STALE_TIME = 5 * 60 * 1000; // 5 minutos
const TASK_LIST_STALE_TIME = 2 * 60 * 1000; // 2 minutos

/**
 * Optimized hook for fetching tasks list with strategic caching
 */
export function useOptimizedTasks(params?: TaskListParams) {
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, "list", params],
    queryFn: () => listTasks(params),
    staleTime: TASK_LIST_STALE_TIME,
    gcTime: 10 * 60 * 1000, // 10 minutos en cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Optimized hook for fetching single task with prefetching
 */
export function useOptimizedTask(taskId: string) {
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, taskId],
    queryFn: () => getTask(taskId),
    enabled: !!taskId,
    staleTime: TASK_DETAIL_STALE_TIME,
    gcTime: 15 * 60 * 1000, // 15 minutos en cache
  });
}

/**
 * Optimized mutation for creating tasks with optimistic updates
 */
export function useOptimizedCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TaskCreate) => createTask(data),
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [...TASKS_QUERY_KEY, "list"],
      });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData([
        ...TASKS_QUERY_KEY,
        "list",
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData([...TASKS_QUERY_KEY, "list"], (old: unknown) => {
        const oldData = old as { data?: Task[] } | undefined;
        if (!oldData?.data) return old;

        return {
          ...oldData,
          data: [
            {
              id: `temp-${Date.now()}`,
              ...newTask,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as Task,
            ...oldData.data,
          ],
        };
      });

      return { previousTasks };
    },
    onError: (_err, _newTask, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(
          [...TASKS_QUERY_KEY, "list"],
          context.previousTasks
        );
      }
    },
    onSettled: () => {
      // Refetch after mutation
      void queryClient.invalidateQueries({
        queryKey: [...TASKS_QUERY_KEY, "list"],
      });
    },
  });
}

/**
 * Optimized mutation for updating tasks with optimistic updates
 */
export function useOptimizedUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TaskUpdate }) =>
      updateTask(id, payload),
    onMutate: async ({ id, payload }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [...TASKS_QUERY_KEY, id] });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData([...TASKS_QUERY_KEY, id]);

      // Optimistically update
      queryClient.setQueryData([...TASKS_QUERY_KEY, id], (old: unknown) => {
        const oldData = old as { data?: Task } | undefined;
        if (!oldData?.data) return old;

        return {
          ...oldData,
          data: {
            ...oldData.data,
            ...payload,
            updated_at: new Date().toISOString(),
          },
        };
      });

      return { previousTask };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(
          [...TASKS_QUERY_KEY, id],
          context.previousTask
        );
      }
    },
    onSettled: (_data, _error, { id }) => {
      // Refetch after mutation
      void queryClient.invalidateQueries({
        queryKey: [...TASKS_QUERY_KEY, id],
      });
      void queryClient.invalidateQueries({
        queryKey: [...TASKS_QUERY_KEY, "list"],
      });
    },
  });
}

/**
 * Prefetch tasks for better UX
 */
export function usePrefetchTasks() {
  const queryClient = useQueryClient();

  return {
    prefetchTasksList: (params?: TaskListParams) => {
      void queryClient.prefetchQuery({
        queryKey: [...TASKS_QUERY_KEY, "list", params],
        queryFn: () => listTasks(params),
        staleTime: TASK_LIST_STALE_TIME,
      });
    },
    prefetchTask: (taskId: string) => {
      void queryClient.prefetchQuery({
        queryKey: [...TASKS_QUERY_KEY, taskId],
        queryFn: () => getTask(taskId),
        staleTime: TASK_DETAIL_STALE_TIME,
      });
    },
  };
}
