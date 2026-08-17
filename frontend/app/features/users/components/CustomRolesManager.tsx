/**
 * CustomRolesManager Component
 *
 * Manages custom roles with granular permission assignment
 * Inspired by Aureus ERP role management interface
 */

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
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
      showToast(t("users.roleDeletedSuccess"), "success");
      refresh();
    } else {
      showToast(t("users.roleDeletedError"), "error");
    }
    setDeleteConfirm({ open: false, roleId: null });
  };

  const handleFormSuccess = () => {
    showToast(
      editingRole
        ? t("users.roleUpdatedSuccess")
        : t("users.roleCreatedSuccess"),
      "success"
    );
    setShowForm(false);
    setEditingRole(null);
    refresh();
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("users.loadingRoles")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {t("users.customRolesTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("users.customRolesDescription")}
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
          {t("users.createRole")}
        </Button>
      </div>

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingRole(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? t("users.roleForm.submitUpdate") : t("users.createRole")}
            </DialogTitle>
          </DialogHeader>
          <RoleForm
            role={editingRole}
            onSubmit={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingRole(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {roles.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("users.noCustomRoles")}
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
                    {role.permissions.length} {t("users.permissions")}
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
        title={t("users.deleteCustomRoleTitle")}
        description={t("users.deleteCustomRoleDescription")}
        confirmText={t("users.delete")}
        cancelText={t("users.roleForm.cancel")}
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
