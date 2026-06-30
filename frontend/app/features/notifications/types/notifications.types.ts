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

// Notification Statistics
export interface NotificationStats {
  total_templates: number;
  active_templates: number;
  total_queue_entries: number;
  pending_entries: number;
  sent_entries: number;
  failed_entries: number;
  most_used_channels: Array<{
    channel: string;
    count: number;
  }>;
  most_used_events: Array<{
    event_type: string;
    count: number;
  }>;
  recent_activity: Array<{
    template_id: string;
    template_name: string;
    action: "created" | "updated" | "deleted" | "sent" | "failed";
    timestamp: string;
  }>;
}

// Notification Preferences
export interface NotificationPreferences {
  id: string;
  tenant_id: string;
  user_id: string;
  event_type: string;
  channels: string[];
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferencesCreate {
  user_id: string;
  event_type: string;
  channels: string[];
  is_enabled?: boolean;
}

export interface NotificationPreferencesUpdate {
  channels?: string[];
  is_enabled?: boolean;
}

// Notification Delivery Report
export interface NotificationDeliveryReport {
  id: string;
  notification_id: string;
  channel: string;
  recipient_id: string;
  status: "sent" | "delivered" | "failed" | "bounced";
  delivered_at: string | null;
  error_message: string | null;
  response_data: Record<string, unknown> | null;
  created_at: string;
}

// Notification Subscription
export interface NotificationSubscription {
  id: string;
  tenant_id: string;
  user_id: string;
  event_type: string;
  webhook_url: string;
  secret: string | null;
  is_active: boolean;
  last_triggered: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

// Notification Event Types
export interface NotificationEventType {
  id: string;
  name: string;
  description: string;
  category: string;
  default_channels: string[];
  required_data: Array<{
    key: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}

// List Responses
export type NotificationTemplateListResponse =
  StandardListResponse<NotificationTemplate>;
export type NotificationQueueListResponse =
  StandardListResponse<NotificationQueue>;
export type NotificationPreferencesListResponse =
  StandardListResponse<NotificationPreferences>;
export type NotificationDeliveryReportListResponse =
  StandardListResponse<NotificationDeliveryReport>;
export type NotificationSubscriptionListResponse =
  StandardListResponse<NotificationSubscription>;
export type NotificationEventTypeListResponse =
  StandardListResponse<NotificationEventType>;
