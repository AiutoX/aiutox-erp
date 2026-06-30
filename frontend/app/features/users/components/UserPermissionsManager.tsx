/**
 * UserPermissionsManager Component
 *
 * Manages user permissions with tabs/accordions by module
 * Shows permissions from roles vs delegated permissions
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { TenantFilter } from "~/components/common/TenantFilter";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  useUserPermissions,
  usePermissionsByModule,
} from "../hooks/useUserPermissions";
import { ModulePermissionsView } from "./ModulePermissionsView";
import type { User, DelegatedPermission } from "../types/user.types";

type DelegatedPermissionWithStatus = DelegatedPermission & {
  is_active?: boolean;
};

interface UserPermissionsManagerProps {
  user: User;
  onUpdate?: () => void;
}

/**
 * UserPermissionsManager component
 */
export function UserPermissionsManager({
  user,
  // onUpdate, // Unused for now
}: UserPermissionsManagerProps) {
  const { t } = useTranslation();
  const { permissions, loading } = useUserPermissions(user.id);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(
    user.tenant_id || null
  );
  const { permissionGroups, loading: loadingGroups } = usePermissionsByModule(
    selectedTenantId || undefined
  );

  const [activeTab, setActiveTab] = useState<string>("all");

  if (loading || loadingGroups) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner
          size="md"
          text={t("users.loadingPermissions") || "Cargando permisos..."}
        />
      </div>
    );
  }

  // Build effective permissions set
  const effectivePermissions = new Set<string>(
    permissions?.effective_permissions || []
  );

  // Group delegated permissions by module
  const delegatedByModule = new Map<string, DelegatedPermissionWithStatus[]>();
  if (permissions?.delegated_permissions) {
    for (const delegated of permissions.delegated_permissions) {
      const module = delegated.permission?.split(".")[0] || "unknown";
      if (!delegatedByModule.has(module)) {
        delegatedByModule.set(module, []);
      }
      delegatedByModule.get(module)!.push(delegated);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">
          {t("users.userPermissionsTitle") || "Permisos del Usuario"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("users.userPermissionsDescription") ||
            "Permisos efectivos del usuario (de roles y delegaciones)"}
        </p>
      </div>

      {/* Tenant Filter */}
      <TenantFilter
        selectedTenantId={selectedTenantId || undefined}
        onTenantChange={setSelectedTenantId}
        label={t("users.filterByTenant") || "Filtrar por Tenant"}
      />

      {/* Permissions Summary */}
      {permissions && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              {t("users.fromGlobalRoles") || "De Roles Globales"}
            </p>
            <p className="text-2xl font-bold">
              {permissions.global_role_permissions.length}
            </p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              {t("users.fromModuleRoles") || "De Roles de Módulo"}
            </p>
            <p className="text-2xl font-bold">
              {Object.values(permissions.module_role_permissions).reduce(
                (sum, perms) => sum + perms.length,
                0
              )}
            </p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              {t("users.delegated") || "Delegados"}
            </p>
            <p className="text-2xl font-bold">
              {
                permissions.delegated_permissions.filter(
                  (d) =>
                    !selectedTenantId ||
                    d.permission.startsWith(`${selectedTenantId}.`)
                ).length
              }
            </p>
          </div>
        </div>
      )}

      {/* Permissions by Module */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">{t("users.all") || "Todos"}</TabsTrigger>
          {permissionGroups.map((group) => (
            <TabsTrigger key={group.module_id} value={group.module_id}>
              {group.module_name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ModulePermissionsView
            permissionGroups={permissionGroups}
            selectedPermissions={effectivePermissions}
            readOnly={true}
            showModuleToggle={false}
          />
        </TabsContent>

        {permissionGroups.map((group) => (
          <TabsContent
            key={group.module_id}
            value={group.module_id}
            className="mt-4"
          >
            <div className="space-y-4">
              <ModulePermissionsView
                permissionGroups={[group]}
                selectedPermissions={effectivePermissions}
                readOnly={true}
                showModuleToggle={false}
              />

              {/* Delegated Permissions for this module */}
              {delegatedByModule.has(group.module_id) && (
                <div className="mt-4 rounded-md border p-4">
                  <h4 className="font-medium mb-2">
                    {t("users.delegatedPermissions") || "Permisos Delegados"}
                  </h4>
                  <div className="space-y-2">
                    {delegatedByModule
                      .get(group.module_id)!
                      .map((delegated) => (
                        <div
                          key={delegated.id}
                          className="flex items-center justify-between rounded-md border p-2"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {delegated.permission}
                            </p>
                            {delegated.expires_at && (
                              <p className="text-xs text-muted-foreground">
                                {t("users.expiresAt") || "Expira"}:{" "}
                                {new Date(
                                  delegated.expires_at
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={
                              delegated.is_active ? "default" : "secondary"
                            }
                          >
                            {delegated.is_active
                              ? t("users.active") || "Activo"
                              : t("users.revoked") || "Revocado"}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
