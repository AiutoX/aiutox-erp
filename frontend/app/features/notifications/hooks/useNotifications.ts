/**
 * Notifications hooks
 * TanStack Query hooks for Notifications module
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  NotificationTemplateCreate,
  NotificationTemplateUpdate,
  NotificationSendRequest,
  SMTPConfigRequest,
  SMSConfigRequest,
  WebhookConfigRequest,
} from "../types/notifications.types";
import {
  listNotificationTemplates,
  getNotificationTemplate,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  listNotificationTemplateVersions,
  renderNotificationTemplate,
  getNotificationChannelsCatalog,
  listNotificationQueue,
  getNotificationQueueEntry,
  sendNotification,
  getNotificationChannels,
  updateSMTPConfig,
  updateSMSConfig,
  updateWebhookConfig,
  testSMTPConnection,
  testWebhookConnection,
} from "../api/notifications.api";

// Query keys
export const notificationsKeys = {
  all: ["notifications"] as const,
  templates: () => [...notificationsKeys.all, "templates"] as const,
  template: (id: string) =>
    [...notificationsKeys.templates(), "detail", id] as const,
  templateVersions: (id: string) =>
    [...notificationsKeys.templates(), "versions", id] as const,
  channelsCatalog: () => [...notificationsKeys.all, "channels-catalog"] as const,
  queue: () => [...notificationsKeys.all, "queue"] as const,
  queueEntry: (id: string) =>
    [...notificationsKeys.queue(), "detail", id] as const,
  channels: () => [...notificationsKeys.all, "channels"] as const,
};

/**
 * Notification Templates hooks
 */

/**
 * Hook for listing notification templates
 * @param params - Query parameters
 * @returns Query result with templates list
 */
export function useNotificationTemplates(params?: {
  page?: number;
  page_size?: number;
  event_type?: string;
  channel?: string;
  is_active?: boolean;
  q?: string;
}) {
  return useQuery({
    queryKey: [...notificationsKeys.templates(), params],
    queryFn: () => listNotificationTemplates(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting a single notification template
 * @param templateId - Template ID
 * @returns Query result with template details
 */
export function useNotificationTemplate(templateId: string) {
  return useQuery({
    queryKey: notificationsKeys.template(templateId),
    queryFn: () => getNotificationTemplate(templateId),
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for creating a notification template
 * @returns Mutation result for template creation
 */
export function useCreateNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NotificationTemplateCreate) =>
      createNotificationTemplate(data),
    onSuccess: () => {
      // Invalidate templates list cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.templates(),
      });
    },
  });
}

/**
 * Hook for updating a notification template
 * @returns Mutation result for template update
 */
export function useUpdateNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string;
      data: NotificationTemplateUpdate;
    }) => updateNotificationTemplate(templateId, data),
    onSuccess: (_, { templateId }) => {
      // Invalidate specific template cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.template(templateId),
      });
      // Invalidate templates list cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.templates(),
      });
    },
  });
}

/**
 * Hook for deleting a notification template
 * @returns Mutation result for template deletion
 */
export function useDeleteNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => deleteNotificationTemplate(templateId),
    onSuccess: (_, templateId) => {
      // Invalidate specific template cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.template(templateId),
      });
      // Invalidate templates list cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.templates(),
      });
    },
  });
}

/**
 * Hook for listing a notification template's version history
 * @param templateId - Template ID
 * @returns Query result with version history
 */
export function useNotificationTemplateVersions(templateId: string) {
  return useQuery({
    queryKey: notificationsKeys.templateVersions(templateId),
    queryFn: () => listNotificationTemplateVersions(templateId),
    enabled: !!templateId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook for listing notification channels with per-tenant availability.
 * Single source of truth for "which channels exist and can this tenant
 * actually send through them" — consumed instead of a hardcoded list.
 * Availability changes only when a tenant (dis)connects an integration or
 * updates SMTP/webhook config, so a longer staleTime is safe.
 * @returns Query result with the channel catalog
 */
export function useNotificationChannelsCatalog() {
  return useQuery({
    queryKey: notificationsKeys.channelsCatalog(),
    queryFn: () => getNotificationChannelsCatalog(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for rendering a notification template with a context
 * @returns Mutation result for template render
 */
export function useRenderNotificationTemplate() {
  return useMutation({
    mutationFn: ({
      templateId,
      context,
    }: {
      templateId: string;
      context: Record<string, unknown>;
    }) => renderNotificationTemplate(templateId, context),
  });
}

/**
 * Notification Queue hooks
 */

/**
 * Hook for listing notification queue entries
 * @param params - Query parameters
 * @returns Query result with queue entries list
 */
export function useNotificationQueue(params?: {
  page?: number;
  page_size?: number;
  status?: string;
}): ReturnType<typeof useQuery> {
  return useQuery({
    queryKey: [...notificationsKeys.queue(), params],
    queryFn: () => listNotificationQueue(params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for real-time updates
  });
}

/**
 * Hook for getting a single notification queue entry
 * @param queueId - Queue entry ID
 * @returns Query result with queue entry details
 */
export function useNotificationQueueEntry(queueId: string) {
  return useQuery({
    queryKey: notificationsKeys.queueEntry(queueId),
    queryFn: () => getNotificationQueueEntry(queueId),
    enabled: !!queueId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 5 * 1000, // Refetch every 5 seconds for real-time updates
  });
}

/**
 * Hook for sending a notification
 * @returns Mutation result for notification send
 */
export function useSendNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NotificationSendRequest) => sendNotification(data),
    onSuccess: () => {
      // Invalidate queue cache
      queryClient.invalidateQueries({ queryKey: notificationsKeys.queue() });
    },
  });
}

/**
 * Notification Channels hooks
 */

/**
 * Hook for getting notification channels configuration
 * @returns Query result with channels configuration
 */
export function useNotificationChannels() {
  return useQuery({
    queryKey: notificationsKeys.channels(),
    queryFn: () => getNotificationChannels(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for updating SMTP channel configuration
 * @returns Mutation result for SMTP configuration update
 */
export function useUpdateSMTPConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SMTPConfigRequest) => updateSMTPConfig(data),
    onSuccess: () => {
      // Invalidate channels cache
      queryClient.invalidateQueries({ queryKey: notificationsKeys.channels() });
    },
  });
}

/**
 * Hook for updating SMS channel configuration
 * @returns Mutation result for SMS configuration update
 */
export function useUpdateSMSConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SMSConfigRequest) => updateSMSConfig(data),
    onSuccess: () => {
      // Invalidate channels cache
      queryClient.invalidateQueries({ queryKey: notificationsKeys.channels() });
    },
  });
}

/**
 * Hook for updating webhook channel configuration
 * @returns Mutation result for webhook configuration update
 */
export function useUpdateWebhookConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WebhookConfigRequest) => updateWebhookConfig(data),
    onSuccess: () => {
      // Invalidate channels cache
      queryClient.invalidateQueries({ queryKey: notificationsKeys.channels() });
    },
  });
}

/**
 * Hook for testing SMTP connection
 * @returns Mutation result for SMTP test
 */
export function useTestSMTPConnection() {
  return useMutation({
    mutationFn: () => testSMTPConnection(),
  });
}

/**
 * Hook for testing webhook connection
 * @returns Mutation result for webhook test
 */
export function useTestWebhookConnection() {
  return useMutation({
    mutationFn: () => testWebhookConnection(),
  });
}

