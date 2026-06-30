/**
 * PubSub API
 * API functions for PubSub module
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  PubSubStats,
  PubSubStream,
  PubSubGroup,
  PubSubConsumer,
  PubSubGroupEntry,
  PubSubCreateStream,
  PubSubCreateGroup,
  PubSubAddMessage,
  PubSubAckMessage,
  PubSubClaimMessages,
  PubSubHealthStatus,
  PubSubMetrics,
  PubSubMonitoring,
} from "../types/pubsub.types";

/**
 * PubSub Statistics API
 */

/**
 * Get PubSub statistics
 * @returns Promise<StandardResponse<PubSubStats>>
 */
export async function getPubSubStats(): Promise<StandardResponse<PubSubStats>> {
  const response = await apiClient.get<StandardResponse<PubSubStats>>(
    "/api/v1/pubsub/stats"
  );
  return response.data;
}

/**
 * Get PubSub health status
 * @returns Promise<StandardResponse<PubSubHealthStatus>>
 */
export async function getPubSubHealth(): Promise<
  StandardResponse<PubSubHealthStatus>
> {
  const response = await apiClient.get<StandardResponse<PubSubHealthStatus>>(
    "/api/v1/pubsub/health"
  );
  return response.data;
}

/**
 * Get PubSub metrics
 * @returns Promise<StandardResponse<PubSubMetrics>>
 */
export async function getPubSubMetrics(): Promise<
  StandardResponse<PubSubMetrics>
> {
  const response = await apiClient.get<StandardResponse<PubSubMetrics>>(
    "/api/v1/pubsub/metrics"
  );
  return response.data;
}

/**
 * Get PubSub monitoring data
 * @returns Promise<StandardResponse<PubSubMonitoring>>
 */
export async function getPubSubMonitoring(): Promise<
  StandardResponse<PubSubMonitoring>
> {
  const response = await apiClient.get<StandardResponse<PubSubMonitoring>>(
    "/api/v1/pubsub/monitoring"
  );
  return response.data;
}

/**
 * PubSub Streams API
 */

/**
 * List all PubSub streams
 * @returns Promise<StandardListResponse<PubSubStream>>
 */
export async function listPubSubStreams(): Promise<
  StandardListResponse<PubSubStream>
> {
  const response = await apiClient.get<StandardListResponse<PubSubStream>>(
    "/api/v1/pubsub/streams"
  );
  return response.data;
}

/**
 * Get a single PubSub stream by name
 * @param name - Stream name
 * @returns Promise<StandardResponse<PubSubStream>>
 */
export async function getPubSubStream(
  name: string
): Promise<StandardResponse<PubSubStream>> {
  const response = await apiClient.get<StandardResponse<PubSubStream>>(
    `/api/v1/pubsub/streams/${name}`
  );
  return response.data;
}

/**
 * Create a new PubSub stream
 * @param payload - Stream creation data
 * @returns Promise<StandardResponse<PubSubStream>>
 */
export async function createPubSubStream(
  payload: PubSubCreateStream
): Promise<StandardResponse<PubSubStream>> {
  const response = await apiClient.post<StandardResponse<PubSubStream>>(
    "/api/v1/pubsub/streams",
    payload
  );
  return response.data;
}

/**
 * Delete a PubSub stream
 * @param name - Stream name
 * @returns Promise<StandardResponse<void>>
 */
export async function deletePubSubStream(
  name: string
): Promise<StandardResponse<void>> {
  const response = await apiClient.delete<StandardResponse<void>>(
    `/api/v1/pubsub/streams/${name}`
  );
  return response.data;
}

/**
 * Add message to a PubSub stream
 * @param payload - Message data
 * @returns Promise<StandardResponse<PubSubStreamEntry>>
 */
export async function addPubSubMessage(
  payload: PubSubAddMessage
): Promise<StandardResponse<unknown>> {
  const response = await apiClient.post<StandardResponse<unknown>>(
    "/api/v1/pubsub/streams/messages",
    payload
  );
  return response.data;
}

/**
 * PubSub Groups API
 */

/**
 * List all PubSub groups for a stream
 * @param streamName - Stream name
 * @returns Promise<StandardListResponse<PubSubGroup>>
 */
export async function listPubSubGroups(
  streamName: string
): Promise<StandardListResponse<PubSubGroup>> {
  const response = await apiClient.get<StandardListResponse<PubSubGroup>>(
    `/api/v1/pubsub/streams/${streamName}/groups`
  );
  return response.data;
}

/**
 * Get a single PubSub group
 * @param streamName - Stream name
 * @param groupName - Group name
 * @returns Promise<StandardResponse<PubSubGroup>>
 */
export async function getPubSubGroup(
  streamName: string,
  groupName: string
): Promise<StandardResponse<PubSubGroup>> {
  const response = await apiClient.get<StandardResponse<PubSubGroup>>(
    `/api/v1/pubsub/streams/${streamName}/groups/${groupName}`
  );
  return response.data;
}

/**
 * Create a new PubSub consumer group
 * @param payload - Group creation data
 * @returns Promise<StandardResponse<PubSubGroup>>
 */
export async function createPubSubGroup(
  payload: PubSubCreateGroup
): Promise<StandardResponse<PubSubGroup>> {
  const response = await apiClient.post<StandardResponse<PubSubGroup>>(
    "/api/v1/pubsub/groups",
    payload
  );
  return response.data;
}

/**
 * Delete a PubSub consumer group
 * @param streamName - Stream name
 * @param groupName - Group name
 * @returns Promise<StandardResponse<void>>
 */
export async function deletePubSubGroup(
  streamName: string,
  groupName: string
): Promise<StandardResponse<void>> {
  const response = await apiClient.delete<StandardResponse<void>>(
    `/api/v1/pubsub/streams/${streamName}/groups/${groupName}`
  );
  return response.data;
}

/**
 * Get pending messages for a PubSub group
 * @param streamName - Stream name
 * @param groupName - Group name
 * @param params - Query parameters for pagination
 * @returns Promise<StandardListResponse<PubSubGroupEntry>>
 */
export async function getPubSubPending(
  streamName: string,
  groupName: string,
  params?: { page?: number; page_size?: number; consumer?: string }
): Promise<StandardListResponse<PubSubGroupEntry>> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.page_size)
    searchParams.append("page_size", params.page_size.toString());
  if (params?.consumer) searchParams.append("consumer", params.consumer);

  const response = await apiClient.get<StandardListResponse<PubSubGroupEntry>>(
    `/api/v1/pubsub/streams/${streamName}/groups/${groupName}/pending?${searchParams.toString()}`
  );
  return response.data;
}

/**
 * Acknowledge messages for a PubSub group
 * @param payload - Acknowledge data
 * @returns Promise<StandardResponse<void>>
 */
export async function acknowledgePubSubMessages(
  payload: PubSubAckMessage
): Promise<StandardResponse<void>> {
  const response = await apiClient.post<StandardResponse<void>>(
    "/api/v1/pubsub/groups/acknowledge",
    payload
  );
  return response.data;
}

/**
 * Claim messages for a PubSub consumer
 * @param payload - Claim data
 * @returns Promise<StandardListResponse<PubSubGroupEntry>>
 */
export async function claimPubSubMessages(
  payload: PubSubClaimMessages
): Promise<StandardListResponse<PubSubGroupEntry>> {
  const response = await apiClient.post<StandardListResponse<PubSubGroupEntry>>(
    "/api/v1/pubsub/groups/claim",
    payload
  );
  return response.data;
}

/**
 * PubSub Consumers API
 */

/**
 * List all PubSub consumers for a group
 * @param streamName - Stream name
 * @param groupName - Group name
 * @returns Promise<StandardListResponse<PubSubConsumer>>
 */
export async function listPubSubConsumers(
  streamName: string,
  groupName: string
): Promise<StandardListResponse<PubSubConsumer>> {
  const response = await apiClient.get<StandardListResponse<PubSubConsumer>>(
    `/api/v1/pubsub/streams/${streamName}/groups/${groupName}/consumers`
  );
  return response.data;
}

/**
 * Get a single PubSub consumer
 * @param streamName - Stream name
 * @param groupName - Group name
 * @param consumerName - Consumer name
 * @returns Promise<StandardResponse<PubSubConsumer>>
 */
export async function getPubSubConsumer(
  streamName: string,
  groupName: string,
  consumerName: string
): Promise<StandardResponse<PubSubConsumer>> {
  const response = await apiClient.get<StandardResponse<PubSubConsumer>>(
    `/api/v1/pubsub/streams/${streamName}/groups/${groupName}/consumers/${consumerName}`
  );
  return response.data;
}

/**
 * Delete a PubSub consumer
 * @param streamName - Stream name
 * @param groupName - Group name
 * @param consumerName - Consumer name
 * @returns Promise<StandardResponse<void>>
 */
export async function deletePubSubConsumer(
  streamName: string,
  groupName: string,
  consumerName: string
): Promise<StandardResponse<void>> {
  const response = await apiClient.delete<StandardResponse<void>>(
    `/api/v1/pubsub/streams/${streamName}/groups/${groupName}/consumers/${consumerName}`
  );
  return response.data;
}

/**
 * PubSub Operations API
 */

/**
 * Reset PubSub statistics
 * @returns Promise<StandardResponse<void>>
 */
export async function resetPubSubStats(): Promise<StandardResponse<void>> {
  const response = await apiClient.post<StandardResponse<void>>(
    "/api/v1/pubsub/stats/reset"
  );
  return response.data;
}

/**
 * Clear all messages from a PubSub stream
 * @param name - Stream name
 * @returns Promise<StandardResponse<void>>
 */
export async function clearPubSubStream(
  name: string
): Promise<StandardResponse<void>> {
  const response = await apiClient.post<StandardResponse<void>>(
    `/api/v1/pubsub/streams/${name}/clear`
  );
  return response.data;
}

/**
 * Trim a PubSub stream
 * @param name - Stream name
 * @param strategy - Trim strategy
 * @param threshold - Trim threshold
 * @returns Promise<StandardResponse<void>>
 */
export async function trimPubSubStream(
  name: string,
  strategy: "maxlen" | "minid",
  threshold: number
): Promise<StandardResponse<void>> {
  const response = await apiClient.post<StandardResponse<void>>(
    `/api/v1/pubsub/streams/${name}/trim`,
    {
      strategy,
      threshold,
    }
  );
  return response.data;
}

/**
 * Get PubSub configuration
 * @returns Promise<StandardResponse<any>>
 */
export async function getPubSubConfig(): Promise<StandardResponse<unknown>> {
  const response = await apiClient.get<StandardResponse<unknown>>(
    "/api/v1/pubsub/config"
  );
  return response.data;
}

/**
 * Update PubSub configuration
 * @param config - Configuration data
 * @returns Promise<StandardResponse<any>>
 */
export async function updatePubSubConfig(
  config: Record<string, unknown>
): Promise<StandardResponse<unknown>> {
  const response = await apiClient.put<StandardResponse<unknown>>(
    "/api/v1/pubsub/config",
    config
  );
  return response.data;
}
