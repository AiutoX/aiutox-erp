/**
 * Notifications types
 * Type definitions for Notifications module
 */

import type { StandardListResponse } from "~/lib/api/types/common.types";

// Notification Template types
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

export interface NotificationChannelCatalogEntry {
  channel: string;
  available: boolean;
  requires_contact_method: boolean;
  method_types: string[];
}

export interface NotificationTemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  subject: string | null;
  body: string;
  changelog: string | null;
  is_current: boolean;
  created_at: string;
}

export interface NotificationTemplateRenderResult {
  subject: string | null;
  body: string;
}

// Notification Queue types
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

export interface NotificationSendRequest {
  event_type: string;
  recipient_id: string;
  channels: string[];
  data?: Record<string, unknown>;
}

// Notification Channel Configuration types
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

// List Responses
export type NotificationTemplateListResponse =
  StandardListResponse<NotificationTemplate>;
export type NotificationQueueListResponse =
  StandardListResponse<NotificationQueue>;
