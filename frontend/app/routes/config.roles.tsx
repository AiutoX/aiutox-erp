/**
 * Roles Configuration Page — 2 tabs principales:
 * 1. Roles: Lista unificada de roles de sistema + personalizados, edición
 *    de permisos por rol, y creación/edición/borrado de roles personalizados
 *    vía modal.
 * 2. Permisos por usuario: PermissionManager (grid/plantillas/copia/auditoría
 *    de permisos por usuario individual — no es un CRUD de usuarios).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { listRoles, assignRole, removeRole } from "~/features/users/api/roles.api";
import { useCustomRoles, useDeleteCustomRole } from "~/features/users/hooks/useCustomRoles";
import { useUsersWithRole } from "~/features/users/hooks/useRoleUsers";
import { useUsers } from "~/features/users/hooks/useUsers";
import { usePermissionsByModule } from "~/features/users/hooks/useUserPermissions";
import { countEffectivePermissions } from "~/features/users/utils/permissionWildcards";
import { useAuthStore } from "~/stores/authStore";
import type { CustomRole } from "~/features/users/types/user.types";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import { ConfigLoadingState } from "~/components/config/ConfigLoadingState";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";
import { ConfigEmptyState } from "~/components/config/ConfigEmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { SearchBar } from "~/components/common/SearchBar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import { showToast } from "~/components/common/Toast";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { ShieldIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import PermissionManager from "~/features/users/components/PermissionManager";
import { RoleForm } from "~/features/users/components/RoleForm";

interface UnifiedRole {
  key: string;
  name: string;
  permissionsCount: number;
  isSystem: boolean;
  customRole?: CustomRole;
}

export function meta() {
  return [
    { title: "Roles y Permisos - AiutoX ERP" },
    {
      name: "description",
      content: "Gestiona los roles y permisos del sistema",
    },
  ];
}

export default function RolesConfigPage() {
  const { t } = useTranslation();
  const [mainTab, setMainTab] = useState("roles");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingCustomRole, setEditingCustomRole] = useState<CustomRole | null>(
    null
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    roleId: string | null;
  }>({ open: false, roleId: null });

  const {
    data: rolesData,
    isLoading,
    error,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ["roles"],
    queryFn: listRoles,
  });

  const {
    roles: customRoles,
    loading: customRolesLoading,
    refresh: refreshCustomRoles,
  } = useCustomRoles();
  const { remove: removeCustomRole, loading: deletingCustomRole } =
    useDeleteCustomRole();

  const currentUser = useAuthStore((state) => state.user);
  const { permissionGroups } = usePermissionsByModule(currentUser?.tenant_id);
  const allPermissions = permissionGroups.flatMap((g) =>
    g.permissions.map((p) => p.permission)
  );

  const { users: usersData, loading: usersLoading } = useUsers({
    search: searchUser || undefined,
    page: 1,
    page_size: 20,
  });

  const isSystemRoleSelected = (rolesData?.data || []).some(
    (r) => r.role === selectedRole
  );
  const {
    users: usersWithRole,
    loading: usersWithRoleLoading,
    refresh: refreshUsersWithRole,
  } = useUsersWithRole(isSystemRoleSelected ? selectedRole : null);

  if (isLoading) {
    return (
      <ConfigPageLayout
        title={t("config.roles.title")}
        description={t("config.roles.description")}
        loading={true}
      >
        <ConfigLoadingState lines={6} />
      </ConfigPageLayout>
    );
  }

  if (error) {
    return (
      <ConfigPageLayout
        title={t("config.roles.title")}
        description={t("config.roles.description")}
        error={error instanceof Error ? error : String(error)}
      >
        <ConfigErrorState message={t("config.roles.errorLoading")} />
      </ConfigPageLayout>
    );
  }

  const roles = (rolesData?.data || []).filter((r) => r.is_system);
  const selectedRoleData = roles.find((r) => r.role === selectedRole);
  const selectedCustomRole = customRoles.find((r) => r.id === selectedRole);

  const unifiedRoles: UnifiedRole[] = [
    ...roles.map((r) => ({
      key: r.role,
      name: r.role,
      permissionsCount: countEffectivePermissions(r.permissions, allPermissions),
      isSystem: true,
    })),
    ...customRoles.map((r) => ({
      key: r.id,
      name: r.name,
      permissionsCount: countEffectivePermissions(r.permissions, allPermissions),
      isSystem: false,
      customRole: r,
    })),
  ];

  const handleAssignRole = async (userId: string, userLabel: string) => {
    if (!selectedRoleData) return;
    setAssigningUserId(userId);
    try {
      await assignRole(userId, selectedRoleData.role);
      showToast(`${t("config.roles.roleAssignedTo")} ${userLabel}`, "success");
      setAssignDialogOpen(false);
      refreshUsersWithRole();
    } catch {
      showToast(t("config.roles.assignRoleError"), "error");
    } finally {
      setAssigningUserId(null);
    }
  };

  const handleRemoveRole = async (userId: string) => {
    if (!selectedRoleData) return;
    setRemovingUserId(userId);
    try {
      await removeRole(userId, selectedRoleData.role);
      showToast(t("users.roleRemovedSuccess"), "success");
      refreshUsersWithRole();
    } catch (err) {
      const backendMessage =
        (
          err as {
            response?: { data?: { error?: { code?: string; message?: string } } };
          }
        )?.response?.data?.error;
      const message =
        backendMessage?.code === "LAST_OWNER_ROLE"
          ? t("config.roles.lastOwnerError")
          : backendMessage?.message || t("users.roleRemovedError");
      showToast(message, "error");
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleDeleteCustomRole = (roleId: string) => {
    setDeleteConfirm({ open: true, roleId });
  };

  const confirmDeleteCustomRole = async () => {
    if (!deleteConfirm.roleId) return;
    const success = await removeCustomRole(deleteConfirm.roleId);
    if (success) {
      showToast(t("users.roleDeletedSuccess"), "success");
      if (selectedRole === deleteConfirm.roleId) setSelectedRole(null);
      refreshCustomRoles();
    } else {
      showToast(t("users.roleDeletedError"), "error");
    }
    setDeleteConfirm({ open: false, roleId: null });
  };

  const handleRoleFormSuccess = () => {
    showToast(
      editingCustomRole
        ? t("users.roleUpdatedSuccess")
        : t("users.roleCreatedSuccess"),
      "success"
    );
    setShowRoleForm(false);
    setEditingCustomRole(null);
    refreshCustomRoles();
  };


  return (
    <ConfigPageLayout
      title={t("config.roles.title")}
      description={t("config.roles.description")}
    >
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="roles">{t("config.roles.tabRoles")}</TabsTrigger>
          <TabsTrigger value="users">{t("config.roles.tabUsers")}</TabsTrigger>
        </TabsList>

        {/* TAB: ROLES */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de roles (sistema + personalizados) */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {t("config.roles.systemRoles")}
                </h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingCustomRole(null);
                    setShowRoleForm(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("config.roles.createCustomRole")}
                </Button>
              </div>
              <div className="space-y-2">
                {unifiedRoles.length === 0 ? (
                  <ConfigEmptyState
                    title={t("config.roles.noRoles")}
                    description={t("config.roles.noRolesDesc")}
                  />
                ) : (
                  unifiedRoles.map((role) => (
                    <Card
                      key={role.key}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedRole === role.key ? "border-primary border-2" : ""
                      }`}
                      onClick={() => setSelectedRole(role.key)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold capitalize">
                                {role.name}
                              </h4>
                              <Badge variant="secondary">
                                {role.isSystem
                                  ? t("config.roles.roleSystem")
                                  : t("config.roles.roleCustom")}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {role.permissionsCount}{" "}
                              {t("config.roles.permissionsCount")}
                            </p>
                          </div>
                          {role.customRole ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCustomRole(role.customRole || null);
                                  setShowRoleForm(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomRole(role.customRole!.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <HugeiconsIcon
                              icon={ShieldIcon}
                              size={24}
                              className="text-muted-foreground"
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
                {customRolesLoading && (
                  <p className="text-sm text-muted-foreground">
                    {t("users.loadingRoles")}
                  </p>
                )}
              </div>
            </div>

            {/* Detalles del rol seleccionado */}
            <div className="lg:col-span-2">
              {selectedRoleData ? (
                <Tabs defaultValue="permissions" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="permissions">
                      {t("config.roles.permissions")}
                    </TabsTrigger>
                    <TabsTrigger value="users">
                      {t("config.roles.users")} ({usersWithRoleLoading ? "…" : usersWithRole.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="permissions" className="space-y-4">
                    <RoleForm
                      key={selectedRoleData.id}
                      role={{
                        id: selectedRoleData.id,
                        name: selectedRoleData.role,
                        description: selectedRoleData.description,
                        permissions: selectedRoleData.permissions,
                        tenant_id: "",
                        created_by: "",
                        created_at: "",
                        updated_at: "",
                      }}
                      isSystemRole={selectedRoleData.is_system}
                      onSubmit={() => {
                        showToast(t("users.roleUpdatedSuccess"), "success");
                        refetchRoles();
                      }}
                      onCancel={() => {}}
                    />
                  </TabsContent>

                  <TabsContent value="users" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{t("config.roles.usersWithRole")}</CardTitle>
                            <CardDescription>
                              {t("config.roles.manageUsers")}{" "}
                              {selectedRoleData.role}
                            </CardDescription>
                          </div>
                          <Dialog
                            open={assignDialogOpen}
                            onOpenChange={setAssignDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button>{t("config.roles.assignRoleButton")}</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  {t("config.roles.assignRole")}
                                </DialogTitle>
                                <DialogDescription>
                                  {t("config.roles.assignRoleDesc")}{" "}
                                  {selectedRoleData.role}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>{t("config.roles.searchUser")}</Label>
                                  <SearchBar
                                    value={searchUser}
                                    onChange={setSearchUser}
                                    placeholder={t(
                                      "config.roles.searchUserPlaceholder"
                                    )}
                                  />
                                </div>
                                {usersLoading ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                    {t("config.roles.loadingUsers")}
                                  </div>
                                ) : usersData && usersData.length > 0 ? (
                                  <ScrollArea className="h-75">
                                    <div className="space-y-2">
                                      {usersData.map((user) => (
                                        <div
                                          key={user.id}
                                          className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors"
                                        >
                                          <div>
                                            <p className="font-medium">
                                              {user.full_name || user.email}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {user.email}
                                            </p>
                                          </div>
                                          <Button
                                            size="sm"
                                            disabled={assigningUserId === user.id}
                                            onClick={() =>
                                              handleAssignRole(
                                                user.id,
                                                user.full_name || user.email
                                              )
                                            }
                                          >
                                            {assigningUserId === user.id
                                              ? t("config.roles.loadingUsers")
                                              : t("config.roles.assignRoleButton")}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                ) : (
                                  <ConfigEmptyState
                                    title={t("config.roles.noUsersFound")}
                                    description={t("config.roles.noUsersFoundDesc")}
                                  />
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {usersWithRoleLoading ? (
                          <div className="text-center py-8 text-muted-foreground">
                            {t("config.roles.loadingUsers")}
                          </div>
                        ) : usersWithRole.length > 0 ? (
                          <div className="space-y-2">
                            {usersWithRole.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors"
                              >
                                <div>
                                  <p className="font-medium">
                                    {user.full_name || user.email}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {user.email}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={removingUserId === user.id}
                                  onClick={() => handleRemoveRole(user.id)}
                                >
                                  {removingUserId === user.id
                                    ? t("config.roles.loadingUsers")
                                    : t("config.roles.removeRole")}
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <ConfigEmptyState
                            title={t("config.roles.noUsersWithRole")}
                            description={t("config.roles.noUsersWithRole")}
                            action={
                              <Button onClick={() => setAssignDialogOpen(true)}>
                                {t("config.roles.assignRoleButton")}
                              </Button>
                            }
                          />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : selectedCustomRole ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedCustomRole.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RoleForm
                      key={selectedCustomRole.id}
                      role={selectedCustomRole}
                      onSubmit={() => {
                        showToast(t("users.roleUpdatedSuccess"), "success");
                        refreshCustomRoles();
                      }}
                      onCancel={() => {}}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center space-y-2">
                      <HugeiconsIcon
                        icon={ShieldIcon}
                        size={48}
                        className="text-muted-foreground mx-auto mb-4"
                      />
                      <h3 className="text-lg font-semibold">
                        {t("config.roles.selectRole")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("config.roles.selectRoleDesc")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB: PERMISOS POR USUARIO */}
        <TabsContent value="users">
          <PermissionManager />
        </TabsContent>

      </Tabs>

      {/* Modal: crear/editar rol personalizado */}
      <Dialog
        open={showRoleForm}
        onOpenChange={(open) => {
          setShowRoleForm(open);
          if (!open) setEditingCustomRole(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCustomRole
                ? t("users.roleForm.submitUpdate")
                : t("config.roles.createCustomRole")}
            </DialogTitle>
          </DialogHeader>
          <RoleForm
            role={editingCustomRole}
            onSubmit={handleRoleFormSuccess}
            onCancel={() => {
              setShowRoleForm(false);
              setEditingCustomRole(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmación de borrado de rol personalizado */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, roleId: null })}
        onConfirm={confirmDeleteCustomRole}
        title={t("config.roles.deleteRoleTitle")}
        description={t("config.roles.deleteRoleDescription")}
        confirmText={t("users.delete")}
        cancelText={t("users.roleForm.cancel")}
        variant="destructive"
        loading={deletingCustomRole}
      />
    </ConfigPageLayout>
  );
}
