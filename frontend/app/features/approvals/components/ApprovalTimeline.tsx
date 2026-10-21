/**
 * Approval Timeline Component
 * Displays timeline of approval actions and delegations
 */

import { Card } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  CheckmarkCircleIcon,
  Cancel01Icon,
  ClockIcon,
  AlertCircleIcon,
  ArrowRightIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ApprovalTimelineItem } from "~/features/approvals/types/approval.types";

interface ApprovalTimelineProps {
  items: ApprovalTimelineItem[];
  maxHeight?: string;
}

const actionConfig = {
  created: {
    icon: ClockIcon,
    color: "bg-gray-100 text-gray-700",
    label: "Solicitud creada",
  },
  approve: {
    icon: CheckmarkCircleIcon,
    color: "bg-green-100 text-green-700",
    label: "Aprobado",
  },
  reject: {
    icon: Cancel01Icon,
    color: "bg-red-100 text-red-700",
    label: "Rechazado",
  },
  delegate: {
    icon: ArrowRightIcon,
    color: "bg-blue-100 text-blue-700",
    label: "Delegado",
  },
  comment: {
    icon: AlertCircleIcon,
    color: "bg-purple-100 text-purple-700",
    label: "Comentario",
  },
  cancelled: {
    icon: AlertCircleIcon,
    color: "bg-gray-100 text-gray-700",
    label: "Cancelado",
  },
};

export function ApprovalTimeline({
  items,
  maxHeight = "400px",
}: ApprovalTimelineProps) {
  if (!items || items.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">No hay acciones registradas</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Historial de Aprobaciones</h3>
      <ScrollArea className={maxHeight}>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-6">
            {items.map((item) => (
              <TimelineItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}

function TimelineItem({ item }: { item: ApprovalTimelineItem }) {
  const config = actionConfig[item.action_type] || actionConfig.created;
  const date = new Date(item.acted_at);
  const formattedDate = date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relative pl-10">
      <div
        className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}
      >
        <HugeiconsIcon icon={config.icon} size={16} />
      </div>
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="font-medium text-gray-900">{config.label}</span>
            {item.step_order !== undefined && (
              <span className="ml-2 text-sm text-gray-600">
                (Paso {item.step_order})
              </span>
            )}
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>{formattedDate}</div>
            <div>{formattedTime}</div>
          </div>
        </div>
        {item.acted_by && (
          <p className="text-sm text-gray-600 mb-2">
            Por: <span className="font-medium">{item.acted_by}</span>
          </p>
        )}
        {item.comment && (
          <div className="bg-white rounded p-3 border border-gray-200">
            <p className="text-sm text-gray-700">{item.comment}</p>
          </div>
        )}
        {item.rejection_reason && item.action_type === "reject" && (
          <div className="mt-2 bg-red-50 rounded p-3 border border-red-200">
            <p className="text-sm font-medium text-red-800 mb-1">
              Motivo del rechazo:
            </p>
            <p className="text-sm text-red-700">{item.rejection_reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
