/**
 * API services for roles management
 *
 * Handles global roles and custom roles (when implemented)
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  UserRole,
  GlobalRole,
  CustomRole,
  CustomRoleCreate,
  CustomRoleUpdate,
} from "../types/user.types";

/**
 * Role with permissions response (from backend)
 */
export interface RoleWithPermissions {
  role: GlobalRole;
  permissions: string[];
}

/**
 * Role list response (from backend)
 */
export interface RoleListResponse {
  roles: UserRole[];
  total: number;
}

/**
 * Role assign request
 */
export interface RoleAssignRequest {
  role: GlobalRole;
}

/**
 * List available global roles
 * GET /api/v1/auth/roles
 *
 * Returns all available global roles with their permissions
 */
export async function listRoles(): Promise<
  StandardListResponse<RoleWithPermissions>
> {
  const response =
    await apiClient.get<StandardListResponse<RoleWithPermissions>>(
      "/auth/roles"
    );
  return response.data;
}

/**
 * Get user roles
 * GET /api/v1/auth/roles/{user_id}
 *
 * Requires: auth.manage_users permission
 */
export async function getUserRoles(userId: string): Promise<RoleListResponse> {
  const response = await apiClient.get<RoleListResponse>(
    `/auth/roles/${userId}`
  );
  return response.data;
}

/**
 * Assign global role to user
 * POST /api/v1/auth/roles/{user_id}
 *
 * Requires: auth.manage_roles permission
 */
export async function assignRole(
  userId: string,
  role: GlobalRole
): Promise<StandardResponse<UserRole>> {
  const response = await apiClient.post<StandardResponse<UserRole>>(
    `/auth/roles/${userId}`,
    { role }
  );
  return response.data;
}

/**
 * Remove global role from user
 * DELETE /api/v1/auth/roles/{user_id}/{role}
 *
 * Requires: auth.manage_roles permission
 */
export async function removeRole(
  userId: string,
  role: GlobalRole
): Promise<StandardResponse<{ message: string }>> {
  const response = await apiClient.delete<
    StandardResponse<{ message: string }>
  >(`/auth/roles/${userId}/${role}`);
  return response.data;
}

/**
 * Create custom role
 * POST /api/v1/auth/custom-roles
 *
 * Note: This endpoint may not exist yet in the backend.
 * When implemented, it will require auth.manage_roles permission.
 */
export async function createCustomRole(
  data: CustomRoleCreate
): Promise<StandardResponse<CustomRole>> {
  const response = await apiClient.post<StandardResponse<CustomRole>>(
    "/auth/custom-roles",
    data
  );
  return response.data;
}

/**
 * List custom roles
 * GET /api/v1/auth/custom-roles
 *
 * Note: This endpoint may not exist yet in the backend.
 */
export async function listCustomRoles(): Promise<
  StandardListResponse<CustomRole>
> {
  const response =
    await apiClient.get<StandardListResponse<CustomRole>>("/auth/custom-roles");
  return response.data;
}

/**
 * Get custom role by ID
 * GET /api/v1/auth/custom-roles/{role_id}
 *
 * Note: This endpoint may not exist yet in the backend.
 */
export async function getCustomRole(
  roleId: string
): Promise<StandardResponse<CustomRole>> {
  const response = await apiClient.get<StandardResponse<CustomRole>>(
    `/auth/custom-roles/${roleId}`
  );
  return response.data;
}

/**
 * Update custom role
 * PATCH /api/v1/auth/custom-roles/{role_id}
 *
 * Note: This endpoint may not exist yet in the backend.
 */
export async function updateCustomRole(
  roleId: string,
  data: CustomRoleUpdate
): Promise<StandardResponse<CustomRole>> {
  const response = await apiClient.patch<StandardResponse<CustomRole>>(
    `/auth/custom-roles/${roleId}`,
    data
  );
  return response.data;
}

/**
 * Delete custom role
 * DELETE /api/v1/auth/custom-roles/{role_id}
 *
 * Note: This endpoint may not exist yet in the backend.
 */
export async function deleteCustomRole(
  roleId: string
): Promise<StandardResponse<{ message: string }>> {
  const response = await apiClient.delete<
    StandardResponse<{ message: string }>
  >(`/auth/custom-roles/${roleId}`);
  return response.data;
}
