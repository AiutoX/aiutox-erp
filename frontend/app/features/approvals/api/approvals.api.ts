/**
 * Approvals API functions
 * Provides API integration for approvals module
 * Aligned with backend schemas from backend/app/schemas/approval.py
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  ApprovalFlowResponse,
  ApprovalFlowCreate,
  ApprovalFlowUpdate,
  ApprovalStepResponse,
  ApprovalStepCreate,
  ApprovalRequestResponse,
  ApprovalRequestCreate,
  ApproveRequestRequest,
  RejectRequestRequest,
  DelegateRequestRequest,
  ListApprovalRequestsParams,
  ApprovalStats,
  ApprovalTimelineItem,
  ListApprovalFlowsParams,
  ApprovalWidgetData,
  EntityApprovalStatus,
  CanApproveResponse,
} from "~/features/approvals/types/approval.types";

/**
 * List approval requests
 * GET /api/v1/approvals/requests
 */
export async function listApprovalRequests(
  params?: ListApprovalRequestsParams
): Promise<StandardListResponse<ApprovalRequestResponse>> {
  const response = await apiClient.get<
    StandardListResponse<ApprovalRequestResponse>
  >("/approvals/requests", { params });
  return response.data;
}

/**
 * Get approval request by ID
 * GET /api/v1/approvals/requests/{request_id}
 */
export async function getApprovalRequest(
  requestId: string
): Promise<StandardResponse<ApprovalRequestResponse>> {
  const response = await apiClient.get<
    StandardResponse<ApprovalRequestResponse>
  >(`/approvals/requests/${requestId}`);
  return response.data;
}

/**
 * Create approval request
 * POST /api/v1/approvals/requests
 */
export async function createApprovalRequest(
  data: ApprovalRequestCreate
): Promise<StandardResponse<ApprovalRequestResponse>> {
  const response = await apiClient.post<
    StandardResponse<ApprovalRequestResponse>
  >("/approvals/requests", data);
  return response.data;
}

/**
 * Approve request
 * POST /api/v1/approvals/requests/{request_id}/approve
 */
export async function approveRequest(
  requestId: string,
  data: ApproveRequestRequest
): Promise<StandardResponse<ApprovalRequestResponse>> {
  const response = await apiClient.post<
    StandardResponse<ApprovalRequestResponse>
  >(`/approvals/requests/${requestId}/approve`, data);
  return response.data;
}

/**
 * Reject request
 * POST /api/v1/approvals/requests/{request_id}/reject
 */
export async function rejectRequest(
  requestId: string,
  data: RejectRequestRequest
): Promise<StandardResponse<ApprovalRequestResponse>> {
  const response = await apiClient.post<
    StandardResponse<ApprovalRequestResponse>
  >(`/approvals/requests/${requestId}/reject`, data);
  return response.data;
}

/**
 * Delegate request
 * POST /api/v1/approvals/requests/{request_id}/delegate
 */
export async function delegateRequest(
  requestId: string,
  data: DelegateRequestRequest
): Promise<StandardResponse<ApprovalRequestResponse>> {
  const response = await apiClient.post<
    StandardResponse<ApprovalRequestResponse>
  >(`/approvals/requests/${requestId}/delegate`, data);
  return response.data;
}

/**
 * Cancel request
 * POST /api/v1/approvals/requests/{request_id}/cancel
 */
export async function cancelApprovalRequest(
  requestId: string
): Promise<StandardResponse<ApprovalRequestResponse>> {
  const response = await apiClient.post<
    StandardResponse<ApprovalRequestResponse>
  >(`/approvals/requests/${requestId}/cancel`);
  return response.data;
}

/**
 * Get approval stats
 * GET /api/v1/approvals/stats
 */
export async function getApprovalStats(): Promise<
  StandardResponse<ApprovalStats>
> {
  const response =
    await apiClient.get<StandardResponse<ApprovalStats>>("/approvals/stats");
  return response.data;
}

/**
 * Get request timeline
 * GET /api/v1/approvals/requests/{request_id}/timeline
 */
export async function getRequestTimeline(
  requestId: string
): Promise<StandardResponse<ApprovalTimelineItem[]>> {
  const response = await apiClient.get<
    StandardResponse<ApprovalTimelineItem[]>
  >(`/approvals/requests/${requestId}/timeline`);
  return response.data;
}

/**
 * List approval flows
 * GET /api/v1/approvals/flows
 */
export async function listApprovalFlows(
  params?: ListApprovalFlowsParams
): Promise<StandardListResponse<ApprovalFlowResponse>> {
  const response = await apiClient.get<
    StandardListResponse<ApprovalFlowResponse>
  >("/approvals/flows", { params });
  return response.data;
}

/**
 * Get approval flow by ID
 * GET /api/v1/approvals/flows/{flow_id}
 */
export async function getApprovalFlow(
  flowId: string
): Promise<StandardResponse<ApprovalFlowResponse>> {
  const response = await apiClient.get<StandardResponse<ApprovalFlowResponse>>(
    `/approvals/flows/${flowId}`
  );
  return response.data;
}

/**
 * Create approval flow
 * POST /api/v1/approvals/flows
 */
export async function createApprovalFlow(
  data: ApprovalFlowCreate
): Promise<StandardResponse<ApprovalFlowResponse>> {
  const response = await apiClient.post<StandardResponse<ApprovalFlowResponse>>(
    "/approvals/flows",
    data
  );
  return response.data;
}

/**
 * Update approval flow
 * PUT /api/v1/approvals/flows/{flow_id}
 */
export async function updateApprovalFlow(
  flowId: string,
  data: ApprovalFlowUpdate
): Promise<StandardResponse<ApprovalFlowResponse>> {
  const response = await apiClient.put<StandardResponse<ApprovalFlowResponse>>(
    `/approvals/flows/${flowId}`,
    data
  );
  return response.data;
}

/**
 * Update flow steps
 * PUT /api/v1/approvals/flows/{flow_id}/steps
 */
export async function updateFlowSteps(
  flowId: string,
  steps: ApprovalStepCreate[]
): Promise<StandardResponse<ApprovalStepResponse[]>> {
  const response = await apiClient.put<
    StandardResponse<ApprovalStepResponse[]>
  >(`/approvals/flows/${flowId}/steps`, steps);
  return response.data;
}

/**
 * Delete approval flow
 * DELETE /api/v1/approvals/flows/{flow_id}
 */
export async function deleteApprovalFlow(
  flowId: string
): Promise<StandardResponse<null>> {
  const response = await apiClient.delete<StandardResponse<null>>(
    `/approvals/flows/${flowId}`
  );
  return response.data;
}

/**
 * Get or create request by entity
 * POST /api/v1/approvals/requests/by-entity
 */
export async function getOrCreateRequestByEntity(params: {
  entity_type: string;
  entity_id: string;
  auto_create?: boolean;
  flow_id?: string;
  title?: string;
  description?: string;
}): Promise<StandardResponse<ApprovalRequestResponse>> {
  const response = await apiClient.post<
    StandardResponse<ApprovalRequestResponse>
  >("/approvals/requests/by-entity", null, { params });
  return response.data;
}

/**
 * Get widget data for a request
 * GET /api/v1/approvals/requests/{request_id}/widget-data
 */
export async function getRequestWidgetData(
  requestId: string
): Promise<StandardResponse<ApprovalWidgetData>> {
  const response = await apiClient.get<StandardResponse<ApprovalWidgetData>>(
    `/approvals/requests/${requestId}/widget-data`
  );
  return response.data;
}

/**
 * Get entity approval status
 * GET /api/v1/approvals/requests/by-entity-status
 */
export async function getEntityApprovalStatus(params: {
  entity_type: string;
  entity_id: string;
}): Promise<StandardResponse<EntityApprovalStatus>> {
  const response = await apiClient.get<StandardResponse<EntityApprovalStatus>>(
    "/approvals/requests/by-entity-status",
    { params }
  );
  return response.data;
}

/**
 * Check if user can approve a request
 * GET /api/v1/approvals/requests/{request_id}/can-approve
 */
export async function checkUserCanApprove(
  requestId: string
): Promise<StandardResponse<CanApproveResponse>> {
  const response = await apiClient.get<StandardResponse<CanApproveResponse>>(
    `/approvals/requests/${requestId}/can-approve`
  );
  return response.data;
}
