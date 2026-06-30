/**
 * Condition Builder component
 * Allows configuration of multiple conditions with AND/OR logic
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
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
import type { AutomationCondition } from "../types/automation.types";

interface ConditionBuilderProps {
  conditions: AutomationCondition[];
  onAddCondition: () => void;
  onUpdateCondition: (index: number, field: string, value: unknown) => void;
  onRemoveCondition: (index: number) => void;
}

const OPERATORS = [
  { value: "eq", label: "=" },
  { value: "ne", label: "≠" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "in", label: "in" },
  { value: "nin", label: "not in" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "not contains" },
];

export function ConditionBuilder({
  conditions,
  onAddCondition,
  onUpdateCondition,
  onRemoveCondition,
}: ConditionBuilderProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {conditions.map((condition, index) => (
        <ConditionRow
          key={index}
          index={index}
          condition={condition}
          onUpdate={onUpdateCondition}
          onRemove={onRemoveCondition}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={onAddCondition}
        className="w-full"
      >
        {t("automation.form.addCondition")}
      </Button>
    </div>
  );
}

interface ConditionRowProps {
  index: number;
  condition: AutomationCondition;
  onUpdate: (index: number, field: string, value: unknown) => void;
  onRemove: (index: number) => void;
}

function ConditionRow({
  index,
  condition,
  onUpdate,
  onRemove,
}: ConditionRowProps) {
  const { t } = useTranslation();

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">
          {t("automation.form.condition")} {index + 1}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          {t("common.remove")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">{t("automation.form.field")}</Label>
          <Input
            value={condition.field}
            onChange={(e) => onUpdate(index, "field", e.target.value)}
            placeholder="status"
          />
        </div>

        <div>
          <Label className="text-xs">{t("automation.form.operator")}</Label>
          <Select
            value={condition.operator}
            onValueChange={(value) => onUpdate(index, "operator", value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">{t("automation.form.value")}</Label>
          <Input
            value={String(condition.value ?? "")}
            onChange={(e) => onUpdate(index, "value", e.target.value)}
            placeholder="completed"
          />
        </div>

        <div>
          <Label className="text-xs">
            {t("automation.form.logicalOperator")}
          </Label>
          <Select
            value={condition.logical_operator || "and"}
            onValueChange={(value) =>
              onUpdate(index, "logical_operator", value)
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">{t("automation.logical.and")}</SelectItem>
              <SelectItem value="or">{t("automation.logical.or")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
