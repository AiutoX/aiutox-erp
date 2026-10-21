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
import { listRoles } from "./roles.api";

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
 * Uses listAllPermissions() (GET /auth/permissions/all), which already
 * returns permissions grouped by module -- avoids listPermissions(), whose
 * `/auth/permissions` URL (missing the `/all` suffix) has no matching
 * backend route.
 *
 * Note: tenantId is accepted for API-compatibility with existing callers,
 * but /auth/permissions/all does not support tenant filtering server-side.
 */
export async function getPermissionsByModule(
  _tenantId?: string
): Promise<PermissionGroup[]> {
  const response = await listAllPermissions();

  return response.data.groups.map((group) => ({
    module_id: group.module,
    module_name: group.module.charAt(0).toUpperCase() + group.module.slice(1),
    permissions: group.permissions.map((permission) => ({
      permission,
      module_id: group.module,
    })),
  }));
}

/**
 * Backend response shape for GET /auth/users/{user_id}/permissions/effective
 * (see backend/app/schemas/permission.py UserEffectivePermissionsResponse)
 */
interface UserEffectivePermissionsApiResponse {
  user_id: string;
  global_roles: string[];
  module_roles: Array<{ module: string; role: string }>;
  delegated_permissions: string[];
  effective_permissions: string[];
}

/**
 * Get user permissions
 *
 * Gets all permissions for a user including:
 * - Permissions from global roles
 * - Permissions from module roles
 * - Delegated permissions
 *
 * Note: `/auth/users/{user_id}/permissions` (no suffix) is a DELETE-only
 * endpoint (revoke all), not GET -- the correct read endpoint is
 * `/permissions/effective`. Its response shape differs from the one this
 * function returns, so results are mapped here to preserve the existing
 * consumer contract (UserPermissionsManager / useUserPermissions).
 */
export async function getUserPermissions(userId: string): Promise<
  StandardResponse<{
    global_role_permissions: string[];
    module_role_permissions: Record<string, string[]>;
    delegated_permissions: DelegatedPermissionResponse[];
    effective_permissions: string[];
  }>
> {
  const [effectiveResponse, rolesResponse] = await Promise.all([
    apiClient.get<StandardResponse<UserEffectivePermissionsApiResponse>>(
      `/auth/users/${userId}/permissions/effective`
    ),
    listRoles(),
  ]);
  const data = effectiveResponse.data.data;

  const module_role_permissions: Record<string, string[]> = {};
  for (const { module, role } of data.module_roles) {
    (module_role_permissions[module] ??= []).push(role);
  }

  // global_roles holds role names (e.g. "admin"), not permissions -- resolve
  // each role's stored permission patterns (which may include wildcards;
  // callers expand those against the full catalog before counting/display).
  const rolesByName = new Map<string, string[]>(
    rolesResponse.data.map((role) => [role.role, role.permissions])
  );
  const global_role_permissions = data.global_roles.flatMap(
    (roleName) => rolesByName.get(roleName) ?? []
  );

  return {
    ...effectiveResponse.data,
    data: {
      global_role_permissions,
      module_role_permissions,
      // Backend returns permission strings, not full delegation records;
      // the manager UI only reads .length/.filter on this array today.
      delegated_permissions: data.delegated_permissions.map((permission) => ({
        id: permission,
        user_id: userId,
        granted_by: "",
        module: permission.split(".")[0] ?? "",
        permission,
        expires_at: null,
        created_at: "",
        revoked_at: null,
        is_active: true,
      })),
      effective_permissions: data.effective_permissions,
    },
  };
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
