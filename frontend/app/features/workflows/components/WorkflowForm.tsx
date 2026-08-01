/**
 * WorkflowForm component
 * Form for creating and editing workflows
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type {
  Workflow,
  WorkflowCreate,
  WorkflowUpdate,
  WorkflowStep,
  WorkflowStepFormData,
} from "../types/workflow.types";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface WorkflowFormProps {
  workflow?: Workflow;
  onSubmit: (data: WorkflowCreate | WorkflowUpdate) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function WorkflowForm({
  workflow,
  onSubmit,
  onCancel,
  loading = false,
}: WorkflowFormProps) {
  const { t } = useTranslation();
  const isEdit = !!workflow;

  const [name, setName] = useState(workflow?.name || "");
  const [description, setDescription] = useState(workflow?.description || "");
  const [enabled, setEnabled] = useState(workflow?.enabled ?? true);
  const [steps, setSteps] = useState<WorkflowStepFormData[]>(
    workflow?.definition.steps.map(
      (s): WorkflowStepFormData => ({
        name: s.name,
        step_type: s.step_type,
        order: s.order,
        config: s.config,
        transitions: s.transitions,
      })
    ) || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: WorkflowCreate | WorkflowUpdate = {
      name,
      description: description || null,
      enabled,
      definition: {
        steps: steps.map((s, idx) => ({
          id: `temp-${idx}`, // Temporary ID for new steps
          workflow_id: workflow?.id || "temp",
          tenant_id: "temp", // Will be set by backend
          ...s,
          order: idx + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as WorkflowStep[], // Cast to WorkflowStep[]
      },
      metadata: null,
    };

    onSubmit(data);
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        name: `Step ${steps.length + 1}`,
        step_type: "manual",
        order: steps.length + 1,
        config: null,
        transitions: null,
      },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (
    index: number,
    field: keyof WorkflowStepFormData,
    value:
      | string
      | number
      | Record<string, unknown>
      | Record<string, unknown>[]
      | null
  ) => {
    const newSteps = [...steps];
    // Ensure name is never undefined when updating
    const updatedStep = {
      ...newSteps[index],
      [field]: value,
    } as WorkflowStepFormData;
    if (field === "name" && !updatedStep.name) {
      updatedStep.name = `Step ${index + 1}`;
    }
    newSteps[index] = updatedStep;
    setSteps(newSteps);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEdit
              ? t("workflows.editWorkflow")
              : t("workflows.createWorkflow")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("workflows.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("workflows.namePlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("workflows.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("workflows.descriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="enabled">{t("workflows.enabled")}</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("workflows.steps")}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-4 w-4 mr-2" />
              {t("workflows.addStep")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("workflows.noSteps")}
            </p>
          ) : (
            steps.map((step, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-2">
                    <Input
                      value={step.name}
                      onChange={(e) =>
                        updateStep(index, "name", e.target.value)
                      }
                      placeholder={t("workflows.stepName")}
                    />
                    <div className="flex gap-2">
                      <select
                        className="flex-1 h-10 px-3 rounded-md border border-input bg-background"
                        value={step.step_type}
                        onChange={(e) =>
                          updateStep(index, "step_type", e.target.value)
                        }
                      >
                        <option value="manual">
                          {t("workflows.stepTypes.manual")}
                        </option>
                        <option value="automatic">
                          {t("workflows.stepTypes.automatic")}
                        </option>
                        <option value="approval">
                          {t("workflows.stepTypes.approval")}
                        </option>
                        <option value="notification">
                          {t("workflows.stepTypes.notification")}
                        </option>
                        <option value="task">
                          {t("workflows.stepTypes.task")}
                        </option>
                        <option value="condition">
                          {t("workflows.stepTypes.condition")}
                        </option>
                        <option value="parallel">
                          {t("workflows.stepTypes.parallel")}
                        </option>
                        <option value="subworkflow">
                          {t("workflows.stepTypes.subworkflow")}
                        </option>
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? t("common.saving")
            : isEdit
              ? t("common.update")
              : t("common.create")}
        </Button>
      </div>
    </form>
  );
}
