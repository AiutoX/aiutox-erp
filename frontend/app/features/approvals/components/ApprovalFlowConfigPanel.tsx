/**
 * Approval Flow Config Panel Component
 * Side panel for detailed flow configuration using ShadCN UI
 */

import { useState } from "react";
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
import { Switch } from "~/components/ui/switch";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Add01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  ApprovalFlowResponse,
  ApprovalStepResponse,
} from "~/features/approvals/types/approval.types";

interface ApprovalFlowConfigPanelProps {
  flow: ApprovalFlowResponse | null;
  steps: ApprovalStepResponse[];
  onSave?: (
    flow: Partial<ApprovalFlowResponse>,
    steps: ApprovalStepResponse[]
  ) => void;
  onAddStep?: () => void;
  onEditStep?: (step: ApprovalStepResponse) => void;
  onDeleteStep?: (stepId: string) => void;
  editable?: boolean;
}

export function ApprovalFlowConfigPanel({
  flow,
  steps,
  onSave,
  onAddStep,
  onEditStep,
  onDeleteStep,
  editable = false,
}: ApprovalFlowConfigPanelProps) {
  const [flowData, setFlowData] = useState<Partial<ApprovalFlowResponse>>({
    name: flow?.name || "",
    description: flow?.description || "",
    flow_type: flow?.flow_type || "sequential",
    module: flow?.module || "",
    is_active: flow?.is_active ?? true,
  });

  if (!flow) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-gray-500">Selecciona un flujo para configurar</p>
      </div>
    );
  }

  const handleSave = () => {
    if (onSave) {
      onSave(flowData, steps);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Flow Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Información del Flujo</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="flow-name">Nombre</Label>
              <Input
                id="flow-name"
                value={flowData.name}
                onChange={(e) =>
                  setFlowData({ ...flowData, name: e.target.value })
                }
                disabled={!editable}
                placeholder="Nombre del flujo"
              />
            </div>

            <div>
              <Label htmlFor="flow-description">Descripción</Label>
              <Textarea
                id="flow-description"
                value={flowData.description ?? ""}
                onChange={(e) =>
                  setFlowData({ ...flowData, description: e.target.value })
                }
                disabled={!editable}
                placeholder="Descripción del flujo"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="flow-type">Tipo de Flujo</Label>
              <Select
                value={flowData.flow_type}
                onValueChange={(value) =>
                  setFlowData({
                    ...flowData,
                    flow_type: value as typeof flowData.flow_type,
                  })
                }
                disabled={!editable}
              >
                <SelectTrigger id="flow-type">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Secuencial</SelectItem>
                  <SelectItem value="parallel">Paralelo</SelectItem>
                  <SelectItem value="conditional">Condicional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="flow-module">Módulo</Label>
              <Input
                id="flow-module"
                value={flowData.module}
                onChange={(e) =>
                  setFlowData({ ...flowData, module: e.target.value })
                }
                disabled={!editable}
                placeholder="Ej: orders, invoices"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="flow-active">Activo</Label>
              <Switch
                id="flow-active"
                checked={flowData.is_active}
                onCheckedChange={(checked) =>
                  setFlowData({ ...flowData, is_active: checked })
                }
                disabled={!editable}
              />
            </div>
          </div>

          {editable && (
            <Button onClick={handleSave} className="w-full mt-4">
              Guardar Cambios
            </Button>
          )}
        </Card>

        {/* Steps List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Pasos del Flujo</h3>
            {editable && (
              <Button onClick={onAddStep} size="sm" variant="outline">
                <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
                Agregar Paso
              </Button>
            )}
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay pasos configurados</p>
              {editable && (
                <p className="text-sm mt-2">
                  Agrega pasos para configurar el flujo
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {steps
                .sort((a, b) => a.step_order - b.step_order)
                .map((step) => (
                  <div
                    key={step.id}
                    className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">Paso {step.step_order}</Badge>
                        <span className="font-medium">{step.name}</span>
                      </div>
                      {step.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {step.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {step.approver_type === "user"
                            ? "Usuario"
                            : step.approver_type === "role"
                              ? "Rol"
                              : "Dinámico"}
                        </span>
                        {step.require_all && (
                          <Badge variant="secondary" className="text-xs">
                            Requiere todos
                          </Badge>
                        )}
                        {step.rejection_required && (
                          <Badge variant="destructive" className="text-xs">
                            Rechazo requerido
                          </Badge>
                        )}
                      </div>
                    </div>
                    {editable && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditStep?.(step)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteStep?.(step.id)}
                        >
                          <HugeiconsIcon icon={Delete01Icon} size={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </Card>

        {/* Flow Statistics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Estadísticas</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total de pasos:</span>
              <span className="font-medium">{steps.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tipo:</span>
              <Badge variant="outline">{flowData.flow_type}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estado:</span>
              <Badge
                variant={flowData.is_active ? "default" : "secondary"}
                className={
                  flowData.is_active ? "bg-green-100 text-green-800" : ""
                }
              >
                {flowData.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
}
