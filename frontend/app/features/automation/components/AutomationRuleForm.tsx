/**
 * Automation Rule Form component
 * Form for creating and editing automation rules
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useTriggerTypes,
  useActionTypes,
  useConditionOperators,
  useValidateAutomationRule,
} from "../hooks/useAutomation";
import { TriggerBuilder } from "./TriggerBuilder";
import { ConditionBuilder } from "./ConditionBuilder";
import { ActionBuilder } from "./ActionBuilder";
import type {
  AutomationRule,
  AutomationRuleCreate,
  AutomationRuleUpdate,
} from "../types/automation.types";

interface AutomationRuleFormProps {
  rule?: AutomationRule;
  onSubmit?: (rule: AutomationRule) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function AutomationRuleForm({
  rule,
  onSubmit,
  onCancel,
  loading,
}: AutomationRuleFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<
    Partial<AutomationRuleCreate | AutomationRuleUpdate>
  >({
    name: rule?.name || "",
    description: rule?.description || "",
    trigger: rule?.trigger || { type: "event" },
    conditions: rule?.conditions || [],
    actions: rule?.actions || [],
    is_active: rule?.is_active ?? true,
    priority: rule?.priority || 1,
  });

  useTriggerTypes();
  useActionTypes();
  useConditionOperators();

  const createRuleMutation = useCreateAutomationRule();
  const updateRuleMutation = useUpdateAutomationRule();
  const validateRuleMutation = useValidateAutomationRule();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate rule first
      await validateRuleMutation.mutateAsync(formData);

      let result;
      if (rule) {
        result = await updateRuleMutation.mutateAsync({
          id: rule.id,
          payload: formData,
        });
      } else {
        result = await createRuleMutation.mutateAsync(
          formData as AutomationRuleCreate
        );
      }

      if (result?.data) {
        onSubmit?.(result.data);
      }
    } catch (error) {
      console.error("Failed to save rule:", error);
    }
  };

  const handleInputChange = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addCondition = () => {
    setFormData((prev) => ({
      ...prev,
      conditions: [
        ...(prev.conditions || []),
        {
          field: "",
          operator: "eq",
          value: "",
          logical_operator: "and",
        },
      ],
    }));
  };

  const updateCondition = (index: number, field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions?.map((condition, i) =>
        i === index ? { ...condition, [field]: value } : condition
      ),
    }));
  };

  const removeCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions?.filter((_, i) => i !== index),
    }));
  };

  const addAction = () => {
    setFormData((prev) => ({
      ...prev,
      actions: [
        ...(prev.actions || []),
        {
          type: "send_notification",
          channel: "email",
          template: "",
          recipients: [],
        },
      ],
    }));
  };

  const updateAction = (index: number, field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      actions: prev.actions?.map((action, i) =>
        i === index ? { ...action, [field]: value } : action
      ),
    }));
  };

  const removeAction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      actions: prev.actions?.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("automation.form.basic")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">{t("automation.form.name")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder={t("automation.form.namePlaceholder")}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">
              {t("automation.form.description")}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder={t("automation.form.descriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                handleInputChange("is_active", checked)
              }
            />
            <Label htmlFor="is_active">{t("automation.form.active")}</Label>
          </div>

          <div>
            <Label htmlFor="priority">{t("automation.form.priority")}</Label>
            <Input
              id="priority"
              type="number"
              min="1"
              max="100"
              value={formData.priority}
              onChange={(e) =>
                handleInputChange("priority", parseInt(e.target.value))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Trigger Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>{t("automation.form.trigger")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TriggerBuilder
            trigger={formData.trigger || { type: "event" }}
            onChange={(trigger) => handleInputChange("trigger", trigger)}
          />
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("automation.form.conditions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ConditionBuilder
            conditions={formData.conditions || []}
            onAddCondition={addCondition}
            onUpdateCondition={updateCondition}
            onRemoveCondition={removeCondition}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("automation.form.actions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionBuilder
            actions={formData.actions || []}
            onAddAction={addAction}
            onUpdateAction={updateAction}
            onRemoveAction={removeAction}
          />
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={
            loading ||
            createRuleMutation.isPending ||
            updateRuleMutation.isPending
          }
        >
          {loading ||
          createRuleMutation.isPending ||
          updateRuleMutation.isPending
            ? t("common.saving")
            : rule
              ? t("common.update")
              : t("common.create")}
        </Button>
      </div>
    </form>
  );
}
