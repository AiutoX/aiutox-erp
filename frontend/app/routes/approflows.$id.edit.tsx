/**
 * Approval Flow Edit Page
 * Page for editing an approval flow and its steps
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { ApprovalFlowForm } from "~/features/approvals/components/ApprovalFlowForm";
import { FlowEditor } from "~/features/approvals/components/FlowEditor";
import {
  useApprovalFlow,
  useUpdateFlowSteps,
} from "~/features/approvals/hooks/useApprovals";
import {
  convertStepsToFlow,
  convertFlowToSteps,
} from "~/features/approvals/utils/flow-editor.utils";
import type { Node, Edge } from "reactflow";

export default function ApprovalFlowEditRoute() {
  const { id } = useParams<{ id: string }>();
  const {
    data: flowResponse,
    isLoading,
    error,
    refetch,
  } = useApprovalFlow(id || "");

  const updateFlowStepsMutation = useUpdateFlowSteps();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const flow = flowResponse?.data;

  // Load flow steps into editor when flow data is available
  useEffect(() => {
    if (flow?.steps) {
      const { nodes: convertedNodes, edges: convertedEdges } =
        convertStepsToFlow(flow.steps);
      setNodes(convertedNodes);
      setEdges(convertedEdges);
    }
  }, [flow]);

  const handleSave = (savedNodes: Node[], savedEdges: Edge[]) => {
    // Convert editor format to backend format
    const steps = convertFlowToSteps(savedNodes, savedEdges, id || "");

    // Update flow steps
    updateFlowStepsMutation.mutate(
      {
        flowId: id || "",
        steps: steps,
      },
      {
        onSuccess: () => {
          alert("Flujo guardado exitosamente");
          void refetch();
        },
        onError: (error) => {
          console.error("Error al guardar flujo:", error);
          alert("Error al guardar el flujo. Por favor intenta nuevamente.");
        },
      }
    );
  };

  const handlePreview = () => {
    // TODO: Implement preview logic
    alert("Funcionalidad de previsualización próximamente");
  };

  if (isLoading) {
    return (
      <PageLayout title="Cargando..." loading>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-20 bg-gray-200 rounded mb-4" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Error" error={error}>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Error al cargar el flujo</p>
          <Button onClick={() => void refetch()}>Reintentar</Button>
        </div>
      </PageLayout>
    );
  }

  if (!flow) {
    return (
      <PageLayout title="Flujo No Encontrado">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No se encontró el flujo</p>
          <Button onClick={() => window.history.back()}>Volver</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`Editar Flujo: ${flow.name}`}
      breadcrumb={[
        { label: "Aprobaciones", href: "/approvals" },
        { label: "Flujos", href: "/approvals" },
        { label: flow.name, href: `/approvals/flows/${flow.id}` },
        { label: "Editar" },
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Flow Basic Information */}
        <ApprovalFlowForm flowId={flow.id} />

        {/* Flow Editor */}
        <div className="h-[800px] border rounded-lg">
          <FlowEditor
            initialNodes={nodes}
            initialEdges={edges}
            onSave={(nodes: Node[], edges: Edge[]) =>
              void handleSave(nodes, edges)
            }
            onPreview={handlePreview}
            readonly={false}
          />
        </div>
      </div>
    </PageLayout>
  );
}
