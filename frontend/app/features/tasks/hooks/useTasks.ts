/**
 * Tasks hooks
 * Provides TanStack Query hooks for tasks module
 * Following frontend-api.md rules
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import {
  listTasks,
  listMyTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  listChecklistItems,
  createAssignment as createAssignmentApi,
  listAssignments,
  deleteAssignment as deleteAssignmentApi,
  getTaskModuleSettings,
  updateTaskModuleSettings,
} from "~/features/tasks/api/tasks.api";
import { useUsers } from "~/features/users/hooks/useUsers";
import { useAuthStore } from "~/stores/authStore";
import type {
  TaskUpdate,
  TaskListParams,
  ChecklistItem,
  TaskAssignmentCreate,
  TaskAssignment,
  TaskModuleSettingsUpdate,
} from "~/features/tasks/types/task.types";

// Query hooks
export function useTasks(params?: TaskListParams) {
  return useQuery({
    queryKey: ["tasks", params],
    queryFn: () => listTasks(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useMyTasks(params?: TaskListParams) {
  return useQuery({
    queryKey: ["tasks", "my", params],
    queryFn: () => listMyTasks(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => getTask(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!id,
  });
}

export function useChecklistItems(taskId: string) {
  return useQuery({
    queryKey: ["tasks", taskId, "checklist"],
    queryFn: () => listChecklistItems(taskId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!taskId,
  });
}

export function useAssignments(taskId: string) {
  return useQuery({
    queryKey: ["tasks", taskId, "assignments"],
    queryFn: () => listAssignments(taskId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!taskId,
  });
}

export function useTaskModuleSettings() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ["tasks", "settings"],
    queryFn: () => getTaskModuleSettings(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    enabled: isAuthenticated,
  });
}

// Mutation hooks
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      // Invalidate tasks list queries
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to create task:", error);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TaskUpdate }) =>
      updateTask(id, payload),
    onSuccess: (_, variables) => {
      // Invalidate specific task and list queries
      void queryClient.invalidateQueries({ queryKey: ["tasks", variables.id] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to update task:", error);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      // Invalidate tasks list queries
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to delete task:", error);
    },
  });
}

export function useChecklistMutations() {
  const queryClient = useQueryClient();

  const createItem = useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: string;
      payload: Omit<ChecklistItem, "id" | "completed_at">;
    }) => createChecklistItem(taskId, payload),
    onSuccess: (_, variables) => {
      // Invalidate specific task and list queries
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId, "checklist"],
      });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to create checklist item:", error);
    },
  });

  const updateItem = useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: Partial<ChecklistItem>;
    }) => updateChecklistItem(itemId, payload),
    onSuccess: () => {
      // Invalidate all checklist queries
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to update checklist item:", error);
    },
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: string) => deleteChecklistItem(itemId),
    onSuccess: () => {
      // Invalidate all checklist queries
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to delete checklist item:", error);
    },
  });

  return {
    createItem,
    updateItem,
    deleteItem,
  };
}

export function useAssignmentMutations() {
  const queryClient = useQueryClient();

  const createAssignment = useMutation({
    mutationFn: ({
      taskId,
      assignment,
    }: {
      taskId: string;
      assignment: TaskAssignmentCreate;
    }) => createAssignmentApi(taskId, assignment),
    onSuccess: (_, variables) => {
      // Invalidate task and assignments queries
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId, "assignments"],
      });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to create assignment:", error);
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: ({
      taskId,
      assignmentId,
    }: {
      taskId: string;
      assignmentId: string;
    }) => deleteAssignmentApi(taskId, assignmentId),
    onSuccess: () => {
      // Invalidate all assignment queries
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("Failed to delete assignment:", error);
    },
  });

  return {
    createAssignment,
    deleteAssignment,
  };
}

export function useTaskModuleSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TaskModuleSettingsUpdate) =>
      updateTaskModuleSettings(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", "settings"] });
    },
    onError: (error) => {
      console.error("Failed to update tasks settings:", error);
    },
  });
}

// Hook para obtener asignaciones con nombres de usuarios
export function useTaskAssignments(taskIds: string[]) {
  const usersQuery = useUsers({ page_size: 100 });

  const assignmentsQuery = useQuery({
    queryKey: ["assignments", taskIds],
    queryFn: async () => {
      if (taskIds.length === 0) return {};

      const assignmentsPromises = taskIds.map(async (taskId) => {
        try {
          const response = await listAssignments(taskId);
          return { taskId, assignments: response.data };
        } catch (error) {
          // Si la tarea no existe o no hay permisos, devolver array vacío
          console.warn(`Failed to load assignments for task ${taskId}:`, error);
          return { taskId, assignments: [] };
        }
      });

      const results = await Promise.all(assignmentsPromises);
      const assignmentsMap: Record<string, TaskAssignment[]> = {};

      results.forEach(({ taskId, assignments }) => {
        assignmentsMap[taskId] = assignments;
      });

      return assignmentsMap;
    },
    enabled: taskIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Combinar asignaciones con nombres de usuarios
  const assignmentsWithUsers = React.useMemo(() => {
    if (!assignmentsQuery.data || !usersQuery.users) return {};

    const userMap = new Map(usersQuery.users.map((user) => [user.id, user]));
    const result: Record<string, (TaskAssignment & { userName: string })[]> =
      {};

    Object.entries(assignmentsQuery.data).forEach(([taskId, assignments]) => {
      result[taskId] = assignments.map((assignment) => {
        const userName = assignment.assigned_to_id
          ? `${userMap.get(assignment.assigned_to_id)?.first_name || ""} ${userMap.get(assignment.assigned_to_id)?.last_name || ""}`.trim() ||
            userMap.get(assignment.assigned_to_id)?.email ||
            "Usuario desconocido"
          : "Sin asignar";
        return {
          ...assignment,
          userName,
        };
      });
    });

    return result;
  }, [assignmentsQuery.data, usersQuery.users]);

  return {
    assignments: assignmentsWithUsers,
    loading: assignmentsQuery.isLoading || usersQuery.loading,
    error: assignmentsQuery.error || usersQuery.error,
  };
}
