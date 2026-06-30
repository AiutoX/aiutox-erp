/**
 * ModulePermissionsView Component
 *
 * View permissions grouped by module (inspired by Aureus ERP)
 * Shows checkboxes for granular permissions (View, Add, Edit, Delete, Manage Users)
 */

import { useMemo } from "react";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import type { PermissionGroup, Permission } from "../types/user.types";

interface ModulePermissionsViewProps {
  permissionGroups: PermissionGroup[];
  selectedPermissions?: Set<string>;
  onPermissionToggle?: (permission: string) => void;
  readOnly?: boolean;
  showModuleToggle?: boolean;
}

/**
 * ModulePermissionsView component
 *
 * Displays permissions grouped by module with checkboxes
 * Similar to Aureus ERP's role permission assignment interface
 */
export function ModulePermissionsView({
  permissionGroups,
  selectedPermissions = new Set(),
  onPermissionToggle,
  readOnly = false,
  showModuleToggle = true,
}: ModulePermissionsViewProps) {
  // Group permissions by action (View, Add, Edit, Delete, Manage Users)
  const groupedByAction = useMemo(() => {
    const groups = new Map<
      string,
      { action: string; label: string; permissions: Permission[] }
    >();

    for (const group of permissionGroups) {
      for (const perm of group.permissions) {
        const parts = perm.permission.split(".");
        const action = parts[parts.length - 1];

        const actionLabel =
          action === "view"
            ? "Ver"
            : action === "create"
              ? "Crear"
              : action === "edit"
                ? "Editar"
                : action === "delete"
                  ? "Eliminar"
                  : action === "manage_users"
                    ? "Gestionar Usuarios"
                    : action || "";

        if (!groups.has(action || "")) {
          groups.set(action || "", {
            action: action || "",
            label: actionLabel,
            permissions: [],
          });
        }

        groups.get(action || "")!.permissions.push(perm);
      }
    }

    return Array.from(groups.values());
  }, [permissionGroups]);

  const handleModuleToggle = (modulePermissions: string[]) => {
    if (!onPermissionToggle || readOnly) return;

    const allSelected = modulePermissions.every((p) =>
      selectedPermissions.has(p)
    );

    modulePermissions.forEach((perm) => {
      if (allSelected) {
        // Deselect all if all are selected
        if (selectedPermissions.has(perm)) {
          onPermissionToggle(perm);
        }
      } else {
        // Select all if not all are selected
        if (!selectedPermissions.has(perm)) {
          onPermissionToggle(perm);
        }
      }
    });
  };

  if (permissionGroups.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No hay permisos disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {permissionGroups.map((group) => {
        const modulePermissions = group.permissions.map((p) => p.permission);
        const allSelected = modulePermissions.every((p) =>
          selectedPermissions.has(p)
        );
        // const someSelected = modulePermissions.some((p) =>
        //   selectedPermissions.has(p)
        // );

        return (
          <div key={group.module_id} className="rounded-md border p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold">{group.module_name}</h4>
                {group.category && (
                  <p className="text-xs text-muted-foreground">
                    {group.category}
                  </p>
                )}
              </div>
              {showModuleToggle && !readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleModuleToggle(modulePermissions)}
                >
                  {allSelected ? "Deseleccionar Todo" : "Seleccionar Todo"}
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {groupedByAction.map((actionGroup) => {
                // Filter permissions for this module and action
                const moduleActionPermissions = actionGroup.permissions.filter(
                  (p) => p.permission.startsWith(`${group.module_id}.`)
                );

                if (moduleActionPermissions.length === 0) return null;

                const allActionSelected = moduleActionPermissions.every((p) =>
                  selectedPermissions.has(p.permission)
                );
                // const someActionSelected = moduleActionPermissions.some((p) =>
                //   selectedPermissions.has(p.permission)
                // );

                return (
                  <div key={actionGroup.action} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${group.module_id}-${actionGroup.action}`}
                        checked={allActionSelected}
                        ref={(el) => {
                          if (el && el instanceof HTMLButtonElement) {
                            // Note: Checkbox from shadcn/ui may not support indeterminate
                            // This is a workaround - in production, use a proper checkbox component
                          }
                        }}
                        onCheckedChange={(checked) => {
                          if (readOnly || !onPermissionToggle) return;
                          moduleActionPermissions.forEach((perm) => {
                            if (
                              checked &&
                              !selectedPermissions.has(perm.permission)
                            ) {
                              onPermissionToggle(perm.permission);
                            } else if (
                              !checked &&
                              selectedPermissions.has(perm.permission)
                            ) {
                              onPermissionToggle(perm.permission);
                            }
                          });
                        }}
                        disabled={readOnly}
                      />
                      <Label
                        htmlFor={`${group.module_id}-${actionGroup.action}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {actionGroup.label}
                      </Label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
