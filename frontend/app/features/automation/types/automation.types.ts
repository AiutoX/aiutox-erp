/**
 * Automation types
 * Type definitions for Automation module
 */

import type { StandardListResponse } from "~/lib/api/types/common.types";

// Automation Rule entity
export interface AutomationRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

// Automation rule creation payload
export interface AutomationRuleCreate {
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  is_active?: boolean;
  priority?: number;
}

// Automation rule update payload
export interface AutomationRuleUpdate {
  name?: string;
  description?: string;
  trigger?: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions?: AutomationAction[];
  is_active?: boolean;
  priority?: number;
}

// Automation trigger schema
export interface AutomationTrigger {
  type: "event" | "schedule" | "manual" | "webhook";
  event_type?: string;
  entity_type?: string;
  schedule?: {
    type: "cron" | "interval";
    expression?: string;
    interval_seconds?: number;
    timezone?: string;
  };
  params?: Record<string, unknown>;
}

// Automation condition schema
export interface AutomationCondition {
  field: string;
  operator:
    | "eq"
    | "ne"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "nin"
    | "contains"
    | "not_contains";
  value: unknown;
  logical_operator?: "and" | "or";
}

// Automation action schema
export interface AutomationAction {
  type:
    | "send_notification"
    | "create_task"
    | "update_entity"
    | "send_webhook"
    | "publish_event";
  channel?: string;
  template?: string;
  recipients?: string[];
  entity_type?: string;
  entity_id?: string;
  data?: Record<string, unknown>;
  webhook_url?: string;
  event_type?: string;
  event_data?: Record<string, unknown>;
}

// Automation execution
export interface AutomationExecution {
  id: string;
  rule_id: string;
  trigger_data: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  result?: Record<string, unknown>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

// Automation execution payload
export interface AutomationExecutionCreate {
  rule_id: string;
  trigger_data?: Record<string, unknown>;
}

// Automation list parameters
export interface AutomationRuleListParams {
  page?: number;
  page_size?: number;
  is_active?: boolean;
  trigger_type?: string;
  search?: string;
}

// Automation list response
export type AutomationRuleListResponse = StandardListResponse<AutomationRule>;

// Automation execution list response
export type AutomationExecutionListResponse =
  StandardListResponse<AutomationExecution>;

// Automation statistics
export interface AutomationStats {
  total_rules: number;
  active_rules: number;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  pending_executions: number;
  executions_by_status: Record<string, number>;
  executions_by_day: Array<{
    date: string;
    count: number;
  }>;
  top_rules: Array<{
    rule_id: string;
    rule_name: string;
    execution_count: number;
    success_rate: number;
  }>;
}

// Rule test runner request (P3-E01)
export interface AutomationTestRequest {
  event_type: string;
  payload?: Record<string, unknown>;
}

// Rule test runner trace result (P3-E01)
export interface ConditionTraceResult {
  condition: Record<string, unknown>;
  passed: boolean;
}

export interface AutomationTestResult {
  is_test: boolean;
  conditions_passed: boolean;
  condition_results: ConditionTraceResult[];
  action_results: Record<string, unknown>[];
  error?: string;
}

// Automation validation errors
export interface AutomationValidationError {
  field: string;
  message: string;
  code: string;
}

// Automation operation result
export interface AutomationOperationResult {
  success: boolean;
  rule?: AutomationRule;
  execution?: AutomationExecution;
  errors?: AutomationValidationError[];
  warnings?: string[];
}

// Webhook secret generation response
export interface WebhookSecretResponse {
  webhook_url: string;
  secret: string;
}

// Node catalog item returned by /meta/triggers, /meta/actions, /meta/data-sources
export interface NodeCatalogItem {
  node_type: string;
  label: string;
  description: string;
  category: string;
  permission_required: string | null;
  available: boolean;
  config_schema: Record<string, unknown>;
  icon: string;
}

// Digest types (P4-S03)
export type DigestSchedule = "daily" | "weekly" | "monthly";
export type DigestChannel = "embedded_chat" | "telegram";

export interface AvailableDigest {
  qualified_name: string;
  module_name: string;
  description: string;
  capability_type: string;
  permission_required: string | null;
  metrics: Record<string, unknown> | null;
}

export interface DigestSubscription {
  id: string;
  tenant_id: string;
  user_id: string;
  digest_name: string;
  schedule: DigestSchedule;
  channels: DigestChannel[];
  params: Record<string, unknown>;
  is_active: boolean;
  next_fire_at: string | null;
  last_fired_at: string | null;
  created_at: string;
}

export interface DigestSubscribePayload {
  digest_name: string;
  schedule: DigestSchedule;
  channels: DigestChannel[];
}

// Agent run types (P5-F01)
export interface AgentPlanStep {
  step_index: number;
  capability: string;
  params: Record<string, unknown>;
  reason: string | null;
  requires_confirmation: boolean;
  status: string;
  result: Record<string, unknown> | null;
}

export interface AgentRunRead {
  id: string;
  status: string;
  goal: string;
  current_step: number;
  result_summary: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface AgentRunDetailRead extends AgentRunRead {
  plan_steps: AgentPlanStep[];
}

export interface AgentRunCreate {
  goal: string;
  context?: Record<string, unknown>;
}

export interface HitlRequest {
  runId: string;
  stepIndex: number;
  capability: string;
  params: Record<string, unknown>;
}
