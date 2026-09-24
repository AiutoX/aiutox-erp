/**
 * Workflows API functions
 * Provides API integration for workflows module
 * Following frontend-api.md rules
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  Workflow,
  WorkflowCreate,
  WorkflowUpdate,
  WorkflowStep,
  WorkflowStepCreate,
  WorkflowExecution,
  WorkflowExecutionCreate,
  WorkflowListParams,
  WorkflowExecutionListParams,
} from "../types/workflow.types";

/**
 * List workflows with pagination and filters
 * GET /api/v1/workflows
 *
 * Requires: workflows.view permission
 */
export async function listWorkflows(
  params?: WorkflowListParams
): Promise<StandardListResponse<Workflow>> {
  const response = await apiClient.get<StandardListResponse<Workflow>>(
    "/workflows",
    {
      params: {
        page: params?.page || 1,
        page_size: params?.page_size || 20,
        enabled_only: params?.enabled_only,
      },
    }
  );
  return response.data;
}

/**
 * Get workflow by ID
 * GET /api/v1/workflows/{id}
 *
 * Requires: workflows.view permission
 */
export async function getWorkflow(
  id: string
): Promise<StandardResponse<Workflow>> {
  const response = await apiClient.get<StandardResponse<Workflow>>(
    `/workflows/${id}`
  );
  return response.data;
}

/**
 * Create new workflow
 * POST /api/v1/workflows
 *
 * Requires: workflows.manage permission
 */
export async function createWorkflow(
  payload: WorkflowCreate
): Promise<StandardResponse<Workflow>> {
  const response = await apiClient.post<StandardResponse<Workflow>>(
    "/workflows",
    payload
  );
  return response.data;
}

/**
 * Update existing workflow
 * PUT /api/v1/workflows/{id}
 *
 * Requires: workflows.manage permission
 */
export async function updateWorkflow(
  id: string,
  payload: WorkflowUpdate
): Promise<StandardResponse<Workflow>> {
  const response = await apiClient.put<StandardResponse<Workflow>>(
    `/workflows/${id}`,
    payload
  );
  return response.data;
}

/**
 * Delete workflow
 * DELETE /api/v1/workflows/{id}
 *
 * Requires: workflows.manage permission
 */
export async function deleteWorkflow(id: string): Promise<void> {
  await apiClient.delete(`/workflows/${id}`);
}

/**
 * List workflow steps
 * GET /api/v1/workflows/{workflow_id}/steps
 *
 * Requires: workflows.view permission
 */
export async function listWorkflowSteps(
  workflowId: string
): Promise<StandardListResponse<WorkflowStep>> {
  const response = await apiClient.get<StandardListResponse<WorkflowStep>>(
    `/workflows/${workflowId}/steps`
  );
  return response.data;
}

/**
 * Create workflow step
 * POST /api/v1/workflows/{workflow_id}/steps
 *
 * Requires: workflows.manage permission
 */
export async function createWorkflowStep(
  workflowId: string,
  payload: WorkflowStepCreate
): Promise<StandardResponse<WorkflowStep>> {
  const response = await apiClient.post<StandardResponse<WorkflowStep>>(
    `/workflows/${workflowId}/steps`,
    payload
  );
  return response.data;
}

/**
 * Start workflow execution
 * POST /api/v1/workflows/{workflow_id}/execute
 *
 * Requires: workflows.manage permission
 */
export async function startWorkflowExecution(
  workflowId: string,
  payload: WorkflowExecutionCreate
): Promise<StandardResponse<WorkflowExecution>> {
  const response = await apiClient.post<StandardResponse<WorkflowExecution>>(
    `/workflows/${workflowId}/execute`,
    payload
  );
  return response.data;
}

/**
 * List workflow executions
 * GET /api/v1/workflows/executions
 *
 * Requires: workflows.view permission
 */
export async function listWorkflowExecutions(
  params?: WorkflowExecutionListParams
): Promise<StandardListResponse<WorkflowExecution>> {
  const response = await apiClient.get<StandardListResponse<WorkflowExecution>>(
    "/workflows/executions",
    {
      params: {
        page: params?.page || 1,
        page_size: params?.page_size || 20,
        workflow_id: params?.workflow_id,
        status: params?.status,
        entity_type: params?.entity_type,
        entity_id: params?.entity_id,
      },
    }
  );
  return response.data;
}

/**
 * Get workflow execution by ID
 * GET /api/v1/workflows/executions/{execution_id}
 *
 * Requires: workflows.view permission
 */
export async function getWorkflowExecution(
  executionId: string
): Promise<StandardResponse<WorkflowExecution>> {
  const response = await apiClient.get<StandardResponse<WorkflowExecution>>(
    `/workflows/executions/${executionId}`
  );
  return response.data;
}

/**
 * Advance workflow execution
 * POST /api/v1/workflows/executions/{execution_id}/advance
 *
 * Requires: workflows.manage permission
 */
export async function advanceWorkflowExecution(
  executionId: string,
  action?: string
): Promise<StandardResponse<WorkflowExecution>> {
  const response = await apiClient.post<StandardResponse<WorkflowExecution>>(
    `/workflows/executions/${executionId}/advance`,
    null,
    {
      params: { action },
    }
  );
  return response.data;
}
