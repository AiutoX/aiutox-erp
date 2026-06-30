/**
 * API services for permissions management
 *
 * Handles permissions listing, delegation, and revocation
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  Permission,
  PermissionGroup,
  PermissionDelegation,
} from "../types/user.types";

/**
 * Delegated permission response (from backend)
 */
export interface DelegatedPermissionResponse {
  id: string;
  user_id: string;
  granted_by: string;
  module: string;
  permission: string;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
  is_active: boolean;
}

/**
 * Delegated permission list response
 */
export interface DelegatedPermissionListResponse {
  permissions: DelegatedPermissionResponse[];
  total: number;
}

/**
 * Revoke permission response
 */
export interface RevokePermissionResponse {
  message: string;
  revoked_count: number;
}

/**
 * List all available permissions
 * GET /api/v1/auth/permissions
 *
 * @param moduleId - Optional module ID to filter by
 * @param tenantId - Optional tenant ID to filter by
 */
export async function listPermissions(
  moduleId?: string,
  tenantId?: string
): Promise<StandardListResponse<Permission>> {
  const params = new URLSearchParams();
  if (moduleId) {
    params.append("module_id", moduleId);
  }
  if (tenantId) {
    params.append("tenant_id", tenantId);
  }

  const queryString = params.toString();
  const url = `/auth/permissions${queryString ? `?${queryString}` : ""}`;

  const response = await apiClient.get<StandardListResponse<Permission>>(url);
  return response.data;
}

/**
 * Get permissions grouped by module
 *
 * This is a helper function that groups permissions by module.
 * Uses listPermissions() and groups the results.
 */
export async function getPermissionsByModule(
  tenantId?: string
): Promise<PermissionGroup[]> {
  const response = await listPermissions(undefined, tenantId);
  const permissions = response.data;

  // Group by module
  const groupsMap = new Map<string, PermissionGroup>();

  for (const permission of permissions) {
    // Extract module from permission string (e.g., "inventory.view" -> "inventory")
    const moduleId = permission.permission.split(".")[0] || "unknown";
    const moduleName = moduleId.charAt(0).toUpperCase() + moduleId.slice(1);

    if (!groupsMap.has(moduleId)) {
      groupsMap.set(moduleId, {
        module_id: moduleId,
        module_name: moduleName,
        permissions: [],
      });
    }

    const group = groupsMap.get(moduleId)!;
    group.permissions.push(permission);
  }

  return Array.from(groupsMap.values());
}

/**
 * Get user permissions
 *
 * Gets all permissions for a user including:
 * - Permissions from global roles
 * - Permissions from module roles
 * - Delegated permissions
 *
 * Note: This may need to be implemented as a composite endpoint
 * or by calling multiple endpoints and combining results.
 */
export async function getUserPermissions(userId: string): Promise<
  StandardResponse<{
    global_role_permissions: string[];
    module_role_permissions: Record<string, string[]>;
    delegated_permissions: DelegatedPermissionResponse[];
    effective_permissions: string[];
  }>
> {
  // This endpoint may need to be created in the backend
  // For now, we'll construct it from available endpoints
  const response = await apiClient.get<
    StandardResponse<{
      global_role_permissions: string[];
      module_role_permissions: Record<string, string[]>;
      delegated_permissions: DelegatedPermissionResponse[];
      effective_permissions: string[];
    }>
  >(`/auth/users/${userId}/permissions`);
  return response.data;
}

/**
 * Get user module permissions
 * GET /api/v1/auth/modules/{module}/permissions/{user_id}
 */
export async function getUserModulePermissions(
  moduleId: string,
  userId: string
): Promise<DelegatedPermissionListResponse> {
  const response = await apiClient.get<DelegatedPermissionListResponse>(
    `/auth/modules/${moduleId}/permissions/${userId}`
  );
  return response.data;
}

/**
 * Delegate permission to user
 * POST /api/v1/auth/modules/{module}/permissions
 *
 * Requires: {module}.manage_users permission
 */
export async function delegatePermission(
  moduleId: string,
  data: PermissionDelegation
): Promise<StandardResponse<DelegatedPermissionResponse>> {
  const response = await apiClient.post<
    StandardResponse<DelegatedPermissionResponse>
  >(`/auth/modules/${moduleId}/permissions`, data);
  return response.data;
}

/**
 * Revoke delegated permission
 * DELETE /api/v1/auth/modules/{module}/permissions/{permission_id}
 *
 * Requires: Be the granter OR have auth.manage_users
 */
export async function revokePermission(
  moduleId: string,
  permissionId: string
): Promise<StandardResponse<RevokePermissionResponse>> {
  const response = await apiClient.delete<
    StandardResponse<RevokePermissionResponse>
  >(`/auth/modules/${moduleId}/permissions/${permissionId}`);
  return response.data;
}

/**
 * Revoke all delegated permissions of a user
 * DELETE /api/v1/auth/users/{user_id}/permissions
 *
 * Requires: auth.manage_users or owner/admin role
 */
export async function revokeAllUserPermissions(
  userId: string
): Promise<StandardResponse<RevokePermissionResponse>> {
  const response = await apiClient.delete<
    StandardResponse<RevokePermissionResponse>
  >(`/auth/users/${userId}/permissions`);
  return response.data;
}

/**
 * Revoke a specific delegated permission (admin override)
 * DELETE /api/v1/auth/users/{user_id}/permissions/{permission_id}
 *
 * Requires: auth.manage_users or owner/admin role
 */
export async function revokeUserPermission(
  userId: string,
  permissionId: string
): Promise<StandardResponse<RevokePermissionResponse>> {
  const response = await apiClient.delete<
    StandardResponse<RevokePermissionResponse>
  >(`/auth/users/${userId}/permissions/${permissionId}`);
  return response.data;
}

/**
 * List all available permissions grouped by module
 * GET /api/v1/auth/permissions/all
 */
export async function listAllPermissions(): Promise<
  StandardResponse<{
    groups: Array<{ module: string; permissions: string[] }>;
    total: number;
  }>
> {
  const response = await apiClient.get<
    StandardResponse<{
      groups: Array<{ module: string; permissions: string[] }>;
      total: number;
    }>
  >("/auth/permissions/all");
  return response.data;
}

/**
 * Get effective permissions for a user
 * GET /api/v1/auth/users/{user_id}/permissions/effective
 */
export async function getUserEffectivePermissions(userId: string): Promise<
  StandardResponse<{
    user_id: string;
    global_roles: string[];
    module_roles: Array<{ module: string; role: string }>;
    delegated_permissions: string[];
    effective_permissions: string[];
  }>
> {
  const response = await apiClient.get<
    StandardResponse<{
      user_id: string;
      global_roles: string[];
      module_roles: Array<{ module: string; role: string }>;
      delegated_permissions: string[];
      effective_permissions: string[];
    }>
  >(`/auth/users/${userId}/permissions/effective`);
  return response.data;
}

/**
 * Bulk update permissions for a user
 * POST /api/v1/auth/users/{user_id}/permissions/bulk
 */
export async function bulkUpdatePermissions(
  userId: string,
  permissions: Array<{ permission: string; module: string; granted: boolean }>
): Promise<StandardResponse<{ granted: number; revoked: number }>> {
  const response = await apiClient.post<
    StandardResponse<{ granted: number; revoked: number }>
  >(`/auth/users/${userId}/permissions/bulk`, { permissions });
  return response.data;
}

/**
 * Copy permissions from one user to another
 * POST /api/v1/auth/users/{target_user_id}/permissions/copy
 */
export async function copyPermissionsFromUser(
  targetUserId: string,
  sourceUserId: string
): Promise<StandardResponse<{ copied: number }>> {
  const response = await apiClient.post<
    StandardResponse<{ copied: number }>
  >(`/auth/users/${targetUserId}/permissions/copy`, {
    source_user_id: sourceUserId,
  });
  return response.data;
}

/**
 * Get role permissions (base + custom overrides)
 * GET /api/v1/auth/roles/{role}/permissions
 */
export async function getRolePermissions(role: string): Promise<
  StandardResponse<{
    role: string;
    base_permissions: string[];
    custom_permissions: string[];
    effective_permissions: string[];
  }>
> {
  const response = await apiClient.get<
    StandardResponse<{
      role: string;
      base_permissions: string[];
      custom_permissions: string[];
      effective_permissions: string[];
    }>
  >(`/auth/roles/${role}/permissions`);
  return response.data;
}

/**
 * Set role permissions (tenant overrides)
 * PUT /api/v1/auth/roles/{role}/permissions
 */
export async function setRolePermissions(
  role: string,
  permissions: Array<{ permission: string; module: string; granted: boolean }>
): Promise<StandardResponse<{ granted: number; revoked: number }>> {
  const response = await apiClient.put<
    StandardResponse<{ granted: number; revoked: number }>
  >(`/auth/roles/${role}/permissions`, { permissions });
  return response.data;
}
