/**
 * Roles Configuration Page — Reestructurado con 2 tabs principales:
 * 1. Roles: Lista de roles + edición de permisos por rol
 * 2. Usuarios: Gestión de permisos por usuario (PermissionManager)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { listRoles } from "~/features/users/api/roles.api";
import { useUsers } from "~/features/users/hooks/useUsers";
import type { User } from "~/features/users/types/user.types";
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
import { DataTable, type DataTableColumn } from "~/components/common/DataTable";
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
import { ShieldIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import PermissionManager from "~/features/users/components/PermissionManager";
import RolePermissionPanel from "~/features/users/components/RolePermissionPanel";

type GlobalRole = "owner" | "admin" | "manager" | "staff" | "viewer";

const SYSTEM_ROLES: GlobalRole[] = ["owner", "admin"];

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
  const [selectedRole, setSelectedRole] = useState<GlobalRole | null>(null);
  const [searchUser, setSearchUser] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const {
    data: rolesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["roles"],
    queryFn: listRoles,
  });

  const { users: usersData, loading: usersLoading } = useUsers({
    search: searchUser || undefined,
    page: 1,
    page_size: 20,
  });

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

  const roles = rolesData?.data || [];
  const selectedRoleData = roles.find((r) => r.role === selectedRole);

  const usersWithRole: User[] = (usersData || []).filter((u) =>
    u.roles?.some((r) => r.role === selectedRole)
  );

  const userColumns: DataTableColumn<User>[] = [
    {
      key: "name",
      header: t("config.roles.users"),
      cell: (user) => (
        <div>
          <div className="font-medium">{user.full_name || user.email}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      ),
    },
    {
      key: "actions",
      header: t("common.actions"),
      cell: (user) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            showToast(
              `${t("config.roles.removeRole")} ${user.full_name || user.email}`,
              "info"
            );
          }}
        >
          {t("config.roles.removeRole")}
        </Button>
      ),
    },
  ];

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
            {/* Lista de roles */}
            <div className="lg:col-span-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {t("config.roles.systemRoles")}
                </h3>
                <div className="space-y-2">
                  {roles.length === 0 ? (
                    <ConfigEmptyState
                      title={t("config.roles.noRoles")}
                      description={t("config.roles.noRolesDesc")}
                    />
                  ) : (
                    roles.map((role) => (
                      <Card
                        key={role.role}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedRole === role.role
                            ? "border-primary border-2"
                            : ""
                        }`}
                        onClick={() => setSelectedRole(role.role)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold capitalize">
                                  {role.role}
                                </h4>
                                {SYSTEM_ROLES.includes(role.role) && (
                                  <Badge variant="secondary">
                                    {t("config.roles.roleSystem")}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {role.permissions.length}{" "}
                                {t("config.roles.permissionsCount")}
                              </p>
                            </div>
                            <HugeiconsIcon
                              icon={ShieldIcon}
                              size={24}
                              className="text-muted-foreground"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
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
                      {t("config.roles.users")} ({usersWithRole.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="permissions" className="space-y-4">
                    <RolePermissionPanel role={selectedRoleData.role} />
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
                                  <ScrollArea className="h-[300px]">
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
                                            onClick={() => {
                                              showToast(
                                                `${t("config.roles.roleAssignedTo")} ${user.full_name || user.email}`,
                                                "success"
                                              );
                                              setAssignDialogOpen(false);
                                            }}
                                          >
                                            {t("config.roles.assignRoleButton")}
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
                        {usersWithRole.length > 0 ? (
                          <DataTable columns={userColumns} data={usersWithRole} />
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

        {/* TAB: USUARIOS */}
        <TabsContent value="users">
          <PermissionManager />
        </TabsContent>
      </Tabs>
    </ConfigPageLayout>
  );
}
