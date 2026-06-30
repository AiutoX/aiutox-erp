/**
 * Notifications API
 * API functions for Notifications module
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  NotificationTemplate,
  NotificationTemplateCreate,
  NotificationTemplateUpdate,
  NotificationQueue,
  NotificationSendRequest,
  NotificationChannels,
  SMTPConfigRequest,
  SMSConfigRequest,
  WebhookConfigRequest,
  NotificationStats,
  NotificationPreferences,
  NotificationPreferencesCreate,
  NotificationPreferencesUpdate,
  NotificationDeliveryReport,
  NotificationSubscription,
  NotificationEventType,
} from "../types/notifications.types";

/**
 * Notification Templates API
 */

/**
 * List notification templates
 * @param params - Query parameters
 * @returns Promise<StandardListResponse<NotificationTemplate>>
 */
export async function listNotificationTemplates(params?: {
  page?: number;
  page_size?: number;
  event_type?: string;
}): Promise<StandardListResponse<NotificationTemplate>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());
  if (params?.event_type) queryParams.append("event_type", params.event_type);

  const url = `/api/v1/notifications/templates?${queryParams.toString()}`;
  const response =
    await apiClient.get<StandardListResponse<NotificationTemplate>>(url);
  return response.data;
}

/**
 * Get notification template by ID
 * @param templateId - Template ID
 * @returns Promise<StandardResponse<NotificationTemplate>>
 */
export async function getNotificationTemplate(
  templateId: string
): Promise<StandardResponse<NotificationTemplate>> {
  const response = await apiClient.get<StandardResponse<NotificationTemplate>>(
    `/api/v1/notifications/templates/${templateId}`
  );
  return response.data;
}

/**
 * Create notification template
 * @param data - Template creation data
 * @returns Promise<StandardResponse<NotificationTemplate>>
 */
export async function createNotificationTemplate(
  data: NotificationTemplateCreate
): Promise<StandardResponse<NotificationTemplate>> {
  const response = await apiClient.post<StandardResponse<NotificationTemplate>>(
    "/api/v1/notifications/templates",
    data
  );
  return response.data;
}

/**
 * Update notification template
 * @param templateId - Template ID
 * @param data - Template update data
 * @returns Promise<StandardResponse<NotificationTemplate>>
 */
export async function updateNotificationTemplate(
  templateId: string,
  data: NotificationTemplateUpdate
): Promise<StandardResponse<NotificationTemplate>> {
  const response = await apiClient.put<StandardResponse<NotificationTemplate>>(
    `/api/v1/notifications/templates/${templateId}`,
    data
  );
  return response.data;
}

/**
 * Delete notification template
 * @param templateId - Template ID
 * @returns Promise<void>
 */
export async function deleteNotificationTemplate(
  templateId: string
): Promise<void> {
  await apiClient.delete(`/api/v1/notifications/templates/${templateId}`);
}

/**
 * Notification Queue API
 */

/**
 * List notification queue entries
 * @param params - Query parameters
 * @returns Promise<StandardListResponse<NotificationQueue>>
 */
export async function listNotificationQueue(params?: {
  page?: number;
  page_size?: number;
  status?: string;
}): Promise<StandardListResponse<NotificationQueue>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());
  if (params?.status) queryParams.append("status", params.status);

  const url = `/api/v1/notifications/queue?${queryParams.toString()}`;
  const response =
    await apiClient.get<StandardListResponse<NotificationQueue>>(url);
  return response.data;
}

/**
 * Get notification queue entry by ID
 * @param queueId - Queue entry ID
 * @returns Promise<StandardResponse<NotificationQueue>>
 */
export async function getNotificationQueueEntry(
  queueId: string
): Promise<StandardResponse<NotificationQueue>> {
  const response = await apiClient.get<StandardResponse<NotificationQueue>>(
    `/api/v1/notifications/queue/${queueId}`
  );
  return response.data;
}

/**
 * Send notification manually
 * @param data - Notification send request
 * @returns Promise<StandardResponse<Array<Record<string, unknown>>>>
 */
export async function sendNotification(
  data: NotificationSendRequest
): Promise<StandardResponse<Array<Record<string, unknown>>>> {
  const response = await apiClient.post<
    StandardResponse<Array<Record<string, unknown>>>
  >("/api/v1/notifications/send", data);
  return response.data;
}

/**
 * Notification Channels Configuration API
 */

/**
 * Get notification channels configuration
 * @returns Promise<StandardResponse<NotificationChannels>>
 */
export async function getNotificationChannels(): Promise<
  StandardResponse<NotificationChannels>
> {
  const response = await apiClient.get<StandardResponse<NotificationChannels>>(
    "/api/v1/config/notifications/channels"
  );
  return response.data;
}

/**
 * Update SMTP channel configuration
 * @param data - SMTP configuration data
 * @returns Promise<StandardResponse<SMTPConfigRequest>>
 */
export async function updateSMTPConfig(
  data: SMTPConfigRequest
): Promise<StandardResponse<SMTPConfigRequest>> {
  const response = await apiClient.put<StandardResponse<SMTPConfigRequest>>(
    "/api/v1/config/notifications/channels/smtp",
    data
  );
  return response.data;
}

/**
 * Update SMS channel configuration
 * @param data - SMS configuration data
 * @returns Promise<StandardResponse<SMSConfigRequest>>
 */
export async function updateSMSConfig(
  data: SMSConfigRequest
): Promise<StandardResponse<SMSConfigRequest>> {
  const response = await apiClient.put<StandardResponse<SMSConfigRequest>>(
    "/api/v1/config/notifications/channels/sms",
    data
  );
  return response.data;
}

/**
 * Update webhook channel configuration
 * @param data - Webhook configuration data
 * @returns Promise<StandardResponse<WebhookConfigRequest>>
 */
export async function updateWebhookConfig(
  data: WebhookConfigRequest
): Promise<StandardResponse<WebhookConfigRequest>> {
  const response = await apiClient.put<StandardResponse<WebhookConfigRequest>>(
    "/api/v1/config/notifications/channels/webhook",
    data
  );
  return response.data;
}

/**
 * Test SMTP connection
 * @returns Promise<StandardResponse<{ success: boolean; message: string; details?: Record<string, unknown> }>>
 */
export async function testSMTPConnection(): Promise<
  StandardResponse<{
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  }>
> {
  const response = await apiClient.post<
    StandardResponse<{
      success: boolean;
      message: string;
      details?: Record<string, unknown>;
    }>
  >("/api/v1/config/notifications/channels/smtp/test");
  return response.data;
}

/**
 * Test webhook connection
 * @returns Promise<StandardResponse<{ success: boolean; message: string; details?: Record<string, unknown> }>>
 */
export async function testWebhookConnection(): Promise<
  StandardResponse<{
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  }>
> {
  const response = await apiClient.post<
    StandardResponse<{
      success: boolean;
      message: string;
      details?: Record<string, unknown>;
    }>
  >("/api/v1/config/notifications/channels/webhook/test");
  return response.data;
}

/**
 * Notification Statistics API
 */

/**
 * Get notification statistics
 * @returns Promise<StandardResponse<NotificationStats>>
 */
export async function getNotificationStats(): Promise<
  StandardResponse<NotificationStats>
> {
  const response = await apiClient.get<StandardResponse<NotificationStats>>(
    "/api/v1/notifications/stats"
  );
  return response.data;
}

/**
 * Notification Preferences API
 */

/**
 * List notification preferences
 * @param params - Query parameters
 * @returns Promise<StandardListResponse<NotificationPreferences>>
 */
export async function listNotificationPreferences(params?: {
  user_id?: string;
  event_type?: string;
  page?: number;
  page_size?: number;
}): Promise<StandardListResponse<NotificationPreferences>> {
  const queryParams = new URLSearchParams();
  if (params?.user_id) queryParams.append("user_id", params.user_id);
  if (params?.event_type) queryParams.append("event_type", params.event_type);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());

  const url = `/api/v1/notifications/preferences?${queryParams.toString()}`;
  const response =
    await apiClient.get<StandardListResponse<NotificationPreferences>>(url);
  return response.data;
}

/**
 * Get notification preferences by ID
 * @param preferenceId - Preference ID
 * @returns Promise<StandardResponse<NotificationPreferences>>
 */
export async function getNotificationPreferences(
  preferenceId: string
): Promise<StandardResponse<NotificationPreferences>> {
  const response = await apiClient.get<
    StandardResponse<NotificationPreferences>
  >(`/api/v1/notifications/preferences/${preferenceId}`);
  return response.data;
}

/**
 * Create notification preferences
 * @param data - Preferences creation data
 * @returns Promise<StandardResponse<NotificationPreferences>>
 */
export async function createNotificationPreferences(
  data: NotificationPreferencesCreate
): Promise<StandardResponse<NotificationPreferences>> {
  const response = await apiClient.post<
    StandardResponse<NotificationPreferences>
  >("/api/v1/notifications/preferences", data);
  return response.data;
}

/**
 * Update notification preferences
 * @param preferenceId - Preference ID
 * @param data - Preferences update data
 * @returns Promise<StandardResponse<NotificationPreferences>>
 */
export async function updateNotificationPreferences(
  preferenceId: string,
  data: NotificationPreferencesUpdate
): Promise<StandardResponse<NotificationPreferences>> {
  const response = await apiClient.put<
    StandardResponse<NotificationPreferences>
  >(`/api/v1/notifications/preferences/${preferenceId}`, data);
  return response.data;
}

/**
 * Delete notification preferences
 * @param preferenceId - Preference ID
 * @returns Promise<void>
 */
export async function deleteNotificationPreferences(
  preferenceId: string
): Promise<void> {
  await apiClient.delete(`/api/v1/notifications/preferences/${preferenceId}`);
}

/**
 * Notification Delivery Reports API
 */

/**
 * List notification delivery reports
 * @param params - Query parameters
 * @returns Promise<StandardListResponse<NotificationDeliveryReport>>
 */
export async function listNotificationDeliveryReports(params?: {
  notification_id?: string;
  channel?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<StandardListResponse<NotificationDeliveryReport>> {
  const queryParams = new URLSearchParams();
  if (params?.notification_id)
    queryParams.append("notification_id", params.notification_id);
  if (params?.channel) queryParams.append("channel", params.channel);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());

  const url = `/api/v1/notifications/delivery-reports?${queryParams.toString()}`;
  const response =
    await apiClient.get<StandardListResponse<NotificationDeliveryReport>>(url);
  return response.data;
}

/**
 * Notification Subscriptions API
 */

/**
 * List notification subscriptions
 * @param params - Query parameters
 * @returns Promise<StandardListResponse<NotificationSubscription>>
 */
export async function listNotificationSubscriptions(params?: {
  user_id?: string;
  event_type?: string;
  page?: number;
  page_size?: number;
}): Promise<StandardListResponse<NotificationSubscription>> {
  const queryParams = new URLSearchParams();
  if (params?.user_id) queryParams.append("user_id", params.user_id);
  if (params?.event_type) queryParams.append("event_type", params.event_type);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());

  const url = `/api/v1/notifications/subscriptions?${queryParams.toString()}`;
  const response =
    await apiClient.get<StandardListResponse<NotificationSubscription>>(url);
  return response.data;
}

/**
 * Create notification subscription
 * @param data - Subscription creation data
 * @returns Promise<StandardResponse<NotificationSubscription>>
 */
export async function createNotificationSubscription(
  data: Omit<
    NotificationSubscription,
    | "id"
    | "tenant_id"
    | "last_triggered"
    | "trigger_count"
    | "created_at"
    | "updated_at"
  >
): Promise<StandardResponse<NotificationSubscription>> {
  const response = await apiClient.post<
    StandardResponse<NotificationSubscription>
  >("/api/v1/notifications/subscriptions", data);
  return response.data;
}

/**
 * Update notification subscription
 * @param subscriptionId - Subscription ID
 * @param data - Subscription update data
 * @returns Promise<StandardResponse<NotificationSubscription>>
 */
export async function updateNotificationSubscription(
  subscriptionId: string,
  data: Partial<
    Pick<NotificationSubscription, "webhook_url" | "secret" | "is_active">
  >
): Promise<StandardResponse<NotificationSubscription>> {
  const response = await apiClient.put<
    StandardResponse<NotificationSubscription>
  >(`/api/v1/notifications/subscriptions/${subscriptionId}`, data);
  return response.data;
}

/**
 * Delete notification subscription
 * @param subscriptionId - Subscription ID
 * @returns Promise<void>
 */
export async function deleteNotificationSubscription(
  subscriptionId: string
): Promise<void> {
  await apiClient.delete(
    `/api/v1/notifications/subscriptions/${subscriptionId}`
  );
}

/**
 * Notification Event Types API
 */

/**
 * List notification event types
 * @returns Promise<StandardListResponse<NotificationEventType>>
 */
export async function listNotificationEventTypes(): Promise<
  StandardListResponse<NotificationEventType>
> {
  const response = await apiClient.get<
    StandardListResponse<NotificationEventType>
  >("/api/v1/notifications/event-types");
  return response.data;
}

/**
 * Get notification event type by ID
 * @param eventTypeId - Event type ID
 * @returns Promise<StandardResponse<NotificationEventType>>
 */
export async function getNotificationEventType(
  eventTypeId: string
): Promise<StandardResponse<NotificationEventType>> {
  const response = await apiClient.get<StandardResponse<NotificationEventType>>(
    `/api/v1/notifications/event-types/${eventTypeId}`
  );
  return response.data;
}

// Alias functions for backward compatibility
export const listTemplates = listNotificationTemplates;
export const getTemplate = getNotificationTemplate;
export const createTemplate = createNotificationTemplate;
export const updateTemplate = updateNotificationTemplate;
export const deleteTemplate = deleteNotificationTemplate;
