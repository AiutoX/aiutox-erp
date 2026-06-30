/**
 * PermissionManager — Unified permission management with 5 views:
 * 1. Checkbox Grid (granular editing)
 * 2. Templates (1-click role assignment)
 * 3. Copy from User (clone permissions)
 * 4. User-Centric (view by user)
 * 5. Audit Table (comparison)
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { ScrollArea } from "~/components/ui/scroll-area";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import {
  useAllPermissions,
  useUserEffectivePermissions,
  useBulkUpdatePermissions,
  useCopyPermissions,
} from "../hooks/useUserPermissions";
import { useUsers } from "../hooks/useUsers";

export default function PermissionManager() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("grid");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedSourceUser, setSelectedSourceUser] = useState<string | null>(
    null
  );
  const [targetUserForCopy, setTargetUserForCopy] = useState<string | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  const { groups } = useAllPermissions();
  const { data: effectiveData, refresh: refreshEffective } =
    useUserEffectivePermissions(selectedUser);
  const { update: bulkUpdate, loading: bulkLoading } =
    useBulkUpdatePermissions();
  const { copy: copyPerms, loading: copyLoading } = useCopyPermissions();
  const { users: usersData } = useUsers({
    search: searchTerm || undefined,
    page: 1,
    page_size: 50,
  });
  const users = usersData ?? [];

  // ── View 1: Checkbox Grid ──
  const togglePerm = (perm: string) => {
    const next = new Set(selectedPerms);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    setSelectedPerms(next);
  };

  const applyTemplate = (template: "readonly" | "editor" | "manager") => {
    const next = new Set<string>();
    for (const g of groups) {
      for (const perm of g.permissions) {
        const action = perm.split(".")[1] || "";
        if (template === "readonly" && action === "view") next.add(perm);
        if (
          template === "editor" &&
          ["view", "edit", "create"].includes(action)
        )
          next.add(perm);
        if (template === "manager") next.add(perm);
      }
    }
    setSelectedPerms(next);
  };

  const handleSaveGrid = async () => {
    if (!selectedUser) return;
    const payload = groups.flatMap((g) =>
      g.permissions.map((p) => ({
        permission: p,
        module: g.module,
        granted: selectedPerms.has(p),
      }))
    );
    await bulkUpdate(selectedUser, payload);
    refreshEffective();
  };

  // ── View 3: Copy ──
  const handleCopy = async () => {
    if (!targetUserForCopy || !selectedSourceUser) return;
    await copyPerms(targetUserForCopy, selectedSourceUser);
    alert(t("permissions.copySuccess") || "Permisos copiados");
  };

  // ── View 5: Audit Table ──
  const auditUsers = users.slice(0, 10);

  return (
    <ConfigPageLayout
      title={t("permissions.title") || "Gestión de Permisos"}
      description={
        t("permissions.description") ||
        "Administra roles y permisos de usuarios"
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="grid">
            {t("permissions.tabGrid") || "Edición Granular"}
          </TabsTrigger>
          <TabsTrigger value="templates">
            {t("permissions.tabTemplates") || "Plantillas"}
          </TabsTrigger>
          <TabsTrigger value="copy">
            {t("permissions.tabCopy") || "Copiar"}
          </TabsTrigger>
          <TabsTrigger value="user">
            {t("permissions.tabUser") || "Por Usuario"}
          </TabsTrigger>
          <TabsTrigger value="audit">
            {t("permissions.tabAudit") || "Auditoría"}
          </TabsTrigger>
        </TabsList>

        {/* ── View 1: Checkbox Grid ── */}
        <TabsContent value="grid" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium mb-1 block">
                {t("permissions.selectUser") || "Seleccionar usuario"}
              </label>
              <Select
                value={selectedUser ?? undefined}
                onValueChange={(v) => {
                  setSelectedUser(v);
                  setSelectedPerms(
                    new Set(effectiveData?.effective_permissions ?? [])
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      t("permissions.selectUserPlaceholder") ||
                      "Buscar usuario..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyTemplate("readonly")}
              >
                {t("permissions.templateReadonly") || "Solo lectura"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyTemplate("editor")}
              >
                {t("permissions.templateEditor") || "Editor"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyTemplate("manager")}
              >
                {t("permissions.templateManager") || "Manager"}
              </Button>
            </div>
          </div>

          {selectedUser && (
            <>
              <ScrollArea className="h-[500px] border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groups.map((group) => (
                    <Card key={group.module}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold capitalize">
                          {group.module}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {group.permissions.map((perm) => {
                          const action = perm.split(".")[1];
                          return (
                            <div
                              key={perm}
                              className="flex items-center gap-2"
                            >
                              <Checkbox
                                id={perm}
                                checked={selectedPerms.has(perm)}
                                onCheckedChange={() => togglePerm(perm)}
                              />
                              <label
                                htmlFor={perm}
                                className="text-sm cursor-pointer"
                              >
                                {action}
                              </label>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setSelectedPerms(
                      new Set(effectiveData?.effective_permissions ?? [])
                    )
                  }
                >
                  {t("common.reset") || "Restaurar"}
                </Button>
                <Button onClick={handleSaveGrid} disabled={bulkLoading}>
                  {bulkLoading
                    ? t("common.saving") || "Guardando..."
                    : t("common.save") || "Guardar cambios"}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── View 2: Templates ── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="max-w-md">
            <label className="text-sm font-medium mb-1 block">
              {t("permissions.selectUser") || "Seleccionar usuario"}
            </label>
            <Select
              value={selectedUser ?? undefined}
              onValueChange={(v) => setSelectedUser(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Buscar usuario..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUser && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  key: "readonly",
                  label: t("permissions.templateReadonly") || "Solo lectura",
                  desc:
                    t("permissions.templateReadonlyDesc") ||
                    "Ver todos los módulos",
                  perms: groups.flatMap((g) =>
                    g.permissions.filter((p) => p.endsWith(".view"))
                  ),
                },
                {
                  key: "editor",
                  label: t("permissions.templateEditor") || "Editor",
                  desc:
                    t("permissions.templateEditorDesc") ||
                    "Ver, editar y crear",
                  perms: groups.flatMap((g) =>
                    g.permissions.filter((p) => {
                      const a = p.split(".")[1] || "";
                      return ["view", "edit", "create"].includes(a);
                    })
                  ),
                },
                {
                  key: "manager",
                  label: t("permissions.templateManager") || "Manager",
                  desc:
                    t("permissions.templateManagerDesc") ||
                    "Acceso completo",
                  perms: groups.flatMap((g) => g.permissions),
                },
              ].map((tpl) => (
                <Card key={tpl.key} className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="text-base">{tpl.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{tpl.desc}</p>
                    <Badge variant="secondary">{tpl.perms.length} permisos</Badge>
                    <Button
                      className="w-full"
                      onClick={async () => {
                        const payload = groups.flatMap((g) =>
                          g.permissions.map((p) => ({
                            permission: p,
                            module: g.module,
                            granted: tpl.perms.includes(p),
                          }))
                        );
                        await bulkUpdate(selectedUser, payload);
                        alert(
                          `${tpl.label} ${
                            t("permissions.applied") || "aplicado"
                          }`
                        );
                        refreshEffective();
                      }}
                      disabled={bulkLoading}
                    >
                      {t("permissions.apply") || "Aplicar"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── View 3: Copy ── */}
        <TabsContent value="copy" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("permissions.sourceUser") || "Usuario origen"}
              </label>
              <Select
                value={selectedSourceUser ?? undefined}
                onValueChange={(v) => setSelectedSourceUser(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("permissions.targetUser") || "Usuario destino"}
              </label>
              <Select
                value={targetUserForCopy ?? undefined}
                onValueChange={(v) => setTargetUserForCopy(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleCopy}
            disabled={!selectedSourceUser || !targetUserForCopy || copyLoading}
          >
            {copyLoading
              ? t("common.copying") || "Copiando..."
              : t("permissions.copyButton") || "Copiar permisos"}
          </Button>
        </TabsContent>

        {/* ── View 4: User-Centric ── */}
        <TabsContent value="user" className="space-y-4">
          <div className="max-w-md">
            <label className="text-sm font-medium mb-1 block">
              {t("permissions.selectUser") || "Seleccionar usuario"}
            </label>
            <Select
              value={selectedUser ?? undefined}
              onValueChange={(v) => setSelectedUser(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Buscar usuario..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {effectiveData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {effectiveData.global_roles.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("permissions.globalRoles") || "Roles globales"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {effectiveData.module_roles.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("permissions.moduleRoles") || "Roles de módulo"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {effectiveData.delegated_permissions.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("permissions.delegated") || "Delegados"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {effectiveData.effective_permissions.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("permissions.effective") || "Efectivos"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {t("permissions.moduleRolesDetail") ||
                      "Roles por módulo"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {effectiveData.module_roles.map((mr, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1 border-b last:border-0"
                      >
                        <span className="capitalize text-sm">{mr.module}</span>
                        <Badge variant="secondary">{mr.role}</Badge>
                      </div>
                    ))}
                    {effectiveData.module_roles.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        {t("permissions.noModuleRoles") ||
                          "Sin roles de módulo"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {t("permissions.effectivePermissions") ||
                      "Permisos efectivos"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {effectiveData.effective_permissions.map((perm) => (
                      <Badge key={perm} variant="outline" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── View 5: Audit Table ── */}
        <TabsContent value="audit" className="space-y-4">
          <Input
            placeholder={
              t("permissions.searchUsers") || "Buscar usuarios..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">
                    {t("permissions.user") || "Usuario"}
                  </th>
                  {groups.slice(0, 6).map((g) => (
                    <th
                      key={g.module}
                      className="text-left p-3 font-medium capitalize"
                    >
                      {g.module}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditUsers.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">
                        {u.full_name || u.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {u.email}
                      </div>
                    </td>
                    {groups.slice(0, 6).map((g) => (
                      <td key={g.module} className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          -
                        </Badge>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </ConfigPageLayout>
  );
}
