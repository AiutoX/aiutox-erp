/**
 * License API client — P10-T13.
 * All requests go through apiClient (~/lib/api/client).
 */

import apiClient from "~/lib/api/client";
import type { StandardResponse } from "~/lib/api/types/common.types";

export interface LicenseInfo {
  license_jti: string | null;
  expires_at: string | null;
  modules: Record<string, string>;
  is_active: boolean;
}

export async function getMyLicense(): Promise<StandardResponse<LicenseInfo>> {
  const response = await apiClient.get<StandardResponse<LicenseInfo>>(
    "/tenants/me/license"
  );
  return response.data;
}

export async function activateLicense(
  token: string
): Promise<StandardResponse<LicenseInfo>> {
  const response = await apiClient.post<StandardResponse<LicenseInfo>>(
    "/admin/licenses/activate",
    { token }
  );
  return response.data;
}

export async function revokeLicense(
  license_jti: string
): Promise<StandardResponse<{ revoked: boolean; license_jti: string }>> {
  const response = await apiClient.post<
    StandardResponse<{ revoked: boolean; license_jti: string }>
  >("/admin/licenses/revoke", { license_jti });
  return response.data;
}
