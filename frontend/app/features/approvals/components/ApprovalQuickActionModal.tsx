/**
 * Approval Quick Action Modal Component
 * Modal for quick approval, rejection, or delegation of requests
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import type { ApprovalRequestResponse } from "../types/approval.types";

interface ApprovalQuickActionModalProps {
  request: ApprovalRequestResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (
    requestId: string,
    action: string,
    decision?: { comment?: string; delegated_to?: string }
  ) => void;
  action?: "approve" | "reject" | "delegate";
}

export function ApprovalQuickActionModal({
  request,
  open,
  onOpenChange,
  onAction,
  action = "approve",
}: ApprovalQuickActionModalProps) {
  const [comment, setComment] = useState("");
  const [delegatedTo, setDelegatedTo] = useState("");

  const handleSubmit = () => {
    if (request) {
      const decision: { comment?: string; delegated_to?: string } = {
        comment: comment || undefined,
      };

      if (action === "delegate" && delegatedTo) {
        decision.delegated_to = delegatedTo;
      }

      onAction(request.id, action, decision);
      setComment("");
      setDelegatedTo("");
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setComment("");
    setDelegatedTo("");
    onOpenChange(false);
  };

  const getActionTitle = () => {
    switch (action) {
      case "approve":
        return "Aprobar Solicitud";
      case "reject":
        return "Rechazar Solicitud";
      case "delegate":
        return "Delegar Solicitud";
      default:
        return "Acción de Aprobación";
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case "approve":
        return `¿Estás seguro de que deseas aprobar la solicitud "${request?.title}"?`;
      case "reject":
        return `¿Estás seguro de que deseas rechazar la solicitud "${request?.title}"?`;
      case "delegate":
        return `¿Estás seguro de que deseas delegar la solicitud "${request?.title}"? Selecciona el usuario al que deseas delegar.`;
      default:
        return "¿Deseas realizar esta acción?";
    }
  };

  const getActionButtonText = () => {
    switch (action) {
      case "approve":
        return "Aprobar";
      case "reject":
        return "Rechazar";
      case "delegate":
        return "Delegar";
      default:
        return "Confirmar";
    }
  };

  const getActionButtonVariant = () => {
    switch (action) {
      case "approve":
        return "default";
      case "reject":
        return "destructive";
      case "delegate":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getActionTitle()}</DialogTitle>
          <DialogDescription>{getActionDescription()}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {action === "delegate" && (
            <div className="grid gap-2">
              <Label htmlFor="delegated_to">Usuario Delegado *</Label>
              <Input
                id="delegated_to"
                placeholder="ID del usuario al que delegar"
                value={delegatedTo}
                onChange={(e) => setDelegatedTo(e.target.value)}
                required
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="comment">Comentario (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Agrega un comentario sobre tu decisión..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={getActionButtonVariant()}
            onClick={handleSubmit}
            disabled={action === "delegate" && !delegatedTo}
          >
            {getActionButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
