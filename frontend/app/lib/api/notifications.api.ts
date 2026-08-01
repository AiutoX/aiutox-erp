/**
 * API services for notification channel configuration endpoints.
 *
 * Template CRUD lives in ~/features/notifications/api/notifications.api.ts
 * (consumed by TemplateManager) — this file only covers SMTP/SMS/webhook
 * channel config, which config.notifications.tsx owns.
 */

import apiClient from "./client";
import type { StandardResponse } from "./types/common.types";

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
 * Send a real test email via the configured SMTP channel
 * POST /api/v1/config/notifications/channels/smtp/test-email
 */
export async function sendSMTPTestEmail(
  email: string
): Promise<
  StandardResponse<{
    success: boolean;
    recipient: string;
  }>
> {
  const response = await apiClient.post<
    StandardResponse<{
      success: boolean;
      recipient: string;
    }>
  >("/config/notifications/channels/smtp/test-email", { email });
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
