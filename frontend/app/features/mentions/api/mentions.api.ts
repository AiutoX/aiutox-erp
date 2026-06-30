/**
 * API client for mentions module.
 */

import apiClient from "~/lib/api/client";
import type {
  Mention,
  CreateMentionPayload,
  ResolveMentionPayload,
  MentionsListResponse,
  MentionsQueryParams,
} from "../types/mention.types";

const BASE_URL = "/api/mentions";

/**
 * Create a new mention.
 */
export async function createMention(
  payload: CreateMentionPayload
): Promise<Mention> {
  const { data } = await apiClient.post<Mention>(BASE_URL, payload);
  return data;
}

/**
 * Get all mentions for current user.
 */
export async function getUserMentions(
  params?: MentionsQueryParams
): Promise<MentionsListResponse> {
  const { data } = await apiClient.get<MentionsListResponse>(
    `${BASE_URL}/user`,
    { params }
  );
  return data;
}

/**
 * Get unresolved mentions for current user.
 */
export async function getUnresolvedMentions(
  params?: Omit<MentionsQueryParams, "resolved">
): Promise<MentionsListResponse> {
  const { data } = await apiClient.get<MentionsListResponse>(
    `${BASE_URL}/user/unresolved`,
    { params }
  );
  return data;
}

/**
 * Get mentions for a specific entity.
 */
export async function getEntityMentions(
  mencionableType: string,
  mencionableId: string,
  params?: MentionsQueryParams
): Promise<MentionsListResponse> {
  const { data } = await apiClient.get<MentionsListResponse>(
    `${BASE_URL}/entity/${mencionableType}/${mencionableId}`,
    { params }
  );
  return data;
}

/**
 * Resolve a mention (mark as read).
 */
export async function resolveMention(
  mentionId: string,
  payload: ResolveMentionPayload
): Promise<Mention> {
  const { data } = await apiClient.patch<Mention>(
    `${BASE_URL}/${mentionId}/resolve`,
    payload
  );
  return data;
}

/**
 * Delete a mention.
 */
export async function deleteMention(mentionId: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}/${mentionId}`);
}

/**
 * Mark all mentions as read for current user.
 */
export async function markAllAsRead(): Promise<void> {
  // TODO: Implement batch endpoint when available
  // For now, this would require multiple API calls
}
