/**
 * Task Status Definitions Hooks
 * TanStack Query hooks for customizable task statuses
 * Sprint 2 - Fase 2
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listStatusDefinitions,
  createStatusDefinition,
  updateStatusDefinition,
  deleteStatusDefinition,
  reorderStatusDefinitions,
  type TaskStatusDefinitionCreate,
  type TaskStatusDefinitionUpdate,
} from "../api/status-definitions.api";

/**
 * Hook para obtener todas las definiciones de estado
 */
export function useTaskStatusDefinitions() {
  return useQuery({
    queryKey: ["tasks", "status-definitions"],
    queryFn: listStatusDefinitions,
    staleTime: 1000 * 60 * 10, // 10 minutos (cambian poco)
    retry: 2,
  });
}

/**
 * Hook para crear definición de estado
 */
export function useCreateStatusDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TaskStatusDefinitionCreate) =>
      createStatusDefinition(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", "status-definitions"],
      });
    },
    onError: (error) => {
      console.error("Failed to create status definition:", error);
    },
  });
}

/**
 * Hook para actualizar definición de estado
 */
export function useUpdateStatusDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      statusId,
      data,
    }: {
      statusId: string;
      data: TaskStatusDefinitionUpdate;
    }) => updateStatusDefinition(statusId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", "status-definitions"],
      });
    },
    onError: (error) => {
      console.error("Failed to update status definition:", error);
    },
  });
}

/**
 * Hook para eliminar definición de estado
 */
export function useDeleteStatusDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (statusId: string) => deleteStatusDefinition(statusId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", "status-definitions"],
      });
    },
    onError: (error) => {
      console.error("Failed to delete status definition:", error);
    },
  });
}

/**
 * Hook para reordenar definiciones de estado
 */
export function useReorderStatusDefinitions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (statusOrders: Record<string, number>) =>
      reorderStatusDefinitions(statusOrders),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", "status-definitions"],
      });
    },
    onError: (error) => {
      console.error("Failed to reorder status definitions:", error);
    },
  });
}
