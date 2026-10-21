/**
 * Automation Flow Editor Utils
 * Converts between AutomationRule (backend format) and ReactFlow nodes/edges.
 */

import type { Node, Edge } from "reactflow";
import type {
  AutomationRuleCreate,
  AutomationTrigger,
  AutomationCondition,
  AutomationAction,
} from "../types/automation.types";
import type { TriggerNodeData } from "../components/nodes/TriggerNode";
import type { ConditionNodeData } from "../components/nodes/ConditionNode";
import type { ActionNodeData } from "../components/nodes/ActionNode";

// ─── Node ID helpers ────────────────────────────────────────────────────────

const TRIGGER_ID = "trigger-0";
const conditionId = (i: number) => `condition-${i}`;
const actionId = (i: number) => `action-${i}`;

// ─── convertRuleToFlow ───────────────────────────────────────────────────────

/**
 * Convert an AutomationRule to ReactFlow nodes and edges.
 *
 * Layout (left-to-right, single row):
 *   TriggerNode  →  ConditionNode(s)  →  ActionNode(s)
 *
 * All action nodes connect from the last condition node (or from trigger if no conditions).
 */
export function convertRuleToFlow(rule: {
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const X_STEP = 260;
  let col = 0;

  // ── Trigger node ────────────────────────────────────────────────────────
  const triggerData: TriggerNodeData = {
    trigger_type: rule.trigger.type,
    event_type: rule.trigger.event_type,
    entity_type: rule.trigger.entity_type,
    schedule: rule.trigger.schedule,
    label: "Disparador",
  };
  nodes.push({
    id: TRIGGER_ID,
    type: "trigger",
    position: { x: col * X_STEP, y: 0 },
    data: triggerData,
  });
  col++;

  // ── Condition nodes ─────────────────────────────────────────────────────
  const conditionIds: string[] = [];
  for (let i = 0; i < rule.conditions.length; i++) {
    const cond = rule.conditions[i]!;
    const id = conditionId(i);
    conditionIds.push(id);

    const condData: ConditionNodeData = {
      field: cond.field,
      operator: cond.operator,
      value: cond.value,
      logical_operator: cond.logical_operator,
      label: `Condición ${i + 1}`,
    };
    nodes.push({
      id,
      type: "condition",
      position: { x: col * X_STEP, y: 0 },
      data: condData,
    });

    // Edge from previous node
    const sourceId = i === 0 ? TRIGGER_ID : conditionId(i - 1);
    edges.push({
      id: `e-${sourceId}-${id}`,
      source: sourceId,
      target: id,
      type: "smoothstep",
      animated: true,
    });

    col++;
  }

  // ── Action nodes ────────────────────────────────────────────────────────
  // All actions connect from the last condition (or trigger if no conditions)
  const lastSourceId =
    conditionIds.length > 0
      ? conditionIds[conditionIds.length - 1]!
      : TRIGGER_ID;

  for (let i = 0; i < rule.actions.length; i++) {
    const action = rule.actions[i]!;
    const id = actionId(i);

    const actionData: ActionNodeData = {
      type: action.type,
      channel: action.channel,
      template: action.template,
      webhook_url: action.webhook_url,
      event_type: action.event_type,
      label: `Acción ${i + 1}`,
    };
    nodes.push({
      id,
      type: "action",
      // Fan out actions vertically when multiple, offset x slightly
      position: { x: col * X_STEP, y: i * 130 },
      data: actionData,
    });

    edges.push({
      id: `e-${lastSourceId}-${id}`,
      source: lastSourceId,
      target: id,
      type: "smoothstep",
      animated: true,
    });
  }

  return { nodes, edges };
}

// ─── convertFlowToRule ───────────────────────────────────────────────────────

/**
 * Convert ReactFlow nodes/edges back to a partial AutomationRuleCreate.
 */
export function convertFlowToRule(
  nodes: Node[],
  _edges: Edge[]
): Partial<AutomationRuleCreate> {
  let trigger: AutomationTrigger | undefined;
  const conditions: AutomationCondition[] = [];
  const actions: AutomationAction[] = [];

  for (const node of nodes) {
    if (node.type === "trigger") {
      const d = node.data as TriggerNodeData;
      trigger = {
        type: d.trigger_type,
        event_type: d.event_type,
        entity_type: d.entity_type,
        schedule: d.schedule,
      };
    } else if (node.type === "condition") {
      const d = node.data as ConditionNodeData;
      conditions.push({
        field: d.field,
        operator: d.operator,
        value: d.value,
        logical_operator: d.logical_operator,
      });
    } else if (node.type === "action") {
      const d = node.data as ActionNodeData;
      actions.push({
        type: d.type,
        channel: d.channel,
        template: d.template,
        webhook_url: d.webhook_url,
        event_type: d.event_type,
      });
    }
  }

  if (!trigger) return {};

  return { trigger, conditions, actions };
}

// ─── validateAutomationFlow ──────────────────────────────────────────────────

export interface FlowValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate an automation flow.
 * Rules:
 * - Exactly 1 TriggerNode required
 * - At least 1 ActionNode required
 * - All ActionNodes must have a type set
 * - No cycles
 */
export function validateAutomationFlow(
  nodes: Node[],
  edges: Edge[]
): FlowValidationResult {
  const errors: string[] = [];

  const triggerNodes = nodes.filter((n) => n.type === "trigger");
  if (triggerNodes.length === 0) {
    errors.push("El flujo debe tener un disparador");
  } else if (triggerNodes.length > 1) {
    errors.push("El flujo solo puede tener un disparador");
  }

  const actionNodes = nodes.filter((n) => n.type === "action");
  if (actionNodes.length === 0) {
    errors.push("El flujo debe tener al menos una acción");
  }

  for (const node of actionNodes) {
    const d = node.data as ActionNodeData;
    if (!d.type) {
      errors.push(`Una acción no tiene tipo configurado`);
    }
  }

  if (checkForCycles(nodes, edges)) {
    errors.push("El flujo contiene ciclos");
  }

  return { valid: errors.length === 0, errors };
}

// ─── checkForCycles ──────────────────────────────────────────────────────────

/**
 * DFS-based cycle detection for directed graph.
 */
export function checkForCycles(nodes: Node[], edges: Edge[]): boolean {
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (dfs(neighbor)) return true;
    }

    inStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (dfs(node.id)) return true;
  }

  return false;
}
