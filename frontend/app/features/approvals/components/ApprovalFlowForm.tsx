/**
 * Approval Flow Form Component
 * Form for creating and editing approval flows
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeftIcon, DownloadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useCreateApprovalFlow,
  useUpdateApprovalFlow,
  useApprovalFlow,
} from "~/features/approvals/hooks/useApprovals";
import type {
  ApprovalFlowCreate,
  ApprovalFlowUpdate,
} from "~/features/approvals/types/approval.types";

interface ApprovalFlowFormProps {
  flowId?: string;
  onSubmit?: (data: ApprovalFlowCreate) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ApprovalFlowForm({
  flowId,
  onSubmit,
  onCancel,
  isLoading: externalLoading,
}: ApprovalFlowFormProps) {
  const navigate = useNavigate();
  const createFlow = useCreateApprovalFlow();
  const updateFlow = useUpdateApprovalFlow();
  const { data: flowResponse, isLoading: isLoadingFlow } = useApprovalFlow(
    flowId || ""
  );

  const isEditing = !!flowId;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    flow_type: "sequential" as "sequential" | "parallel" | "conditional",
    module: "general",
    is_active: true,
  });

  useEffect(() => {
    if (isEditing && flowResponse?.data) {
      const flow = flowResponse.data;
      setFormData({
        name: flow.name,
        description: flow.description || "",
        flow_type: flow.flow_type,
        module: flow.module,
        is_active: flow.is_active,
      });
    }
  }, [isEditing, flowResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      const updateData: ApprovalFlowUpdate = {
        name: formData.name,
        description: formData.description,
        flow_type: formData.flow_type,
      };

      if (flowId) {
        await updateFlow
          .mutateAsync({ id: flowId, data: updateData })
          .then(() => {
            void navigate("/approvals");
          })
          .catch((error) => {
            console.error("Error updating flow:", error);
          });
      }
    } else {
      const createData: ApprovalFlowCreate = {
        name: formData.name,
        description: formData.description,
        flow_type: formData.flow_type,
        module: formData.module,
        is_active: formData.is_active,
      };

      if (onSubmit) {
        await onSubmit(createData);
      } else {
        await createFlow
          .mutateAsync(createData)
          .then(() => {
            void navigate("/approvals");
          })
          .catch((error) => {
            console.error("Error creating flow:", error);
          });
      }
    }
  };

  if (isLoadingFlow && isEditing) {
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

  return (
    <PageLayout
      title={
        isEditing ? "Editar Flujo de Aprobación" : "Crear Flujo de Aprobación"
      }
      breadcrumb={[
        { label: "Aprobaciones", href: "/approvals" },
        { label: isEditing ? "Editar Flujo" : "Crear Flujo" },
      ]}
    >
      <div className="max-w-4xl mx-auto">
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-6"
        >
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre del Flujo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ingrese el nombre del flujo"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="module">Módulo *</Label>
                  <Select
                    value={formData.module}
                    onValueChange={(value) =>
                      setFormData({ ...formData, module: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="users">Usuarios</SelectItem>
                      <SelectItem value="files">Archivos</SelectItem>
                      <SelectItem value="tasks">Tareas</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="flow_type">Tipo de Flujo *</Label>
                <Select
                  value={formData.flow_type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      flow_type: value as
                        | "sequential"
                        | "parallel"
                        | "conditional",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el tipo de flujo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Secuencial</SelectItem>
                    <SelectItem value="parallel">Paralelo</SelectItem>
                    <SelectItem value="conditional">Condicional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Ingrese la descripción del flujo"
                  rows={4}
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Activo
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel || (() => void navigate("/approvals"))}
            >
              <HugeiconsIcon icon={ArrowLeftIcon} size={16} className="mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                externalLoading || createFlow.isPending || updateFlow.isPending
              }
            >
              <HugeiconsIcon icon={DownloadIcon} size={16} className="mr-2" />
              {externalLoading || createFlow.isPending || updateFlow.isPending
                ? "Guardando..."
                : isEditing
                  ? "Actualizar Flujo"
                  : "Crear Flujo"}
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
