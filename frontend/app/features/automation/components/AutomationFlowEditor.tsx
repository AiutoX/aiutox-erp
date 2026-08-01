/**
 * AutomationFlowEditor
 * Visual n8n-style flow editor for automation rules using ReactFlow.
 * Adapts the pattern from features/approvals/components/FlowEditor.tsx.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  type Connection,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Zap,
  Filter,
  Play,
  PanelLeft,
  FlaskConical,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { TriggerNode, ConditionNode, ActionNode } from "./nodes";
import type { TriggerNodeData } from "./nodes/TriggerNode";
import type { ConditionNodeData } from "./nodes/ConditionNode";
import type { ActionNodeData } from "./nodes/ActionNode";
import { NodeCatalogPanel } from "./NodeCatalogPanel";
import { NodeConfigSheet } from "./NodeConfigSheet";
import { RuleTestPanel } from "./RuleTestPanel";
import {
  convertRuleToFlow,
  convertFlowToRule,
  validateAutomationFlow,
} from "../utils/flow-editor.utils";
import type {
  AutomationRule,
  AutomationRuleCreate,
  NodeCatalogItem,
} from "../types/automation.types";
import { useTranslation } from "~/lib/i18n/useTranslation";

// ─── Node type registry ──────────────────────────────────────────────────────

const NODE_TYPES = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AutomationFlowEditorProps {
  initialRule?: AutomationRule;
  onSave?: (rulePartial: Partial<AutomationRuleCreate>) => void;
  readonly?: boolean;
}

// ─── Inner component (needs ReactFlowProvider context) ───────────────────────

function FlowEditorInner({
  initialRule,
  onSave,
  readonly = false,
}: AutomationFlowEditorProps) {
  const { t } = useTranslation();
  const { screenToFlowPosition } = useReactFlow();

  // Catalog panel visibility
  const [catalogOpen, setCatalogOpen] = useState(true);

  // Convert rule to initial nodes/edges
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!initialRule) return { initialNodes: [], initialEdges: [] };
    const { nodes, edges } = convertRuleToFlow(initialRule);
    return { initialNodes: nodes, initialEdges: edges };
  }, [initialRule]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowKey, setReactFlowKey] = useState(0);

  // Config sheet state
  const [configNode, setConfigNode] = useState<Node | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  // Test panel state
  const [testOpen, setTestOpen] = useState(false);

  // Validation state
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);

  // Re-init when initialRule changes
  useEffect(() => {
    if (!initialRule) return;
    const { nodes: n, edges: e } = convertRuleToFlow(initialRule);
    const uniqueNodes = Array.from(
      new Map(n.map((node) => [node.id, node])).values()
    );
    const uniqueEdges = Array.from(
      new Map(e.map((edge) => [edge.id, edge])).values()
    );
    setNodes(uniqueNodes);
    setEdges(uniqueEdges);
    setReactFlowKey((k) => k + 1);
    setValidationResult(null);
  }, [initialRule, setNodes, setEdges]);

  // ── Edge connection ────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (connection: Connection) => {
      if (readonly) return;
      setEdges((eds) =>
        addEdge({ ...connection, type: "smoothstep", animated: true }, eds)
      );
    },
    [readonly, setEdges]
  );

  // ── Node click → open config sheet ────────────────────────────────────────
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (readonly) return;
      setConfigNode(node);
      setConfigOpen(true);
    },
    [readonly]
  );

  // ── Add nodes ──────────────────────────────────────────────────────────────
  const addTrigger = useCallback(() => {
    if (readonly) return;
    const hasTrigger = nodes.some((n) => n.type === "trigger");
    if (hasTrigger) return;
    const newNode: Node = {
      id: `trigger-${Date.now()}`,
      type: "trigger",
      position: { x: 50, y: 200 },
      data: {
        trigger_type: "event",
        label: t("automation.flowEditor.addTrigger"),
      } satisfies TriggerNodeData,
    };
    setNodes((nds) => [...nds, newNode]);
  }, [readonly, nodes, setNodes, t]);

  const addCondition = useCallback(() => {
    if (readonly) return;
    const count = nodes.filter((n) => n.type === "condition").length;
    const newNode: Node = {
      id: `condition-${Date.now()}`,
      type: "condition",
      position: { x: 350 + count * 20, y: 200 },
      data: {
        field: "",
        operator: "eq",
        value: "",
        label: t("automation.flowEditor.addCondition"),
      } satisfies ConditionNodeData,
    };
    setNodes((nds) => [...nds, newNode]);
  }, [readonly, nodes, setNodes, t]);

  const addAction = useCallback(() => {
    if (readonly) return;
    const count = nodes.filter((n) => n.type === "action").length;
    const newNode: Node = {
      id: `action-${Date.now()}`,
      type: "action",
      position: { x: 650 + count * 20, y: 200 },
      data: {
        type: "send_notification",
        label: t("automation.flowEditor.addAction"),
      } satisfies ActionNodeData,
    };
    setNodes((nds) => [...nds, newNode]);
  }, [readonly, nodes, setNodes, t]);

  // ── Add node from catalog (click or drop) ─────────────────────────────────
  const addNodeFromCatalog = useCallback(
    (item: NodeCatalogItem, position?: { x: number; y: number }) => {
      if (readonly || !item.available) return;
      const pos = position ?? { x: 250 + nodes.length * 20, y: 200 };
      const category = item.category;
      const nodeType =
        category === "triggers"
          ? "trigger"
          : category === "actions"
            ? "action"
            : "condition";
      const newNode: Node = {
        id: `${item.node_type}-${Date.now()}`,
        type: nodeType,
        position: pos,
        data: {
          label: item.label,
          node_type: item.node_type,
          ...(nodeType === "trigger" ? { trigger_type: item.node_type } : {}),
          ...(nodeType === "action" ? { type: item.node_type } : {}),
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [readonly, nodes.length, setNodes]
  );

  // ── React Flow drop handler ────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData("application/nodeType");
      const rawConfig = e.dataTransfer.getData("application/nodeConfig");
      if (!nodeType) return;
      const config: NodeCatalogItem = rawConfig
        ? (JSON.parse(rawConfig) as NodeCatalogItem)
        : ({ node_type: nodeType, available: true, category: "actions" } as NodeCatalogItem);
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNodeFromCatalog(config, position);
    },
    [screenToFlowPosition, addNodeFromCatalog]
  );

  // ── Validate ───────────────────────────────────────────────────────────────
  const handleValidate = useCallback(() => {
    const result = validateAutomationFlow(nodes, edges);
    setValidationResult(result);
  }, [nodes, edges]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const result = validateAutomationFlow(nodes, edges);
    setValidationResult(result);
    if (!result.valid) return;
    const rulePartial = convertFlowToRule(nodes, edges);
    onSave?.(rulePartial);
  }, [nodes, edges, onSave]);

  // ── Update node data from config sheet ────────────────────────────────────
  const handleConfigSave = useCallback(
    (updatedData: Record<string, unknown>) => {
      if (!configNode) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === configNode.id
            ? { ...n, data: { ...n.data, ...updatedData } }
            : n
        )
      );
      setConfigOpen(false);
      setConfigNode(null);
    },
    [configNode, setNodes]
  );

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      triggers: nodes.filter((n) => n.type === "trigger").length,
      conditions: nodes.filter((n) => n.type === "condition").length,
      actions: nodes.filter((n) => n.type === "action").length,
    }),
    [nodes]
  );

  const hasTrigger = stats.triggers > 0;

  return (
    <div className="h-full flex flex-col">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      {!readonly && (
        <div className="border-b bg-card px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={catalogOpen ? "secondary" : "outline"}
              onClick={() => setCatalogOpen((v) => !v)}
              className="gap-1.5"
              title={
                catalogOpen
                  ? t("automation.catalog.hideCatalog")
                  : t("automation.catalog.showCatalog")
              }
            >
              <PanelLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {t("automation.catalog.title")}
              </span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={addTrigger}
              disabled={hasTrigger}
              className="gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-green-600" />
              {t("automation.flowEditor.addTrigger")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={addCondition}
              className="gap-1.5"
            >
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              {t("automation.flowEditor.addCondition")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={addAction}
              className="gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-primary" />
              {t("automation.flowEditor.addAction")}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleValidate}
              className="gap-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {t("automation.flowEditor.validate")}
            </Button>
            {initialRule?.id && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTestOpen(true)}
                className="gap-1.5"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                {t("automation.flowEditor.testRule")}
              </Button>
            )}
            {onSave && (
              <Button size="sm" onClick={handleSave} className="gap-1.5">
                <Save className="w-3.5 h-3.5" />
                {t("common.save")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div className="border-b bg-muted/30 px-4 py-1.5 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span>
          {t("automation.catalog.triggers")}: <strong>{stats.triggers}</strong>
        </span>
        <span>
          {t("automation.catalog.conditions")}: <strong>{stats.conditions}</strong>
        </span>
        <span>
          {t("automation.catalog.actions")}: <strong>{stats.actions}</strong>
        </span>

        {validationResult &&
          (validationResult.valid ? (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("automation.flowEditor.validationPassed")}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="w-3.5 h-3.5" />
              {validationResult.errors[0]}
              {validationResult.errors.length > 1 &&
                ` (+${validationResult.errors.length - 1})`}
            </span>
          ))}
      </div>

      {/* ── Catalog + Canvas ─────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Catalog panel — hidden on small screens unless catalogOpen */}
        {catalogOpen && !readonly && (
          <div className="hidden md:flex w-56 lg:w-64 flex-col shrink-0">
            <NodeCatalogPanel onAddNode={(item) => addNodeFromCatalog(item)} />
          </div>
        )}

        {/* ReactFlow Canvas */}
        <div
          className="flex-1 bg-muted/10"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            key={reactFlowKey}
            nodes={nodes}
            edges={edges}
            onNodesChange={readonly ? undefined : onNodesChange}
            onEdgesChange={readonly ? undefined : onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={!readonly}
            nodesConnectable={!readonly}
            elementsSelectable={!readonly}
            deleteKeyCode={readonly ? null : ["Backspace", "Delete"]}
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* ── Node Config Sheet ────────────────────────────────────────────── */}
      <NodeConfigSheet
        node={configNode}
        open={configOpen}
        onClose={() => {
          setConfigOpen(false);
          setConfigNode(null);
        }}
        onSave={handleConfigSave}
      />

      {/* ── Rule Test Panel ──────────────────────────────────────────────── */}
      {initialRule?.id && (
        <RuleTestPanel
          ruleId={initialRule.id}
          open={testOpen}
          onClose={() => setTestOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Public export wrapped in ReactFlowProvider ───────────────────────────────

export function AutomationFlowEditor(props: AutomationFlowEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  );
}

