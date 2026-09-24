/**
 * Approval Flow Visualizer Component
 * Visualizes approval flows using React Flow
 */

import { useCallback, useMemo } from "react";
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import type { ApprovalStepResponse } from "../types/approval.types";

interface ApprovalFlowVisualizerProps {
  steps: ApprovalStepResponse[];
  onStepsChange?: (steps: ApprovalStepResponse[]) => void;
  readonly?: boolean;
}

export function ApprovalFlowVisualizer({
  steps,
  onStepsChange,
  readonly = false,
}: ApprovalFlowVisualizerProps) {
  const initialNodes: Node[] = useMemo(() => {
    return steps.map((step, index) => ({
      id: step.id,
      type: "default",
      position: { x: 250 * index, y: 0 },
      data: {
        label: (
          <div className="p-2">
            <div className="font-bold text-sm">Paso {step.step_order}</div>
            <div className="text-xs">{step.name}</div>
            <div className="text-xs text-gray-500 mt-1">
              {step.approver_type === "user"
                ? "Usuario"
                : step.approver_type === "role"
                  ? "Rol"
                  : "Dinámico"}
            </div>
          </div>
        ),
        step,
      },
    }));
  }, [steps]);

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);

    for (let i = 0; i < sortedSteps.length - 1; i++) {
      const currentStep = sortedSteps[i];
      const nextStep = sortedSteps[i + 1];
      if (currentStep && nextStep) {
        edges.push({
          id: `e${currentStep.id}-${nextStep.id}`,
          source: currentStep.id,
          target: nextStep.id,
          type: "smoothstep",
          animated: true,
        });
      }
    }

    return edges;
  }, [steps]);

  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readonly) return;
      setEdges((eds) => addEdge(connection, eds));
    },
    [readonly, setEdges]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (readonly || !onStepsChange) return;

      const stepIndex = steps.findIndex((s) => s.id === node.id);
      if (stepIndex === -1) return;

      const updatedSteps = [...steps];
      const currentStep = updatedSteps[stepIndex];
      if (!currentStep) return;

      const newStepOrder = node.position
        ? Math.floor(node.position.x / 250) + 1
        : currentStep.step_order;

      if (newStepOrder !== currentStep.step_order) {
        currentStep.step_order = newStepOrder;
        onStepsChange(updatedSteps);
      }
    },
    [readonly, steps, onStepsChange]
  );

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No hay pasos en el flujo</p>
          <p className="text-sm text-gray-400">
            Agrega pasos para visualizar el flujo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        fitView
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        elementsSelectable={!readonly}
        zoomOnScroll={!readonly}
        panOnScroll={!readonly}
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
