/**
 * Approval Flow View Page
 * Page for viewing an approval flow and its steps in read-only mode
 */

import { lazy, Suspense } from "react";
import { useParams } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { useApprovalFlow } from "~/features/approvals/hooks/useApprovals";

// Lazy load the visualizer component
const ApprovalFlowVisualizer = lazy(() =>
  import("~/features/approvals/components/ApprovalFlowVisualizer").then(
    (module) => ({
      default: module.ApprovalFlowVisualizer,
    })
  )
);

export default function ApprovalFlowViewRoute() {
  const { id } = useParams<{ id: string }>();
  const {
    data: flowResponse,
    isLoading,
    error,
    refetch,
  } = useApprovalFlow(id || "");

  const steps = flowResponse?.data?.steps || [];

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

  const flow = flowResponse?.data;

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
      title={`Ver Flujo: ${flow.name}`}
      breadcrumb={[
        { label: "Aprobaciones", href: "/approvals" },
        { label: "Flujos", href: "/approvals" },
        { label: flow.name, href: `/approvals/flows/${flow.id}` },
        { label: "Ver" },
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Flow Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Información del Flujo</h2>
            <Button onClick={() => window.history.back()}>Volver</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">
                Nombre
              </label>
              <p className="text-lg">{flow.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Tipo</label>
              <p className="text-lg capitalize">
                {flow.flow_type === "sequential"
                  ? "Secuencial"
                  : flow.flow_type === "parallel"
                    ? "Paralelo"
                    : "Condicional"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Módulo
              </label>
              <p className="text-lg capitalize">{flow.module}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Estado
              </label>
              <p className="text-lg">
                {flow.is_active ? (
                  <span className="text-green-600 font-medium">Activo</span>
                ) : (
                  <span className="text-gray-600 font-medium">Inactivo</span>
                )}
              </p>
            </div>
            {flow.description && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">
                  Descripción
                </label>
                <p className="text-lg">{flow.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Flow Visualizer */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Visualización del Flujo</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Modo Solo Lectura:</strong> Este es el modo de
              visualización. Para editar el flujo, ve a la página de edición.
            </p>
          </div>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <p className="text-gray-500 mb-2">Cargando visualizador...</p>
                  <p className="text-sm text-gray-400">Por favor espera</p>
                </div>
              </div>
            }
          >
            <ApprovalFlowVisualizer steps={steps} readonly={true} />
          </Suspense>
        </div>

        {/* Steps List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Pasos del Flujo</h2>
          {steps.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border">
              <p className="text-gray-500">No hay pasos configurados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* eslint-disable @typescript-eslint/no-explicit-any */}
              {(steps as any[])
                .sort((a: any, b: any) => a.step_order - b.step_order)
                .map((step: any) => (
                  <div
                    key={step.id}
                    className="bg-white rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                            Paso {step.step_order}
                          </span>
                          <h3 className="text-lg font-semibold">{step.name}</h3>
                        </div>
                        {step.description && (
                          <p className="text-gray-600 mb-2">
                            {step.description}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">
                              Tipo de aprobador:
                            </span>
                            <span className="ml-2 font-medium">
                              {step.approver_type === "user"
                                ? "Usuario"
                                : step.approver_type === "role"
                                  ? "Rol"
                                  : "Dinámico"}
                            </span>
                          </div>
                          {step.approver_role && (
                            <div>
                              <span className="text-gray-500">Rol:</span>
                              <span className="ml-2 font-medium">
                                {step.approver_role}
                              </span>
                            </div>
                          )}
                          {step.require_all && (
                            <div>
                              <span className="text-gray-500">
                                Requiere todos:
                              </span>
                              <span className="ml-2 font-medium text-green-600">
                                Sí
                              </span>
                            </div>
                          )}
                          {step.min_approvals && (
                            <div>
                              <span className="text-gray-500">
                                Aprobaciones mínimas:
                              </span>
                              <span className="ml-2 font-medium">
                                {step.min_approvals}
                              </span>
                            </div>
                          )}
                          {step.rejection_required && (
                            <div>
                              <span className="text-gray-500">
                                Rechazo requerido:
                              </span>
                              <span className="ml-2 font-medium text-red-600">
                                Sí
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
