/**
 * API services for authentication endpoints
 * Handles forgot password, reset password, and email verification
 */

import apiClient from "./client";
import type { StandardResponse } from "../../features/views/types/savedFilter.types";

/**
 * Request to send password recovery email
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Response from forgot password endpoint
 */
export interface ForgotPasswordResponse {
  message: string;
}

/**
 * Request to reset password
 */
export interface ResetPasswordRequest {
  token: string;
  password: string;
}

/**
 * Response from reset password endpoint
 */
export interface ResetPasswordResponse {
  message: string;
}

/**
 * Request to verify email
 */
export interface VerifyEmailRequest {
  token: string;
}

/**
 * Response from verify email endpoint
 */
export interface VerifyEmailResponse {
  message: string;
  verified: boolean;
}

/**
 * Send password recovery email
 * POST /api/v1/auth/forgot-password
 */
export async function forgotPassword(
  email: string
): Promise<StandardResponse<ForgotPasswordResponse>> {
  const response = await apiClient.post<
    StandardResponse<ForgotPasswordResponse>
  >("/auth/forgot-password", { email });
  return response.data;
}

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(
  token: string,
  password: string
): Promise<StandardResponse<ResetPasswordResponse>> {
  const response = await apiClient.post<
    StandardResponse<ResetPasswordResponse>
  >("/auth/reset-password", { token, password });
  return response.data;
}

/**
 * Verify email with token
 * POST /api/v1/auth/verify-email
 * Note: Endpoint may not exist yet, but structure is prepared
 */
export async function verifyEmail(
  token: string
): Promise<StandardResponse<VerifyEmailResponse>> {
  const response = await apiClient.post<StandardResponse<VerifyEmailResponse>>(
    "/auth/verify-email",
    { token }
  );
  return response.data;
}

/**
 * Request to change password
 */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/**
 * Response from change password endpoint
 */
export interface ChangePasswordResponse {
  message: string;
  sessions_invalidated: number;
  password_changed_at: string;
}

/**
 * Request to validate password strength
 */
export interface PasswordStrengthRequest {
  password: string;
  user_inputs?: string[];
}

/**
 * Password strength levels
 */
export type PasswordStrength =
  | "very-weak"
  | "weak"
  | "fair"
  | "good"
  | "strong";

/**
 * Response from password strength validation
 */
export interface PasswordStrengthResponse {
  score: number;
  strength: PasswordStrength;
  crack_time: string;
  suggestions: string[];
  warnings: string[];
}

/**
 * Password history item
 */
export interface PasswordHistoryItem {
  changed_at: string;
  changed_by: "user" | "admin" | "system";
  reason?: string;
  ip_address?: string;
}

/**
 * Response from password history endpoint
 */
export interface PasswordHistoryResponse {
  history: PasswordHistoryItem[];
  total: number;
}

/**
 * Change password for authenticated user
 * POST /api/v1/auth/change-password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<StandardResponse<ChangePasswordResponse>> {
  const response = await apiClient.post<
    StandardResponse<ChangePasswordResponse>
  >("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.data;
}

/**
 * Validate password strength
 * POST /api/v1/auth/password-strength
 */
export async function validatePasswordStrength(
  password: string,
  userInputs?: string[]
): Promise<StandardResponse<PasswordStrengthResponse>> {
  const response = await apiClient.post<
    StandardResponse<PasswordStrengthResponse>
  >("/auth/password-strength", {
    password,
    user_inputs: userInputs,
  });
  return response.data;
}

/**
 * Get password change history
 * GET /api/v1/auth/password-history
 */
export async function getPasswordHistory(
  limit: number = 10
): Promise<StandardResponse<PasswordHistoryResponse>> {
  const response = await apiClient.get<
    StandardResponse<PasswordHistoryResponse>
  >("/auth/password-history", {
    params: { limit },
  });
  return response.data;
}
