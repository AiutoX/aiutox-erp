/**
 * Approvals module public exports
 * Provides reusable components, hooks, and API functions for integration with other modules
 */

// Types
export type {
  ApprovalFlowResponse,
  ApprovalFlowCreate,
  ApprovalFlowUpdate,
  ApprovalRequestResponse,
  ApprovalRequestCreate,
  ApprovalStatus,
  ApproverType,
  ApprovalWidgetData,
  EntityApprovalStatus,
  CanApproveResponse,
  ApprovalTimelineItem,
} from "./types/approval.types";

// API functions
export {
  listApprovalFlows,
  getApprovalFlow,
  createApprovalFlow,
  updateApprovalFlow,
  deleteApprovalFlow,
  listApprovalRequests,
  getApprovalRequest,
  createApprovalRequest,
  cancelApprovalRequest,
  approveRequest,
  rejectRequest,
  delegateRequest,
  getApprovalStats,
  getRequestTimeline,
  getOrCreateRequestByEntity,
  getRequestWidgetData,
  getEntityApprovalStatus,
  checkUserCanApprove,
} from "./api/approvals.api";

// Hooks
export {
  useApprovalFlows,
  useApprovalFlow,
  useApprovalRequests,
  useApprovalRequest,
  useApprovalStats,
  useRequestTimeline,
  useCreateApprovalFlow,
  useUpdateApprovalFlow,
  useDeleteApprovalFlow,
  useCreateApprovalRequest,
  useCancelApprovalRequest,
  useApproveRequest,
  useRejectRequest,
  useDelegateRequest,
  useApprovalWidget,
  useEntityApprovalStatus,
  useCanApproveRequest,
} from "./hooks/useApprovals";

// Components
export { ApprovalActionButtons } from "./components/ApprovalActionButtons";
export { ApprovalFlowForm } from "./components/ApprovalFlowForm";
export { ApprovalFlowList } from "./components/ApprovalFlowList";
export { ApprovalFlowVisualizer } from "./components/ApprovalFlowVisualizer";
export { ApprovalFlowConfigPanel } from "./components/ApprovalFlowConfigPanel";
export { ApprovalQuickActionModal } from "./components/ApprovalQuickActionModal";
export { ApprovalRequestCard } from "./components/ApprovalRequestCard";
export { ApprovalRequestForm } from "./components/ApprovalRequestForm";
export { ApprovalRequestList } from "./components/ApprovalRequestList";
export { ApprovalStats } from "./components/ApprovalStats";
export { ApprovalStepsForm } from "./components/ApprovalStepsForm";
export { ApprovalWidget } from "./components/ApprovalWidget";
export { ApprovalStatusBadge } from "./components/ApprovalStatusBadge";
export { ApprovalTimeline } from "./components/ApprovalTimeline";
