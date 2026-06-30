/**
 * UserRolesManager Component
 *
 * Manages roles assigned to a user (global roles + custom roles)
 */

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { X, Shield } from "lucide-react";
import {
  useUserRoles,
  useAvailableRoles,
  useAssignRole,
  useRemoveRole,
} from "../hooks/useUserRoles";
import { useCustomRoles } from "../hooks/useCustomRoles";
import type { User, GlobalRole } from "../types/user.types";

interface UserRolesManagerProps {
  user: User;
  onUpdate?: () => void;
}

/**
 * UserRolesManager component
 */
export function UserRolesManager({ user, onUpdate }: UserRolesManagerProps) {
  const { t } = useTranslation();
  const { roles, loading, refresh } = useUserRoles(user.id);
  const { availableRoles } = useAvailableRoles();
  const { roles: customRoles } = useCustomRoles();
  const { assign, loading: assigning } = useAssignRole();
  const { remove, loading: removing } = useRemoveRole();

  const [selectedRole, setSelectedRole] = useState<string>("");

  const handleAssignRole = async (roleName: string) => {
    const result = await assign(user.id, roleName as GlobalRole);
    if (result) {
      showToast(
        t("users.roleAssignedSuccess") || "Rol asignado exitosamente",
        "success"
      );
      setSelectedRole("");
      refresh();
      onUpdate?.();
    } else {
      showToast(
        t("users.roleAssignedError") || "Error al asignar el rol",
        "error"
      );
    }
  };

  const handleRemoveRole = async (roleName: GlobalRole) => {
    const success = await remove(user.id, roleName);
    if (success) {
      showToast(
        t("users.roleRemovedSuccess") || "Rol removido exitosamente",
        "success"
      );
      refresh();
      onUpdate?.();
    } else {
      showToast(
        t("users.roleRemovedError") || "Error al remover el rol",
        "error"
      );
    }
  };

  // Get available roles that user doesn't have
  const availableGlobalRoles = availableRoles.filter(
    (role) => !roles.some((userRole) => userRole.role === role.role)
  );

  const availableCustomRolesForUser = customRoles.filter(
    (customRole) => !roles.some((userRole) => userRole.role === customRole.id)
  );

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("users.loadingRoles") || "Cargando roles..."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {t("users.assignedRoles") || "Roles Asignados"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("users.assignedRolesDescription") ||
              "Gestiona los roles globales y personalizados del usuario"}
          </p>
        </div>
      </div>

      {/* Assign New Role */}
      <div className="flex items-center gap-2">
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-[250px]">
            <SelectValue
              placeholder={
                t("users.selectRoleToAssign") || "Seleccionar rol para asignar"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableGlobalRoles.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {t("users.globalRoles") || "Roles Globales"}
                </div>
                {availableGlobalRoles.map((role) => (
                  <SelectItem key={role.role} value={role.role}>
                    {role.role.charAt(0).toUpperCase() + role.role.slice(1)} (
                    {role.permissions.length}{" "}
                    {t("users.permissions") || "permisos"})
                  </SelectItem>
                ))}
              </>
            )}
            {availableCustomRolesForUser.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {t("users.customRoles") || "Roles Personalizados"}
                </div>
                {availableCustomRolesForUser.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name} ({role.permissions.length}{" "}
                    {t("users.permissions") || "permisos"})
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={() => {
            if (selectedRole) {
              handleAssignRole(selectedRole);
            }
          }}
          disabled={!selectedRole || assigning}
        >
          <Shield className="h-4 w-4 mr-2" />
          {t("users.assignRole") || "Asignar Rol"}
        </Button>
      </div>

      {/* Assigned Roles */}
      {roles.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("users.noRolesAssigned") ||
              "El usuario no tiene roles asignados"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((userRole) => {
            // Check if it's a custom role
            const customRole = customRoles.find(
              (cr) => cr.id === userRole.role
            );
            const isCustomRole = !!customRole;

            // Get role info
            const roleInfo = isCustomRole
              ? customRole
              : availableRoles.find((r) => r.role === userRole.role);

            return (
              <div
                key={userRole.role}
                className="flex items-center justify-between rounded-md border p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {isCustomRole
                        ? customRole.name
                        : userRole.role.charAt(0).toUpperCase() +
                          userRole.role.slice(1)}
                    </p>
                    <Badge variant="outline">
                      {isCustomRole
                        ? t("users.custom") || "Personalizado"
                        : t("users.global") || "Global"}
                    </Badge>
                    {roleInfo && (
                      <span className="text-xs text-muted-foreground">
                        (
                        {isCustomRole
                          ? customRole.permissions.length
                          : roleInfo.permissions.length}{" "}
                        {t("users.permissions") || "permisos"})
                      </span>
                    )}
                  </div>
                  {isCustomRole && customRole.description && (
                    <p className="text-sm text-muted-foreground">
                      {customRole.description}
                    </p>
                  )}
                  {userRole.granted_by && (
                    <p className="text-xs text-muted-foreground">
                      {t("users.assignedOn") || "Asignado el"}{" "}
                      {new Date(userRole.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveRole(userRole.role)}
                  disabled={removing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
