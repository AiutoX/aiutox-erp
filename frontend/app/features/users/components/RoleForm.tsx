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
import { usePermissionsByModule } from "../hooks/useUserPermissions";
import {
  useCreateCustomRole,
  useUpdateCustomRole,
} from "../hooks/useCustomRoles";
import { useAuthStore } from "~/stores/authStore";
import { showToast } from "~/components/common/Toast";
import type { PermissionGroup, CustomRole } from "../types/user.types";

const roleSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional().nullable(),
  permissions: z
    .array(z.string())
    .min(1, "Debe seleccionar al menos un permiso"),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormProps {
  role?: CustomRole | null;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * RoleForm component
 */
export function RoleForm({ role, onSubmit, onCancel }: RoleFormProps) {
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
        name: data.name,
        description: data.description,
        permissions: Array.from(selectedPermissions),
      });
      if (result) {
        showToast("Rol actualizado exitosamente", "success");
        onSubmit();
      } else {
        showToast("Error al actualizar el rol", "error");
      }
    } else {
      const result = await create({
        name: data.name,
        description: data.description,
        permissions: Array.from(selectedPermissions),
        tenant_id: tenantId,
      });
      if (result) {
        showToast("Rol creado exitosamente", "success");
        onSubmit();
      } else {
        showToast("Error al crear el rol", "error");
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
            Nombre del Rol <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register("name")}
            disabled={loading}
            placeholder="Ej: Gerente de Ventas"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            {...register("description")}
            rows={3}
            disabled={loading}
            placeholder="Descripción del rol y sus responsabilidades"
          />
        </div>
      </div>

      {/* Permissions by Module (Aureus ERP style) */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">
            Permisos <span className="text-destructive">*</span>
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Selecciona los permisos que tendrá este rol. Los permisos están
            agrupados por módulo.
          </p>
        </div>

        {loadingPermissions ? (
          <div className="text-sm text-muted-foreground">
            Cargando permisos...
          </div>
        ) : permissionGroups.length === 0 ? (
          <div className="rounded-md border p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No hay permisos disponibles
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {permissionGroups.map((group) => (
              <ModulePermissionsGroup
                key={group.module_id}
                group={group}
                selectedPermissions={selectedPermissions}
                onPermissionToggle={handlePermissionToggle}
                onModuleToggle={handleModuleToggle}
                disabled={loading}
              />
            ))}
          </div>
        )}

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
            Permisos seleccionados: {selectedPermissions.size}
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
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading || selectedPermissions.size === 0}
        >
          {loading
            ? "Guardando..."
            : isEditing
              ? "Actualizar Rol"
              : "Crear Rol"}
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
}

function ModulePermissionsGroup({
  group,
  selectedPermissions,
  onPermissionToggle,
  onModuleToggle,
  disabled = false,
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
          {allSelected ? "Deseleccionar Todo" : "Seleccionar Todo"}
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
                  ? "Ver"
                  : action === "create"
                    ? "Crear"
                    : action === "edit"
                      ? "Editar"
                      : action === "delete"
                        ? "Eliminar"
                        : action === "manage_users"
                          ? "Gestionar Usuarios"
                          : action}
              </Label>
            </div>
          )
        )}
      </div>
    </div>
  );
}
