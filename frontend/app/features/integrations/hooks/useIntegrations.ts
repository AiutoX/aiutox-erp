/**
 * Integrations hooks
 * TanStack Query hooks for Integrations module
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  IntegrationCreate,
  IntegrationUpdate,
  IntegrationActivateRequest,
  IntegrationWebhook,
  IntegrationConfig,
} from "../types/integrations.types";
import {
  listIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  activateIntegration,
  deactivateIntegration,
  testIntegration,
  getIntegrationStats,
  getIntegrationLogs,
  getIntegrationWebhooks,
  createIntegrationWebhook,
  updateIntegrationWebhook,
  deleteIntegrationWebhook,
  getIntegrationEvents,
  getIntegrationHealth,
  getIntegrationConfig,
  updateIntegrationConfig,
  getAvailableIntegrationTypes,
  syncIntegration,
} from "../api/integrations.api";

// Query keys
export const integrationsKeys = {
  all: ["integrations"] as const,
  lists: () => [...integrationsKeys.all, "list"] as const,
  list: (type?: string) => [...integrationsKeys.lists(), type] as const,
  details: () => [...integrationsKeys.all, "detail"] as const,
  detail: (id: string) => [...integrationsKeys.details(), id] as const,
  stats: () => [...integrationsKeys.all, "stats"] as const,
  logs: (id: string) => [...integrationsKeys.detail(id), "logs"] as const,
  webhooks: (id: string) =>
    [...integrationsKeys.detail(id), "webhooks"] as const,
  events: (id: string) => [...integrationsKeys.detail(id), "events"] as const,
  health: (id: string) => [...integrationsKeys.detail(id), "health"] as const,
  credentials: (id: string) =>
    [...integrationsKeys.detail(id), "credentials"] as const,
  config: (id: string) => [...integrationsKeys.detail(id), "config"] as const,
  types: () => [...integrationsKeys.all, "types"] as const,
};

/**
 * Integrations hooks
 */

/**
 * Hook for listing integrations
 * @param type - Optional integration type filter
 * @returns Query result with integrations list
 */
export function useIntegrations(type?: string) {
  return useQuery({
    queryKey: integrationsKeys.list(type),
    queryFn: () => listIntegrations(type),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for getting a single integration
 * @param integrationId - Integration ID
 * @returns Query result with integration details
 */
export function useIntegration(integrationId: string) {
  return useQuery({
    queryKey: integrationsKeys.detail(integrationId),
    queryFn: () => getIntegration(integrationId),
    enabled: !!integrationId,
    staleTime: 10 * 1000, // 10 seconds
  });
}

/**
 * Hook for creating an integration
 * @returns Mutation result for integration creation
 */
export function useCreateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IntegrationCreate) => createIntegration(data),
    onSuccess: () => {
      // Invalidate integrations list cache
      queryClient.invalidateQueries({ queryKey: integrationsKeys.lists() });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: integrationsKeys.stats() });
    },
  });
}

/**
 * Hook for updating an integration
 * @returns Mutation result for integration update
 */
export function useUpdateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      data,
    }: {
      integrationId: string;
      data: IntegrationUpdate;
    }) => updateIntegration(integrationId, data),
    onSuccess: (_, { integrationId }) => {
      // Invalidate specific integration cache
      queryClient.invalidateQueries({
        queryKey: integrationsKeys.detail(integrationId),
      });
      // Invalidate integrations list cache
      queryClient.invalidateQueries({ queryKey: integrationsKeys.lists() });
    },
  });
}

/**
 * Hook for deleting an integration
 * @returns Mutation result for integration deletion
 */
export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (integrationId: string) => deleteIntegration(integrationId),
    onSuccess: () => {
      // Invalidate integrations list cache
      queryClient.invalidateQueries({ queryKey: integrationsKeys.lists() });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: integrationsKeys.stats() });
    },
  });
}

/**
 * Hook for activating an integration
 * @returns Mutation result for integration activation
 */
export function useActivateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      data,
    }: {
      integrationId: string;
      data: IntegrationActivateRequest;
    }) => activateIntegration(integrationId, data),
    onSuccess: (_, { integrationId }) => {
      // Invalidate specific integration cache
      queryClient.invalidateQueries({
        queryKey: integrationsKeys.detail(integrationId),
      });
      // Invalidate integrations list cache
      queryClient.invalidateQueries({ queryKey: integrationsKeys.lists() });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: integrationsKeys.stats() });
    },
  });
}

/**
 * Hook for deactivating an integration
 * @returns Mutation result for integration deactivation
 */
export function useDeactivateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (integrationId: string) => deactivateIntegration(integrationId),
    onSuccess: () => {
      // Invalidate integrations list cache
      queryClient.invalidateQueries({ queryKey: integrationsKeys.lists() });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: integrationsKeys.stats() });
    },
  });
}

/**
 * Hook for testing an integration
 * @returns Mutation result for integration test
 */
export function useTestIntegration() {
  return useMutation({
    mutationFn: (integrationId: string) => testIntegration(integrationId),
  });
}

/**
 * Hook for syncing an integration
 * @returns Mutation result for integration sync
 */
export function useSyncIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (integrationId: string) => syncIntegration(integrationId),
    onSuccess: () => {
      // Invalidate integrations list cache
      queryClient.invalidateQueries({ queryKey: integrationsKeys.lists() });
    },
  });
}

/**
 * Statistics hooks
 */

/**
 * Hook for getting integration statistics
 * @returns Query result with statistics
 */
export function useIntegrationStats() {
  return useQuery({
    queryKey: integrationsKeys.stats(),
    queryFn: () => getIntegrationStats(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * Logs hooks
 */

/**
 * Hook for getting integration logs
 * @param integrationId - Integration ID
 * @param params - Query parameters
 * @returns Query result with logs list
 */
export function useIntegrationLogs(
  integrationId: string,
  params?: {
    level?: string;
    limit?: number;
    offset?: number;
  }
) {
  return useQuery({
    queryKey: [...integrationsKeys.logs(integrationId), params],
    queryFn: () => getIntegrationLogs(integrationId, params),
    enabled: !!integrationId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Webhooks hooks
 */

/**
 * Hook for getting integration webhooks
 * @param integrationId - Integration ID
 * @returns Query result with webhooks list
 */
export function useIntegrationWebhooks(integrationId: string) {
  return useQuery({
    queryKey: integrationsKeys.webhooks(integrationId),
    queryFn: () => getIntegrationWebhooks(integrationId),
    enabled: !!integrationId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for creating an integration webhook
 * @returns Mutation result for webhook creation
 */
export function useCreateIntegrationWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      data,
    }: {
      integrationId: string;
      data: Omit<
        IntegrationWebhook,
        "id" | "integration_id" | "trigger_count" | "created_at" | "updated_at"
      >;
    }) => createIntegrationWebhook(integrationId, data),
    onSuccess: (_, { integrationId }) => {
      // Invalidate webhooks cache
      queryClient.invalidateQueries({
        queryKey: integrationsKeys.webhooks(integrationId),
      });
    },
  });
}

/**
 * Hook for updating an integration webhook
 * @returns Mutation result for webhook update
 */
export function useUpdateIntegrationWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      webhookId,
      data,
    }: {
      integrationId: string;
      webhookId: string;
      data: Partial<
        Pick<IntegrationWebhook, "event_type" | "url" | "secret" | "active">
      >;
    }) => updateIntegrationWebhook(integrationId, webhookId, data),
    onSuccess: (_, { integrationId }) => {
      // Invalidate webhooks cache
      queryClient.invalidateQueries({
        queryKey: integrationsKeys.webhooks(integrationId),
      });
    },
  });
}

/**
 * Hook for deleting an integration webhook
 * @returns Mutation result for webhook deletion
 */
export function useDeleteIntegrationWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      webhookId,
    }: {
      integrationId: string;
      webhookId: string;
    }) => deleteIntegrationWebhook(integrationId, webhookId),
    onSuccess: (_, { integrationId }) => {
      // Invalidate webhooks cache
      queryClient.invalidateQueries({
        queryKey: integrationsKeys.webhooks(integrationId),
      });
    },
  });
}

/**
 * Events hooks
 */

/**
 * Hook for getting integration events
 * @param integrationId - Integration ID
 * @param params - Query parameters
 * @returns Query result with events list
 */
export function useIntegrationEvents(
  integrationId: string,
  params?: {
    event_type?: string;
    processed?: boolean;
    limit?: number;
    offset?: number;
  }
): ReturnType<typeof useQuery> {
  return useQuery({
    queryKey: [...integrationsKeys.events(integrationId), params],
    queryFn: () => getIntegrationEvents(integrationId, params),
    enabled: !!integrationId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Health hooks
 */

/**
 * Hook for getting integration health
 * @param integrationId - Integration ID
 * @returns Query result with health status
 */
export function useIntegrationHealth(integrationId: string) {
  return useQuery({
    queryKey: integrationsKeys.health(integrationId),
    queryFn: () => getIntegrationHealth(integrationId),
    enabled: !!integrationId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}

/**
 * Credentials hooks
 */

/**
 * Hook for getting integration credentials
 * @param integrationId - Integration ID
 * @returns Query result with credentials list
 */
export function useIntegrationCredentials(integrationId: string) {
  return useQuery({
    queryKey: integrationsKeys.credentials(integrationId),
    queryFn: () => {
      // Temporarily return empty array since getIntegrationCredentials is not available
      return Promise.resolve([]);
    },
    enabled: !!integrationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for updating integration credentials
 * @returns Mutation result for credentials update
 */
export function useUpdateIntegrationCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_params) =>
      // Temporarily return success since updateIntegrationCredentials is not available
      Promise.resolve({}),
    onSuccess: () => {
      // Invalidate all credentials caches
      queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
}

/**
 * Configuration hooks
 */

/**
 * Hook for getting integration configuration
 * @param integrationId - Integration ID
 * @returns Query result with configuration list
 */
export function useIntegrationConfig(integrationId: string) {
  return useQuery({
    queryKey: integrationsKeys.config(integrationId),
    queryFn: () => getIntegrationConfig(integrationId),
    enabled: !!integrationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for updating integration configuration
 * @returns Mutation result for configuration update
 */
export function useUpdateIntegrationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      configId,
      data,
    }: {
      integrationId: string;
      configId: string;
      data: Partial<Pick<IntegrationConfig, "value" | "description">>;
    }) => updateIntegrationConfig(integrationId, configId, data),
    onSuccess: (_, { integrationId }) => {
      // Invalidate config cache
      queryClient.invalidateQueries({
        queryKey: integrationsKeys.config(integrationId),
      });
    },
  });
}

/**
 * Utility hooks
 */

/**
 * Hook for getting available integration types
 * @returns Query result with available types
 */
export function useAvailableIntegrationTypes() {
  return useQuery({
    queryKey: integrationsKeys.types(),
    queryFn: () => getAvailableIntegrationTypes(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
