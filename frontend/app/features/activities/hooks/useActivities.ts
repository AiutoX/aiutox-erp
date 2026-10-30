/**
 * Activities hooks
 * Provides TanStack Query hooks for activities module
 * Following frontend-api.md rules
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  listEntityActivities,
} from "~/features/activities/api/activities.api";
import type {
  ActivityUpdate,
  ActivityListParams,
  EntityActivitiesParams,
} from "~/features/activities/types/activity.types";

// Query hooks
export function useActivities(params?: ActivityListParams) {
  return useQuery({
    queryKey: ["activities", params],
    queryFn: () => listActivities(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: ["activities", id],
    queryFn: () => getActivity(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!id,
  });
}

export function useEntityActivities(
  entityType: string,
  entityId: string,
  params?: Omit<EntityActivitiesParams, "entity_type" | "entity_id">
) {
  return useQuery({
    queryKey: ["activities", "entity", entityType, entityId, params],
    queryFn: () => listEntityActivities(entityType, entityId, params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!entityType && !!entityId,
  });
}

// Mutation hooks
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      // Invalidate activities list queries
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (error) => {
      console.error("Failed to create activity:", error);
    },
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ActivityUpdate }) =>
      updateActivity(id, payload),
    onSuccess: (_, variables) => {
      // Invalidate specific activity and list queries
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
      void queryClient.invalidateQueries({
        queryKey: ["activity", variables.id],
      });
    },
    onError: (error) => {
      console.error("Failed to update activity:", error);
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => {
      // Invalidate activities list queries
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (error) => {
      console.error("Failed to delete activity:", error);
    },
  });
}
