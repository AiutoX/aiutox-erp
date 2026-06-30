/**
 * API services for notification endpoints
 */

import apiClient from "./client";
import type {
  StandardResponse,
  StandardListResponse,
} from "./types/common.types";

export interface NotificationTemplate {
  id: string;
  tenant_id: string;
  name: string;
  event_type: string;
  channel: string;
  subject: string | null;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationQueue {
  id: string;
  tenant_id: string;
  recipient_id: string;
  event_type: string;
  channel: string;
  template_id: string | null;
  data: Record<string, unknown> | null;
  status: "pending" | "sent" | "failed";
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface NotificationTemplateCreate {
  name: string;
  event_type: string;
  channel: string;
  subject?: string | null;
  body: string;
  is_active?: boolean;
}

export interface NotificationTemplateUpdate {
  name?: string;
  event_type?: string;
  channel?: string;
  subject?: string | null;
  body?: string;
  is_active?: boolean;
}

export interface NotificationSendRequest {
  event_type: string;
  recipient_id: string;
  channels: string[];
  data?: Record<string, unknown>;
}

/**
 * List notification templates
 * GET /api/v1/notifications/templates
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

  const response = await apiClient.get<
    StandardListResponse<NotificationTemplate>
  >(`/notifications/templates?${queryParams.toString()}`);
  return response.data;
}

/**
 * Get notification template by ID
 * GET /api/v1/notifications/templates/{template_id}
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
 * POST /api/v1/notifications/templates
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
 * PUT /api/v1/notifications/templates/{template_id}
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
 * DELETE /api/v1/notifications/templates/{template_id}
 */
export async function deleteNotificationTemplate(
  templateId: string
): Promise<void> {
  await apiClient.delete(`/notifications/templates/${templateId}`);
}

/**
 * List notification queue entries
 * GET /api/v1/notifications/queue
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

  const response = await apiClient.get<StandardListResponse<NotificationQueue>>(
    `/notifications/queue?${queryParams.toString()}`
  );
  return response.data;
}

/**
 * Get notification queue entry by ID
 * GET /api/v1/notifications/queue/{queue_id}
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
 * POST /api/v1/notifications/send
 */
export async function sendNotification(
  data: NotificationSendRequest
): Promise<StandardResponse<Array<Record<string, unknown>>>> {
  const response = await apiClient.post<
    StandardResponse<Array<Record<string, unknown>>>
  >("/notifications/send", data);
  return response.data;
}

// Alias functions for backward compatibility
export const listTemplates = listNotificationTemplates;
export const getTemplate = getNotificationTemplate;
export const createTemplate = createNotificationTemplate;
export const updateTemplate = updateNotificationTemplate;
export const deleteTemplate = deleteNotificationTemplate;

/**
 * Notification Channel Configuration Types
 */
export interface SMTPConfig extends Record<string, unknown> {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  password?: string | null;
  use_tls: boolean;
  from_email: string;
  from_name: string;
}

export interface SMSConfig extends Record<string, unknown> {
  enabled: boolean;
  provider: string;
  account_sid?: string | null;
  auth_token?: string | null;
  from_number?: string | null;
}

export interface WebhookConfig extends Record<string, unknown> {
  enabled: boolean;
  url: string;
  secret?: string | null;
  timeout: number;
}

export interface NotificationChannels {
  smtp: SMTPConfig;
  sms: SMSConfig;
  webhook: WebhookConfig;
}

export interface SMTPConfigRequest {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  password?: string | null;
  use_tls: boolean;
  from_email: string;
  from_name: string;
}

export interface SMSConfigRequest {
  enabled: boolean;
  provider: string;
  account_sid?: string | null;
  auth_token?: string | null;
  from_number?: string | null;
}

export interface WebhookConfigRequest {
  enabled: boolean;
  url: string;
  secret?: string | null;
  timeout: number;
}

/**
 * Get notification channels configuration
 * GET /api/v1/config/notifications/channels
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
 * PUT /api/v1/config/notifications/channels/smtp
 */
export async function updateSMTPConfig(
  data: SMTPConfigRequest
): Promise<StandardResponse<SMTPConfig>> {
  const response = await apiClient.put<StandardResponse<SMTPConfig>>(
    "/config/notifications/channels/smtp",
    data
  );
  return response.data;
}

/**
 * Update SMS channel configuration
 * PUT /api/v1/config/notifications/channels/sms
 */
export async function updateSMSConfig(
  data: SMSConfigRequest
): Promise<StandardResponse<SMSConfig>> {
  const response = await apiClient.put<StandardResponse<SMSConfig>>(
    "/config/notifications/channels/sms",
    data
  );
  return response.data;
}

/**
 * Update webhook channel configuration
 * PUT /api/v1/config/notifications/channels/webhook
 */
export async function updateWebhookConfig(
  data: WebhookConfigRequest
): Promise<StandardResponse<WebhookConfig>> {
  const response = await apiClient.put<StandardResponse<WebhookConfig>>(
    "/config/notifications/channels/webhook",
    data
  );
  return response.data;
}

/**
 * Test SMTP connection
 * POST /api/v1/config/notifications/channels/smtp/test
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
 * POST /api/v1/config/notifications/channels/webhook/test
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
