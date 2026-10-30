/**
 * Approvals types for AiutoX ERP
 * Aligned with backend schemas from backend/app/schemas/approval.py
 */

// Approval Flow types
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
  steps?: ApprovalStepResponse[];
}

export interface ApprovalFlowResponse extends ApprovalFlowBase {
  id: string;
  tenant_id: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  steps?: ApprovalStepResponse[];
}

// Approval Step types
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
  form_schema?: Record<string, unknown> | null;
  print_config?: Record<string, unknown> | null;
  rejection_required?: boolean;
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

// Approval Request types
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

// Approval Action types
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

// Approval Delegation types
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

// Approval Stats types
export interface ApprovalStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  delegated_requests: number;
  cancelled_requests: number;
  avg_approval_time_hours?: number | null;
}

// Approval Timeline types
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
  rejection_reason?: string | null;
  form_data?: Record<string, unknown> | null;
  acted_by?: string | null;
  acted_at: string;
  metadata?: Record<string, unknown> | null;
}

// Approve/Reject request types
export interface ApproveRequestRequest {
  comment?: string | null;
  rejection_reason?: string | null;
  form_data?: Record<string, unknown> | null;
}

export interface RejectRequestRequest {
  comment?: string | null;
  rejection_reason?: string | null;
  form_data?: Record<string, unknown> | null;
}

// Delegate request types
export interface DelegateRequestRequest {
  to_user_id: string;
  reason?: string | null;
  expires_at?: string | null;
}

// Query params for listing requests
export interface ListApprovalRequestsParams {
  page?: number;
  page_size?: number;
  status?: "pending" | "approved" | "rejected" | "delegated" | "cancelled";
  entity_type?: string;
  requested_by?: string;
}

// Query params for listing flows
export interface ListApprovalFlowsParams {
  page?: number;
  page_size?: number;
  module?: string;
  is_active?: boolean;
}

// Legacy types for backward compatibility (deprecated)
export type ApprovalFlow = ApprovalFlowResponse;
export type ApprovalRequest = ApprovalRequestResponse;
export type ApprovalStep = ApprovalStepResponse;
export interface ApprovalDecision {
  action: "approve" | "reject" | "delegate";
  delegated_to?: string;
  comments?: string;
}
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "delegated"
  | "cancelled";
export type ApproverType = "user" | "role" | "dynamic";
export interface ApproverConfig {
  user_id?: string;
  role_id?: string;
  min_approvals?: number;
}
export type ApprovalFlowListParams = ListApprovalFlowsParams;
export type ApprovalRequestListParams = ListApprovalRequestsParams;
export interface ApprovalRequestUpdate {
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// Integration types for widgets and entity-based operations
export interface ApprovalWidgetData {
  request: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    current_step: number;
    entity_type: string;
    entity_id: string;
    requested_by?: string | null;
    requested_at: string;
    completed_at?: string | null;
  };
  flow: {
    id: string;
    name: string;
    flow_type: string;
  };
  current_step: {
    id?: string | null;
    step_order?: number | null;
    name?: string | null;
    description?: string | null;
    approver_type?: string | null;
    rejection_required?: boolean;
  } | null;
  permissions: {
    can_approve: boolean;
  };
  timeline: ApprovalTimelineItem[];
}

export interface EntityApprovalStatus {
  has_request: boolean;
  status: string | null;
  current_step: number | null;
  request_id: string | null;
  flow_name?: string | null;
}

export interface CanApproveResponse {
  can_approve: boolean;
  current_step: {
    id?: string | null;
    step_order?: number | null;
    name?: string | null;
    description?: string | null;
    approver_type?: string | null;
    rejection_required?: boolean;
  } | null;
  request_status: string;
}
