/**
 * ActiveDelegationsList Component
 *
 * Lists the temporary permissions currently delegated to a user (module,
 * permission, expiry) and lets an administrator revoke one after confirming.
 *
 * The user's effective permissions only carry permission strings for
 * delegations -- no delegation ids and no expiry -- so they are used here only
 * to discover which modules hold delegations (useUserDelegatedModules). The
 * real rows (id, expires_at, is_active) come per module from
 * useUserModuleDelegations. Both are TanStack queries, so reopening the tab
 * reuses the cache; a revoke invalidates only this user's delegation keys.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { showToast } from "~/components/common/Toast";
import { useHasPermission } from "~/hooks/usePermissions";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { DelegatedPermissionResponse } from "../api/permissions.api";
import {
  delegationKeys,
  useRevokeUserPermission,
  useUserDelegatedModules,
  useUserModuleDelegations,
} from "../hooks/useUserPermissions";
import { translateModuleName } from "../utils/moduleNames";
import type { User } from "../types/user.types";

interface ActiveDelegationsListProps {
  user: User;
  onUpdate?: () => void;
}

interface ModuleDelegationRowsProps {
  userId: string;
  moduleId: string;
  onRevoked: () => Promise<void>;
}

/**
 * Active delegation rows of one module. A component of its own because the
 * per-module hook cannot be called from a loop.
 */
function ModuleDelegationRows({
  userId,
  moduleId,
  onRevoked,
}: ModuleDelegationRowsProps) {
  const { t } = useTranslation();
  const { data: permissions = [], error } = useUserModuleDelegations(
    moduleId,
    userId
  );
  // DELETE /auth/users/{id}/permissions/{pid} requires auth.manage_users
  const canRevoke = useHasPermission("auth.manage_users");
  const { revoke, loading: revoking } = useRevokeUserPermission();
  const [pending, setPending] = useState<DelegatedPermissionResponse | null>(
    null
  );

  const active = permissions.filter((delegation) => delegation.is_active);

  const confirmRevoke = async () => {
    const target = pending;
    if (!target) return;
    const success = await revoke(userId, target.id);
    if (success) {
      showToast(t("users.revokeDelegationSuccess"), "success");
      await onRevoked();
    } else {
      showToast(t("users.revokeDelegationError"), "error");
    }
  };

  if (error) {
    return (
      <li className="rounded-md border p-3">
        <Badge variant="outline">{translateModuleName(t, moduleId)}</Badge>{" "}
        <span className="text-sm text-destructive">
          {t("users.delegationsLoadError")}
        </span>
      </li>
    );
  }

  return (
    <>
      {active.map((delegation) => (
        <li
          key={delegation.id}
          className="flex items-center justify-between gap-4 rounded-md border p-3"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {translateModuleName(t, moduleId)}
              </Badge>
              <span className="text-sm font-medium">
                {delegation.permission}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("users.expiresAt")}:{" "}
              <span>
                {delegation.expires_at
                  ? new Date(delegation.expires_at).toLocaleDateString()
                  : t("users.never")}
              </span>
            </p>
          </div>
          {canRevoke && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPending(delegation)}
              disabled={revoking}
            >
              {t("users.revokeDelegation")}
            </Button>
          )}
        </li>
      ))}
      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => void confirmRevoke()}
        title={t("users.revokeDelegationTitle")}
        description={`${t("users.revokeDelegationDescription")} ${pending?.permission ?? ""}`.trim()}
        confirmText={t("users.revokeDelegation")}
        cancelText={t("users.cancel")}
        variant="destructive"
        loading={revoking}
      />
    </>
  );
}

/**
 * ActiveDelegationsList component
 */
export function ActiveDelegationsList({
  user,
  onUpdate,
}: ActiveDelegationsListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: moduleIds, isLoading, error } = useUserDelegatedModules(
    user.id
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" text={t("users.loadingPermissions")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-sm text-destructive">
          {t("users.delegationsLoadError")}
        </p>
      </div>
    );
  }

  if (!moduleIds || moduleIds.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {t("users.noActiveDelegations")}
        </p>
      </div>
    );
  }

  const handleRevoked = async () => {
    await queryClient.invalidateQueries({
      queryKey: delegationKeys.all(user.id),
    });
    onUpdate?.();
  };

  return (
    <ul className="space-y-2">
      {moduleIds.map((moduleId) => (
        <ModuleDelegationRows
          key={moduleId}
          userId={user.id}
          moduleId={moduleId}
          onRevoked={handleRevoked}
        />
      ))}
    </ul>
  );
}
