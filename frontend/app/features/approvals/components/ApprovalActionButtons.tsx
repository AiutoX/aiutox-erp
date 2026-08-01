/**
 * Approval Action Buttons Component
 * Action buttons for approval requests
 */

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  PlugIcon,
  UploadIcon,
  ArrowLeftIcon,
  DownloadIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  ApprovalRequestResponse,
  ApprovalStatus,
} from "~/features/approvals/types/approval.types";

interface ApprovalActionButtonsProps {
  request: ApprovalRequestResponse;
  onAction?: (
    requestId: string,
    action: string,
    decision?: { comment?: string }
  ) => void;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "destructive";
  showActions?: boolean;
}

const getStatusBadge = (status: ApprovalStatus): string => {
  switch (status) {
    case "pending":
      return "bg-yellow-500 text-white";
    case "approved":
      return "bg-green-500 text-white";
    case "rejected":
      return "bg-red-500 text-white";
    case "delegated":
      return "bg-purple-500 text-white";
    case "cancelled":
      return "bg-gray-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

export function ApprovalActionButtons({
  request,
  onAction,
  size = "sm",
  variant = "default",
  showActions = true,
}: ApprovalActionButtonsProps) {
  const isPending = request.status === "pending";

  const handleApprove = () => {
    if (onAction) {
      onAction(request.id, "approve", { comment: "" });
    }
  };

  const handleReject = () => {
    if (onAction) {
      onAction(request.id, "reject", { comment: "" });
    }
  };

  const handleView = () => {
    if (onAction) {
      onAction(request.id, "view");
    }
  };

  const handleDelegate = () => {
    if (onAction) {
      onAction(request.id, "delegate", { comment: "" });
    }
  };

  if (!showActions) {
    return null;
  }

  return (
    <div className="flex gap-2">
      {/* View Details */}
      <Button
        size={size}
        variant={variant}
        onClick={handleView}
        className="text-blue-600 hover:text-blue-700"
      >
        <HugeiconsIcon icon={DownloadIcon} size={16} className="mr-2" />
        Ver detalles
      </Button>

      {/* Approve Button */}
      {isPending && (
        <Button
          size={size}
          variant={variant}
          onClick={handleApprove}
          className="text-green-600 hover:text-green-700"
        >
          <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
          Aprobar
        </Button>
      )}

      {/* Reject Button */}
      {isPending && (
        <Button
          size={size}
          variant={variant}
          onClick={handleReject}
          className="text-red-600 hover:text-red-700"
        >
          <HugeiconsIcon icon={UploadIcon} size={16} className="mr-2" />
          Rechazar
        </Button>
      )}

      {/* Delegate Button */}
      {isPending && (
        <Button
          size={size}
          variant={variant}
          onClick={handleDelegate}
          className="text-blue-600 hover:text-blue-700"
        >
          <HugeiconsIcon icon={ArrowLeftIcon} size={16} className="mr-2" />
          Delegar
        </Button>
      )}

      {/* Status Badge */}
      <Badge className={getStatusBadge(request.status)}>{request.status}</Badge>
    </div>
  );
}
