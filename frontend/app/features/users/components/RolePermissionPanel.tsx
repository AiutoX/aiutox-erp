/**
 * RolePermissionPanel — Edit permissions for a specific role
 * Shows base (hardcoded) permissions + allows adding custom overrides
 */

import { useState, useEffect } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import { showToast } from "~/components/common/Toast";
import { useAllPermissions, useRolePermissions, useSetRolePermissions } from "../hooks/useUserPermissions";

interface RolePermissionPanelProps {
  role: string;
}

export default function RolePermissionPanel({ role }: RolePermissionPanelProps) {
  const { t } = useTranslation();
  const { groups, loading: groupsLoading } = useAllPermissions();
  const { data: roleData, loading: roleLoading, refresh } = useRolePermissions(role);
  const { update, loading: saving } = useSetRolePermissions();

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (roleData) {
      setSelectedPermissions(new Set(roleData.effective_permissions));
    }
  }, [roleData]);

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  };

  const handleSave = async () => {
    const permissions = groups.flatMap((g) =>
      g.permissions.map((p) => ({
        permission: p,
        module: g.module,
        granted: selectedPermissions.has(p),
      }))
    );
    const result = await update(role, permissions);
    if (result) {
      showToast(
        `${t("permissions.saved")} — ${t("permissions.granted")}: ${result.granted}, ${t("permissions.revoked")}: ${result.revoked}`,
        "success"
      );
      refresh();
    } else {
      showToast(t("permissions.saveError"), "error");
    }
  };

  if (groupsLoading || roleLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold capitalize">{role}</h3>
          <p className="text-sm text-muted-foreground">
            {roleData?.base_permissions.length || 0} {t("permissions.base")} +{" "}
            {roleData?.custom_permissions.length || 0} {t("permissions.custom")}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      </div>

      <ScrollArea className="h-125">
        <div className="space-y-6">
          {groups.map((group) => (
            <Card key={group.module}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base capitalize flex items-center gap-2">
                  {group.module}
                  <Badge variant="outline">
                    {group.permissions.filter((p) => selectedPermissions.has(p)).length}/{group.permissions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {group.permissions.map((permission) => {
                    const isBase = roleData?.base_permissions.includes(permission);
                    return (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          id={`perm-${permission}`}
                          checked={selectedPermissions.has(permission)}
                          onCheckedChange={() => togglePermission(permission)}
                        />
                        <label
                          htmlFor={`perm-${permission}`}
                          className="text-sm cursor-pointer truncate"
                          title={permission}
                        >
                          {permission.split(".")[1]}
                          {isBase && (
                            <span className="ml-1 text-xs text-muted-foreground">(base)</span>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
