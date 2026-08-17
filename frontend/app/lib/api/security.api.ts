/**
 * Security API endpoints
 *
 * Handles security-related API calls including encryption secrets
 */

import apiClient from "./client";
import type { StandardResponse } from "./types/common.types";

/**
 * Response type for encryption secret
 */
export interface EncryptionSecretResponse {
  secret: string;
  expires_at: string | null; // ISO datetime string
}

/**
 * Get encryption secret from backend
 *
 * This secret is used for client-side encryption of sensitive data.
 * The secret is tenant-specific and should be refreshed periodically.
 *
 * @returns Encryption secret response
 */
export async function getEncryptionSecret(): Promise<EncryptionSecretResponse> {
  const response = await apiClient.get<
    StandardResponse<EncryptionSecretResponse>
  >("/auth/encryption-secret");
  return response.data.data;
}
