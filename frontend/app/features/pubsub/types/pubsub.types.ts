import type { StandardListResponse } from "~/lib/api/types/common.types";

// GET /pubsub/stats
export interface PubSubStreamStats {
  length: number;
  groups: Array<{
    name: string;
    consumers: number;
    pending: number;
    last_delivered_id: string;
    pending_messages_count: number;
  }>;
  first_entry_id: string | null;
  last_entry_id: string | null;
}

export interface PubSubStats {
  streams: Record<string, PubSubStreamStats>;
  total_pending: number;
}

// GET /pubsub/failed
export interface PubSubFailedEvent {
  message_id: string;
  original_stream?: string;
  original_message_id?: string;
  error_info?: string;
  failed_at?: string;
  [key: string]: unknown;
}

export type PubSubFailedEventListResponse =
  StandardListResponse<PubSubFailedEvent>;

// POST /pubsub/failed/{message_id}/reprocess
export interface PubSubReprocessResult {
  original_message_id: string;
  new_message_id: string;
  original_stream: string;
}

// GET /pubsub/streams/{stream_name}/info
export interface PubSubStreamInfo {
  stream_name: string;
  length: number;
  groups: Array<{
    name: string;
    consumers: number;
    pending: number;
    "last-delivered-id"?: string;
  }>;
  first_entry_id: string | null;
  last_entry_id: string | null;
}

// GET /pubsub/streams/{stream_name}/groups/{group_name}/pending
export interface PubSubPendingEntry {
  message_id: string;
  consumer: string;
  time_since_delivered: number;
  times_delivered: number;
}

export type PubSubPendingListResponse = StandardListResponse<PubSubPendingEntry>;
