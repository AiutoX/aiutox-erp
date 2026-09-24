/**
 * useSavedViews hook
 * Provides TanStack Query hooks for saved views CRUD.
 * Following frontend-api.md rules.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getViews, createView } from "~/features/tasks/api/tasks.api";
import type { SavedView, ViewCreate } from "~/features/tasks/types/task.types";
import apiClient from "~/lib/api/client";
import type { StandardResponse } from "~/lib/api/types/common.types";

export function useSavedViews() {
  const queryClient = useQueryClient();

  const viewsQuery = useQuery({
    queryKey: ["tasks", "views"],
    queryFn: () => getViews(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (data: ViewCreate) => createView(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", "views"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ViewCreate>;
    }) => {
      const response = await apiClient.put<StandardResponse<SavedView>>(
        `/tasks/views/${id}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", "views"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<StandardResponse<null>>(
        `/tasks/views/${id}`
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", "views"] });
    },
  });

  return {
    views: viewsQuery.data?.data ?? [],
    isLoading: viewsQuery.isLoading,
    error: viewsQuery.error,
    createView: (data: ViewCreate) => createMutation.mutateAsync(data),
    updateView: (id: string, data: Partial<ViewCreate>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteView: (id: string) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
  };
}
