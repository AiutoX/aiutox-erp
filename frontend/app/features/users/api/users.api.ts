/**
 * API service for Users module
 *
 * Handles CRUD operations for users
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  User,
  UserCreate,
  UserUpdate,
  UsersListParams,
} from "../types/user.types";

/**
 * List users
 * GET /api/v1/users
 *
 * Requires: auth.manage_users permission
 */
export async function listUsers(
  params?: UsersListParams
): Promise<StandardListResponse<User>> {
  const response = await apiClient.get<StandardListResponse<User>>("/users", {
    params: {
      page: params?.page || 1,
      page_size: params?.page_size || 20,
      search: params?.search,
      is_active: params?.is_active,
      saved_filter_id: params?.saved_filter_id,
    },
  });
  return response.data;
}

/**
 * Get user by ID
 * GET /api/v1/users/{user_id}
 *
 * Requires: auth.manage_users permission
 */
export async function getUser(userId: string): Promise<StandardResponse<User>> {
  const response = await apiClient.get<StandardResponse<User>>(
    `/users/${userId}`
  );
  return response.data;
}

/**
 * Create user
 * POST /api/v1/users
 *
 * Requires: auth.manage_users permission
 */
export async function createUser(
  data: UserCreate
): Promise<StandardResponse<User>> {
  const response = await apiClient.post<StandardResponse<User>>("/users", data);
  return response.data;
}

/**
 * Update user
 * PATCH /api/v1/users/{user_id}
 *
 * Requires: auth.manage_users permission
 */
export async function updateUser(
  userId: string,
  data: UserUpdate
): Promise<StandardResponse<User>> {
  console.log("[updateUser API] Calling PATCH /users/{userId}:", {
    userId,
    data,
  });
  try {
    const response = await apiClient.patch<StandardResponse<User>>(
      `/users/${userId}`,
      data
    );
    console.log("[updateUser API] Response received:", {
      status: response.status,
      data: response.data,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("[updateUser API] Error:", error);
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response: {
          status: number;
          statusText: string;
          data: unknown;
          headers: unknown;
        };
      };
      console.error("[updateUser API] Error response:", {
        status: axiosError.response.status,
        statusText: axiosError.response.statusText,
        data: axiosError.response.data,
        headers: axiosError.response.headers,
      });
    }
    throw error;
  }
}

/**
 * Update own profile
 * PATCH /api/v1/users/me
 *
 * Allows users to edit their own profile without auth.manage_users permission.
 * Forbidden fields are automatically removed by the backend.
 */
export async function updateOwnProfile(
  data: UserUpdate
): Promise<StandardResponse<User>> {
  console.log("[updateOwnProfile API] Calling PATCH /users/me:", { data });
  try {
    const response = await apiClient.patch<StandardResponse<User>>(
      "/users/me",
      data
    );
    console.log("[updateOwnProfile API] Response received:", {
      status: response.status,
      data: response.data,
    });
    return response.data;
  } catch (error: unknown) {
    console.error("[updateOwnProfile API] Error:", error);
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response: {
          status: number;
          statusText: string;
          data: unknown;
          headers: unknown;
        };
      };
      console.error("[updateOwnProfile API] Error response:", {
        status: axiosError.response.status,
        statusText: axiosError.response.statusText,
        data: axiosError.response.data,
        headers: axiosError.response.headers,
      });
    }
    throw error;
  }
}

/**
 * Delete user (soft delete)
 * DELETE /api/v1/users/{user_id}
 *
 * Requires: auth.manage_users permission
 */
export async function deleteUser(
  userId: string
): Promise<StandardResponse<{ message: string }>> {
  const response = await apiClient.delete<
    StandardResponse<{ message: string }>
  >(`/users/${userId}`);
  return response.data;
}

/**
 * Bulk actions on users
 * POST /api/v1/users/bulk
 *
 * Requires: auth.manage_users permission
 */
export interface BulkUsersActionRequest {
  action: "activate" | "deactivate" | "delete";
  user_ids: string[];
}

export interface BulkUsersActionResponse {
  action: string;
  total: number;
  success: number;
  failed: number;
  failed_ids: string[];
}

export async function bulkUsersAction(
  data: BulkUsersActionRequest
): Promise<StandardResponse<BulkUsersActionResponse>> {
  const response = await apiClient.post<
    StandardResponse<BulkUsersActionResponse>
  >("/users/bulk", data);
  return response.data;
}

// Legacy function names for backward compatibility
export const getUsers = listUsers;
