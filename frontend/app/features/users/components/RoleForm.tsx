/**
 * RoleForm Component
 *
 * Form for creating/editing custom roles with granular permission assignment
 * Inspired by Aureus ERP: permissions grouped by module with checkboxes
 */

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { X } from "lucide-react";
import { usePermissionsByModule } from "../hooks/useUserPermissions";
import {
  useCreateCustomRole,
  useUpdateCustomRole,
} from "../hooks/useCustomRoles";
import { useAuthStore } from "~/stores/authStore";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { PermissionGroup, CustomRole } from "../types/user.types";
import {
  WILDCARD_PATTERN,
  TOTAL_ACCESS_WILDCARDS,
  isWildcardPermission,
  expandWildcard,
} from "../utils/permissionWildcards";

type RoleFormData = z.infer<ReturnType<typeof buildRoleSchema>>;

function buildRoleSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t("users.roleForm.nameRequired")),
    description: z.string().optional().nullable(),
    permissions: z
      .array(z.string())
      .min(1, t("users.roleForm.permissionsRequired")),
  });
}

interface RoleFormProps {
  role?: CustomRole | null;
  /** True when editing a system role (owner/admin/manager/staff/viewer) --
   * its name is immutable, but permissions/description can be edited the
   * same way as a custom role (single unified editing path). */
  isSystemRole?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * RoleForm component
 */
export function RoleForm({
  role,
  isSystemRole = false,
  onSubmit,
  onCancel,
}: RoleFormProps) {
  const { t } = useTranslation();
  const isEditing = !!role;
  const currentUser = useAuthStore((state) => state.user);
  const tenantId = currentUser?.tenant_id || "";

  const { permissionGroups, loading: loadingPermissions } =
    usePermissionsByModule(tenantId);
  const { create, loading: creating } = useCreateCustomRole();
  const { update, loading: updating } = useUpdateCustomRole();

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(role?.permissions || [])
  );
  const [wildcardInput, setWildcardInput] = useState("");
  const [wildcardError, setWildcardError] = useState<string | null>(null);
  const [expandedWildcards, setExpandedWildcards] = useState(false);

  // "owner" with total-access ("*" / "*.*") is never expanded/edited away --
  // there must always be at least one owner with unrestricted access.
  const isTotalAccessLocked =
    isSystemRole &&
    role?.name === "owner" &&
    (role.permissions.includes("*") || role.permissions.includes("*.*"));

  // Expand partial wildcards (module.*, *.action) into literal, editable
  // checkboxes once the full permission catalog has loaded. Runs once per
  // role -- after this, selectedPermissions only ever holds literal
  // permissions plus whatever wildcards the user explicitly re-adds.
  useEffect(() => {
    if (expandedWildcards || loadingPermissions || isTotalAccessLocked) return;
    const allPermissions = permissionGroups.flatMap((g) =>
      g.permissions.map((p) => p.permission)
    );
    if (allPermissions.length === 0) return;

    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const perm of Array.from(next)) {
        if (isWildcardPermission(perm) && !TOTAL_ACCESS_WILDCARDS.has(perm)) {
          next.delete(perm);
          expandWildcard(perm, allPermissions).forEach((p) => next.add(p));
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setExpandedWildcards(true);
  }, [expandedWildcards, loadingPermissions, isTotalAccessLocked, permissionGroups]);

  const wildcardPermissions = Array.from(selectedPermissions).filter(
    isWildcardPermission
  );

  const handleAddWildcard = () => {
    const value = wildcardInput.trim();
    if (!value) return;
    if (!WILDCARD_PATTERN.test(value)) {
      setWildcardError(t("users.roleForm.wildcardInvalid"));
      return;
    }
    setSelectedPermissions((prev) => new Set(prev).add(value));
    setWildcardInput("");
    setWildcardError(null);
  };

  const handleRemoveWildcard = (value: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      next.delete(value);
      return next;
    });
  };

  const roleSchema = useMemo(() => buildRoleSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
      permissions: role?.permissions || [],
    },
  });

  // Update form when selectedPermissions changes
  useEffect(() => {
    setValue("permissions", Array.from(selectedPermissions));
  }, [selectedPermissions, setValue]);

  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permission)) {
        newSet.delete(permission);
      } else {
        newSet.add(permission);
      }
      return newSet;
    });
  };

  const handleModuleToggle = (modulePermissions: string[]) => {
    const allSelected = modulePermissions.every((p) =>
      selectedPermissions.has(p)
    );
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deselect all
        modulePermissions.forEach((p) => newSet.delete(p));
      } else {
        // Select all
        modulePermissions.forEach((p) => newSet.add(p));
      }
      return newSet;
    });
  };

  const onSubmitForm = async (data: RoleFormData) => {
    if (isEditing && role) {
      const result = await update(role.id, {
        ...(isSystemRole ? {} : { name: data.name }),
        description: data.description,
        permissions: Array.from(selectedPermissions),
      });
      if (result) {
        showToast(t("users.roleForm.updateSuccess"), "success");
        onSubmit();
      } else {
        showToast(t("users.roleForm.updateError"), "error");
      }
    } else {
      const result = await create({
        name: data.name,
        description: data.description,
        permissions: Array.from(selectedPermissions),
        tenant_id: tenantId,
      });
      if (result) {
        showToast(t("users.roleForm.createSuccess"), "success");
        onSubmit();
      } else {
        showToast(t("users.roleForm.createError"), "error");
      }
    }
  };

  const loading = creating || updating || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            {t("users.roleForm.nameLabel")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register("name")}
            disabled={loading || isSystemRole}
            placeholder={t("users.roleForm.namePlaceholder")}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            {t("users.roleForm.descriptionLabel")}
          </Label>
          <Textarea
            id="description"
            {...register("description")}
            rows={3}
            disabled={loading}
            placeholder={t("users.roleForm.descriptionPlaceholder")}
          />
        </div>
      </div>

      {/* Permissions: by module (literal), or Advanced (wildcard patterns) */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">
            {t("users.roleForm.permissionsLabel")}{" "}
            <span className="text-destructive">*</span>
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            {t("users.roleForm.permissionsDescription")}
          </p>
        </div>

        <Tabs defaultValue="byModule">
          <TabsList>
            <TabsTrigger value="byModule">
              {t("users.roleForm.tabByModule")}
            </TabsTrigger>
            <TabsTrigger value="advanced">
              {t("users.roleForm.tabAdvanced")}
              {wildcardPermissions.length > 0 && ` (${wildcardPermissions.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="byModule" className="space-y-4 pt-4">
            {isTotalAccessLocked && (
              <p className="text-sm text-muted-foreground rounded-md border bg-muted/50 p-3">
                {t("users.roleForm.totalAccessLocked")}
              </p>
            )}
            {loadingPermissions ? (
              <div className="text-sm text-muted-foreground">
                {t("users.loadingPermissions")}
              </div>
            ) : permissionGroups.length === 0 ? (
              <div className="rounded-md border p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("users.roleForm.noPermissionsAvailable")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {permissionGroups.map((group) => (
                  <ModulePermissionsGroup
                    key={group.module_id}
                    group={group}
                    selectedPermissions={
                      isTotalAccessLocked
                        ? new Set(group.permissions.map((p) => p.permission))
                        : selectedPermissions
                    }
                    onPermissionToggle={handlePermissionToggle}
                    onModuleToggle={handleModuleToggle}
                    disabled={loading || isTotalAccessLocked}
                    t={t}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              {t("users.roleForm.wildcardDescription")}
            </p>
            {isTotalAccessLocked ? (
              <p className="text-sm text-muted-foreground rounded-md border bg-muted/50 p-3">
                {t("users.roleForm.totalAccessLocked")}
              </p>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={wildcardInput}
                  onChange={(e) => {
                    setWildcardInput(e.target.value);
                    setWildcardError(null);
                  }}
                  disabled={loading}
                  placeholder={t("users.roleForm.wildcardPlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddWildcard();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={handleAddWildcard}
                >
                  {t("users.roleForm.wildcardAdd")}
                </Button>
              </div>
            )}
            {wildcardError && (
              <p className="text-sm text-destructive">{wildcardError}</p>
            )}
            {wildcardPermissions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {wildcardPermissions.map((perm) => (
                  <span
                    key={perm}
                    className="inline-flex items-center gap-1 rounded-full bg-[#023E87]/10 px-2 py-1 text-xs text-[#023E87]"
                  >
                    {perm}
                    {!isTotalAccessLocked && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleRemoveWildcard(perm)}
                        aria-label={`${t("users.roleForm.wildcardAdd")} ${perm}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {errors.permissions && (
          <p className="text-sm text-destructive">
            {errors.permissions.message}
          </p>
        )}
      </div>

      {/* Selected Permissions Summary */}
      {selectedPermissions.size > 0 && (
        <div className="rounded-md border bg-muted/50 p-4">
          <p className="text-sm font-medium mb-2">
            {t("users.roleForm.selectedPermissionsCount")}:{" "}
            {selectedPermissions.size}
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedPermissions).map((perm) => (
              <span
                key={perm}
                className="rounded-full bg-[#023E87]/10 px-2 py-1 text-xs text-[#023E87]"
              >
                {perm}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          {t("users.roleForm.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={
            loading || selectedPermissions.size === 0 || isTotalAccessLocked
          }
        >
          {loading
            ? t("users.roleForm.saving")
            : isEditing
              ? t("users.roleForm.submitUpdate")
              : t("users.roleForm.submitCreate")}
        </Button>
      </div>
    </form>
  );
}

/**
 * ModulePermissionsGroup Component
 *
 * Displays permissions for a module with checkboxes (Aureus ERP style)
 */
interface ModulePermissionsGroupProps {
  group: PermissionGroup;
  selectedPermissions: Set<string>;
  onPermissionToggle: (permission: string) => void;
  onModuleToggle: (permissions: string[]) => void;
  disabled?: boolean;
  t: (key: string) => string;
}

function ModulePermissionsGroup({
  group,
  selectedPermissions,
  onPermissionToggle,
  onModuleToggle,
  disabled = false,
  t,
}: ModulePermissionsGroupProps) {
  const modulePermissions = group.permissions.map((p) => p.permission);
  const allSelected = modulePermissions.every((p) =>
    selectedPermissions.has(p)
  );
  // const someSelected = modulePermissions.some((p) =>
  //   selectedPermissions.has(p)
  // );

  // Permission actions (View, Add, Edit, Delete, Manage Users)
  const permissionActions = useMemo(() => {
    const actions = new Map<string, string[]>();
    for (const perm of group.permissions) {
      const parts = perm.permission.split(".");
      if (parts.length >= 2) {
        const action = parts[parts.length - 1];
        if (!actions.has(action || "")) {
          actions.set(action || "", []);
        }
        actions.get(action || "")!.push(perm.permission);
      }
    }
    return actions;
  }, [group.permissions]);

  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h5 className="font-medium">{group.module_name}</h5>
          {group.category && (
            <p className="text-xs text-muted-foreground">{group.category}</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onModuleToggle(modulePermissions)}
          disabled={disabled}
        >
          {allSelected
            ? t("users.roleForm.deselectAll")
            : t("users.roleForm.selectAll")}
        </Button>
      </div>

      <div className="space-y-2">
        {Array.from(permissionActions.entries()).map(
          ([action, permissions]) => (
            <div key={action} className="flex items-center gap-2">
              <Checkbox
                id={`${group.module_id}-${action}`}
                checked={permissions.every((p) => selectedPermissions.has(p))}
                onCheckedChange={(checked) => {
                  if (checked) {
                    permissions.forEach((p) => onPermissionToggle(p));
                  } else {
                    permissions.forEach((p) => {
                      if (selectedPermissions.has(p)) {
                        onPermissionToggle(p);
                      }
                    });
                  }
                }}
                disabled={disabled}
              />
              <Label
                htmlFor={`${group.module_id}-${action}`}
                className="text-sm font-medium capitalize cursor-pointer"
              >
                {action === "view"
                  ? t("users.roleForm.actionView")
                  : action === "create"
                    ? t("users.roleForm.actionCreate")
                    : action === "edit"
                      ? t("users.roleForm.actionEdit")
                      : action === "delete"
                        ? t("users.roleForm.actionDelete")
                        : action === "manage_users"
                          ? t("users.roleForm.actionManageUsers")
                          : action}
              </Label>
            </div>
          )
        )}
      </div>
    </div>
  );
}
