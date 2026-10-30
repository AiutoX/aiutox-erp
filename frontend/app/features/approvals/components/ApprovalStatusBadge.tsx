/**
 * Approval Status Badge Component
 * Displays approval status with color, icon, and tooltip
 */

import { Badge } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  ClockIcon,
  CheckmarkCircleIcon,
  Cancel01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ApprovalStatus } from "~/features/approvals/types/approval.types";

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  showLabel?: boolean;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusConfig = {
  pending: {
    icon: ClockIcon,
    color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    label: "Pendiente",
    description: "La solicitud está esperando aprobación",
  },
  approved: {
    icon: CheckmarkCircleIcon,
    color: "bg-green-100 text-green-800 hover:bg-green-200",
    label: "Aprobado",
    description: "La solicitud ha sido aprobada",
  },
  rejected: {
    icon: Cancel01Icon,
    color: "bg-red-100 text-red-800 hover:bg-red-200",
    label: "Rechazado",
    description: "La solicitud ha sido rechazada",
  },
  cancelled: {
    icon: AlertCircleIcon,
    color: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    label: "Cancelado",
    description: "La solicitud ha sido cancelada",
  },
  delegated: {
    icon: ClockIcon,
    color: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    label: "Delegado",
    description: "La aprobación ha sido delegada a otro usuario",
  },
};

export function ApprovalStatusBadge({
  status,
  showLabel = true,
  showIcon = true,
  size = "md",
}: ApprovalStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const iconSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  const textSize =
    size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={`${config.color} ${textSize} cursor-help transition-colors`}
          >
            {showIcon && (
              <HugeiconsIcon
                icon={config.icon}
                size={iconSize}
                className="mr-1"
              />
            )}
            {showLabel && config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
