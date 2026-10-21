/**
 * API services for integration endpoints
 */

import apiClient from "./client";
import type {
  StandardResponse,
  StandardListResponse,
} from "./types/common.types";

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

/**
 * List all integrations
 * GET /api/v1/integrations
 */
export async function listIntegrations(
  type?: string
): Promise<StandardListResponse<Integration>> {
  const params = type ? `?type=${type}` : "";
  const response = await apiClient.get<StandardListResponse<Integration>>(
    `/integrations${params}`
  );
  return response.data;
}

/**
 * Get integration by ID
 * GET /api/v1/integrations/{integration_id}
 */
export async function getIntegration(
  integrationId: string
): Promise<StandardResponse<Integration>> {
  const response = await apiClient.get<StandardResponse<Integration>>(
    `/integrations/${integrationId}`
  );
  return response.data;
}

/**
 * Create integration
 * POST /api/v1/integrations
 */
export async function createIntegration(
  data: IntegrationCreate
): Promise<StandardResponse<Integration>> {
  const response = await apiClient.post<StandardResponse<Integration>>(
    "/integrations",
    data
  );
  return response.data;
}

/**
 * Update integration
 * PUT /api/v1/integrations/{integration_id}
 */
export async function updateIntegration(
  integrationId: string,
  data: IntegrationUpdate
): Promise<StandardResponse<Integration>> {
  const response = await apiClient.put<StandardResponse<Integration>>(
    `/integrations/${integrationId}`,
    data
  );
  return response.data;
}

/**
 * Activate integration
 * POST /api/v1/integrations/{integration_id}/activate
 */
export async function activateIntegration(
  integrationId: string,
  data: IntegrationActivateRequest
): Promise<StandardResponse<Integration>> {
  const response = await apiClient.post<StandardResponse<Integration>>(
    `/integrations/${integrationId}/activate`,
    data
  );
  return response.data;
}

/**
 * Deactivate integration
 * POST /api/v1/integrations/{integration_id}/deactivate
 */
export async function deactivateIntegration(
  integrationId: string
): Promise<StandardResponse<Integration>> {
  const response = await apiClient.post<StandardResponse<Integration>>(
    `/integrations/${integrationId}/deactivate`
  );
  return response.data;
}

/**
 * Delete integration
 * DELETE /api/v1/integrations/{integration_id}
 */
export async function deleteIntegration(
  integrationId: string
): Promise<StandardResponse<{ message: string }>> {
  const response = await apiClient.delete<
    StandardResponse<{ message: string }>
  >(`/integrations/${integrationId}`);
  return response.data;
}

/**
 * Test integration
 * POST /api/v1/integrations/{integration_id}/test
 */
export async function testIntegration(
  integrationId: string
): Promise<StandardResponse<IntegrationTestResponse>> {
  const response = await apiClient.post<
    StandardResponse<IntegrationTestResponse>
  >(`/integrations/${integrationId}/test`);
  return response.data;
}
