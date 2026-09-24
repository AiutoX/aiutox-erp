/**
 * API services for module management endpoints
 *
 * Handles module discovery and metadata retrieval from backend
 */

import apiClient from "./client";
import type {
  StandardResponse,
  StandardListResponse,
} from "./types/common.types";
import type { ModuleListItem, ModuleInfoResponse } from "../modules/types";

/**
 * Get list of all available modules
 * GET /api/v1/config/modules
 *
 * Requires: config.view permission
 */
export async function getModules(): Promise<
  StandardListResponse<ModuleListItem>
> {
  const response =
    await apiClient.get<StandardListResponse<ModuleListItem>>(
      "/config/modules"
    );
  return response.data;
}

/**
 * Get detailed information about a specific module
 * GET /api/v1/config/modules/{module_id}
 *
 * Requires: config.view permission
 *
 * @param moduleId - Module identifier (e.g., 'products', 'auth')
 */
export async function getModuleMetadata(
  moduleId: string
): Promise<StandardResponse<ModuleInfoResponse>> {
  const response = await apiClient.get<StandardResponse<ModuleInfoResponse>>(
    `/config/modules/${moduleId}`
  );
  return response.data;
}

/**
 * Get module permissions for a specific module
 * GET /api/v1/auth/permissions?module_id={module_id}&tenant_id={tenant_id}
 *
 * @param moduleId - Module identifier (optional)
 * @param tenantId - Tenant ID (optional, for filtering)
 */
export async function getModulePermissions(
  moduleId?: string,
  tenantId?: string
): Promise<StandardListResponse<unknown>> {
  const params = new URLSearchParams();
  if (moduleId) {
    params.append("module_id", moduleId);
  }
  if (tenantId) {
    params.append("tenant_id", tenantId);
  }

  const queryString = params.toString();
  const url = `/auth/permissions${queryString ? `?${queryString}` : ""}`;

  const response = await apiClient.get<StandardListResponse<unknown>>(url);
  return response.data;
}

/**
 * Get all permissions grouped by module
 * GET /api/v1/auth/permissions
 *
 * @param tenantId - Tenant ID (optional, for filtering)
 */
export async function getAllPermissions(
  tenantId?: string
): Promise<StandardListResponse<unknown>> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append("tenant_id", tenantId);
  }

  const queryString = params.toString();
  const url = `/auth/permissions${queryString ? `?${queryString}` : ""}`;

  const response = await apiClient.get<StandardListResponse<unknown>>(url);
  return response.data;
}

/**
 * Get user permissions for a specific module
 * GET /api/v1/auth/modules/{module}/permissions/{user_id}
 *
 * @param moduleId - Module identifier
 * @param userId - User ID
 * @param tenantId - Tenant ID (optional)
 */
export async function getUserModulePermissions(
  moduleId: string,
  userId: string,
  tenantId?: string
): Promise<StandardResponse<unknown>> {
  const params = new URLSearchParams();
  if (tenantId) {
    params.append("tenant_id", tenantId);
  }

  const queryString = params.toString();
  const url = `/auth/modules/${moduleId}/permissions/${userId}${
    queryString ? `?${queryString}` : ""
  }`;

  const response = await apiClient.get<StandardResponse<unknown>>(url);
  return response.data;
}

/**
 * Enable a module for the current tenant
 * PUT /api/v1/config/modules/{module_id}/enable
 *
 * Requires: config.edit permission
 *
 * @param moduleId - Module identifier
 */
export async function enableModule(
  moduleId: string
): Promise<
  StandardResponse<{ module_id: string; enabled: boolean; message: string }>
> {
  const response = await apiClient.put<
    StandardResponse<{ module_id: string; enabled: boolean; message: string }>
  >(`/config/modules/${moduleId}/enable`);
  return response.data;
}

/**
 * Get all configuration values for a module
 * GET /api/v1/config/{module_id}
 */
export async function getModuleConfig(
  moduleId: string
): Promise<
  StandardResponse<{ module: string; config: Record<string, unknown> }>
> {
  const response = await apiClient.get<
    StandardResponse<{ module: string; config: Record<string, unknown> }>
  >(`/config/${moduleId}`);
  return response.data;
}

/**
 * Save configuration values for a module
 * POST /api/v1/config/{module_id}
 */
export async function saveModuleConfig(
  moduleId: string,
  config: Record<string, unknown>
): Promise<
  StandardResponse<{ module: string; config: Record<string, unknown> }>
> {
  const response = await apiClient.post<
    StandardResponse<{ module: string; config: Record<string, unknown> }>
  >(`/config/${moduleId}`, config);
  return response.data;
}

/**
 * Disable a module for the current tenant
 * PUT /api/v1/config/modules/{module_id}/disable
 *
 * Requires: config.edit permission
 *
 * @param moduleId - Module identifier
 */
export async function disableModule(
  moduleId: string
): Promise<
  StandardResponse<{ module_id: string; enabled: boolean; message: string }>
> {
  const response = await apiClient.put<
    StandardResponse<{ module_id: string; enabled: boolean; message: string }>
  >(`/config/modules/${moduleId}/disable`);
  return response.data;
}
