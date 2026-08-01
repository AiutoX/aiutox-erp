/**
 * Hook for managing task statuses
 * Provides CRUD operations and state management for task statuses
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  TaskStatus,
  TaskStatusCreate,
  TaskStatusUpdate,
  TaskStatusType,
} from "../types/status.types";

import api from "~/lib/api/client";
import { showToast } from "~/components/common/Toast";

// API endpoints
const STATUSES_ENDPOINT = "/task-statuses";

export function useTaskStatuses() {
  const queryClient = useQueryClient();

  // Get all statuses
  const {
    data: statuses,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["task-statuses"],
    queryFn: async () => {
      const response = await api.get(
        `${STATUSES_ENDPOINT}?include_system=true`
      );
      return response.data as TaskStatus[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create status mutation
  const createMutation = useMutation({
    mutationFn: async (data: TaskStatusCreate) => {
      const response = await api.post(STATUSES_ENDPOINT, data);
      return response.data as TaskStatus;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["task-statuses"] });
      showToast("Estado creado exitosamente", "success");

      // Optional: Update form caches if needed
      void queryClient.invalidateQueries({ queryKey: ["task-form-options"] });
    },
    onError: (error: Error) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Error al crear estado";
      showToast(message, "error");
    },
  });

  // Update status mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: TaskStatusUpdate;
    }) => {
      const response = await api.put(`${STATUSES_ENDPOINT}/${id}`, data);
      return response.data as TaskStatus;
    },
    onSuccess: (updatedStatus) => {
      void queryClient.invalidateQueries({ queryKey: ["task-statuses"] });
      showToast("Estado actualizado exitosamente", "success");

      // Update in cache directly for better UX
      queryClient.setQueryData(
        ["task-statuses"],
        (old: TaskStatus[] | undefined) => {
          if (!old) return old;
          return old.map((status) =>
            status.id === updatedStatus.id ? updatedStatus : status
          );
        }
      );
    },
    onError: (error: Error) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Error al actualizar estado";
      showToast(message, "error");
    },
  });

  // Delete status mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${STATUSES_ENDPOINT}/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ["task-statuses"] });
      showToast("Estado eliminado exitosamente", "success");

      // Remove from cache directly for better UX
      queryClient.setQueryData(
        ["task-statuses"],
        (old: TaskStatus[] | undefined) => {
          if (!old) return old;
          return old.filter((status) => status.id !== deletedId);
        }
      );
    },
    onError: (error: Error) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Error al eliminar estado";
      showToast(message, "error");
    },
  });

  // Reorder status mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const response = await api.post(`${STATUSES_ENDPOINT}/${id}/reorder`, {
        new_order: newOrder,
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["task-statuses"] });
      showToast("Estado reordenado exitosamente", "success");
    },
    onError: (error: Error) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Error al reordenar estado";
      showToast(message, "error");
    },
  });

  // Helper functions
  const createStatus = (data: TaskStatusCreate): void => {
    createMutation.mutate(data);
  };

  const updateStatus = (id: string, data: TaskStatusUpdate): void => {
    updateMutation.mutate({ id, data });
  };

  const deleteStatus = (id: string): void => {
    if (
      confirm(
        "¿Estás seguro de eliminar este estado? Esta acción no se puede deshacer."
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const reorderStatus = (id: string, newOrder: number): void => {
    reorderMutation.mutate({ id, newOrder });
  };

  // Get status by ID
  const getStatusById = (id: string): TaskStatus | undefined => {
    return statuses?.find((status) => status.id === id);
  };

  // Get statuses by type
  const getStatusesByType = (type: TaskStatusType): TaskStatus[] => {
    return statuses?.filter((status) => status.type === type) || [];
  };

  // Get non-system statuses
  const getCustomStatuses = (): TaskStatus[] => {
    return statuses?.filter((status) => !status.is_system) || [];
  };

  // Get system statuses
  const getSystemStatuses = (): TaskStatus[] => {
    return statuses?.filter((status) => status.is_system) || [];
  };

  // Check if status name exists
  const isStatusNameTaken = (name: string, excludeId?: string): boolean => {
    return (
      statuses?.some(
        (status) =>
          status.name.toLowerCase() === name.toLowerCase() &&
          status.id !== excludeId
      ) || false
    );
  };

  // Get next order number
  const getNextOrder = (): number => {
    if (!statuses || statuses.length === 0) return 0;
    const maxOrder = Math.max(...statuses.map((status) => status.order));
    return maxOrder + 1;
  };

  return {
    // Data
    statuses,
    isLoading,
    error,

    // Mutations
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatus,

    // States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,

    // Helper functions
    refetch,
    getStatusById,
    getStatusesByType,
    getCustomStatuses,
    getSystemStatuses,
    isStatusNameTaken,
    getNextOrder,
  };
}

// Hook for status options (for forms, filters, etc.)
export function useStatusOptions() {
  const { statuses } = useTaskStatuses();

  return {
    data:
      statuses?.map((status) => ({
        value: status.id,
        label: status.name,
        color: status.color,
        type: status.type,
        is_system: status.is_system,
      })) || [],
    isLoading: false,
  };
}
