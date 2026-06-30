/**
 * Task types for AiutoX ERP
 * Based on docs/40-modules/tasks.md
 */

// Base task types
export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  assigned_to_id: string | null; // UUID from backend (legacy, use assignments)
  created_by_id: string | null; // UUID from backend
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  start_at?: string | null;
  end_at?: string | null;
  all_day?: boolean;
  tag_ids?: string[] | null;
  color_override?: string | null;
  completed_at?: string;
  checklist: ChecklistItem[];
  checklist_items?: ChecklistItem[]; // Alias for backend compatibility
  metadata?: Record<string, unknown>;
  // Board view and templates (Fase 1)
  status_id?: string | null; // Reference to TaskStatus
  board_order?: number | null; // Order in board view
  template_id?: string | null; // Reference to TaskTemplate
  // Multi-module integration
  source_module?: string; // e.g., 'projects', 'workflows'
  source_id?: string; // ID of source entity
  source_context?: Record<string, unknown>; // Additional context from source module
  // Subtask hierarchy
  parent_task_id?: string | null;
  subtasks?: Task[];
  // Legacy fields (kept for backward compatibility)
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
  updated_at: string;
}

// Task creation payload
export interface TaskCreate {
  title: string;
  description: string;
  assigned_to_id: string | null; // UUID from backend (legacy)
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  start_at?: string | null;
  end_at?: string | null;
  all_day?: boolean;
  tag_ids?: string[] | null;
  color_override?: string | null;
  checklist?: ChecklistItem[];
  metadata?: Record<string, unknown>;
  // Multi-module integration
  source_module?: string;
  source_id?: string;
  source_context?: Record<string, unknown>;
  // Subtask hierarchy
  parent_task_id?: string | null;
  // Legacy fields
  related_entity_type?: string;
  related_entity_id?: string;
}

// Task update payload
export interface TaskUpdate {
  title?: string;
  description?: string;
  assigned_to_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  start_at?: string | null;
  end_at?: string | null;
  all_day?: boolean;
  tag_ids?: string[] | null;
  color_override?: string | null;
  checklist?: ChecklistItem[];
  metadata?: Record<string, unknown>;
  // Board view and templates (Fase 1)
  status_id?: string | null;
  board_order?: number | null;
  template_id?: string | null;
  // Subtask hierarchy
  parent_task_id?: string | null;
  // Multi-module integration
  source_module?: string;
  source_id?: string;
  source_context?: Record<string, unknown>;
}

// Task list parameters
export interface TaskListParams {
  page?: number;
  page_size?: number;
  status?: TaskStatus;
  assigned_to_id?: string; // UUID from backend
  priority?: TaskPriority;
}

// Task template types
export interface TaskTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  category?: string;
  estimated_hours?: number;
  default_status_id?: string;
  checklist_items?: ChecklistItem[];
  usage_count?: number;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplateCreate {
  name: string;
  description: string;
  category?: string;
  estimated_hours?: number;
  default_status_id?: string;
  checklist_items?: ChecklistItem[];
}

// Task assignment types
export interface TaskAssignment {
  id: string;
  task_id: string;
  assigned_to_id?: string;
  assigned_to_group_id?: string;
  assigned_by_id?: string;
  assigned_at?: string;
  created_by_id: string;
  updated_by_id?: string;
  role?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignmentCreate {
  task_id: string;
  assigned_to_id?: string;
  assigned_to_group_id?: string;
  role?: string;
  notes?: string;
  created_by_id: string; // Added for backend compatibility
  updated_by_id?: string;
}

// Checklist item
export interface ChecklistItem {
  id: string;
  title: string; // Backend uses 'title', not 'text'
  completed: boolean;
  completed_at?: string;
}

// Workflow types
export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  definition: WorkflowDefinition;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Workflow creation payload
export interface WorkflowCreate {
  name: string;
  description: string;
  definition: WorkflowDefinition;
  is_active?: boolean;
}

// Workflow update payload
export interface WorkflowUpdate {
  name?: string;
  description?: string;
  definition?: WorkflowDefinition;
  is_active?: boolean;
}

// Workflow definition
export interface WorkflowDefinition {
  steps: WorkflowStep[];
}

// Workflow step
export interface WorkflowStep {
  step_number: number;
  name: string;
  status: string;
  transitions: string[];
  conditions?: Record<string, unknown>;
}

// Workflow execution payload
export interface WorkflowExecute {
  workflow_id: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}

// Task and workflow list parameters
export interface TaskWorkflowListParams {
  page?: number;
  page_size?: number;
  search?: string;
}

// Task statistics
export interface TaskStats {
  total_tasks: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
  overdue_count: number;
  completed_today: number;
}

// Task module settings (tenant-level)
export interface TaskModuleSettings {
  calendar_enabled: boolean;
  board_enabled: boolean;
  inbox_enabled: boolean;
  list_enabled: boolean;
  stats_enabled: boolean;
}

export interface TaskModuleSettingsUpdate {
  calendar_enabled?: boolean;
  board_enabled?: boolean;
  inbox_enabled?: boolean;
  list_enabled?: boolean;
  stats_enabled?: boolean;
}

// Task status values
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "on_hold"
  | "blocked"
  | "review"
  | "done"
  | "cancelled";

// Task priority values
export type TaskPriority = "low" | "medium" | "high" | "urgent";

// Agenda item types
export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  source: string;
  source_id?: string;
  type: "task" | "event" | "meeting" | "deadline";
  status?: string;
  priority?: TaskPriority;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Agenda list parameters
export interface AgendaListParams {
  start_date?: string;
  end_date?: string;
  sources?: string;
}

// Calendar source types
export interface CalendarSource {
  id: string;
  name: string;
  type: "internal" | "external" | "google" | "outlook" | "calDAV";
  enabled: boolean;
  color?: string;
  url?: string;
  credentials?: Record<string, unknown>;
  sync_enabled: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

// Calendar source preferences
export interface CalendarSourcePreferences {
  enabled_sources: string[];
  default_colors: Record<string, string>;
  sync_intervals: Record<string, number>;
  display_options: {
    show_completed: boolean;
    show_cancelled: boolean;
    group_by_source: boolean;
  };
}

// Saved view types
export interface SavedView {
  id: string;
  name: string;
  description?: string;
  filters: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    assigned_to_id?: string[];
    date_range?: {
      start: string;
      end: string;
    };
  };
  sort_config: {
    field: string;
    direction: "asc" | "desc";
  };
  column_config: Record<
    string,
    {
      visible: boolean;
      width?: number;
      order: number;
    }
  >;
  is_default: boolean;
  is_public: boolean;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

// View creation payload
export interface ViewCreate {
  name: string;
  description?: string;
  filters: SavedView["filters"];
  sort_config: SavedView["sort_config"];
  column_config: SavedView["column_config"];
  is_default?: boolean;
  is_public?: boolean;
}
