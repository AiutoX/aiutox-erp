/**
 * PubSub types
 * Type definitions for PubSub module
 */

import type { StandardListResponse } from "~/lib/api/types/common.types";

// PubSub statistics
export interface PubSubStats {
  streams: Record<
    string,
    {
      length: number;
      groups: number;
      pending: number;
      last_read?: string;
      first_entry_id?: string;
      last_entry_id?: string;
    }
  >;
  total_streams: number;
  total_groups: number;
  total_pending: number;
  redis_info: {
    version: string;
    used_memory: string;
    connected_clients: number;
    uptime_in_seconds: number;
  };
}

// PubSub stream
export interface PubSubStream {
  name: string;
  length: number;
  groups: number;
  pending: number;
  first_entry_id?: string;
  last_entry_id?: string;
  last_read?: string;
  created_at?: string;
  entries: PubSubStreamEntry[];
}

// PubSub stream entry
export interface PubSubStreamEntry {
  id: string;
  stream_name: string;
  data: Record<string, unknown>;
  timestamp: string;
  sequence: number;
}

// PubSub consumer group
export interface PubSubGroup {
  name: string;
  stream_name: string;
  consumers: number;
  pending: number;
  last_delivered_id?: string;
  created_at?: string;
  entries: PubSubGroupEntry[];
}

// PubSub group entry (pending messages)
export interface PubSubGroupEntry {
  id: string;
  stream_name: string;
  group_name: string;
  consumer_name?: string;
  delivery_count: number;
  last_delivered?: string;
  data: Record<string, unknown>;
  timestamp: string;
  sequence: number;
}

// PubSub consumer
export interface PubSubConsumer {
  name: string;
  group_name: string;
  stream_name: string;
  idle_time: number;
  pending: number;
  last_seen?: string;
  active: boolean;
}

// PubSub pending messages list response
export type PubSubPendingListResponse = StandardListResponse<PubSubGroupEntry>;

// PubSub stream list response
export type PubSubStreamListResponse = StandardListResponse<PubSubStream>;

// PubSub group list response
export type PubSubGroupListResponse = StandardListResponse<PubSubGroup>;

// PubSub consumer list response
export type PubSubConsumerListResponse = StandardListResponse<PubSubConsumer>;

// PubSub operations
export interface PubSubCreateStream {
  name: string;
  max_length?: number;
  trim_strategy?: "maxlen" | "minid";
}

export interface PubSubCreateGroup {
  name: string;
  stream_name: string;
  start_id?: string;
  start_time?: string;
}

export interface PubSubAddMessage {
  stream_name: string;
  data: Record<string, unknown>;
  max_length?: number;
  id?: string;
}

export interface PubSubAckMessage {
  stream_name: string;
  group_name: string;
  message_ids: string[];
}

export interface PubSubClaimMessages {
  stream_name: string;
  group_name: string;
  consumer_name: string;
  min_idle_time: number;
  message_ids: string[];
}

// PubSub event types
export interface PubSubEvent {
  id: string;
  stream_name: string;
  group_name?: string;
  consumer_name?: string;
  event_type:
    | "message_added"
    | "message_delivered"
    | "message_acknowledged"
    | "group_created"
    | "consumer_added"
    | "consumer_removed";
  data: Record<string, unknown>;
  timestamp: string;
}

// PubSub configuration
export interface PubSubConfig {
  redis_url: string;
  max_connections: number;
  connection_timeout: number;
  read_timeout: number;
  write_timeout: number;
  retry_attempts: number;
  retry_delay: number;
  health_check_interval: number;
}

// PubSub health status
export interface PubSubHealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  redis_connected: boolean;
  total_streams: number;
  total_groups: number;
  total_pending: number;
  last_check: string;
  errors: string[];
}

// PubSub metrics
export interface PubSubMetrics {
  messages_per_second: number;
  messages_processed_total: number;
  messages_failed_total: number;
  average_processing_time: number;
  consumer_lag: Record<string, number>;
  stream_length: Record<string, number>;
  group_pending: Record<string, number>;
}

// PubSub monitoring data
export interface PubSubMonitoring {
  stats: PubSubStats;
  health: PubSubHealthStatus;
  metrics: PubSubMetrics;
  events: PubSubEvent[];
}
