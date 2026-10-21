/**
 * Action Node Component
 * Represents an automation action (notification, task, webhook, etc.)
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Play } from "lucide-react";
import type { AutomationAction } from "../../types/automation.types";

export interface ActionNodeData {
  type: AutomationAction["type"];
  channel?: string;
  template?: string;
  webhook_url?: string;
  event_type?: string;
  label?: string;
}

const ACTION_TYPE_LABEL: Record<AutomationAction["type"], string> = {
  send_notification: "Notificación",
  create_task: "Crear Tarea",
  update_entity: "Actualizar Entidad",
  send_webhook: "Webhook",
  publish_event: "Publicar Evento",
};

export const ActionNode = memo(
  ({ data, selected }: NodeProps<ActionNodeData>) => {
    const typeLabel = ACTION_TYPE_LABEL[data.type] ?? data.type;

    const subtitle =
      data.channel ??
      data.template ??
      data.webhook_url ??
      data.event_type ??
      undefined;

    return (
      <div
        className={`px-4 py-3 rounded-lg border-2 bg-card shadow-lg min-w-[180px] ${
          selected
            ? "border-primary ring-2 ring-primary/30"
            : "border-primary/60"
        }`}
      >
        {/* Input handle only */}
        <Handle type="target" position={Position.Top} className="w-3 h-3" />

        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-primary">
            <Play className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground truncate">
              {data.label ?? "Acción"}
            </div>
            {subtitle && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {subtitle}
              </div>
            )}
            <span className="inline-block mt-1.5 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              {typeLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

ActionNode.displayName = "ActionNode";
