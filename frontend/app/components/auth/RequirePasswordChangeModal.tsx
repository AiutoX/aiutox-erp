/**
 * Required Password Change Modal
 * Blocks user access until password is changed (forced by admin or policy)
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ChangePasswordForm } from "./ChangePasswordForm";

interface RequirePasswordChangeModalProps {
  isOpen: boolean;
  reason?: string;
  message?: string;
  onPasswordChanged?: () => void;
}

export function RequirePasswordChangeModal({
  isOpen,
  reason,
  message,
  onPasswordChanged,
}: RequirePasswordChangeModalProps) {
  const { t } = useTranslation();
  const [attemptedClose, setAttemptedClose] = useState(false);

  // Reset attempted close when modal opens
  useEffect(() => {
    if (isOpen) {
      setAttemptedClose(false);
    }
  }, [isOpen]);

  // Prevent closing the modal
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setAttemptedClose(true);
      // Dialog stays open because `open` prop is controlled
    }
  };

  // Get reason message
  const getReasonMessage = () => {
    if (message) return message;

    const reasonMap: Record<string, string> = {
      admin_forced: t("auth.password.forceChange.reason.adminForced"),
      security_breach: t("auth.password.forceChange.reason.securityBreach"),
      policy_expired: t("auth.password.forceChange.reason.policyExpired"),
      first_login: t("auth.password.forceChange.reason.firstLogin"),
      compromised: t("auth.password.forceChange.reason.compromised"),
    };

    return reason
      ? reasonMap[reason] || reason
      : t("auth.password.forceChange.reason.generic");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {t("auth.password.forceChange.title")}
          </DialogTitle>
          <DialogDescription>
            {t("auth.password.forceChange.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Reason Alert */}
        <Alert
          variant={reason === "security_breach" ? "destructive" : "default"}
        >
          <AlertDescription className="text-sm">
            <strong>{t("auth.password.forceChange.reasonLabel")}:</strong>{" "}
            {getReasonMessage()}
          </AlertDescription>
        </Alert>

        {/* Warning if user tried to close */}
        {attemptedClose && (
          <Alert variant="destructive">
            <AlertDescription className="text-sm">
              {t("auth.password.forceChange.cannotClose")}
            </AlertDescription>
          </Alert>
        )}

        {/* Change Password Form */}
        <div className="mt-4">
          <ChangePasswordForm isForced={true} onSuccess={onPasswordChanged} />
        </div>

        {/* Info Footer */}
        <div className="mt-4 rounded-md bg-muted p-3">
          <p className="text-xs text-muted-foreground">
            {t("auth.password.forceChange.footer")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
