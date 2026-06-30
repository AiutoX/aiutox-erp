/**
 * Preferences hooks
 * React Query hooks for notification preferences
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../api/preferences.api";
import type { NotificationPreferencesMap } from "../types/preferences.types";

const QUERY_KEY = ["preferences", "notifications"] as const;

/**
 * Fetch notification preferences for the current user.
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await getNotificationPreferences();
      return response.data ?? {};
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation to update notification preferences.
 * Optimistically updates cache and invalidates on settle.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: NotificationPreferencesMap) =>
      updateNotificationPreferences(preferences),

    onMutate: async (newPreferences) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous =
        queryClient.getQueryData<NotificationPreferencesMap>(QUERY_KEY);

      queryClient.setQueryData<NotificationPreferencesMap>(
        QUERY_KEY,
        (old) => ({
          ...(old ?? {}),
          ...newPreferences,
        })
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
