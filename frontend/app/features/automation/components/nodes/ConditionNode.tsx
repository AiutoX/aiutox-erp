/**
 * Condition Node Component
 * Represents an automation condition (field operator value)
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Filter } from "lucide-react";
import type { AutomationCondition } from "../../types/automation.types";

export interface ConditionNodeData {
  field: string;
  operator: AutomationCondition["operator"];
  value: unknown;
  logical_operator?: AutomationCondition["logical_operator"];
  label?: string;
}

const OPERATOR_LABEL: Record<AutomationCondition["operator"], string> = {
  eq: "=",
  ne: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  in: "en",
  nin: "no en",
  contains: "contiene",
  not_contains: "no contiene",
};

export const ConditionNode = memo(
  ({ data, selected }: NodeProps<ConditionNodeData>) => {
    const opLabel = OPERATOR_LABEL[data.operator] ?? data.operator;
    const valueStr = Array.isArray(data.value)
      ? data.value.join(", ")
      : String(data.value ?? "");

    return (
      <div
        className={`px-4 py-3 rounded-lg border-2 bg-card shadow-lg min-w-[200px] ${
          selected
            ? "border-amber-500 ring-2 ring-amber-500/30"
            : "border-amber-500/60"
        }`}
      >
        {/* Input handle */}
        <Handle type="target" position={Position.Top} className="w-3 h-3" />

        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-amber-600 dark:text-amber-400">
            <Filter className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground truncate">
              {data.label ?? "Condición"}
            </div>
            {data.field && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono truncate max-w-[80px]">
                  {data.field}
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                  {opLabel}
                </span>
                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded truncate max-w-[80px]">
                  {valueStr}
                </span>
              </div>
            )}
            {data.logical_operator && (
              <span className="inline-block mt-1.5 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded uppercase">
                {data.logical_operator}
              </span>
            )}
          </div>
        </div>

        {/* Output handle */}
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      </div>
    );
  }
);

ConditionNode.displayName = "ConditionNode";
