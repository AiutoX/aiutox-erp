/**
 * Admin API client for system setup and administration.
 */

import apiClient from "./client";

/**
 * Setup status response from backend
 */
export interface SetupStatusResponse {
  setup_required: boolean;
  setup_completed: boolean;
  window_open: boolean;
  expires_at: string | null;
  message: string;
}

/**
 * Super user creation request
 */
export interface SuperUserCreate {
  email: string;
  password: string;
  full_name: string;
}

/**
 * Setup completion response
 */
export interface SetupCompleteResponse {
  success: boolean;
  user_id: string;
  message: string;
}

/**
 * Standard API response wrapper
 */
interface StandardResponse<T> {
  data: T;
  error?: {
    code: string;
    message: string;
    details: unknown;
  };
}

/**
 * Get current setup status
 *
 * @returns Setup status information
 */
export async function getSetupStatus(): Promise<SetupStatusResponse> {
  const response = await apiClient.get<StandardResponse<SetupStatusResponse>>(
    "/admin/setup/status"
  );
  return response.data.data;
}

/**
 * Complete initial system setup by creating superuser
 *
 * @param data - Super user creation data
 * @returns Setup completion response
 */
export async function createSuperUser(
  data: SuperUserCreate
): Promise<SetupCompleteResponse> {
  const response = await apiClient.post<
    StandardResponse<SetupCompleteResponse>
  >("/admin/setup", data);
  return response.data.data;
}
