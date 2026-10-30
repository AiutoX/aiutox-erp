/**
 * Activity Icon Configuration Types
 * Types for activity icon configuration management
 */

export interface ActivityIconConfig {
  id: string;
  tenant_id: string;
  activity_type: string;
  status: string;
  icon: string;
  class_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityIconConfigCreate {
  activity_type: string;
  status: string;
  icon: string;
  class_name?: string;
}

export interface ActivityIconConfigUpdate {
  activity_type?: string;
  status?: string;
  icon?: string;
  class_name?: string;
  is_active?: boolean;
}

export interface ActivityIconConfigBulkUpdate {
  configs: Record<string, Record<string, string>>;
}

export interface ActivityIconsState {
  configs: Record<string, Record<string, ActivityIconConfig>>;
  loading: boolean;
  error: string | null;
}

export interface DefaultIconConfig {
  icon: string;
  class_name?: string;
}

export type ActivityType =
  | "task"
  | "meeting"
  | "event"
  | "project"
  | "workflow";
export type ActivityStatus =
  | "todo"
  | "pending"
  | "in_progress"
  | "done"
  | "completed"
  | "canceled"
  | "blocked";
