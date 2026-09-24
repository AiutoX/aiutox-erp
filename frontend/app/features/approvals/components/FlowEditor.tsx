/**
 * Flow Editor Component
 * Main visual editor for approval flows
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { ApprovalNode, ConcentratorNode, StartNode, EndNode } from "./nodes";
import { ApprovalNodeConfigModal } from "./ApprovalNodeConfigModal";
import { ConcentratorNodeConfigModal } from "./ConcentratorNodeConfigModal";
import type {
  FlowNode,
  ApprovalNodeData,
  ConcentratorNodeData,
  FlowValidationResult,
} from "../types/flow-editor.types";
import { Button } from "~/components/ui/button";
import { Plus, Save, Eye, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

// Register custom node types
const nodeTypes = {
  approval: ApprovalNode,
  concentrator: ConcentratorNode,
  start: StartNode,
  end: EndNode,
};

interface FlowEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onPreview?: () => void;
  readonly?: boolean;
}

export function FlowEditor({
  initialNodes = [],
  initialEdges = [],
  onSave,
  onPreview,
  readonly = false,
}: FlowEditorProps) {
  const [nodes, setNodes, _onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, _onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [concentratorModalOpen, setConcentratorModalOpen] = useState(false);
  const [reactFlowKey, setReactFlowKey] = useState(0);

  useEffect(() => {
    const uniqueNodes = Array.from(
      new Map((initialNodes || []).map((n) => [n.id, n])).values()
    );
    setNodes(uniqueNodes);
    setReactFlowKey((k) => k + 1);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    const uniqueEdges = Array.from(
      new Map((initialEdges || []).map((e) => [e.id, e])).values()
    );
    setEdges(uniqueEdges);
    setReactFlowKey((k) => k + 1);
  }, [initialEdges, setEdges]);

  const onNodesChange = useCallback(
    (changes: Parameters<typeof _onNodesChange>[0]) => {
      if (readonly) return;

      const isTryingToRemoveStartOrEnd = changes.some((change) => {
        if (change.type !== "remove") return false;
        const node = nodes.find((n) => n.id === change.id);
        return node?.type === "start" || node?.type === "end";
      });

      if (isTryingToRemoveStartOrEnd) {
        alert("No se pueden eliminar los nodos de inicio y fin");
        return;
      }

      _onNodesChange(changes);
    },
    [readonly, _onNodesChange, nodes]
  );

  const onEdgesChange = useCallback(
    (changes: Parameters<typeof _onEdgesChange>[0]) => {
      if (readonly) return;
      _onEdgesChange(changes);
    },
    [readonly, _onEdgesChange]
  );

  // Calculate input count for concentrator node
  const getInputCount = useCallback(
    (nodeId: string) => {
      return edges.filter((edge) => edge.target === nodeId).length;
    },
    [edges]
  );

  // Validate flow
  const validateFlow = useCallback((): FlowValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if flow has nodes
    if (nodes.length === 0) {
      errors.push("El flujo debe tener al menos un nodo");
    }

    // Check if flow has start node
    const hasStartNode = nodes.some((node) => node.type === "start");
    if (!hasStartNode) {
      errors.push("El flujo debe tener un nodo de inicio");
    }

    // Check if flow has end node
    const hasEndNode = nodes.some((node) => node.type === "end");
    if (!hasEndNode) {
      errors.push("El flujo debe tener un nodo de fin");
    }

    // Check if flow has at least one approval node
    const hasApprovalNode = nodes.some((node) => node.type === "approval");
    if (!hasApprovalNode) {
      errors.push("El flujo debe tener al menos un nodo de aprobación");
    }

    // Check for orphaned nodes (no connections)
    const connectedNodeIds = new Set<string>();
    edges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    const orphanedNodes = nodes.filter(
      (node) => !connectedNodeIds.has(node.id) && node.type !== "start"
    );
    if (orphanedNodes.length > 0) {
      warnings.push(
        `${orphanedNodes.length} nodo${orphanedNodes.length !== 1 ? "s" : ""} sin conexiones`
      );
    }

    // Check for cycles (simple check)
    const hasCycles = checkForCycles(nodes, edges);
    if (hasCycles) {
      errors.push("El flujo contiene ciclos infinitos");
    }

    // Check max depth (5 levels)
    const maxDepth = calculateMaxDepth(nodes, edges);
    if (maxDepth > 5) {
      errors.push(
        `El flujo excede el máximo de 5 niveles de profundidad (actual: ${maxDepth})`
      );
    }

    // Validate approval nodes have approvers
    nodes.forEach((node) => {
      if (node.type === "approval") {
        const data = node.data as ApprovalNodeData;
        if (data.approvers.length === 0) {
          errors.push(`El nodo "${data.name}" no tiene aprobadores asignados`);
        }
      }
    });

    // Validate concentrator nodes have valid minApprovals
    nodes.forEach((node) => {
      if (node.type === "concentrator") {
        const data = node.data as ConcentratorNodeData;
        const inputCount = getInputCount(node.id);
        if (!data.requireAll && data.minApprovals > inputCount) {
          errors.push(
            `El concentrador "${data.name}" requiere más aprobaciones (${data.minApprovals}) que entradas disponibles (${inputCount})`
          );
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, getInputCount]);

  // Check for cycles in the flow
  const checkForCycles = useCallback(
    (nodes: Node[], edges: Edge[]): boolean => {
      const adjacencyList = new Map<string, string[]>();
      nodes.forEach((node) => adjacencyList.set(node.id, []));
      edges.forEach((edge) => {
        const neighbors = adjacencyList.get(edge.source) || [];
        neighbors.push(edge.target);
        adjacencyList.set(edge.source, neighbors);
      });

      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const hasCycle = (nodeId: string): boolean => {
        visited.add(nodeId);
        recursionStack.add(nodeId);

        const neighbors = adjacencyList.get(nodeId) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor)) return true;
          } else if (recursionStack.has(neighbor)) {
            return true;
          }
        }

        recursionStack.delete(nodeId);
        return false;
      };

      for (const node of nodes) {
        if (!visited.has(node.id)) {
          if (hasCycle(node.id)) return true;
        }
      }

      return false;
    },
    []
  );

  // Calculate max depth of the flow (excluding start and end nodes)
  const calculateMaxDepth = useCallback(
    (nodes: Node[], edges: Edge[]): number => {
      const adjacencyList = new Map<string, string[]>();
      nodes.forEach((node) => adjacencyList.set(node.id, []));
      edges.forEach((edge) => {
        const neighbors = adjacencyList.get(edge.source) || [];
        neighbors.push(edge.target);
        adjacencyList.set(edge.source, neighbors);
      });

      const startNode = nodes.find((node) => node.type === "start");
      if (!startNode) return 0;

      const getDepth = (nodeId: string, visited: Set<string>): number => {
        if (visited.has(nodeId)) return 0;
        visited.add(nodeId);

        const node = nodes.find((n) => n.id === nodeId);
        const neighbors = adjacencyList.get(nodeId) || [];

        if (node?.type === "end") return 0;

        if (node?.type === "start") {
          if (neighbors.length === 0) return 0;
          return Math.max(
            ...neighbors.map((n) => getDepth(n, new Set(visited)))
          );
        }

        const childDepth =
          neighbors.length === 0
            ? 0
            : Math.max(...neighbors.map((n) => getDepth(n, new Set(visited))));

        return 1 + childDepth;
      };

      return getDepth(startNode.id, new Set());
    },
    []
  );

  // Handle node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (readonly) return;
      setSelectedNode(node as FlowNode);

      // Open appropriate modal based on node type
      if (node.type === "approval") {
        setApprovalModalOpen(true);
      } else if (node.type === "concentrator") {
        setConcentratorModalOpen(true);
      }
    },
    [readonly]
  );

  // Handle edge connection
  const onConnect = useCallback(
    (connection: Connection) => {
      if (readonly) return;

      // Validate connection
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      // Prevent connecting end node to anything
      if (sourceNode.type === "end") {
        alert("No se puede conectar desde el nodo de fin");
        return;
      }

      // Prevent connecting to start node
      if (targetNode.type === "start") {
        alert("No se puede conectar al nodo de inicio");
        return;
      }

      setEdges((eds) => addEdge(connection, eds));
    },
    [readonly, nodes, setEdges]
  );

  // Add new node
  const addNode = useCallback(
    (type: "approval" | "concentrator" | "start" | "end") => {
      if (readonly) return;

      const startNode = nodes.find((n) => n.type === "start");
      const baseX = startNode?.position.x ?? 250;
      const maxY = nodes.reduce((acc, n) => Math.max(acc, n.position.y), 0);

      const newNode: FlowNode = {
        id: `${type}-${Date.now()}`,
        type,
        position: { x: baseX, y: maxY + 180 },
        data: {
          type,
          name:
            type === "approval"
              ? "Nueva Aprobación"
              : type === "concentrator"
                ? "Nuevo Concentrador"
                : type === "start"
                  ? "Inicio"
                  : "Fin",
          ...(type === "approval" && {
            approverType: "user",
            approvers: [],
            requireAll: false,
            minApprovals: 1,
          }),
          ...(type === "concentrator" && {
            requireAll: false,
            minApprovals: 1,
          }),
        } as unknown as ApprovalNodeData,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [readonly, setNodes, nodes]
  );

  // Handle save
  const handleSave = useCallback(() => {
    const validation = validateFlow();
    if (!validation.valid) {
      alert(
        `Errores de validación:\n${validation.errors.join("\n")}\n\nAdvertencias:\n${validation.warnings.join("\n")}`
      );
      return;
    }

    if (onSave) {
      onSave(nodes, edges);
    }
  }, [validateFlow, onSave, nodes, edges]);

  // Handle approval node save
  const handleApprovalNodeSave = useCallback(
    (data: ApprovalNodeData) => {
      if (!selectedNode) return;

      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id
            ? { ...node, data: data as unknown as typeof node.data }
            : node
        )
      );
    },
    [selectedNode, setNodes]
  );

  // Handle concentrator node save
  const handleConcentratorNodeSave = useCallback(
    (data: ConcentratorNodeData) => {
      if (!selectedNode) return;

      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id
            ? { ...node, data: data as unknown as typeof node.data }
            : node
        )
      );
    },
    [selectedNode, setNodes]
  );

  // Calculate flow stats
  const flowStats = useMemo(() => {
    return {
      totalNodes: nodes.length,
      approvalNodes: nodes.filter((n) => n.type === "approval").length,
      concentratorNodes: nodes.filter((n) => n.type === "concentrator").length,
      maxDepth: calculateMaxDepth(nodes, edges),
      hasCycles: checkForCycles(nodes, edges),
    };
  }, [nodes, edges, calculateMaxDepth, checkForCycles]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      {!readonly && (
        <div className="border-b bg-white p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => addNode("start")}
              disabled={nodes.some((n) => n.type === "start")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Inicio
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addNode("approval")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Aprobación
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addNode("concentrator")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Concentrador
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addNode("end")}
              disabled={nodes.some((n) => n.type === "end")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Fin
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onPreview && (
              <Button size="sm" variant="outline" onClick={onPreview}>
                <Eye className="w-4 h-4 mr-2" />
                Previsualizar
              </Button>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" type="button">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cómo borrar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Selecciona un nodo o conexión y presiona Supr/Delete o
                    Backspace para eliminar.
                  </p>
                  <p>No se pueden eliminar los nodos de Inicio y Fin.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="border-b bg-gray-50 px-4 py-2 text-sm text-gray-600 flex items-center gap-4">
        <span>Nodos: {flowStats.totalNodes}</span>
        <span>Aprobaciones: {flowStats.approvalNodes}</span>
        <span>Concentradores: {flowStats.concentratorNodes}</span>
        <span>Profundidad: {flowStats.maxDepth}/5</span>
        {flowStats.hasCycles && (
          <span className="text-red-600">⚠️ Ciclos detectados</span>
        )}
      </div>

      {/* Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          key={reactFlowKey}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={!readonly}
          nodesConnectable={!readonly}
          elementsSelectable={!readonly}
          zoomOnScroll={!readonly}
          panOnScroll={!readonly}
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>

      {/* Configuration Modals */}
      {selectedNode && selectedNode.type === "approval" && (
        <ApprovalNodeConfigModal
          open={approvalModalOpen}
          onClose={() => {
            setApprovalModalOpen(false);
            setSelectedNode(null);
          }}
          onSave={handleApprovalNodeSave}
          initialData={selectedNode.data as ApprovalNodeData}
        />
      )}

      {selectedNode && selectedNode.type === "concentrator" && (
        <ConcentratorNodeConfigModal
          open={concentratorModalOpen}
          onClose={() => {
            setConcentratorModalOpen(false);
            setSelectedNode(null);
          }}
          onSave={handleConcentratorNodeSave}
          initialData={selectedNode.data as ConcentratorNodeData}
          inputCount={getInputCount(selectedNode.id)}
        />
      )}
    </div>
  );
}
