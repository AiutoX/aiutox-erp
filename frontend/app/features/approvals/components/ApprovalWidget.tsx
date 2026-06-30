/**
 * Approval Widget Component
 * Reusable widget for displaying approval status and actions
 * Supports three variants: full, compact, minimal
 */

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  ClockIcon,
  AlertCircleIcon,
  CheckmarkCircleIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useApprovalWidget,
  useApproveRequest,
  useRejectRequest,
} from "~/features/approvals/hooks/useApprovals";
import type { ApprovalWidgetData } from "~/features/approvals/types/approval.types";

type ApprovalWidgetVariant = "full" | "compact" | "minimal";

interface ApprovalWidgetProps {
  requestId: string;
  variant?: ApprovalWidgetVariant;
  onAction?: (action: "approve" | "reject") => void;
}

export function ApprovalWidget({
  requestId,
  variant = "full",
  onAction,
}: ApprovalWidgetProps) {
  const { data: widgetData, isLoading, error } = useApprovalWidget(requestId);
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();
  const [comment, setComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  if (isLoading) {
    return <ApprovalWidgetSkeleton variant={variant} />;
  }

  if (error || !widgetData?.data) {
    return <ApprovalWidgetError variant={variant} />;
  }

  const { request, permissions, current_step } = widgetData.data;
  const isPending = request.status === "pending";
  const isApproved = request.status === "approved";
  const isRejected = request.status === "rejected";
  const isCancelled = request.status === "cancelled";

  const handleApprove = () => {
    void approveMutation.mutateAsync({
      requestId: request.id,
      data: { comment, rejection_reason: null },
    });
    onAction?.("approve");
    setComment("");
  };

  const handleReject = () => {
    void rejectMutation.mutateAsync({
      requestId: request.id,
      data: { comment, rejection_reason: rejectionReason || "Rechazado" },
    });
    onAction?.("reject");
    setComment("");
    setRejectionReason("");
  };

  const isSubmitting = approveMutation.isPending || rejectMutation.isPending;

  if (variant === "minimal") {
    return <MinimalApprovalWidget request={request} />;
  }

  if (variant === "compact") {
    return (
      <CompactApprovalWidget
        request={request}
        currentStep={current_step}
        permissions={permissions}
        isPending={isPending}
        isApproved={isApproved}
        isRejected={isRejected}
        isCancelled={isCancelled}
        onApprove={handleApprove}
        onReject={handleReject}
        isSubmitting={isSubmitting}
        comment={comment}
        setComment={setComment}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        requiresRejectionReason={current_step?.rejection_required || false}
      />
    );
  }

  return (
    <FullApprovalWidget
      request={request}
      currentStep={current_step}
      permissions={permissions}
      isPending={isPending}
      isApproved={isApproved}
      isRejected={isRejected}
      isCancelled={isCancelled}
      onApprove={handleApprove}
      onReject={handleReject}
      isSubmitting={isSubmitting}
      comment={comment}
      setComment={setComment}
      rejectionReason={rejectionReason}
      setRejectionReason={setRejectionReason}
      requiresRejectionReason={current_step?.rejection_required || false}
    />
  );
}

function MinimalApprovalWidget({
  request,
}: {
  request: ApprovalWidgetData["request"];
}) {
  const statusConfig = {
    pending: {
      icon: ClockIcon,
      color: "bg-yellow-100 text-yellow-800",
      label: "Pendiente",
    },
    approved: {
      icon: CheckmarkCircleIcon,
      color: "bg-green-100 text-green-800",
      label: "Aprobado",
    },
    rejected: {
      icon: Cancel01Icon,
      color: "bg-red-100 text-red-800",
      label: "Rechazado",
    },
    cancelled: {
      icon: AlertCircleIcon,
      color: "bg-gray-100 text-gray-800",
      label: "Cancelado",
    },
    delegated: {
      icon: ClockIcon,
      color: "bg-blue-100 text-blue-800",
      label: "Delegado",
    },
  };

  const config =
    statusConfig[request.status as keyof typeof statusConfig] ||
    statusConfig.pending;

  return (
    <Badge className={config.color}>
      <HugeiconsIcon icon={config.icon} size={14} className="mr-1" />
      {config.label}
    </Badge>
  );
}

function CompactApprovalWidget({
  request,
  currentStep,
  permissions,
  isPending,
  isApproved,
  isRejected,
  isCancelled,
  onApprove,
  onReject,
  isSubmitting,
  comment,
  setComment,
  rejectionReason,
  setRejectionReason,
  requiresRejectionReason,
}: {
  request: ApprovalWidgetData["request"];
  currentStep: ApprovalWidgetData["current_step"];
  permissions: ApprovalWidgetData["permissions"];
  isPending: boolean;
  isApproved: boolean;
  isRejected: boolean;
  isCancelled: boolean;
  onApprove: () => void;
  onReject: () => void;
  isSubmitting: boolean;
  comment: string;
  setComment: (value: string) => void;
  rejectionReason: string;
  setRejectionReason: (value: string) => void;
  requiresRejectionReason: boolean;
}) {
  const statusConfig = {
    pending: {
      icon: ClockIcon,
      color: "bg-yellow-100 text-yellow-800",
      label: "Pendiente",
    },
    approved: {
      icon: CheckmarkCircleIcon,
      color: "bg-green-100 text-green-800",
      label: "Aprobado",
    },
    rejected: {
      icon: Cancel01Icon,
      color: "bg-red-100 text-red-800",
      label: "Rechazado",
    },
    cancelled: {
      icon: AlertCircleIcon,
      color: "bg-gray-100 text-gray-800",
      label: "Cancelado",
    },
    delegated: {
      icon: ClockIcon,
      color: "bg-blue-100 text-blue-800",
      label: "Delegado",
    },
  };

  const config =
    statusConfig[request.status as keyof typeof statusConfig] ||
    statusConfig.pending;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className={config.color}>
            <HugeiconsIcon icon={config.icon} size={14} className="mr-1" />
            {config.label}
          </Badge>
          {currentStep && (
            <span className="text-sm text-gray-600">
              Paso {currentStep.step_order}: {currentStep.name}
            </span>
          )}
        </div>
      </div>

      {isPending && permissions.can_approve && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="comment">Comentario (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Agrega un comentario..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>

          {requiresRejectionReason && (
            <div>
              <Label htmlFor="rejection-reason" className="text-red-600">
                Motivo de rechazo (requerido)
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explica el motivo del rechazo..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={onApprove}
              disabled={isSubmitting}
              className="flex-1"
            >
              <HugeiconsIcon
                icon={CheckmarkCircleIcon}
                size={16}
                className="mr-2"
              />
              Aprobar
            </Button>
            <Button
              onClick={onReject}
              disabled={
                isSubmitting ||
                (requiresRejectionReason && !rejectionReason.trim())
              }
              variant="destructive"
              className="flex-1"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} className="mr-2" />
              Rechazar
            </Button>
          </div>
        </div>
      )}

      {(isApproved || isRejected || isCancelled) && (
        <div className="text-sm text-gray-600">
          {isApproved && (
            <p className="text-green-600">La solicitud ha sido aprobada</p>
          )}
          {isRejected && (
            <p className="text-red-600">La solicitud ha sido rechazada</p>
          )}
          {isCancelled && (
            <p className="text-gray-600">La solicitud ha sido cancelada</p>
          )}
        </div>
      )}
    </Card>
  );
}

function FullApprovalWidget({
  request,
  currentStep,
  permissions,
  isPending,
  isApproved,
  isRejected,
  isCancelled,
  onApprove,
  onReject,
  isSubmitting,
  comment,
  setComment,
  rejectionReason,
  setRejectionReason,
  requiresRejectionReason,
}: {
  request: ApprovalWidgetData["request"];
  currentStep: ApprovalWidgetData["current_step"];
  permissions: ApprovalWidgetData["permissions"];
  isPending: boolean;
  isApproved: boolean;
  isRejected: boolean;
  isCancelled: boolean;
  onApprove: () => void;
  onReject: () => void;
  isSubmitting: boolean;
  comment: string;
  setComment: (value: string) => void;
  rejectionReason: string;
  setRejectionReason: (value: string) => void;
  requiresRejectionReason: boolean;
}) {
  const statusConfig = {
    pending: {
      icon: ClockIcon,
      color: "bg-yellow-100 text-yellow-800",
      label: "Pendiente",
      description: "Esperando aprobación",
    },
    approved: {
      icon: CheckmarkCircleIcon,
      color: "bg-green-100 text-green-800",
      label: "Aprobado",
      description: "La solicitud ha sido aprobada",
    },
    rejected: {
      icon: Cancel01Icon,
      color: "bg-red-100 text-red-800",
      label: "Rechazado",
      description: "La solicitud ha sido rechazada",
    },
    cancelled: {
      icon: AlertCircleIcon,
      color: "bg-gray-100 text-gray-800",
      label: "Cancelado",
      description: "La solicitud ha sido cancelada",
    },
    delegated: {
      icon: ClockIcon,
      color: "bg-blue-100 text-blue-800",
      label: "Delegado",
      description: "La aprobación ha sido delegada",
    },
  };

  const config =
    statusConfig[request.status as keyof typeof statusConfig] ||
    statusConfig.pending;

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">{request.title}</h3>
        {request.description && (
          <p className="text-sm text-gray-600 mb-3">{request.description}</p>
        )}
        <div className="flex items-center gap-2 mb-3">
          <Badge className={config.color}>
            <HugeiconsIcon icon={config.icon} size={14} className="mr-1" />
            {config.label}
          </Badge>
          <span className="text-sm text-gray-600">{config.description}</span>
        </div>
      </div>

      {currentStep && (
        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <p className="text-sm font-medium text-gray-700">
            Paso actual: {currentStep.name}
          </p>
          {currentStep.description && (
            <p className="text-sm text-gray-600 mt-1">
              {currentStep.description}
            </p>
          )}
        </div>
      )}

      {isPending && permissions.can_approve && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="comment">Comentario (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Agrega un comentario sobre esta aprobación..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          {requiresRejectionReason && (
            <div>
              <Label htmlFor="rejection-reason" className="text-red-600">
                Motivo de rechazo (requerido)
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explica detalladamente el motivo del rechazo..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={onApprove}
              disabled={isSubmitting}
              className="flex-1"
              size="lg"
            >
              <HugeiconsIcon
                icon={CheckmarkCircleIcon}
                size={18}
                className="mr-2"
              />
              Aprobar Solicitud
            </Button>
            <Button
              onClick={onReject}
              disabled={
                isSubmitting ||
                (requiresRejectionReason && !rejectionReason.trim())
              }
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} className="mr-2" />
              Rechazar Solicitud
            </Button>
          </div>
        </div>
      )}

      {(isApproved || isRejected || isCancelled) && (
        <div className="bg-gray-50 p-4 rounded-lg">
          {isApproved && (
            <div className="flex items-center gap-2 text-green-700">
              <HugeiconsIcon icon={CheckmarkCircleIcon} size={20} />
              <p className="font-medium">
                La solicitud ha sido aprobada exitosamente
              </p>
            </div>
          )}
          {isRejected && (
            <div className="flex items-center gap-2 text-red-700">
              <HugeiconsIcon icon={Cancel01Icon} size={20} />
              <p className="font-medium">La solicitud ha sido rechazada</p>
            </div>
          )}
          {isCancelled && (
            <div className="flex items-center gap-2 text-gray-700">
              <HugeiconsIcon icon={AlertCircleIcon} size={20} />
              <p className="font-medium">La solicitud ha sido cancelada</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
        <p>Solicitado: {new Date(request.requested_at).toLocaleString()}</p>
        {request.completed_at && (
          <p>Completado: {new Date(request.completed_at).toLocaleString()}</p>
        )}
      </div>
    </Card>
  );
}

function ApprovalWidgetSkeleton({
  variant,
}: {
  variant: ApprovalWidgetVariant;
}) {
  if (variant === "minimal") {
    return <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />;
  }

  if (variant === "compact") {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-24 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
      </div>
    </Card>
  );
}

function ApprovalWidgetError({ variant }: { variant: ApprovalWidgetVariant }) {
  if (variant === "minimal") {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-800">
        Error
      </Badge>
    );
  }

  return (
    <Card className="p-4 border-red-200 bg-red-50">
      <p className="text-sm text-red-700">
        Error al cargar información de aprobación
      </p>
    </Card>
  );
}
