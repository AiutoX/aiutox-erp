/**
 * CustomRolesManager Component
 *
 * Manages custom roles with granular permission assignment
 * Inspired by Aureus ERP role management interface
 */

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useCustomRoles, useDeleteCustomRole } from "../hooks/useCustomRoles";
import { RoleForm } from "./RoleForm";
import type { CustomRole } from "../types/user.types";

interface CustomRolesManagerProps {
  onRoleSelect?: (role: CustomRole) => void;
}

/**
 * CustomRolesManager component
 */
export function CustomRolesManager({ onRoleSelect }: CustomRolesManagerProps) {
  const { t } = useTranslation();
  const { roles, loading, refresh } = useCustomRoles();
  const { remove, loading: deleting } = useDeleteCustomRole();

  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    roleId: string | null;
  }>({ open: false, roleId: null });

  const handleDelete = async (roleId: string) => {
    setDeleteConfirm({ open: true, roleId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.roleId) return;

    const success = await remove(deleteConfirm.roleId);
    if (success) {
      showToast(
        t("users.roleDeletedSuccess") || "Rol eliminado exitosamente",
        "success"
      );
      refresh();
    } else {
      showToast(
        t("users.roleDeletedError") || "Error al eliminar el rol",
        "error"
      );
    }
    setDeleteConfirm({ open: false, roleId: null });
  };

  const handleFormSuccess = () => {
    showToast(
      editingRole
        ? t("users.roleUpdatedSuccess") || "Rol actualizado exitosamente"
        : t("users.roleCreatedSuccess") || "Rol creado exitosamente",
      "success"
    );
    setShowForm(false);
    setEditingRole(null);
    refresh();
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("users.loadingRoles") || "Cargando roles..."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {t("users.customRolesTitle") || "Roles Personalizados"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("users.customRolesDescription") ||
              "Crea y gestiona roles personalizados con permisos granulares"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingRole(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("users.createRole") || "Crear Rol"}
        </Button>
      </div>

      {showForm && (
        <RoleForm
          role={editingRole}
          onSubmit={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingRole(null);
          }}
        />
      )}

      {roles.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("users.noCustomRoles") ||
              "No hay roles personalizados. Crea uno para comenzar."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between rounded-md border p-4 hover:bg-muted/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{role.name}</p>
                  <span className="rounded-full bg-[#023E87]/10 px-2 py-0.5 text-xs text-[#023E87]">
                    {role.permissions.length}{" "}
                    {t("users.permissions") || "permisos"}
                  </span>
                </div>
                {role.description && (
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingRole(role);
                    setShowForm(true);
                    onRoleSelect?.(role);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(role.id)}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, roleId: null })}
        onConfirm={confirmDelete}
        title={t("users.deleteCustomRoleTitle") || "Eliminar Rol Personalizado"}
        description={
          t("users.deleteCustomRoleDescription") ||
          "¿Estás seguro de que deseas eliminar este rol? Esta acción no se puede deshacer."
        }
        confirmText={t("users.delete") || "Eliminar"}
        cancelText={t("users.cancel") || "Cancelar"}
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
