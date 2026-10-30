/**
 * Condition Builder component
 * Allows configuration of multiple conditions with AND/OR logic
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useConditionOperators } from "../hooks/useAutomation";
import type { AutomationCondition } from "../types/automation.types";

interface ConditionBuilderProps {
  conditions: AutomationCondition[];
  onAddCondition: () => void;
  onUpdateCondition: (index: number, field: string, value: unknown) => void;
  onRemoveCondition: (index: number) => void;
}

// Symbol labels for the canonical operators — used as a fallback while
// useConditionOperators() is loading, and to render a compact label instead
// of the API's longer `description` field.
const OPERATOR_SYMBOLS: Record<string, string> = {
  "==": "=",
  "!=": "≠",
  ">": ">",
  ">=": "≥",
  "<": "<",
  "<=": "≤",
  in: "in",
  contains: "contains",
};

const FALLBACK_OPERATORS = Object.keys(OPERATOR_SYMBOLS);

export function ConditionBuilder({
  conditions,
  onAddCondition,
  onUpdateCondition,
  onRemoveCondition,
}: ConditionBuilderProps) {
  const { t } = useTranslation();
  const { data: operatorsResponse } = useConditionOperators();
  const operators = operatorsResponse?.data?.length
    ? operatorsResponse.data.map((op) => op.operator)
    : FALLBACK_OPERATORS;

  return (
    <div className="space-y-4">
      {conditions.map((condition, index) => (
        <ConditionRow
          key={index}
          index={index}
          condition={condition}
          operators={operators}
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
  operators: string[];
  onUpdate: (index: number, field: string, value: unknown) => void;
  onRemove: (index: number) => void;
}

function ConditionRow({
  index,
  condition,
  operators,
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
              {operators.map((op) => (
                <SelectItem key={op} value={op}>
                  {OPERATOR_SYMBOLS[op] ?? op}
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

      <div className="flex items-center gap-2">
        <Checkbox
          id={`condition-negate-${index}`}
          checked={condition.negate ?? false}
          onCheckedChange={(checked) =>
            onUpdate(index, "negate", checked === true)
          }
        />
        <Label
          htmlFor={`condition-negate-${index}`}
          className="text-xs font-normal cursor-pointer"
        >
          {t("automation.form.negate")}
        </Label>
      </div>
    </div>
  );
}
