/**
 * API services for approvals endpoints
 */

import apiClient from "./client";
import type {
  StandardResponse,
  StandardListResponse,
} from "./types/common.types";
import type {
  ApprovalRequestResponse,
  ApprovalRequestCreate,
  ApproveRequestRequest,
  RejectRequestRequest,
  DelegateRequestRequest,
  ListApprovalRequestsParams,
  ApprovalStats,
  ApprovalTimelineItem,
} from "./types/auth.types";

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
