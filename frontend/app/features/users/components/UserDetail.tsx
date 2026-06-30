/**
 * UserDetail Component
 *
 * Complete user detail view with tabs for:
 * - General Information
 * - Organizations
 * - Contact Methods
 * - Roles
 * - Permissions
 * - Active Delegations
 */

import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { ArrowLeft, Edit, Shield } from "lucide-react";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { showToast } from "~/components/common/Toast";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { useUser, useUpdateUser, useDeleteUser } from "../hooks/useUsers";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { UserForm } from "./UserForm";
import { UserOrganizations } from "./UserOrganizations";
import { UserContactMethods } from "./UserContactMethods";
import { UserRolesManager } from "./UserRolesManager";
import { UserPermissionsManager } from "./UserPermissionsManager";
import { PermissionDelegationModal } from "./PermissionDelegationModal";
import { useAuthStore } from "~/stores/authStore";
import type { UserUpdate } from "../types/user.types";

/**
 * UserDetail component
 */
export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const { t } = useTranslation();

  const { user, loading, refresh } = useUser(id || null);
  const { mutateAsync: updateUserAsync, isPending: updating } = useUpdateUser();
  const { remove, loading: deleting } = useDeleteUser();

  const [editing, setEditing] = useState(false);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleUpdate = async (data: UserUpdate) => {
    if (!id) return;
    console.error("[UserDetail] handleUpdate called:", { id, data });
    try {
      const result = await updateUserAsync({ userId: id, data });
      console.error("[UserDetail] update result:", result);
      if (result && result.data) {
        console.error("[UserDetail] Update successful, closing form");
        showToast(
          t("users.updateSuccess") || "Usuario actualizado exitosamente",
          "success"
        );
        setEditing(false);
        void refresh();
      } else {
        console.error("[UserDetail] Update returned null or no data");
        showToast(
          t("users.updateError") || "Error al actualizar el usuario",
          "error"
        );
      }
    } catch (error) {
      console.error("[UserDetail] Exception in handleUpdate:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("users.updateError") || "Error al actualizar el usuario";
      showToast(errorMessage, "error");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!id) return;
    const success = await remove(id);
    if (success) {
      showToast(
        t("users.deleteSuccess") || "Usuario eliminado exitosamente",
        "success"
      );
      // Redirect to users list
      void navigate("/users");
    } else {
      showToast(
        t("users.deleteError") || "Error al eliminar el usuario",
        "error"
      );
    }
    setDeleteConfirm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner
          size="lg"
          text={t("users.loadingUser") || "Cargando usuario..."}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">
          {t("users.userNotFound") || "Usuario no encontrado"}
        </p>
        <Link to="/users">
          <Button variant="outline" className="mt-4">
            {t("users.backToUsers") || "Volver a Usuarios"}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">
                {t("users.back") || "Volver"}
              </span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {user.full_name || user.email}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {user.email}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setEditing(!editing)}
            disabled={updating}
            size="sm"
            className="w-full sm:w-auto"
          >
            <Edit className="h-4 w-4 mr-2" />
            {editing
              ? t("users.cancel") || "Cancelar"
              : t("users.edit") || "Editar"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleting}
            size="sm"
            className="w-full sm:w-auto"
            aria-label={t("users.delete") || "Eliminar usuario"}
          >
            {t("users.delete") || "Eliminar"}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => void confirmDelete()}
        title={t("users.confirmDeleteTitle") || "Eliminar Usuario"}
        description={
          user
            ? `${t("users.confirmDelete") || "¿Estás seguro de que deseas eliminar este usuario?"} ${user.email ? `\n\nUsuario: ${user.email}` : ""} ${user.full_name ? `\nNombre: ${user.full_name}` : ""}\n\n${t("users.confirmDeleteWarning") || "Esta acción no se puede deshacer."}`
            : t("users.confirmDelete") ||
              "¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
        }
        confirmText={t("users.delete") || "Eliminar"}
        cancelText={t("users.cancel") || "Cancelar"}
        variant="destructive"
        loading={deleting}
      />

      {/* Edit Form */}
      {editing && (
        <div className="rounded-md border p-6">
          <h2 className="text-xl font-semibold mb-4">
            {t("users.editUser") || "Editar Usuario"}
          </h2>
          <UserForm
            user={user}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            loading={updating}
          />
        </div>
      )}

      {/* Tabs */}
      {!editing && (
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">
              {t("users.generalInfo") || "Información General"}
            </TabsTrigger>
            <TabsTrigger value="organizations">
              {t("users.organizations") || "Organizaciones"}
            </TabsTrigger>
            <TabsTrigger value="contact-methods">
              {t("users.contactMethods") || "Métodos de Contacto"}
            </TabsTrigger>
            <TabsTrigger value="roles">
              {t("users.roles") || "Roles"}
            </TabsTrigger>
            <TabsTrigger value="permissions">
              {t("users.permissions") || "Permisos"}
            </TabsTrigger>
            <TabsTrigger value="delegations">
              {t("users.activeDelegations") || "Delegaciones Activas"}
            </TabsTrigger>
          </TabsList>

          {/* General Information Tab */}
          <TabsContent value="general" className="space-y-4">
            <div className="rounded-md border p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t("users.generalInfo") || "Información General"}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("users.emailLabel") || "Email"}
                  </p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("users.fullNameLabel") || "Nombre Completo"}
                  </p>
                  <p className="font-medium">
                    {user.full_name ||
                      `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                      "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("users.jobTitleLabel") || "Cargo"}
                  </p>
                  <p className="font-medium">{user.job_title || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("users.departmentLabel") || "Departamento"}
                  </p>
                  <p className="font-medium">{user.department || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("users.statusLabel") || "Estado"}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                      user.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.is_active
                      ? t("users.active") || "Activo"
                      : t("users.inactive") || "Inactivo"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("users.twoFactorLabel") || "2FA Habilitado"}
                  </p>
                  <p className="font-medium">
                    {user.two_factor_enabled
                      ? t("users.yes") || "Sí"
                      : t("users.no") || "No"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("users.lastLoginLabel") || "Último Acceso"}
                  </p>
                  <p className="font-medium">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleString()
                      : t("users.never") || "Nunca"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("users.createdLabel") || "Creado"}
                  </p>
                  <p className="font-medium">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations">
            <UserOrganizations user={user} onUpdate={() => void refresh()} />
          </TabsContent>

          {/* Contact Methods Tab */}
          <TabsContent value="contact-methods">
            <UserContactMethods user={user} onUpdate={() => void refresh()} />
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <UserRolesManager user={user} onUpdate={() => void refresh()} />
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {t("users.permissionsTitle") || "Permisos del Usuario"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("users.permissionsDescription") ||
                      "Visualiza y gestiona los permisos del usuario"}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowDelegationModal(true)}
                  aria-label={
                    t("users.delegatePermission") || "Delegar Permiso"
                  }
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {t("users.delegatePermission") || "Delegar Permiso"}
                </Button>
              </div>
              <UserPermissionsManager
                user={user}
                onUpdate={() => void refresh()}
              />
            </div>
          </TabsContent>

          {/* Active Delegations Tab */}
          <TabsContent value="delegations">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {t("users.delegationsTitle") || "Delegaciones Activas"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("users.delegationsDescription") ||
                    "Permisos delegados temporalmente a este usuario"}
                </p>
              </div>
              {/* TODO: Create component to list active delegations */}
              <div className="rounded-md border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("users.delegationsPending") ||
                    "Componente de delegaciones activas (pendiente de implementar)"}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Permission Delegation Modal */}
      {currentUser && (
        <PermissionDelegationModal
          open={showDelegationModal}
          onClose={() => setShowDelegationModal(false)}
          currentUserId={currentUser.id}
          onSuccess={() => void refresh()}
        />
      )}
    </div>
  );
}
