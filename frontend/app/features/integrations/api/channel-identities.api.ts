/**
 * Channel Identities API — employee self-service channel linking
 * Backend: GET/DELETE /api/v1/channel-identities, POST .../telegram/link-code
 */

import apiClient from "~/lib/api/client";
import type {
  StandardListResponse,
  StandardResponse,
} from "~/lib/api/types/common.types";
import type { ChannelIdentity, TelegramLinkCode } from "../types/channel-identity.types";

const BASE = "/channel-identities";

/**
 * List the current user's own active channel identities.
 */
export async function listChannelIdentities(): Promise<
  StandardListResponse<ChannelIdentity>
> {
  const response =
    await apiClient.get<StandardListResponse<ChannelIdentity>>(BASE);
  return response.data;
}

/**
 * Unlink one of the current user's own channel identities.
 */
export async function deactivateChannelIdentity(
  identityId: string
): Promise<StandardResponse<{ id: string; deactivated: boolean }>> {
  const response = await apiClient.delete<
    StandardResponse<{ id: string; deactivated: boolean }>
  >(`${BASE}/${identityId}`);
  return response.data;
}

/**
 * Generate a single-use, 10-minute Telegram linking code.
 */
export async function createTelegramLinkCode(): Promise<
  StandardResponse<TelegramLinkCode>
> {
  const response = await apiClient.post<StandardResponse<TelegramLinkCode>>(
    `${BASE}/telegram/link-code`
  );
  return response.data;
}
