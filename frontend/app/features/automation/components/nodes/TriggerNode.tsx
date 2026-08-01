/**
 * Trigger Node Component
 * Represents the automation trigger (event, schedule, or manual)
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Zap } from "lucide-react";
import type { AutomationTrigger } from "../../types/automation.types";

export interface TriggerNodeData {
  trigger_type: AutomationTrigger["type"];
  event_type?: string;
  entity_type?: string;
  schedule?: AutomationTrigger["schedule"];
  label?: string;
}

const TRIGGER_TYPE_LABEL: Record<AutomationTrigger["type"], string> = {
  event: "Evento",
  schedule: "Programado",
  manual: "Manual",
  webhook: "Webhook",
};

export const TriggerNode = memo(
  ({ data, selected }: NodeProps<TriggerNodeData>) => {
    const typeLabel =
      TRIGGER_TYPE_LABEL[data.trigger_type] ?? data.trigger_type;

    return (
      <div
        className={`px-4 py-3 rounded-lg border-2 bg-card shadow-lg min-w-[180px] ${
          selected
            ? "border-green-500 ring-2 ring-green-500/30"
            : "border-green-500/60"
        }`}
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-green-600 dark:text-green-400">
            <Zap className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground truncate">
              {data.label ?? "Disparador"}
            </div>
            {data.event_type && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {data.event_type}
              </div>
            )}
            {data.entity_type && (
              <div className="text-xs text-muted-foreground truncate">
                {data.entity_type}
              </div>
            )}
            {data.schedule?.expression && (
              <div className="text-xs text-muted-foreground font-mono truncate">
                {data.schedule.expression}
              </div>
            )}
            <span className="inline-block mt-1.5 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
              {typeLabel}
            </span>
          </div>
        </div>

        {/* Output handle only */}
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      </div>
    );
  }
);

TriggerNode.displayName = "TriggerNode";
