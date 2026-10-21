/**
 * Flow Editor Utils
 * Utility functions for converting between flow editor format and backend format
 */

import type { Node, Edge } from "reactflow";
import type { ApprovalNodeData } from "../types/flow-editor.types";
import type { ApprovalStepResponse } from "../types/approval.types";

/**
 * Convert flow editor nodes and edges to backend approval steps
 */
export function convertFlowToSteps(
  nodes: Node[],
  edges: Edge[],
  flowId: string
): Omit<
  ApprovalStepResponse,
  "id" | "tenant_id" | "created_at" | "updated_at"
>[] {
  const steps: Omit<
    ApprovalStepResponse,
    "id" | "tenant_id" | "created_at" | "updated_at"
  >[] = [];

  // Filter only approval nodes
  const approvalNodes = nodes.filter((node) => node.type === "approval");

  // Calculate step order based on connections
  const nodeOrder = calculateNodeOrder(nodes, edges);

  approvalNodes.forEach((node) => {
    const data = node.data as ApprovalNodeData;
    const stepOrder = nodeOrder[node.id] || 0;

    steps.push({
      flow_id: flowId,
      step_order: stepOrder,
      name: data.name,
      description: data.description,
      approver_type:
        data.approverType === "group" ? "dynamic" : data.approverType,
      approver_id: data.approvers[0] || null, // For now, use first approver
      approver_role: data.approverType === "role" ? data.approvers[0] : null,
      approver_rule: {
        type: data.approverType,
        approvers: data.approvers,
      },
      require_all: data.requireAll,
      min_approvals: data.minApprovals,
      form_schema: null,
      print_config: null,
      rejection_required: false,
    });
  });

  return steps;
}

/**
 * Convert backend approval steps to flow editor nodes and edges
 */
export function convertStepsToFlow(steps: ApprovalStepResponse[]): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Sort steps by order
  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);

  // Add start node
  nodes.push({
    id: "start",
    type: "start",
    position: { x: 0, y: 0 },
    data: {
      type: "start",
      name: "Inicio",
    },
  });

  // Add approval nodes
  sortedSteps.forEach((step, index) => {
    nodes.push({
      id: step.id,
      type: "approval",
      position: { x: 250 * (index + 1), y: 0 },
      data: {
        type: "approval",
        name: step.name,
        description: step.description,
        approverType: step.approver_type,
        approvers: step.approver_id ? [step.approver_id] : [],
        requireAll: step.require_all,
        minApprovals: step.min_approvals,
      },
    });
  });

  // Add end node
  if (sortedSteps.length > 0) {
    nodes.push({
      id: "end",
      type: "end",
      position: { x: 250 * (sortedSteps.length + 1), y: 0 },
      data: {
        type: "end",
        name: "Fin",
      },
    });
  }

  // Add edges
  if (nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      const sourceNode = nodes[i];
      const targetNode = nodes[i + 1];

      if (!sourceNode || !targetNode) continue;

      edges.push({
        id: `e${sourceNode.id}-${targetNode.id}`,
        source: sourceNode.id,
        target: targetNode.id,
        type: "smoothstep",
        animated: true,
      });
    }
  }

  return { nodes, edges };
}

/**
 * Calculate the order of nodes based on connections
 */
function calculateNodeOrder(
  nodes: Node[],
  edges: Edge[]
): Record<string, number> {
  const order: Record<string, number> = {};
  const visited = new Set<string>();

  // Find start node
  const startNode = nodes.find((node) => node.type === "start");
  if (!startNode) return order;

  // BFS to calculate order
  const queue: Array<{ nodeId: string; level: number }> = [
    { nodeId: startNode.id, level: 0 },
  ];

  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    if (nodeId !== startNode.id && nodeId !== "end") {
      order[nodeId] = level;
    }

    // Find connected nodes
    const connectedEdges = edges.filter((edge) => edge.source === nodeId);
    connectedEdges.forEach((edge) => {
      queue.push({ nodeId: edge.target, level: level + 1 });
    });
  }

  return order;
}

/**
 * Validate flow structure
 */
export function validateFlowStructure(
  nodes: Node[],
  edges: Edge[]
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for start node
  const hasStartNode = nodes.some((node) => node.type === "start");
  if (!hasStartNode) {
    errors.push("El flujo debe tener un nodo de inicio");
  }

  // Check for end node
  const hasEndNode = nodes.some((node) => node.type === "end");
  if (!hasEndNode) {
    errors.push("El flujo debe tener un nodo de fin");
  }

  // Check for at least one approval node
  const hasApprovalNode = nodes.some((node) => node.type === "approval");
  if (!hasApprovalNode) {
    errors.push("El flujo debe tener al menos un nodo de aprobación");
  }

  // Check for orphaned nodes
  const connectedNodeIds = new Set<string>();
  edges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });
  const orphanedNodes = nodes.filter(
    (node) => !connectedNodeIds.has(node.id) && node.type !== "start"
  );
  if (orphanedNodes.length > 0) {
    errors.push(
      `${orphanedNodes.length} nodo${orphanedNodes.length !== 1 ? "s" : ""} sin conexiones`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
