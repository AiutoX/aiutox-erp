/**
 * Channel identities hooks — employee self-service channel linking.
 * React Query hooks wrapping the channel-identities API.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTelegramLinkCode,
  deactivateChannelIdentity,
  listChannelIdentities,
} from "../api/channel-identities.api";

const QUERY_KEY = ["channel-identities"] as const;

/**
 * List the current user's own active channel identities.
 */
export function useChannelIdentities() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await listChannelIdentities();
      return response.data ?? [];
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}

/**
 * Unlink one of the current user's own channel identities.
 */
export function useDeactivateChannelIdentity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (identityId: string) => deactivateChannelIdentity(identityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Generate a single-use, 10-minute Telegram linking code.
 */
export function useCreateTelegramLinkCode() {
  return useMutation({
    mutationFn: () => createTelegramLinkCode(),
  });
}
