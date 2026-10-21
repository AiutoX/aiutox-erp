/**
 * Flow Editor Types
 * Types for the visual flow editor
 */

import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from "reactflow";

// Node types
export type FlowNodeType = "approval" | "concentrator" | "start" | "end";

// Approver types
export type ApproverType = "user" | "role" | "group";

// Condition operators
export type ConditionOperator =
  | "eq"
  | "ne"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "in"
  | "not_in"
  | "contains";

// Condition rule
export interface ConditionRule {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

// Condition for edge
export interface EdgeCondition {
  logic: "AND" | "OR";
  rules: ConditionRule[];
}

// Approval node data
export interface ApprovalNodeData {
  type: "approval";
  name: string;
  description?: string;
  approverType: ApproverType;
  approvers: string[]; // IDs of users/roles/groups
  requireAll: boolean;
  minApprovals?: number;
}

// Concentrator node data
export interface ConcentratorNodeData {
  type: "concentrator";
  name: string;
  requireAll: boolean;
  minApprovals: number;
}

// Start/End node data
export interface StartEndNodeData {
  type: "start" | "end";
  name: string;
}

// Flow node data (union of all node types)
export type FlowNodeData =
  | ApprovalNodeData
  | ConcentratorNodeData
  | StartEndNodeData;

// Flow node
export interface FlowNode extends Omit<ReactFlowNode, "data"> {
  type: FlowNodeType;
  data: FlowNodeData;
}

// Flow edge with condition
export interface FlowEdge extends Omit<ReactFlowEdge, "data"> {
  data?: {
    condition?: EdgeCondition;
  };
}

// User/Role/Group for selectors
export interface ApproverOption {
  id: string;
  name: string;
  type: "user" | "role" | "group";
  avatar?: string;
}

// Flow validation result
export interface FlowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Flow statistics
export interface FlowStats {
  totalNodes: number;
  approvalNodes: number;
  concentratorNodes: number;
  maxDepth: number;
  hasCycles: boolean;
}
