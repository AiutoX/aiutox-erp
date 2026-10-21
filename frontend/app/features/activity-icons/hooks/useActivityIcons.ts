/**
 * Activity Icons Hooks
 * React Query hooks for activity icon configuration management
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activityIconsApi } from "../api/activity-icons.api";
import { showToast } from "~/components/common/Toast";
import type {
  ActivityIconConfigBulkUpdate,
  ActivityIconConfigCreate,
  ActivityIconConfigUpdate,
} from "../types/activity-icon.types";

/**
 * Hook to fetch activity icon configurations
 */
export const useActivityIcons = () => {
  return useQuery({
    queryKey: ["activity-icons"],
    queryFn: () => activityIconsApi.getIcons(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch default activity icon configurations
 */
export const useDefaultActivityIcons = () => {
  return useQuery({
    queryKey: ["activity-icons-defaults"],
    queryFn: () => activityIconsApi.getDefaults(),
    staleTime: Infinity, // Never refetch defaults
  });
};

/**
 * Hook to create a new activity icon configuration
 */
export const useCreateActivityIcon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ActivityIconConfigCreate) =>
      activityIconsApi.createIcon(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["activity-icons"] });
      showToast("Icono creado correctamente", "success");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Error al crear icono";
      showToast(message, "error");
      console.error("Error creating activity icon:", error);
    },
  });
};

/**
 * Hook to bulk update activity icon configurations
 */
export const useUpdateActivityIcons = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ActivityIconConfigBulkUpdate) =>
      activityIconsApi.bulkUpdateIcons(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["activity-icons"] });
      showToast("Iconos actualizados correctamente", "success");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Error al actualizar iconos";
      showToast(message, "error");
      console.error("Error updating activity icons:", error);
    },
  });
};

/**
 * Hook to update a specific activity icon configuration
 */
export const useUpdateActivityIcon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      configId,
      data,
    }: {
      configId: string;
      data: ActivityIconConfigUpdate;
    }) => activityIconsApi.updateIcon(configId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["activity-icons"] });
      showToast("Icono actualizado correctamente", "success");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Error al actualizar icono";
      showToast(message, "error");
      console.error("Error updating activity icon:", error);
    },
  });
};

/**
 * Hook to delete an activity icon configuration
 */
export const useDeleteActivityIcon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configId: string) => activityIconsApi.deleteIcon(configId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["activity-icons"] });
      showToast("Icono eliminado correctamente", "success");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Error al eliminar icono";
      showToast(message, "error");
      console.error("Error deleting activity icon:", error);
    },
  });
};
