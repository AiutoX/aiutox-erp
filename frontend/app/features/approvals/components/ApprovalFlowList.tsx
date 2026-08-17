/**
 * Approval Flow List Component
 * Displays list of approval flows
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { PlugIcon, DownloadIcon, UploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useApprovalFlows,
  useCreateApprovalFlow,
  useUpdateApprovalFlow,
  useDeleteApprovalFlow,
} from "~/features/approvals/hooks/useApprovals";
import type { ApprovalFlowCreate } from "~/features/approvals/types/approval.types";

interface ApprovalFlowListProps {
  onFlowCreate?: () => void;
  onFlowEdit?: (flowId: string) => void;
  onFlowView?: (flowId: string) => void;
  showPageLayout?: boolean; // Whether to show PageLayout wrapper
}

export function ApprovalFlowList({
  onFlowCreate,
  onFlowEdit,
  onFlowView,
  showPageLayout = true,
}: ApprovalFlowListProps) {
  const navigate = useNavigate();
  const { data: flowsResponse, isLoading, error, refetch } = useApprovalFlows();
  const createFlow = useCreateApprovalFlow();
  const updateFlow = useUpdateApprovalFlow();
  const deleteFlow = useDeleteApprovalFlow();

  const flows = flowsResponse?.data || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const filteredFlows = flows.filter((flow) => {
    const matchesSearch = flow.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive || flow.is_active;
    return matchesSearch && matchesStatus;
  });

  const handleCreateFlow = () => {
    if (onFlowCreate) {
      onFlowCreate();
    } else {
      const newFlow: ApprovalFlowCreate = {
        name: "Nuevo Flujo de Aprobación",
        description: "Flujo de aprobación creado automáticamente",
        flow_type: "sequential",
        module: "general",
        is_active: true,
      };

      void createFlow.mutateAsync(newFlow).catch((error) => {
        console.error("Error creating approval flow:", error);
      });
    }
  };

  const handleToggleActive = (flowId: string, isActive: boolean) => {
    void updateFlow
      .mutateAsync({
        id: flowId,
        data: { is_active: isActive },
      })
      .then(() => {
        void refetch();
      })
      .catch((error) => {
        console.error("Error updating approval flow:", error);
      });
  };

  const handleDeleteFlow = (flowId: string) => {
    if (
      confirm("¿Estás seguro de que deseas eliminar este flujo de aprobación?")
    ) {
      void deleteFlow
        .mutateAsync(flowId)
        .then(() => {
          void refetch();
        })
        .catch((error) => {
          console.error("Error deleting approval flow:", error);
        });
    }
  };

  const handleViewFlow = (flowId: string) => {
    if (onFlowView) {
      onFlowView(flowId);
    } else {
      void navigate(`/approvals/flows/${flowId}`);
    }
  };

  const handleEditFlow = (flowId: string) => {
    if (onFlowEdit) {
      onFlowEdit(flowId);
    } else {
      void navigate(`/approvals/flows/${flowId}/edit`);
    }
  };

  const getStatusBadge = (isActive: boolean): string => {
    return isActive ? "bg-green-500 text-white" : "bg-gray-500 text-white";
  };

  if (isLoading) {
    if (!showPageLayout) {
      return (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-20 bg-gray-200 rounded mb-4" />
        </div>
      );
    }
    return (
      <PageLayout title="Flujos de Aprobación" loading>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-20 bg-gray-200 rounded mb-4" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    if (!showPageLayout) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            Error al cargar flujos de aprobación
          </p>
          <Button onClick={() => void refetch()}>Reintentar</Button>
        </div>
      );
    }
    return (
      <PageLayout title="Flujos de Aprobación" error={error}>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            Error al cargar flujos de aprobación
          </p>
          <Button onClick={() => void refetch()}>Reintentar</Button>
        </div>
      </PageLayout>
    );
  }

  const content = (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar flujos de aprobación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500"
            />
          </div>
          <Button onClick={handleCreateFlow}>
            <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
            Nuevo Flujo
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Mostrar inactivos</span>
          </label>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total de Flujos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {flows.length}
            </div>
            <p className="text-sm text-gray-600">
              Total de flujos de aprobación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flujos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {flows.filter((f) => f.is_active).length}
            </div>
            <p className="text-sm text-gray-600">Flujos actualmente activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flujos Inactivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {flows.filter((f) => !f.is_active).length}
            </div>
            <p className="text-sm text-gray-600">
              Flujos actualmente inactivos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Flows List */}
      <Card>
        <CardHeader>
          <CardTitle>Flujos de Aprobación</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFlows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No se encontraron flujos de aprobación
              </p>
              <p className="text-sm text-gray-400">
                {showInactive
                  ? "No se encontraron flujos inactivos"
                  : "No se encontraron flujos activos"}
              </p>
              <Button onClick={handleCreateFlow}>
                <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
                Crear Primer Flujo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFlows.map((flow) => (
                <div
                  key={flow.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {flow.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {flow.description}
                      </p>

                      <div className="flex items-center gap-4 mt-3">
                        <Badge className={getStatusBadge(flow.is_active)}>
                          {flow.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Módulo: {flow.module}
                        </span>
                        <span className="text-sm text-gray-500">
                          Tipo: {flow.flow_type}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-sm text-gray-500">
                          Creado:{" "}
                          {new Date(flow.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewFlow(flow.id)}
                    >
                      <HugeiconsIcon
                        icon={DownloadIcon}
                        size={16}
                        className="mr-2"
                      />
                      Ver
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditFlow(flow.id)}
                    >
                      <HugeiconsIcon
                        icon={UploadIcon}
                        size={16}
                        className="mr-2"
                      />
                      Editar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleToggleActive(flow.id, !flow.is_active)
                      }
                      className={
                        flow.is_active
                          ? "text-red-600 hover:text-red-700"
                          : "text-green-600 hover:text-green-700"
                      }
                    >
                      {flow.is_active ? "Desactivar" : "Activar"}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFlow(flow.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (!showPageLayout) {
    return content;
  }

  return <PageLayout title="Flujos de Aprobación">{content}</PageLayout>;
}
