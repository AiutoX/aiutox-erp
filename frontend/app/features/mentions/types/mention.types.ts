/**
 * TypeScript types and interfaces for mentions module.
 */

/**
 * Mention object representing a @user mention in a polymorphic entity.
 */
export interface Mention {
  id: string;
  user_id: string;
  mencionable_type: string;
  mencionable_id: string;
  tenant_id: string;
  resolved: boolean;
  notification_sent: boolean;
  created_at: string;
  resolved_at?: string;
  updated_at: string;
}

/**
 * Mention creation payload.
 */
export interface CreateMentionPayload {
  user_id: string;
  mencionable_type: string;
  mencionable_id: string;
}

/**
 * Mention resolution payload.
 */
export interface ResolveMentionPayload {
  resolved: boolean;
}

/**
 * Mentions list response.
 */
export interface MentionsListResponse {
  mentions: Mention[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Query parameters for mentions listing.
 */
export interface MentionsQueryParams {
  limit?: number;
  offset?: number;
  resolved?: boolean;
  user_id?: string;
}

/**
 * Entity reference for mentions context.
 */
export interface EntityReference {
  type: string;
  id: string;
  displayName?: string;
}

/**
 * Mention filter options.
 */
export enum MentionFilter {
  ALL = "all",
  UNRESOLVED = "unresolved",
  RESOLVED = "resolved",
}

/**
 * Mention sort options.
 */
export enum MentionSort {
  NEWEST = "newest",
  OLDEST = "oldest",
  UNRESOLVED_FIRST = "unresolved_first",
}
