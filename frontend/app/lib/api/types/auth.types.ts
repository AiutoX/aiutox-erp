/**
 * Types for authentication and token management
 *
 * These types align with the backend API contract defined in `rules/auth-rbac.md`
 * and `rules/api-contract.md`.
 */

/**
 * Response from login endpoint
 * POST /api/v1/auth/login
 */
export interface TokenResponse {
  /** Access token (JWT) - default 60 min; override via ACCESS_TOKEN_EXPIRE_MINUTES (backend) + VITE_TOKEN_REFRESH_MARGIN_MINUTES (frontend) */
  access_token: string;
  /** Refresh token (JWT) - 7 days standard, 30 days with remember_me; override via REFRESH_TOKEN_EXPIRE_DAYS / REFRESH_TOKEN_REMEMBER_ME_DAYS (backend) */
  refresh_token: string;
  /** Token type, typically "bearer" */
  token_type: string;
}

/**
 * Response from refresh token endpoint
 * POST /api/v1/auth/refresh
 */
export interface RefreshTokenResponse {
  /** New access token (JWT) - same duration as original; configurable via ACCESS_TOKEN_EXPIRE_MINUTES (backend) */
  access_token: string;
  /** Token type, typically "bearer" */
  token_type: string;
}

/**
 * Request body for refresh token endpoint
 * POST /api/v1/auth/refresh
 */
export interface RefreshTokenRequest {
  /** Refresh token to use for renewal */
  refresh_token: string;
}

/**
 * Types for approvals module
 * Aligned with backend schemas from backend/app/schemas/approval.py
 */

/**
 * Approval Flow types
 */
export interface ApprovalFlowBase {
  name: string;
  description?: string | null;
  flow_type: "sequential" | "parallel" | "conditional";
  module: string;
  conditions?: Record<string, unknown> | null;
  is_active: boolean;
}

export type ApprovalFlowCreate = ApprovalFlowBase;

export interface ApprovalFlowUpdate {
  name?: string | null;
  description?: string | null;
  flow_type?: "sequential" | "parallel" | "conditional" | null;
  conditions?: Record<string, unknown> | null;
  is_active?: boolean | null;
}

export interface ApprovalFlowResponse extends ApprovalFlowBase {
  id: string;
  tenant_id: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Approval Step types
 */
export interface ApprovalStepBase {
  flow_id: string;
  step_order: number;
  name: string;
  description?: string | null;
  approver_type: "user" | "role" | "dynamic";
  approver_id?: string | null;
  approver_role?: string | null;
  approver_rule?: Record<string, unknown> | null;
  require_all: boolean;
  min_approvals?: number | null;
}

export type ApprovalStepCreate = ApprovalStepBase;

export interface ApprovalStepUpdate {
  step_order?: number | null;
  name?: string | null;
  description?: string | null;
  approver_type?: "user" | "role" | "dynamic" | null;
  approver_id?: string | null;
  approver_role?: string | null;
  approver_rule?: Record<string, unknown> | null;
  require_all?: boolean | null;
  min_approvals?: number | null;
}

export interface ApprovalStepResponse extends ApprovalStepBase {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Approval Request types
 */
export interface ApprovalRequestBase {
  flow_id: string;
  title: string;
  description?: string | null;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown> | null;
}

export type ApprovalRequestCreate = ApprovalRequestBase;

export interface ApprovalRequestResponse extends ApprovalRequestBase {
  id: string;
  tenant_id: string;
  status: "pending" | "approved" | "rejected" | "delegated" | "cancelled";
  current_step: number;
  requested_by?: string | null;
  requested_at: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  request_metadata?: Record<string, unknown> | null;
}

/**
 * Approval Action types
 */
export interface ApprovalActionBase {
  request_id: string;
  action_type: "approve" | "reject" | "delegate" | "comment";
  step_order: number;
  comment?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type ApprovalActionCreate = ApprovalActionBase;

export interface ApprovalActionResponse extends ApprovalActionBase {
  id: string;
  tenant_id: string;
  acted_by?: string | null;
  acted_at: string;
}

/**
 * Approval Delegation types
 */
export interface ApprovalDelegationBase {
  request_id: string;
  from_user_id: string;
  to_user_id: string;
  reason?: string | null;
  expires_at?: string | null;
}

export type ApprovalDelegationCreate = ApprovalDelegationBase;

export interface ApprovalDelegationResponse extends ApprovalDelegationBase {
  id: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Approval Stats types
 */
export interface ApprovalStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  delegated_requests: number;
  cancelled_requests: number;
  avg_approval_time_hours?: number | null;
}

/**
 * Approval Timeline types
 */
export interface ApprovalTimelineItem {
  id: string;
  request_id: string;
  action_type:
    | "approve"
    | "reject"
    | "delegate"
    | "comment"
    | "created"
    | "cancelled";
  step_order: number;
  comment?: string | null;
  acted_by?: string | null;
  acted_at: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * Approve/Reject request types
 */
export interface ApproveRequestRequest {
  comment?: string | null;
}

export interface RejectRequestRequest {
  comment?: string | null;
}

/**
 * Delegate request types
 */
export interface DelegateRequestRequest {
  to_user_id: string;
  reason?: string | null;
  expires_at?: string | null;
}

/**
 * Query params for listing requests
 */
export interface ListApprovalRequestsParams {
  page?: number;
  page_size?: number;
  status?: "pending" | "approved" | "rejected" | "delegated" | "cancelled";
  entity_type?: string;
  requested_by?: string;
}

/**
 * Query params for listing flows
 */
export interface ListApprovalFlowsParams {
  page?: number;
  page_size?: number;
  module?: string;
  is_active?: boolean;
}
