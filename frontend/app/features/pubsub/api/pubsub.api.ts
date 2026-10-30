/**
 * PubSub API
 * API functions for the pubsub admin router (backend/app/api/v1/pubsub.py).
 * Only 5 endpoints exist server-side — do not add calls here without a matching route.
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  PubSubStats,
  PubSubFailedEvent,
  PubSubReprocessResult,
  PubSubStreamInfo,
  PubSubPendingEntry,
} from "../types/pubsub.types";

/**
 * Get Pub-Sub statistics (GET /pubsub/stats)
 */
export async function getPubSubStats(): Promise<StandardResponse<PubSubStats>> {
  const response =
    await apiClient.get<StandardResponse<PubSubStats>>("/pubsub/stats");
  return response.data;
}

/**
 * List failed events (GET /pubsub/failed)
 */
export async function listPubSubFailedEvents(params?: {
  limit?: number;
  offset?: number;
}): Promise<StandardListResponse<PubSubFailedEvent>> {
  const response = await apiClient.get<
    StandardListResponse<PubSubFailedEvent>
  >("/pubsub/failed", { params });
  return response.data;
}

/**
 * Reprocess a failed event (POST /pubsub/failed/{message_id}/reprocess)
 */
export async function reprocessPubSubFailedEvent(
  messageId: string
): Promise<StandardResponse<PubSubReprocessResult>> {
  const response = await apiClient.post<StandardResponse<PubSubReprocessResult>>(
    `/pubsub/failed/${encodeURIComponent(messageId)}/reprocess`
  );
  return response.data;
}

/**
 * Get detailed information about a stream (GET /pubsub/streams/{stream_name}/info)
 */
export async function getPubSubStreamInfo(
  streamName: string
): Promise<StandardResponse<PubSubStreamInfo>> {
  const response = await apiClient.get<StandardResponse<PubSubStreamInfo>>(
    `/pubsub/streams/${encodeURIComponent(streamName)}/info`
  );
  return response.data;
}

/**
 * Get pending messages for a consumer group
 * (GET /pubsub/streams/{stream_name}/groups/{group_name}/pending)
 */
export async function getPubSubPending(
  streamName: string,
  groupName: string,
  params?: { count?: number }
): Promise<StandardListResponse<PubSubPendingEntry>> {
  const response = await apiClient.get<
    StandardListResponse<PubSubPendingEntry>
  >(
    `/pubsub/streams/${encodeURIComponent(streamName)}/groups/${encodeURIComponent(groupName)}/pending`,
    { params }
  );
  return response.data;
}
