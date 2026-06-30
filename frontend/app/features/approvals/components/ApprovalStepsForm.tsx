/**
 * Approval Steps Form Component
 * Form for managing steps in an approval flow
 */

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { PlugIcon, Delete01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ApprovalStepResponse } from "../types/approval.types";

interface ApprovalStepsFormProps {
  steps: ApprovalStepResponse[];
  onStepsChange: (steps: ApprovalStepResponse[]) => void;
  readonly?: boolean;
}

export function ApprovalStepsForm({
  steps,
  onStepsChange,
  readonly = false,
}: ApprovalStepsFormProps) {
  const [newStep, setNewStep] = useState({
    step_order: (steps.length + 1).toString(),
    name: "",
    approver_type: "user" as "user" | "role" | "dynamic",
    approver_id: "",
    conditions: "{}",
    min_approvals: "1",
  });

  const handleAddStep = () => {
    if (!newStep.name) {
      alert("El nombre del paso es requerido");
      return;
    }

    const step: ApprovalStepResponse = {
      id: crypto.randomUUID(),
      flow_id: "",
      tenant_id: "",
      step_order: parseInt(newStep.step_order, 10),
      name: newStep.name,
      description: null,
      approver_type: newStep.approver_type,
      approver_id: newStep.approver_id || null,
      approver_role: null,
      approver_rule: null,
      require_all: false,
      min_approvals: parseInt(newStep.min_approvals, 10) || 1,
      form_schema: null,
      print_config: null,
      rejection_required: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onStepsChange([...steps, step]);

    setNewStep({
      step_order: (steps.length + 2).toString(),
      name: "",
      approver_type: "user",
      approver_id: "",
      conditions: "{}",
      min_approvals: "1",
    });
  };

  const handleRemoveStep = (stepId: string) => {
    onStepsChange(steps.filter((s) => s.id !== stepId));
  };

  return (
    <div className="space-y-4">
      {/* Existing Steps */}
      {steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pasos del Flujo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {steps
                .sort((a, b) => a.step_order - b.step_order)
                .map((step) => (
                  <div
                    key={step.id}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-lg">
                            Paso {step.step_order}
                          </span>
                          <span className="text-gray-600">-</span>
                          <span className="text-gray-900">{step.name}</span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">
                              Tipo de Aprobador:{" "}
                            </span>
                            <span className="ml-2">
                              {step.approver_type === "user"
                                ? "Usuario"
                                : step.approver_type === "role"
                                  ? "Rol"
                                  : "Dinámico"}
                            </span>
                          </div>

                          {step.approver_id && (
                            <div>
                              <span className="font-medium">
                                Aprobador ID:{" "}
                              </span>
                              <span className="ml-2">{step.approver_id}</span>
                            </div>
                          )}

                          {step.min_approvals && step.min_approvals > 1 && (
                            <div>
                              <span className="font-medium">
                                Mínimo Aprobaciones:{" "}
                              </span>
                              <span className="ml-2">{step.min_approvals}</span>
                            </div>
                          )}

                          {step.form_schema &&
                            Object.keys(step.form_schema).length > 0 && (
                              <div>
                                <span className="font-medium">Schema: </span>
                                <span className="ml-2">
                                  {JSON.stringify(step.form_schema)}
                                </span>
                              </div>
                            )}
                        </div>
                      </div>

                      {!readonly && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveStep(step.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <HugeiconsIcon
                              icon={Delete01Icon}
                              size={16}
                              className="mr-2"
                            />
                            Eliminar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Step */}
      {!readonly && (
        <Card>
          <CardHeader>
            <CardTitle>Agregar Nuevo Paso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="step_name">Nombre del Paso *</Label>
                <Input
                  id="step_name"
                  value={newStep.name}
                  onChange={(e) =>
                    setNewStep({ ...newStep, name: e.target.value })
                  }
                  placeholder="Ej: Revisión Inicial"
                />
              </div>

              <div>
                <Label htmlFor="step_order">Número de Paso *</Label>
                <Input
                  id="step_order"
                  type="number"
                  value={newStep.step_order}
                  onChange={(e) =>
                    setNewStep({ ...newStep, step_order: e.target.value })
                  }
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="approver_type">Tipo de Aprobador *</Label>
                <Select
                  value={newStep.approver_type}
                  onValueChange={(value) =>
                    setNewStep({
                      ...newStep,
                      approver_type: value as "user" | "role" | "dynamic",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="role">Rol</SelectItem>
                    <SelectItem value="dynamic">Dinámico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="min_approvals">Mínimo de Aprobaciones</Label>
                <Input
                  id="min_approvals"
                  type="number"
                  value={newStep.min_approvals}
                  onChange={(e) =>
                    setNewStep({ ...newStep, min_approvals: e.target.value })
                  }
                  min="1"
                />
              </div>
            </div>

            {(newStep.approver_type === "user" ||
              newStep.approver_type === "role") && (
              <div>
                <Label htmlFor="approver_id">ID del Aprobador *</Label>
                <Input
                  id="approver_id"
                  value={newStep.approver_id}
                  onChange={(e) =>
                    setNewStep({ ...newStep, approver_id: e.target.value })
                  }
                  placeholder={
                    newStep.approver_type === "user"
                      ? "ID del usuario que debe aprobar"
                      : "ID del rol que puede aprobar"
                  }
                />
              </div>
            )}

            <div>
              <Label htmlFor="conditions">Condiciones (JSON, opcional)</Label>
              <Textarea
                id="conditions"
                value={newStep.conditions}
                onChange={(e) =>
                  setNewStep({ ...newStep, conditions: e.target.value })
                }
                placeholder='{"amount": ">1000", "department": "finance"}'
                rows={2}
              />
            </div>

            <Button
              type="button"
              onClick={handleAddStep}
              disabled={!newStep.name}
            >
              <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
              Agregar Paso
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
