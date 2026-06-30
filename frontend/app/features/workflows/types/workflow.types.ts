/**
 * Workflow types for AiutoX ERP
 * Aligned with backend schemas in app/schemas/task.py
 */

/**
 * Workflow definition structure
 */
export interface WorkflowDefinition {
  steps: WorkflowStep[];
  metadata?: Record<string, unknown>;
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  id: string;
  workflow_id: string;
  tenant_id: string;
  name: string;
  step_type: string;
  order: number;
  config: Record<string, unknown> | null;
  transitions: Record<string, unknown>[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * Workflow
 */
export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  definition: WorkflowDefinition;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Workflow creation payload
 */
export interface WorkflowCreate {
  name: string;
  description?: string | null;
  enabled?: boolean;
  definition: WorkflowDefinition;
  metadata?: Record<string, unknown> | null;
}

/**
 * Workflow update payload
 */
export interface WorkflowUpdate {
  name?: string;
  description?: string | null;
  enabled?: boolean;
  definition?: WorkflowDefinition;
  metadata?: Record<string, unknown> | null;
}

/**
 * Workflow step creation payload
 */
export interface WorkflowStepCreate {
  workflow_id: string;
  name: string;
  step_type: string;
  order: number;
  config?: Record<string, unknown> | null;
  transitions?: Record<string, unknown>[] | null;
}

/**
 * Workflow execution
 */
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  tenant_id: string;
  status: string;
  current_step_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  execution_data: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

/**
 * Workflow execution creation payload
 */
export interface WorkflowExecutionCreate {
  workflow_id: string;
  entity_type?: string | null;
  entity_id?: string | null;
  execution_data?: Record<string, unknown> | null;
}

/**
 * Workflow list parameters
 */
export interface WorkflowListParams {
  page?: number;
  page_size?: number;
  enabled_only?: boolean;
  search?: string;
}

/**
 * Workflow execution list parameters
 */
export interface WorkflowExecutionListParams {
  page?: number;
  page_size?: number;
  workflow_id?: string;
  status?: string;
  entity_type?: string;
  entity_id?: string;
}

/**
 * Workflow step creation payload (without workflow_id for forms)
 */
export interface WorkflowStepFormData {
  name: string;
  step_type: string;
  order: number;
  config?: Record<string, unknown> | null;
  transitions?: Record<string, unknown>[] | null;
}

/**
 * Workflow status values
 */
export type WorkflowExecutionStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Workflow step type values
 */
export type WorkflowStepType =
  | "manual"
  | "automatic"
  | "approval"
  | "notification"
  | "task"
  | "condition"
  | "parallel"
  | "subworkflow";
