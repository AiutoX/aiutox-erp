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
  NotificationPreferencesCreate,
  NotificationPreferencesUpdate,
  NotificationSubscription,
} from "../types/notifications.types";
import {
  listNotificationTemplates,
  getNotificationTemplate,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  listNotificationQueue,
  getNotificationQueueEntry,
  sendNotification,
  getNotificationChannels,
  updateSMTPConfig,
  updateSMSConfig,
  updateWebhookConfig,
  testSMTPConnection,
  testWebhookConnection,
  getNotificationStats,
  listNotificationPreferences,
  getNotificationPreferences,
  createNotificationPreferences,
  updateNotificationPreferences,
  deleteNotificationPreferences,
  listNotificationDeliveryReports,
  listNotificationSubscriptions,
  createNotificationSubscription,
  updateNotificationSubscription,
  deleteNotificationSubscription,
  listNotificationEventTypes,
  getNotificationEventType,
} from "../api/notifications.api";

// Query keys
export const notificationsKeys = {
  all: ["notifications"] as const,
  templates: () => [...notificationsKeys.all, "templates"] as const,
  template: (id: string) =>
    [...notificationsKeys.templates(), "detail", id] as const,
  queue: () => [...notificationsKeys.all, "queue"] as const,
  queueEntry: (id: string) =>
    [...notificationsKeys.queue(), "detail", id] as const,
  channels: () => [...notificationsKeys.all, "channels"] as const,
  stats: () => [...notificationsKeys.all, "stats"] as const,
  preferences: () => [...notificationsKeys.all, "preferences"] as const,
  preference: (id: string) =>
    [...notificationsKeys.preferences(), "detail", id] as const,
  deliveryReports: () =>
    [...notificationsKeys.all, "delivery-reports"] as const,
  subscriptions: () => [...notificationsKeys.all, "subscriptions"] as const,
  subscription: (id: string) =>
    [...notificationsKeys.subscriptions(), "detail", id] as const,
  eventTypes: () => [...notificationsKeys.all, "event-types"] as const,
  eventType: (id: string) =>
    [...notificationsKeys.eventTypes(), "detail", id] as const,
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
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: notificationsKeys.stats() });
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
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: notificationsKeys.stats() });
    },
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
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: notificationsKeys.stats() });
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

/**
 * Notification Statistics hooks
 */

/**
 * Hook for getting notification statistics
 * @returns Query result with statistics
 */
export function useNotificationStats() {
  return useQuery({
    queryKey: notificationsKeys.stats(),
    queryFn: () => getNotificationStats(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * Notification Preferences hooks
 */

/**
 * Hook for listing notification preferences
 * @param params - Query parameters
 * @returns Query result with preferences list
 */
export function useNotificationPreferences(params?: {
  user_id?: string;
  event_type?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: [...notificationsKeys.preferences(), params],
    queryFn: () => listNotificationPreferences(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting notification preferences by ID
 * @param preferenceId - Preference ID
 * @returns Query result with preferences details
 */
export function useNotificationPreference(preferenceId: string) {
  return useQuery({
    queryKey: notificationsKeys.preference(preferenceId),
    queryFn: () => getNotificationPreferences(preferenceId),
    enabled: !!preferenceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for creating notification preferences
 * @returns Mutation result for preferences creation
 */
export function useCreateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NotificationPreferencesCreate) =>
      createNotificationPreferences(data),
    onSuccess: () => {
      // Invalidate preferences list cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.preferences(),
      });
    },
  });
}

/**
 * Hook for updating notification preferences
 * @returns Mutation result for preferences update
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      preferenceId,
      data,
    }: {
      preferenceId: string;
      data: NotificationPreferencesUpdate;
    }) => updateNotificationPreferences(preferenceId, data),
    onSuccess: (_, { preferenceId }) => {
      // Invalidate specific preference cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.preference(preferenceId),
      });
      // Invalidate preferences list cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.preferences(),
      });
    },
  });
}

/**
 * Hook for deleting notification preferences
 * @returns Mutation result for preferences deletion
 */
export function useDeleteNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferenceId: string) =>
      deleteNotificationPreferences(preferenceId),
    onSuccess: (_, preferenceId) => {
      // Invalidate specific preference cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.preference(preferenceId),
      });
      // Invalidate preferences list cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.preferences(),
      });
    },
  });
}

/**
 * Notification Delivery Reports hooks
 */

/**
 * Hook for listing notification delivery reports
 * @param params - Query parameters
 * @returns Query result with delivery reports list
 */
export function useNotificationDeliveryReports(params?: {
  notification_id?: string;
  channel?: string;
  status?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: [...notificationsKeys.deliveryReports(), params],
    queryFn: () => listNotificationDeliveryReports(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Notification Subscriptions hooks
 */

/**
 * Hook for listing notification subscriptions
 * @param params - Query parameters
 * @returns Query result with subscriptions list
 */
export function useNotificationSubscriptions(params?: {
  user_id?: string;
  event_type?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: [...notificationsKeys.subscriptions(), params],
    queryFn: () => listNotificationSubscriptions(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for creating a notification subscription
 * @returns Mutation result for subscription creation
 */
export function useCreateNotificationSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<
        NotificationSubscription,
        | "id"
        | "tenant_id"
        | "last_triggered"
        | "trigger_count"
        | "created_at"
        | "updated_at"
      >
    ) => createNotificationSubscription(data),
    onSuccess: () => {
      // Invalidate subscriptions list cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.subscriptions(),
      });
    },
  });
}

/**
 * Hook for updating a notification subscription
 * @returns Mutation result for subscription update
 */
export function useUpdateNotificationSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      data,
    }: {
      subscriptionId: string;
      data: Partial<
        Pick<NotificationSubscription, "webhook_url" | "secret" | "is_active">
      >;
    }) => updateNotificationSubscription(subscriptionId, data),
    onSuccess: (_, { subscriptionId }) => {
      // Invalidate specific subscription cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.subscription(subscriptionId),
      });
      // Invalidate subscriptions list cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.subscriptions(),
      });
    },
  });
}

/**
 * Hook for deleting a notification subscription
 * @returns Mutation result for subscription deletion
 */
export function useDeleteNotificationSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscriptionId: string) =>
      deleteNotificationSubscription(subscriptionId),
    onSuccess: (_, subscriptionId) => {
      // Invalidate specific subscription cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.subscription(subscriptionId),
      });
      // Invalidate subscriptions list cache
      queryClient.invalidateQueries({
        queryKey: notificationsKeys.subscriptions(),
      });
    },
  });
}

/**
 * Notification Event Types hooks
 */

/**
 * Hook for listing notification event types
 * @returns Query result with event types list
 */
export function useNotificationEventTypes() {
  return useQuery({
    queryKey: notificationsKeys.eventTypes(),
    queryFn: () => listNotificationEventTypes(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for getting a notification event type by ID
 * @param eventTypeId - Event type ID
 * @returns Query result with event type details
 */
export function useNotificationEventType(eventTypeId: string) {
  return useQuery({
    queryKey: notificationsKeys.eventType(eventTypeId),
    queryFn: () => getNotificationEventType(eventTypeId),
    enabled: !!eventTypeId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
