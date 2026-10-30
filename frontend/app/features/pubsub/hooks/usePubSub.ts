/**
 * PubSub hooks
 * TanStack Query hooks for the pubsub admin router's 5 real endpoints.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPubSubStats,
  listPubSubFailedEvents,
  reprocessPubSubFailedEvent,
  getPubSubStreamInfo,
  getPubSubPending,
} from "../api/pubsub.api";

// Query keys
export const pubsubKeys = {
  all: ["pubsub"] as const,
  stats: () => [...pubsubKeys.all, "stats"] as const,
  failed: (params?: { limit?: number; offset?: number }) =>
    [...pubsubKeys.all, "failed", params] as const,
  streamInfo: (name: string) =>
    [...pubsubKeys.all, "streams", name, "info"] as const,
  pending: (streamName: string, groupName: string) =>
    [...pubsubKeys.all, "streams", streamName, "groups", groupName, "pending"] as const,
};

/**
 * Hook for getting Pub-Sub statistics
 */
export function usePubSubStats() {
  return useQuery({
    queryKey: pubsubKeys.stats(),
    queryFn: () => getPubSubStats(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Hook for listing failed events
 */
export function usePubSubFailedEvents(params?: {
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: pubsubKeys.failed(params),
    queryFn: () => listPubSubFailedEvents(params),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for reprocessing a failed event
 */
export function useReprocessPubSubFailedEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => reprocessPubSubFailedEvent(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pubsubKeys.all });
    },
  });
}

/**
 * Hook for getting detailed stream information
 */
export function usePubSubStreamInfo(name: string) {
  return useQuery({
    queryKey: pubsubKeys.streamInfo(name),
    queryFn: () => getPubSubStreamInfo(name),
    enabled: !!name,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook for getting pending messages for a consumer group
 */
export function usePubSubPending(
  streamName: string,
  groupName: string,
  params?: { count?: number }
) {
  return useQuery({
    queryKey: [...pubsubKeys.pending(streamName, groupName), params],
    queryFn: () => getPubSubPending(streamName, groupName, params),
    enabled: !!streamName && !!groupName,
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
  });
}
