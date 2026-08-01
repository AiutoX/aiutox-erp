/**
 * FilePermissionsSelector Component
 * Allows selecting users, roles, or organizations and assigning permissions
 */

import { useState } from "react";
import { Plus, X, User, Shield, Building2, Info } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { FilePermissionRequest } from "../types/file.types";

export interface FilePermissionsSelectorProps {
  permissions: FilePermissionRequest[];
  onChange: (permissions: FilePermissionRequest[]) => void;
  availableUsers?: Array<{ id: string; name: string; email: string }>;
  availableRoles?: Array<{ id: string; name: string }>;
  availableOrganizations?: Array<{ id: string; name: string }>;
}

/**
 * FilePermissionsSelector component
 */
export function FilePermissionsSelector({
  permissions,
  onChange,
  availableUsers = [],
  availableRoles = [],
  availableOrganizations = [],
}: FilePermissionsSelectorProps) {
  const { t } = useTranslation();
  const [selectedTargetType, setSelectedTargetType] = useState<
    "user" | "role" | "organization"
  >("user");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");

  const addPermission = () => {
    if (!selectedTargetId) return;

    // Check if permission already exists
    const exists = permissions.some(
      (p) =>
        p.target_type === selectedTargetType && p.target_id === selectedTargetId
    );
    if (exists) {
      return; // Already added
    }

    const newPermission: FilePermissionRequest = {
      target_type: selectedTargetType,
      target_id: selectedTargetId,
      can_view: true,
      can_download: true,
      can_edit: false,
      can_delete: false,
    };

    onChange([...permissions, newPermission]);
    setSelectedTargetId("");
  };

  const removePermission = (index: number) => {
    onChange(permissions.filter((_, i) => i !== index));
  };

  const updatePermission = (
    index: number,
    field: keyof FilePermissionRequest,
    value: boolean | string
  ) => {
    const updated = [...permissions];
    // Ensure required fields are not undefined
    const permission = updated[index];
    if (permission) {
      const safePermission = {
        target_type: permission.target_type || "user",
        target_id: permission.target_id || "",
        can_view: permission.can_view || false,
        can_download: permission.can_download || false,
        can_edit: permission.can_edit || false,
        can_delete: permission.can_delete || false,
      } as FilePermissionRequest;
      updated[index] = { ...safePermission, [field]: value };
      onChange(updated);
    }
  };

  const getTargetName = (permission: FilePermissionRequest): string => {
    if (permission.target_type === "user") {
      const user = availableUsers.find((u) => u.id === permission.target_id);
      return user ? `${user.name} (${user.email})` : permission.target_id;
    }
    if (permission.target_type === "role") {
      const role = availableRoles.find((r) => r.id === permission.target_id);
      return role ? role.name : permission.target_id;
    }
    if (permission.target_type === "organization") {
      const org = availableOrganizations.find(
        (o) => o.id === permission.target_id
      );
      return org ? org.name : permission.target_id;
    }
    return permission.target_id;
  };

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case "user":
        return <User className="h-4 w-4" />;
      case "role":
        return <Shield className="h-4 w-4" />;
      case "organization":
        return <Building2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getAvailableTargets = () => {
    switch (selectedTargetType) {
      case "user":
        return availableUsers.map((u) => ({
          id: u.id,
          name: `${u.name} (${u.email})`,
        }));
      case "role":
        return availableRoles.map((r) => ({ id: r.id, name: r.name }));
      case "organization":
        return availableOrganizations.map((o) => ({ id: o.id, name: o.name }));
      default:
        return [];
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          {t("files.permissions") || "Permisos"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informative message */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              {t("files.ownerFullAccess")}
            </p>
          </div>
        </div>

        {/* Add new permission */}
        <div className="flex gap-2">
          <Select
            value={selectedTargetType}
            onValueChange={(value: "user" | "role" | "organization") => {
              setSelectedTargetType(value);
              setSelectedTargetId("");
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t("files.user") || "Usuario"}
                </div>
              </SelectItem>
              <SelectItem value="role">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t("files.role") || "Rol"}
                </div>
              </SelectItem>
              {availableOrganizations.length > 0 && (
                <SelectItem value="organization">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t("files.organization") || "Organización"}
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
            <SelectTrigger className="flex-1">
              <SelectValue
                placeholder={t("files.selectTarget") || "Seleccionar..."}
              />
            </SelectTrigger>
            <SelectContent>
              {getAvailableTargets().map((target) => (
                <SelectItem key={target.id} value={target.id}>
                  {target.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            onClick={addPermission}
            size="icon"
            variant="outline"
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* List of permissions */}
        {permissions.length > 0 && (
          <div className="space-y-2">
            {permissions.map((permission, index) => (
              <div
                key={`${permission.target_type}-${permission.target_id}-${index}`}
                className="flex flex-col md:flex-row md:items-center gap-3 p-3 border rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getTargetIcon(permission.target_type)}
                  <span className="font-medium truncate">
                    {getTargetName(permission)}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {permission.target_type}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`view-${index}`}
                      checked={permission.can_view}
                      onCheckedChange={(checked) =>
                        updatePermission(index, "can_view", checked)
                      }
                    />
                    <Label
                      htmlFor={`view-${index}`}
                      className="text-sm cursor-pointer"
                    >
                      {t("files.view") || "Ver"}
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`download-${index}`}
                      checked={permission.can_download}
                      onCheckedChange={(checked) =>
                        updatePermission(
                          index,
                          "can_download",
                          checked
                        )
                      }
                    />
                    <Label
                      htmlFor={`download-${index}`}
                      className="text-sm cursor-pointer"
                    >
                      {t("files.download") || "Descargar"}
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-${index}`}
                      checked={permission.can_edit}
                      onCheckedChange={(checked) =>
                        updatePermission(index, "can_edit", checked)
                      }
                    />
                    <Label
                      htmlFor={`edit-${index}`}
                      className="text-sm cursor-pointer"
                    >
                      {t("files.edit") || "Editar"}
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`delete-${index}`}
                      checked={permission.can_delete}
                      onCheckedChange={(checked) =>
                        updatePermission(
                          index,
                          "can_delete",
                          checked
                        )
                      }
                    />
                    <Label
                      htmlFor={`delete-${index}`}
                      className="text-sm cursor-pointer"
                    >
                      {t("files.delete") || "Eliminar"}
                    </Label>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePermission(index)}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {permissions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("files.noPermissions") ||
              "No hay permisos asignados. El propietario tiene acceso completo."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
