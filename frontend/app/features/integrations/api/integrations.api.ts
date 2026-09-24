/**
 * Integrations API
 * API functions for Integrations module
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  Integration,
  IntegrationCreate,
  IntegrationUpdate,
  IntegrationActivateRequest,
  IntegrationTestResponse,
  IntegrationLog,
  IntegrationWebhook,
  IntegrationEvent,
  IntegrationStats,
  IntegrationHealth,
  IntegrationCredentials,
  IntegrationConfig,
} from "../types/integrations.types";

/**
 * Integrations API
 */

/**
 * List all integrations
 * @param type - Optional integration type filter
 * @returns Promise<StandardListResponse<Integration>>
 */
export async function listIntegrations(
  type?: string
): Promise<StandardListResponse<Integration>> {
  const params = type ? `?type=${type}` : "";
  const response = await apiClient.get<StandardListResponse<Integration>>(
    `/api/v1/integrations${params}`
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Get integration by ID
 * @param integrationId - Integration ID
 * @returns Promise<StandardResponse<Integration>>
 */
export async function getIntegration(
  integrationId: string
): Promise<StandardResponse<Integration>> {
  const response = await apiClient.get<StandardResponse<Integration>>(
    `/api/v1/integrations/${integrationId}`
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Create integration
 * @param data - Integration creation data
 * @returns Promise<StandardResponse<Integration>>
 */
export async function createIntegration(
  data: IntegrationCreate
): Promise<StandardResponse<Integration>> {
  const response = await apiClient.post<StandardResponse<Integration>>(
    "/api/v1/integrations",
    data
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Update integration
 * @param integrationId - Integration ID
 * @param data - Integration update data
 * @returns Promise<StandardResponse<Integration>>
 */
export async function updateIntegration(
  integrationId: string,
  data: IntegrationUpdate
): Promise<StandardResponse<Integration>> {
  const response = await apiClient.put<StandardResponse<Integration>>(
    `/api/v1/integrations/${integrationId}`,
    data
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Delete integration
 * @param integrationId - Integration ID
 * @returns Promise<StandardResponse<{ message: string }>>
 */
export async function deleteIntegration(
  integrationId: string
): Promise<StandardResponse<{ message: string }>> {
  const response = await apiClient.delete<
    StandardResponse<{ message: string }>
  >(`/api/v1/integrations/${integrationId}`);
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Activate integration
 * @param integrationId - Integration ID
 * @param data - Activation request data
 * @returns Promise<StandardResponse<Integration>>
 */
export async function activateIntegration(
  integrationId: string,
  data: IntegrationActivateRequest
): Promise<StandardResponse<Integration>> {
  const response = await apiClient.post<StandardResponse<Integration>>(
    `/api/v1/integrations/${integrationId}/activate`,
    data
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Deactivate integration
 * @param integrationId - Integration ID
 * @returns Promise<StandardResponse<Integration>>
 */
export async function deactivateIntegration(
  integrationId: string
): Promise<StandardResponse<Integration>> {
  const response = await apiClient.post<StandardResponse<Integration>>(
    `/api/v1/integrations/${integrationId}/deactivate`
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Test integration
 * @param integrationId - Integration ID
 * @returns Promise<StandardResponse<IntegrationTestResponse>>
 */
export async function testIntegration(
  integrationId: string
): Promise<StandardResponse<IntegrationTestResponse>> {
  const response = await apiClient.post<
    StandardResponse<IntegrationTestResponse>
  >(`/api/v1/integrations/${integrationId}/test`);
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Get integration statistics
 * @returns Promise<StandardResponse<IntegrationStats>>
 */
export async function getIntegrationStats(): Promise<
  StandardResponse<IntegrationStats>
> {
  const response = await apiClient.get<StandardResponse<IntegrationStats>>(
    "/api/v1/integrations/stats"
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Get integration logs
 * @param integrationId - Integration ID
 * @param params - Query parameters
 * @returns Promise<StandardListResponse<IntegrationLog>>
 */
export async function getIntegrationLogs(
  integrationId: string,
  params?: {
    level?: string;
    limit?: number;
    offset?: number;
  }
): Promise<StandardListResponse<IntegrationLog>> {
  const queryParams = new URLSearchParams();
  if (params?.level) queryParams.append("level", params.level);
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.offset) queryParams.append("offset", params.offset.toString());

  const url = `/api/v1/integrations/${integrationId}/logs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response =
    await apiClient.get<StandardListResponse<IntegrationLog>>(url);
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Get integration webhooks
 * @param integrationId - Integration ID
 * @returns Promise<StandardListResponse<IntegrationWebhook>>
 */
export async function getIntegrationWebhooks(
  integrationId: string
): Promise<StandardListResponse<IntegrationWebhook>> {
  const response = await apiClient.get<
    StandardListResponse<IntegrationWebhook>
  >(`/api/v1/integrations/${integrationId}/webhooks`);
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Create integration webhook
 * @param integrationId - Integration ID
 * @param data - Webhook creation data
 * @returns Promise<StandardResponse<IntegrationWebhook>>
 */
export async function createIntegrationWebhook(
  integrationId: string,
  data: Omit<
    IntegrationWebhook,
    "id" | "integration_id" | "trigger_count" | "created_at" | "updated_at"
  >
): Promise<StandardResponse<IntegrationWebhook>> {
  const response = await apiClient.post<StandardResponse<IntegrationWebhook>>(
    `/api/v1/integrations/${integrationId}/webhooks`,
    data
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Update integration webhook
 * @param integrationId - Integration ID
 * @param webhookId - Webhook ID
 * @param data - Webhook update data
 * @returns Promise<StandardResponse<IntegrationWebhook>>
 */
export async function updateIntegrationWebhook(
  integrationId: string,
  webhookId: string,
  data: Partial<
    Pick<IntegrationWebhook, "event_type" | "url" | "secret" | "active">
  >
): Promise<StandardResponse<IntegrationWebhook>> {
  const response = await apiClient.put<StandardResponse<IntegrationWebhook>>(
    `/api/v1/integrations/${integrationId}/webhooks/${webhookId}`,
    data
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Delete integration webhook
 * @param integrationId - Integration ID
 * @param webhookId - Webhook ID
 * @returns Promise<StandardResponse<{ message: string }>>
 */
export async function deleteIntegrationWebhook(
  integrationId: string,
  webhookId: string
): Promise<StandardResponse<{ message: string }>> {
  const response = await apiClient.delete<
    StandardResponse<{ message: string }>
  >(`/api/v1/integrations/${integrationId}/webhooks/${webhookId}`);
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Get integration events
 * @param integrationId - Integration ID
 * @param params - Query parameters
 * @returns Promise<StandardListResponse<IntegrationEvent>>
 */
export async function getIntegrationEvents(
  integrationId: string,
  params?: {
    event_type?: string;
    processed?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<StandardListResponse<IntegrationEvent>> {
  const queryParams = new URLSearchParams();
  if (params?.event_type) queryParams.append("event_type", params.event_type);
  if (params?.processed !== undefined)
    queryParams.append("processed", params.processed.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.offset) queryParams.append("offset", params.offset.toString());

  const url = `/api/v1/integrations/${integrationId}/events${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response =
    await apiClient.get<StandardListResponse<IntegrationEvent>>(url);
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Get integration health
 * @param integrationId - Integration ID
 * @returns Promise<StandardResponse<IntegrationHealth>>
 */
export async function getIntegrationHealth(
  integrationId: string
): Promise<StandardResponse<IntegrationHealth>> {
  const response = await apiClient.get<StandardResponse<IntegrationHealth>>(
    `/api/v1/integrations/${integrationId}/health`
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Get integration credentials
 * @param integrationId - Integration ID
 * @returns Promise<StandardListResponse<IntegrationCredentials>>
 */
export async function getIntegrationCredentials(
  integrationId: string
): Promise<StandardListResponse<IntegrationCredentials>> {
  const response = await apiClient.get<
    StandardListResponse<IntegrationCredentials>
  >(`/api/v1/integrations/${integrationId}/credentials`);
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Update integration credentials
 * @param integrationId - Integration ID
 * @param credentialId - Credential ID
 * @param data - Credential update data
 * @returns Promise<StandardResponse<IntegrationCredentials>>
 */
export async function updateIntegrationCredentials(
  integrationId: string,
  credentialId: string,
  data: Partial<
    Pick<IntegrationCredentials, "name" | "encrypted_data" | "expires_at">
  >
): Promise<StandardResponse<IntegrationCredentials>> {
  const response = await apiClient.put<
    StandardResponse<IntegrationCredentials>
  >(`/api/v1/integrations/${integrationId}/credentials/${credentialId}`, data);
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Get integration configuration
 * @param integrationId - Integration ID
 * @returns Promise<StandardListResponse<IntegrationConfig>>
 */
export async function getIntegrationConfig(
  integrationId: string
): Promise<StandardListResponse<IntegrationConfig>> {
  const response = await apiClient.get<StandardListResponse<IntegrationConfig>>(
    `/api/v1/integrations/${integrationId}/config`
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Update integration configuration
 * @param integrationId - Integration ID
 * @param configId - Configuration ID
 * @param data - Configuration update data
 * @returns Promise<StandardResponse<IntegrationConfig>>
 */
export async function updateIntegrationConfig(
  integrationId: string,
  configId: string,
  data: Partial<Pick<IntegrationConfig, "value" | "description">>
): Promise<StandardResponse<IntegrationConfig>> {
  const response = await apiClient.put<StandardResponse<IntegrationConfig>>(
    `/api/v1/integrations/${integrationId}/config/${configId}`,
    data
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Get available integration types
 * @returns Promise<StandardResponse<string[]>>
 */
export async function getAvailableIntegrationTypes(): Promise<
  StandardResponse<string[]>
> {
  const response = await apiClient.get<StandardResponse<string[]>>(
    "/api/v1/integrations/types"
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}

/**
 * Sync integration
 * @param integrationId - Integration ID
 * @returns Promise<StandardResponse<Integration>>
 */
export async function syncIntegration(
  integrationId: string
): Promise<StandardResponse<Integration>> {
  const response = await apiClient.post<StandardResponse<Integration>>(
    `/api/v1/integrations/${integrationId}/sync`
  );
  if (!response.data) {
    throw new Error("API response is empty");
  }
  return response.data;
}
