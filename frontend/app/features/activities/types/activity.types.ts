/**
 * Activity types for AiutoX ERP
 * Based on docs/40-modules/activities.md
 */

// Base activity types
export interface Activity {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  user_id: string;
  metadata?: ActivityMetadata;
  created_at: string;
  updated_at: string;
}

// Activity creation payload
export interface ActivityCreate {
  entity_type: string;
  entity_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// Activity update payload
export interface ActivityUpdate {
  title?: string;
  description?: string;
  metadata?: ActivityMetadata;
}

// Activity types
export type ActivityType =
  | "comment"
  | "call"
  | "email"
  | "meeting"
  | "task"
  | "status_change"
  | "note"
  | "file_upload"
  | "custom";

// Activity list parameters
export interface ActivityListParams {
  page?: number;
  page_size?: number;
  activity_type?: ActivityType;
  entity_type?: string;
  entity_id?: string;
  search?: string;
}

// Activity timeline response
export interface ActivityTimelineResponse {
  data: Activity[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Entity activities parameters
export interface EntityActivitiesParams {
  entity_type: string;
  entity_id: string;
  page?: number;
  page_size?: number;
  activity_type?: ActivityType;
}

// Activity metadata common structures
export interface ActivityMetadata {
  priority?: "low" | "medium" | "high";
  assigned_to?: string;
  [key: string]: unknown;
}

// Activity filters
export interface ActivityFilters {
  activity_types: ActivityType[];
  entity_types: string[];
  date_from?: string;
  date_to?: string;
  user_ids?: string[];
  search?: string;
}

// Activity statistics
export interface ActivityStats {
  total_activities: number;
  by_type: Record<ActivityType, number>;
  by_entity_type: Record<string, number>;
  recent_activities: Activity[];
}
