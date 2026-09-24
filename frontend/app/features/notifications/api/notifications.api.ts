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
  NotificationTemplateVersion,
  NotificationTemplateRenderResult,
  NotificationChannelCatalogEntry,
  NotificationQueue,
  NotificationSendRequest,
  NotificationChannels,
  SMTPConfigRequest,
  SMSConfigRequest,
  WebhookConfigRequest,
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
  channel?: string;
  is_active?: boolean;
  q?: string;
}): Promise<StandardListResponse<NotificationTemplate>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());
  if (params?.event_type) queryParams.append("event_type", params.event_type);
  if (params?.channel) queryParams.append("channel", params.channel);
  if (params?.is_active !== undefined)
    queryParams.append("is_active", params.is_active.toString());
  if (params?.q) queryParams.append("q", params.q);

  const url = `/notifications/templates?${queryParams.toString()}`;
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
    `/notifications/templates/${templateId}`
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
    "/notifications/templates",
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
    `/notifications/templates/${templateId}`,
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
  await apiClient.delete(`/notifications/templates/${templateId}`);
}

/**
 * List version history for a notification template
 * @param templateId - Template ID
 * @returns Promise<StandardListResponse<NotificationTemplateVersion>>
 */
export async function listNotificationTemplateVersions(
  templateId: string
): Promise<StandardListResponse<NotificationTemplateVersion>> {
  const response = await apiClient.get<
    StandardListResponse<NotificationTemplateVersion>
  >(`/notifications/templates/${templateId}/versions`);
  return response.data;
}

/**
 * List notification channels with per-tenant availability
 * @returns Promise<StandardListResponse<NotificationChannelCatalogEntry>>
 */
export async function getNotificationChannelsCatalog(): Promise<
  StandardListResponse<NotificationChannelCatalogEntry>
> {
  const response = await apiClient.get<
    StandardListResponse<NotificationChannelCatalogEntry>
  >("/notifications/channels-catalog");
  return response.data;
}

/**
 * Render a notification template with a variable context
 * @param templateId - Template ID
 * @param context - Variables to substitute into the template
 * @returns Promise<StandardResponse<NotificationTemplateRenderResult>>
 */
export async function renderNotificationTemplate(
  templateId: string,
  context: Record<string, unknown>
): Promise<StandardResponse<NotificationTemplateRenderResult>> {
  const response = await apiClient.post<
    StandardResponse<NotificationTemplateRenderResult>
  >(`/notifications/templates/${templateId}/render`, { context });
  return response.data;
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

  const url = `/notifications/queue?${queryParams.toString()}`;
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
    `/notifications/queue/${queueId}`
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
  >("/notifications/send", data);
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
    "/config/notifications/channels"
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
    "/config/notifications/channels/smtp",
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
    "/config/notifications/channels/sms",
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
    "/config/notifications/channels/webhook",
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
  >("/config/notifications/channels/smtp/test");
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
  >("/config/notifications/channels/webhook/test");
  return response.data;
}

// Alias functions for backward compatibility
export const listTemplates = listNotificationTemplates;
export const getTemplate = getNotificationTemplate;
export const createTemplate = createNotificationTemplate;
export const updateTemplate = updateNotificationTemplate;
export const deleteTemplate = deleteNotificationTemplate;
