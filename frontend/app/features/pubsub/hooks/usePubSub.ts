/**
 * PubSub hooks
 * TanStack Query hooks for PubSub module
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { StandardResponse } from "~/lib/api/types/common.types";
import type {
  PubSubAddMessage,
  PubSubAckMessage,
  PubSubClaimMessages,
  PubSubCreateStream,
  PubSubCreateGroup,
  PubSubHealthStatus,
  PubSubMonitoring,
} from "../types/pubsub.types";
import {
  getPubSubStats,
  getPubSubHealth,
  getPubSubMetrics,
  getPubSubMonitoring,
  listPubSubStreams,
  getPubSubStream,
  createPubSubStream,
  deletePubSubStream,
  addPubSubMessage,
  listPubSubGroups,
  getPubSubGroup,
  createPubSubGroup,
  deletePubSubGroup,
  getPubSubPending,
  acknowledgePubSubMessages,
  claimPubSubMessages,
  listPubSubConsumers,
  getPubSubConsumer,
  deletePubSubConsumer,
  resetPubSubStats,
  clearPubSubStream,
  trimPubSubStream,
  getPubSubConfig,
  updatePubSubConfig,
} from "../api/pubsub.api";

// Query keys
export const pubsubKeys = {
  all: ["pubsub"] as const,
  stats: () => [...pubsubKeys.all, "stats"] as const,
  health: () => [...pubsubKeys.all, "health"] as const,
  metrics: () => [...pubsubKeys.all, "metrics"] as const,
  monitoring: () => [...pubsubKeys.all, "monitoring"] as const,
  streams: () => [...pubsubKeys.all, "streams"] as const,
  stream: (name: string) => [...pubsubKeys.streams(), "detail", name] as const,
  groups: (streamName: string) =>
    [...pubsubKeys.streams(), streamName, "groups"] as const,
  group: (streamName: string, groupName: string) =>
    [...pubsubKeys.groups(streamName), "detail", groupName] as const,
  consumers: (streamName: string, groupName: string) =>
    [...pubsubKeys.groups(streamName), groupName, "consumers"] as const,
  consumer: (streamName: string, groupName: string, consumerName: string) =>
    [
      ...pubsubKeys.consumers(streamName, groupName),
      "detail",
      consumerName,
    ] as const,
  pending: (streamName: string, groupName: string) =>
    [...pubsubKeys.groups(streamName), groupName, "pending"] as const,
  config: () => [...pubsubKeys.all, "config"] as const,
};

/**
 * PubSub Statistics hooks
 */

/**
 * Hook for getting PubSub statistics
 * @returns Query result with PubSub stats
 */
export function usePubSubStats() {
  return useQuery({
    queryKey: pubsubKeys.stats(),
    queryFn: () => getPubSubStats(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook for getting PubSub health status
 * @returns Query result with health status
 */
export function usePubSubHealth(): ReturnType<
  typeof useQuery<StandardResponse<PubSubHealthStatus>>
> {
  return useQuery({
    queryKey: pubsubKeys.health(),
    queryFn: () => getPubSubHealth(),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

/**
 * Hook for getting PubSub metrics
 * @returns Query result with metrics
 */
export function usePubSubMetrics() {
  return useQuery({
    queryKey: pubsubKeys.metrics(),
    queryFn: () => getPubSubMetrics(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook for getting PubSub monitoring data
 * @returns Query result with monitoring data
 */
export function usePubSubMonitoring(): ReturnType<
  typeof useQuery<StandardResponse<PubSubMonitoring>>
> {
  return useQuery({
    queryKey: pubsubKeys.monitoring(),
    queryFn: () => getPubSubMonitoring(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * PubSub Streams hooks
 */

/**
 * Hook for listing PubSub streams
 * @returns Query result with streams list
 */
export function usePubSubStreams() {
  return useQuery({
    queryKey: pubsubKeys.streams(),
    queryFn: () => listPubSubStreams(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting a single PubSub stream
 * @param name - Stream name
 * @returns Query result with stream details
 */
export function usePubSubStream(name: string) {
  return useQuery({
    queryKey: pubsubKeys.stream(name),
    queryFn: () => getPubSubStream(name),
    enabled: !!name,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for creating a new PubSub stream
 * @returns Mutation result for stream creation
 */
export function useCreatePubSubStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PubSubCreateStream) => createPubSubStream(payload),
    onSuccess: () => {
      // Invalidate streams list cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.streams() });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stats() });
    },
  });
}

/**
 * Hook for deleting a PubSub stream
 * @returns Mutation result for stream deletion
 */
export function useDeletePubSubStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => deletePubSubStream(name),
    onSuccess: (_, name) => {
      // Invalidate specific stream cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stream(name) });
      // Invalidate streams list cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.streams() });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stats() });
    },
  });
}

/**
 * Hook for adding message to a PubSub stream
 * @returns Mutation result for message addition
 */
export function useAddPubSubMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PubSubAddMessage) => addPubSubMessage(payload),
    onSuccess: (_, { stream_name }) => {
      // Invalidate specific stream cache
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.stream(stream_name),
      });
      // Invalidate streams list cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.streams() });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stats() });
      // Invalidate metrics cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.metrics() });
    },
  });
}

/**
 * PubSub Groups hooks
 */

/**
 * Hook for listing PubSub groups for a stream
 * @param streamName - Stream name
 * @returns Query result with groups list
 */
export function usePubSubGroups(streamName: string) {
  return useQuery({
    queryKey: pubsubKeys.groups(streamName),
    queryFn: () => listPubSubGroups(streamName),
    enabled: !!streamName,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for getting a single PubSub group
 * @param streamName - Stream name
 * @param groupName - Group name
 * @returns Query result with group details
 */
export function usePubSubGroup(streamName: string, groupName: string) {
  return useQuery({
    queryKey: pubsubKeys.group(streamName, groupName),
    queryFn: () => getPubSubGroup(streamName, groupName),
    enabled: !!streamName && !!groupName,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for creating a new PubSub consumer group
 * @returns Mutation result for group creation
 */
export function useCreatePubSubGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PubSubCreateGroup) => createPubSubGroup(payload),
    onSuccess: (_, { stream_name }) => {
      // Invalidate groups cache for this stream
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.groups(stream_name),
      });
      // Invalidate specific stream cache
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.stream(stream_name),
      });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stats() });
    },
  });
}

/**
 * Hook for deleting a PubSub consumer group
 * @returns Mutation result for group deletion
 */
export function useDeletePubSubGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      streamName,
      groupName,
    }: {
      streamName: string;
      groupName: string;
    }) => deletePubSubGroup(streamName, groupName),
    onSuccess: (_, { streamName, groupName }) => {
      // Invalidate specific group cache
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.group(streamName, groupName),
      });
      // Invalidate groups cache for this stream
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.groups(streamName),
      });
      // Invalidate specific stream cache
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.stream(streamName),
      });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stats() });
    },
  });
}

/**
 * Hook for getting pending messages for a PubSub group
 * @param streamName - Stream name
 * @param groupName - Group name
 * @param params - Query parameters
 * @returns Query result with pending messages
 */
export function usePubSubPending(
  streamName: string,
  groupName: string,
  params?: { page?: number; page_size?: number; consumer?: string }
) {
  return useQuery({
    queryKey: [...pubsubKeys.pending(streamName, groupName), params],
    queryFn: () => getPubSubPending(streamName, groupName, params),
    enabled: !!streamName && !!groupName,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 15 * 1000, // Refetch every 15 seconds for pending messages
  });
}

/**
 * Hook for acknowledging messages for a PubSub group
 * @returns Mutation result for message acknowledgment
 */
export function useAcknowledgePubSubMessages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PubSubAckMessage) =>
      acknowledgePubSubMessages(payload),
    onSuccess: (_, { stream_name, group_name }) => {
      // Invalidate pending messages cache
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.pending(stream_name, group_name),
      });
      // Invalidate group cache
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.group(stream_name, group_name),
      });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stats() });
      // Invalidate metrics cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.metrics() });
    },
  });
}

/**
 * Hook for claiming messages for a PubSub consumer
 * @returns Mutation result for message claiming
 */
export function useClaimPubSubMessages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PubSubClaimMessages) => claimPubSubMessages(payload),
    onSuccess: (_, { stream_name, group_name }) => {
      // Invalidate pending messages cache
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.pending(stream_name, group_name),
      });
      // Invalidate group cache
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.group(stream_name, group_name),
      });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stats() });
    },
  });
}

/**
 * PubSub Consumers hooks
 */

/**
 * Hook for listing PubSub consumers for a group
 * @param streamName - Stream name
 * @param groupName - Group name
 * @returns Query result with consumers list
 */
export function usePubSubConsumers(streamName: string, groupName: string) {
  return useQuery({
    queryKey: pubsubKeys.consumers(streamName, groupName),
    queryFn: () => listPubSubConsumers(streamName, groupName),
    enabled: !!streamName && !!groupName,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for getting a single PubSub consumer
 * @param streamName - Stream name
 * @param groupName - Group name
 * @param consumerName - Consumer name
 * @returns Query result with consumer details
 */
export function usePubSubConsumer(
  streamName: string,
  groupName: string,
  consumerName: string
) {
  return useQuery({
    queryKey: pubsubKeys.consumer(streamName, groupName, consumerName),
    queryFn: () => getPubSubConsumer(streamName, groupName, consumerName),
    enabled: !!streamName && !!groupName && !!consumerName,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for deleting a PubSub consumer
 * @returns Mutation result for consumer deletion
 */
export function useDeletePubSubConsumer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      streamName,
      groupName,
      consumerName,
    }: {
      streamName: string;
      groupName: string;
      consumerName: string;
    }) => deletePubSubConsumer(streamName, groupName, consumerName),
    onSuccess: (_, { streamName, groupName, consumerName }) => {
      // Invalidate specific consumer cache
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.consumer(streamName, groupName, consumerName),
      });
      // Invalidate consumers cache for this group
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.consumers(streamName, groupName),
      });
      // Invalidate group cache
      queryClient.invalidateQueries({
        queryKey: pubsubKeys.group(streamName, groupName),
      });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stats() });
    },
  });
}

/**
 * PubSub Operations hooks
 */

/**
 * Hook for resetting PubSub statistics
 * @returns Mutation result for stats reset
 */
export function useResetPubSubStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resetPubSubStats(),
    onSuccess: () => {
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stats() });
      // Invalidate metrics cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.metrics() });
      // Invalidate monitoring cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.monitoring() });
    },
  });
}

/**
 * Hook for clearing all messages from a PubSub stream
 * @returns Mutation result for stream clearing
 */
export function useClearPubSubStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => clearPubSubStream(name),
    onSuccess: (_, name) => {
      // Invalidate specific stream cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stream(name) });
      // Invalidate streams list cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.streams() });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stats() });
      // Invalidate metrics cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.metrics() });
    },
  });
}

/**
 * Hook for trimming a PubSub stream
 * @returns Mutation result for stream trimming
 */
export function useTrimPubSubStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      strategy,
      threshold,
    }: {
      name: string;
      strategy: "maxlen" | "minid";
      threshold: number;
    }) => trimPubSubStream(name, strategy, threshold),
    onSuccess: (_, { name }) => {
      // Invalidate specific stream cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stream(name) });
      // Invalidate streams list cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.streams() });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.stats() });
      // Invalidate metrics cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.metrics() });
    },
  });
}

/**
 * Hook for getting PubSub configuration
 * @returns Query result with configuration
 */
export function usePubSubConfig() {
  return useQuery({
    queryKey: pubsubKeys.config(),
    queryFn: () => getPubSubConfig(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for updating PubSub configuration
 * @returns Mutation result for configuration update
 */
export function useUpdatePubSubConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Record<string, unknown>) => updatePubSubConfig(config),
    onSuccess: () => {
      // Invalidate config cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.config() });
      // Invalidate health cache
      queryClient.invalidateQueries({ queryKey: pubsubKeys.health() });
    },
  });
}
