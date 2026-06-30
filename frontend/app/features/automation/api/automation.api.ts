/**
 * Automation API
 * API functions for Automation module
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  AutomationRule,
  AutomationRuleCreate,
  AutomationRuleUpdate,
  AutomationExecution,
  AutomationExecutionCreate,
  AutomationRuleListParams,
  AutomationStats,
  AutomationTestResult,
  AutomationTestRequest,
  AutomationOperationResult,
  NodeCatalogItem,
  WebhookSecretResponse,
  AvailableDigest,
  DigestSubscription,
  DigestSubscribePayload,
  AgentRunCreate,
  AgentRunRead,
  AgentRunDetailRead,
} from "../types/automation.types";

/**
 * Automation Rules API
 */

/**
 * List automation rules with pagination and filters
 * @param params - Query parameters for filtering and pagination
 * @returns Promise<StandardListResponse<AutomationRule>>
 */
export async function listAutomationRules(
  params?: AutomationRuleListParams
): Promise<StandardListResponse<AutomationRule>> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.page_size)
    searchParams.append("page_size", params.page_size.toString());
  if (params?.is_active !== undefined)
    searchParams.append("is_active", params.is_active.toString());
  if (params?.trigger_type)
    searchParams.append("trigger_type", params.trigger_type);
  if (params?.search) searchParams.append("search", params.search);

  const response = await apiClient.get<StandardListResponse<AutomationRule>>(
    `/api/v1/automation/rules?${searchParams.toString()}`
  );
  return response.data;
}

/**
 * Get a single automation rule by ID
 * @param id - Rule ID
 * @returns Promise<StandardResponse<AutomationRule>>
 */
export async function getAutomationRule(
  id: string
): Promise<StandardResponse<AutomationRule>> {
  const response = await apiClient.get<StandardResponse<AutomationRule>>(
    `/api/v1/automation/rules/${id}`
  );
  return response.data;
}

/**
 * Create a new automation rule
 * @param payload - Rule creation data
 * @returns Promise<StandardResponse<AutomationRule>>
 */
export async function createAutomationRule(
  payload: AutomationRuleCreate
): Promise<StandardResponse<AutomationRule>> {
  const response = await apiClient.post<StandardResponse<AutomationRule>>(
    "/api/v1/automation/rules",
    payload
  );
  return response.data;
}

/**
 * Update an existing automation rule
 * @param id - Rule ID
 * @param payload - Rule update data
 * @returns Promise<StandardResponse<AutomationRule>>
 */
export async function updateAutomationRule(
  id: string,
  payload: AutomationRuleUpdate
): Promise<StandardResponse<AutomationRule>> {
  const response = await apiClient.put<StandardResponse<AutomationRule>>(
    `/api/v1/automation/rules/${id}`,
    payload
  );
  return response.data;
}

/**
 * Delete an automation rule
 * @param id - Rule ID
 * @returns Promise<StandardResponse<void>>
 */
export async function deleteAutomationRule(
  id: string
): Promise<StandardResponse<void>> {
  const response = await apiClient.delete<StandardResponse<void>>(
    `/api/v1/automation/rules/${id}`
  );
  return response.data;
}

/**
 * Execute an automation rule
 * @param id - Rule ID
 * @param payload - Execution payload
 * @returns Promise<StandardResponse<AutomationExecution>>
 */
export async function executeAutomationRule(
  id: string,
  payload: AutomationExecutionCreate
): Promise<StandardResponse<AutomationExecution>> {
  const response = await apiClient.post<StandardResponse<AutomationExecution>>(
    `/api/v1/automation/rules/${id}/execute`,
    payload
  );
  return response.data;
}

/**
 * List executions for a rule
 * @param id - Rule ID
 * @param params - Query parameters for pagination
 * @returns Promise<StandardListResponse<AutomationExecution>>
 */
export async function listAutomationExecutions(
  id: string,
  params?: { page?: number; page_size?: number }
): Promise<StandardListResponse<AutomationExecution>> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.page_size)
    searchParams.append("page_size", params.page_size.toString());

  const response = await apiClient.get<
    StandardListResponse<AutomationExecution>
  >(`/api/v1/automation/rules/${id}/executions?${searchParams.toString()}`);
  return response.data;
}

/**
 * Get a single execution by ID
 * @param id - Execution ID
 * @returns Promise<StandardResponse<AutomationExecution>>
 */
export async function getAutomationExecution(
  id: string
): Promise<StandardResponse<AutomationExecution>> {
  const response = await apiClient.get<StandardResponse<AutomationExecution>>(
    `/api/v1/automation/executions/${id}`
  );
  return response.data;
}

/**
 * Test an automation rule with a synthetic event (dry run)
 * @param id - Rule ID
 * @param request - event_type and optional payload
 * @returns Promise<StandardResponse<AutomationTestResult>>
 */
export async function testAutomationRule(
  id: string,
  request: AutomationTestRequest
): Promise<StandardResponse<AutomationTestResult>> {
  const response = await apiClient.post<StandardResponse<AutomationTestResult>>(
    `/api/v1/automation/rules/${id}/test`,
    request
  );
  return response.data;
}

/**
 * Get automation statistics
 * @returns Promise<StandardResponse<AutomationStats>>
 */
export async function getAutomationStats(): Promise<
  StandardResponse<AutomationStats>
> {
  const response = await apiClient.get<StandardResponse<AutomationStats>>(
    "/api/v1/automation/stats"
  );
  return response.data;
}

/**
 * Enable an automation rule
 * @param id - Rule ID
 * @returns Promise<StandardResponse<AutomationRule>>
 */
export async function enableAutomationRule(
  id: string
): Promise<StandardResponse<AutomationRule>> {
  const response = await apiClient.post<StandardResponse<AutomationRule>>(
    `/api/v1/automation/rules/${id}/enable`
  );
  return response.data;
}

/**
 * Disable an automation rule
 * @param id - Rule ID
 * @returns Promise<StandardResponse<AutomationRule>>
 */
export async function disableAutomationRule(
  id: string
): Promise<StandardResponse<AutomationRule>> {
  const response = await apiClient.post<StandardResponse<AutomationRule>>(
    `/api/v1/automation/rules/${id}/disable`
  );
  return response.data;
}

/**
 * Clone an automation rule
 * @param id - Rule ID
 * @param payload - Cloned rule data
 * @returns Promise<StandardResponse<AutomationRule>>
 */
export async function cloneAutomationRule(
  id: string,
  payload: { name: string; description?: string }
): Promise<StandardResponse<AutomationRule>> {
  const response = await apiClient.post<StandardResponse<AutomationRule>>(
    `/api/v1/automation/rules/${id}/clone`,
    payload
  );
  return response.data;
}

/**
 * Get trigger node catalog (permission-filtered)
 */
export async function getTriggerTypes(): Promise<
  StandardResponse<NodeCatalogItem[]>
> {
  const response = await apiClient.get<StandardResponse<NodeCatalogItem[]>>(
    "/api/v1/automation/meta/triggers"
  );
  return response.data;
}

/**
 * Get action node catalog (permission-filtered)
 */
export async function getActionTypes(): Promise<
  StandardResponse<NodeCatalogItem[]>
> {
  const response = await apiClient.get<StandardResponse<NodeCatalogItem[]>>(
    "/api/v1/automation/meta/actions"
  );
  return response.data;
}

/**
 * Get data source node catalog (permission-filtered)
 */
export async function getDataSources(): Promise<
  StandardResponse<NodeCatalogItem[]>
> {
  const response = await apiClient.get<StandardResponse<NodeCatalogItem[]>>(
    "/api/v1/automation/meta/data-sources"
  );
  return response.data;
}

/**
 * Get available condition operators
 * @returns Promise<StandardResponse<Array<{ operator: string; description: string; value_types: string[] }>>>
 */
export async function getConditionOperators(): Promise<
  StandardResponse<
    Array<{ operator: string; description: string; value_types: string[] }>
  >
> {
  const response = await apiClient.get<
    StandardResponse<
      Array<{ operator: string; description: string; value_types: string[] }>
    >
  >("/api/v1/automation/condition-operators");
  return response.data;
}

/**
 * Validate automation rule configuration
 * @param payload - Rule configuration to validate
 * @returns Promise<StandardResponse<AutomationOperationResult>>
 */
export async function validateAutomationRule(
  payload: AutomationRuleCreate | AutomationRuleUpdate
): Promise<StandardResponse<AutomationOperationResult>> {
  const response = await apiClient.post<
    StandardResponse<AutomationOperationResult>
  >("/api/v1/automation/rules/validate", payload);
  return response.data;
}

/**
 * Generate or rotate the webhook secret for a rule.
 * Returns the plaintext secret once — user must save it immediately.
 * @param id - Rule ID
 * @returns Promise<StandardResponse<WebhookSecretResponse>>
 */
export async function generateWebhookSecret(
  id: string
): Promise<StandardResponse<WebhookSecretResponse>> {
  const response = await apiClient.post<StandardResponse<WebhookSecretResponse>>(
    `/api/v1/automation/rules/${id}/webhook-secret`
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// AI Analytics API
// ---------------------------------------------------------------------------

export interface CostPeriodEntry {
  date: string;
  cost_usd: number;
  token_count: number;
}

export interface CostByCapabilityEntry {
  capability: string;
  total_cost_usd: number;
  invocation_count: number;
  avg_latency_ms: number;
}

export interface CostByUserEntry {
  user_id: string;
  conversations: number;
  token_count: number;
  cost_usd: number;
}

export interface CostAnalyticsOut {
  period: { from: string; to: string; group_by: string };
  by_day: CostPeriodEntry[];
  by_capability: CostByCapabilityEntry[];
  by_user: CostByUserEntry[] | null;
}

export interface CapabilityMetricEntry {
  capability: string;
  invocation_count: number;
  avg_latency_ms: number;
  error_rate_pct: number;
}

export const aiAnalyticsApi = {
  getCostAnalytics: async (days: 7 | 30 | 90): Promise<CostAnalyticsOut> => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - days * 86_400_000).toISOString();
    const res = await apiClient.get<{ data: CostAnalyticsOut }>(
      "/api/v1/ai/analytics/cost",
      { params: { from, to, group_by: "day" } }
    );
    return res.data.data;
  },

  getCapabilityMetrics: async (): Promise<CapabilityMetricEntry[]> => {
    const res = await apiClient.get<{ data: CapabilityMetricEntry[] }>(
      "/api/v1/ai/analytics/capabilities"
    );
    return res.data.data;
  },
};

// ---------------------------------------------------------------------------
// Digest Subscriptions API
// ---------------------------------------------------------------------------

export const digestApi = {
  listAvailable: async (): Promise<AvailableDigest[]> => {
    const res = await apiClient.get<StandardListResponse<AvailableDigest>>(
      "/api/v1/ai/digests"
    );
    return res.data.data;
  },

  listSubscriptions: async (): Promise<DigestSubscription[]> => {
    const res = await apiClient.get<StandardListResponse<DigestSubscription>>(
      "/api/v1/ai/digests/subscriptions"
    );
    return res.data.data;
  },

  subscribe: async (
    payload: DigestSubscribePayload
  ): Promise<DigestSubscription> => {
    const res = await apiClient.post<StandardResponse<DigestSubscription>>(
      "/api/v1/ai/digests/subscriptions",
      payload
    );
    return res.data.data;
  },

  unsubscribe: async (id: string): Promise<DigestSubscription> => {
    const res = await apiClient.delete<StandardResponse<DigestSubscription>>(
      `/api/v1/ai/digests/subscriptions/${id}`
    );
    return res.data.data;
  },
};

// ---------------------------------------------------------------------------
// Agent Run API (P5-F01)
// ---------------------------------------------------------------------------

export const agentRunApi = {
  start: async (payload: AgentRunCreate): Promise<AgentRunRead> => {
    const res = await apiClient.post<StandardResponse<AgentRunRead>>(
      "/api/v1/ai/agent-runs",
      payload
    );
    return res.data.data;
  },

  list: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<StandardListResponse<AgentRunRead>> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());
    const res = await apiClient.get<StandardListResponse<AgentRunRead>>(
      `/api/v1/ai/agent-runs?${searchParams.toString()}`
    );
    return res.data;
  },

  getDetail: async (runId: string): Promise<StandardResponse<AgentRunDetailRead>> => {
    const res = await apiClient.get<StandardResponse<AgentRunDetailRead>>(
      `/api/v1/ai/agent-runs/${runId}`
    );
    return res.data;
  },

  cancel: async (runId: string): Promise<StandardResponse<AgentRunRead>> => {
    const res = await apiClient.delete<StandardResponse<AgentRunRead>>(
      `/api/v1/ai/agent-runs/${runId}`
    );
    return res.data;
  },

  confirm: async (runId: string): Promise<AgentRunRead> => {
    const res = await apiClient.post<StandardResponse<AgentRunRead>>(
      `/api/v1/ai/agent-runs/${runId}/confirm`
    );
    return res.data.data;
  },

  reject: async (runId: string, feedback: string): Promise<AgentRunRead> => {
    const res = await apiClient.post<StandardResponse<AgentRunRead>>(
      `/api/v1/ai/agent-runs/${runId}/reject`,
      { feedback }
    );
    return res.data.data;
  },
};
