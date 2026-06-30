/**
 * Change Password Form Component
 * Allows authenticated users to change their password with real-time validation
 */

import { useState } from "react";
import type { AxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  changePassword,
  type ChangePasswordResponse,
} from "~/lib/api/auth.api";
import type { ApiResponse } from "~/lib/api/types/common.types";
import { usePasswordStrength } from "~/hooks/usePasswordStrength";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

interface ChangePasswordFormProps {
  isForced?: boolean;
  onSuccess?: () => void;
}

export function ChangePasswordForm({
  isForced = false,
  onSuccess,
}: ChangePasswordFormProps = {}) {
  const { t } = useTranslation();
  // const { toast } = useToasts(); // Comentado temporalmente - Toast no implementado
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validate new password strength
  const passwordStrength = usePasswordStrength(newPassword, {
    minScore: 2,
    userInputs: [], // TODO: Add user email, name from context
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      return await changePassword(currentPassword, newPassword);
    },
    onSuccess: (response) => {
      // toast({
      //   title: t("auth.password.change.success.title"),
      //   description: t("auth.password.change.success.description", {
      //     count: response.data?.sessions_invalidated || 0,
      //   }),
      // });
      console.log("Password changed successfully", response);

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      onSuccess?.();

      if (!isForced) {
        // Redirect to login after 2 seconds (sessions invalidated)
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    },
    onError: (error: AxiosError<ApiResponse<ChangePasswordResponse>>) => {
      const errorCode = error.response?.data?.error?.code;
      const errorMessage =
        error.response?.data?.error?.message ||
        (errorCode ? t(`auth.password.error.${errorCode}`) : undefined) ||
        t("auth.password.error.generic");

      // Clear current password on error for security
      setCurrentPassword("");

      // toast({
      //   variant: "destructive",
      //   title: t("auth.password.change.error.title"),
      //   description: errorMessage || t(`auth.password.error.${errorCode}`) || t("auth.password.error.generic"),
      // });
      console.error("Password change error:", errorMessage);
    },
  });

  // Form validation
  const isFormValid = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return false;
    }

    if (newPassword !== confirmPassword) {
      return false;
    }

    if (!passwordStrength.isValid) {
      return false;
    }

    if (newPassword === currentPassword) {
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      // toast({
      //   variant: "destructive",
      //   title: t("auth.password.error.title"),
      //   description: t("auth.password.error.passwordsDoNotMatch"),
      // });
      console.error("Passwords do not match");
      return;
    }

    // Validate new password is different from current
    if (newPassword === currentPassword) {
      // toast({
      //   variant: "destructive",
      //   title: t("auth.password.error.title"),
      //   description: t("auth.password.error.samePassword"),
      // });
      console.error("New password same as current");
      return;
    }

    // Validate strength
    if (!passwordStrength.isValid) {
      // toast({
      //   variant: "destructive",
      //   title: t("auth.password.error.title"),
      //   description: t("auth.password.error.weakPassword"),
      // });
      console.error("Password too weak");
      return;
    }

    changePasswordMutation.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      data-testid="change-password-form"
    >
      {/* Current Password */}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">
          {t("auth.password.current.label")}
        </Label>
        <div className="relative">
          <Input
            id="currentPassword"
            name="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder={t("auth.password.current.placeholder")}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
          >
            {showCurrentPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t("auth.password.new.label")}</Label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("auth.password.new.placeholder")}
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowNewPassword(!showNewPassword)}
          >
            {showNewPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {newPassword && (
          <PasswordStrengthIndicator
            strength={passwordStrength}
            showRequirements={true}
          />
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          {t("auth.password.confirm.label")}
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("auth.password.confirm.placeholder")}
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>

        {/* Confirmation validation */}
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="text-xs text-destructive">
            {t("auth.password.error.passwordsDoNotMatch")}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!isFormValid() || changePasswordMutation.isPending}
          className="flex-1"
        >
          {changePasswordMutation.isPending
            ? t("auth.password.change.submitting")
            : t("auth.password.change.submit")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
          }}
        >
          {t("common.cancel")}
        </Button>
      </div>

      {/* Info Message */}
      <p className="text-xs text-muted-foreground">
        {t("auth.password.change.info")}
      </p>
    </form>
  );
}
