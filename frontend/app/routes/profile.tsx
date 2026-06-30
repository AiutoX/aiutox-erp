/**
 * Profile Page
 *
 * Página de perfil del usuario autenticado con modal y restricciones de edición
 */

import { useState } from "react";
import { PageLayout } from "~/components/layout/PageLayout";
// import { useTranslation } from "~/lib/i18n/useTranslation";
import { showToast } from "~/components/common/Toast";
import { UserFormModal } from "~/features/users/components/UserFormModal";
import { useAuthStore } from "~/stores/authStore";
import { useUser, useUpdateOwnProfile } from "~/features/users/hooks/useUsers";
import type { UserUpdate } from "~/features/users/types/user.types";
import { LoadingState } from "~/components/common/LoadingState";
import { ErrorState } from "~/components/common/ErrorState";
import { ChangePasswordForm } from "~/components/auth/ChangePasswordForm";

export default function ProfilePage() {
  const { user: authUser } = useAuthStore();
  const { user, loading, error } = useUser(authUser?.id || null);
  const { mutateAsync: updateProfileAsync, isPending: updating } =
    useUpdateOwnProfile();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (data: UserUpdate) => {
    try {
      await updateProfileAsync(data);
      showToast("Perfil actualizado exitosamente", "success");
      setIsModalOpen(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al actualizar el perfil";
      showToast(errorMessage, "error");
      throw err;
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const handleEditProfile = () => {
    setIsModalOpen(true);
  };

  return (
    <PageLayout
      title="Mi Perfil"
      description="Gestiona tu información personal y configuraciones"
      breadcrumb={[{ label: "Inicio", href: "/" }, { label: "Mi Perfil" }]}
      loading={loading}
      error={error}
    >
      {loading && <LoadingState />}
      {error && (
        <ErrorState
          message={error instanceof Error ? error.message : "Error"}
        />
      )}

      {user && (
        <div className="space-y-6">
          {/* Información del usuario */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Información Personal</h2>
              <button
                onClick={handleEditProfile}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
              >
                Editar Perfil
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <p className="text-gray-900 dark:text-gray-100">{user.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre Completo
                </label>
                <p className="text-gray-900 dark:text-gray-100">
                  {user.full_name || "No especificado"}
                </p>
              </div>

              {user.job_title && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cargo
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {user.job_title}
                  </p>
                </div>
              )}

              {user.department && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Departamento
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {user.department}
                  </p>
                </div>
              )}

              {user.preferred_language && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Idioma Preferido
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {user.preferred_language}
                  </p>
                </div>
              )}

              {user.timezone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Zona Horaria
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {user.timezone}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Información de seguridad */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Seguridad</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Autenticación de Dos Factores</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {user.two_factor_enabled ? "Habilitada" : "Deshabilitada"}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    user.two_factor_enabled
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {user.two_factor_enabled ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          {/* Cambiar Contraseña */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Cambiar Contraseña</h2>
            <ChangePasswordForm />
          </div>

          {/* Nota de restricciones */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex">
              <div className="shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Información importante
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    Por razones de seguridad, no puedes modificar tu nombre,
                    email ni estado de activación. Estos campos solo pueden ser
                    modificados por un administrador.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      <UserFormModal
        open={isModalOpen}
        onClose={handleClose}
        user={user || undefined}
        onSubmit={handleSubmit}
        loading={updating}
        isSelfEdit={true}
      />
    </PageLayout>
  );
}
