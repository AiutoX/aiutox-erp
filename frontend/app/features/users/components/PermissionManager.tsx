/**
 * PermissionManager — Unified permission management with 4 views:
 * 1. Checkbox Grid (granular editing, includes 1-click role templates)
 * 2. Copy from User (clone permissions)
 * 3. User-Centric (view by user)
 * 4. Audit Table (comparison)
 */

import { useState, useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { showToast } from "~/components/common/Toast";
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
import { MultiSelect } from "~/components/ui/multi-select";
import { ScrollArea } from "~/components/ui/scroll-area";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import {
  useAllPermissions,
  useUserEffectivePermissions,
  useBulkUpdatePermissions,
  useCopyPermissions,
} from "../hooks/useUserPermissions";
import { useUsers } from "../hooks/useUsers";
import { useAuditPermissions } from "../hooks/useAuditPermissions";

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

  // ── View 2: Copy ──
  const handleCopy = async () => {
    if (!targetUserForCopy || !selectedSourceUser) return;
    await copyPerms(targetUserForCopy, selectedSourceUser);
    showToast(t("permissions.copySuccess"), "success");
  };

  // ── View 4: Audit Table ──
  const auditUsers = users.slice(0, 10);
  const auditUserIdsKey = auditUsers.map((u) => u.id).join(",");
  const auditUserIds = useMemo(
    () => auditUserIdsKey.split(",").filter(Boolean),
    [auditUserIdsKey]
  );
  const { data: auditPermissions, loading: auditLoading } =
    useAuditPermissions(auditUserIds);
  const [auditModules, setAuditModules] = useState<string[]>([]);
  const auditModuleOptions = groups.map((g) => ({
    value: g.module,
    label: g.module,
  }));
  const auditGroups = groups.filter((g) =>
    auditModules.length > 0
      ? auditModules.includes(g.module)
      : groups.slice(0, 6).some((first) => first.module === g.module)
  );

  return (
    <ConfigPageLayout
      title={t("permissions.title")}
      description={t("permissions.description")}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="grid">{t("permissions.tabGrid")}</TabsTrigger>
          <TabsTrigger value="copy">{t("permissions.tabCopy")}</TabsTrigger>
          <TabsTrigger value="user">{t("permissions.tabUser")}</TabsTrigger>
          <TabsTrigger value="audit">{t("permissions.tabAudit")}</TabsTrigger>
        </TabsList>

        {/* ── View 1: Checkbox Grid ── */}
        <TabsContent value="grid" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="text-sm font-medium mb-1 block">
                {t("permissions.selectUser")}
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
                    placeholder={t("permissions.selectUserPlaceholder")}
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
                {t("permissions.templateReadonly")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyTemplate("editor")}
              >
                {t("permissions.templateEditor")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyTemplate("manager")}
              >
                {t("permissions.templateManager")}
              </Button>
            </div>
          </div>

          {selectedUser && (
            <>
              <ScrollArea className="h-125 border rounded-lg p-4">
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
                  {t("common.reset")}
                </Button>
                <Button onClick={handleSaveGrid} disabled={bulkLoading}>
                  {bulkLoading ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── View 2: Copy ── */}
        <TabsContent value="copy" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("permissions.sourceUser")}
              </label>
              <Select
                value={selectedSourceUser ?? undefined}
                onValueChange={(v) => setSelectedSourceUser(v)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("permissions.selectUserPlaceholder")}
                  />
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
                {t("permissions.targetUser")}
              </label>
              <Select
                value={targetUserForCopy ?? undefined}
                onValueChange={(v) => setTargetUserForCopy(v)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("permissions.selectUserPlaceholder")}
                  />
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
            {copyLoading ? t("common.copying") : t("permissions.copyButton")}
          </Button>
        </TabsContent>

        {/* ── View 3: User-Centric ── */}
        <TabsContent value="user" className="space-y-4">
          <div className="max-w-md">
            <label className="text-sm font-medium mb-1 block">
              {t("permissions.selectUser")}
            </label>
            <Select
              value={selectedUser ?? undefined}
              onValueChange={(v) => setSelectedUser(v)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("permissions.searchUserPlaceholder")}
                />
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
                      {t("permissions.globalRoles")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {effectiveData.module_roles.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("permissions.moduleRoles")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {effectiveData.delegated_permissions.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("permissions.delegated")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {effectiveData.effective_permissions.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("permissions.effective")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {t("permissions.moduleRolesDetail")}
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

        {/* ── View 4: Audit Table ── */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder={t("permissions.searchUsers")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <MultiSelect
              options={auditModuleOptions}
              selected={auditModules}
              onChange={setAuditModules}
              placeholder={t("permissions.selectModules")}
              className="max-w-sm"
            />
          </div>
          {auditLoading && (
            <p className="text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          )}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">
                    {t("permissions.user")}
                  </th>
                  {auditGroups.map((g) => (
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
                {auditUsers.map((u) => {
                  const userPermissions =
                    auditPermissions.get(u.id) ?? new Set<string>();
                  return (
                    <tr key={u.id} className="border-t">
                      <td className="p-3">
                        <div className="font-medium">
                          {u.full_name || u.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {u.email}
                        </div>
                      </td>
                      {auditGroups.map((g) => {
                        const grantedCount = g.permissions.filter((p) =>
                          userPermissions.has(p)
                        ).length;
                        return (
                          <td key={g.module} className="p-3">
                            <Badge
                              variant={grantedCount > 0 ? "secondary" : "outline"}
                              className="text-[10px]"
                            >
                              {grantedCount}/{g.permissions.length}
                            </Badge>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </ConfigPageLayout>
  );
}
