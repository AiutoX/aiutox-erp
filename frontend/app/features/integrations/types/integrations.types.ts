/**
 * Integrations types
 * Type definitions for Integrations module
 */

import type { StandardListResponse } from "~/lib/api/types/common.types";

// Integration types
export interface Integration {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  status: "active" | "inactive" | "error" | "pending";
  config: Record<string, unknown>;
  last_sync_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationCreate {
  name: string;
  type: string;
  config: Record<string, unknown>;
}

export interface IntegrationUpdate {
  name?: string;
  config?: Record<string, unknown>;
  status?: string;
}

export interface IntegrationActivateRequest {
  config: Record<string, unknown>;
}

export interface IntegrationTestResponse {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// Integration Types
export type IntegrationType =
  | "stripe"
  | "twilio"
  | "google-calendar"
  | "slack"
  | "zapier"
  | "webhook";

export interface IntegrationTypeInfo {
  id: IntegrationType;
  name: string;
  description: string;
  category:
    | "payment"
    | "communication"
    | "calendar"
    | "productivity"
    | "automation"
    | "webhook";
  icon: string;
  fields: IntegrationField[];
}

export interface IntegrationField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "email" | "number" | "boolean" | "select";
  required: boolean;
  placeholder?: string;
  options?: string[];
  description?: string;
}

// Integration Statistics
export interface IntegrationStats {
  total_integrations: number;
  active_integrations: number;
  inactive_integrations: number;
  error_integrations: number;
  pending_integrations: number;
  most_used_types: Array<{
    type: string;
    count: number;
  }>;
  recent_activity: Array<{
    integration_id: string;
    integration_name: string;
    action: "created" | "activated" | "deactivated" | "tested" | "error";
    timestamp: string;
  }>;
}

// Integration Logs
export interface IntegrationLog {
  id: string;
  integration_id: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  user_id?: string;
}

// Integration Webhooks
export interface IntegrationWebhook {
  id: string;
  integration_id: string;
  event_type: string;
  url: string;
  secret?: string;
  active: boolean;
  last_triggered?: string;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

// Integration Credentials
export interface IntegrationCredentials {
  id: string;
  integration_id: string;
  name: string;
  type: "api_key" | "oauth" | "basic_auth" | "custom";
  encrypted_data: Record<string, unknown>;
  expires_at?: string;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

// Integration Configuration
export interface IntegrationConfig {
  id: string;
  integration_id: string;
  key: string;
  value: unknown;
  type: "string" | "number" | "boolean" | "json" | "encrypted";
  description?: string;
  created_at: string;
  updated_at: string;
}

// Integration Health
export interface IntegrationHealth {
  integration_id: string;
  status: "healthy" | "warning" | "error" | "unknown";
  last_check: string;
  response_time_ms?: number;
  error_rate?: number;
  uptime_percentage?: number;
  details?: Record<string, unknown>;
}

// Integration Events
export interface IntegrationEvent {
  id: string;
  integration_id: string;
  event_type: string;
  data: Record<string, unknown>;
  processed: boolean;
  processed_at?: string;
  error_message?: string;
  created_at: string;
}

// List Responses
export type IntegrationListResponse = StandardListResponse<Integration>;
export type IntegrationLogListResponse = StandardListResponse<IntegrationLog>;
export type IntegrationWebhookListResponse =
  StandardListResponse<IntegrationWebhook>;
export type IntegrationEventListResponse =
  StandardListResponse<IntegrationEvent>;
