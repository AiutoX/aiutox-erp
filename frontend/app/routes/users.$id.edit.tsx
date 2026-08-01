/**
 * User Edit Page
 *
 * Form for editing user information using modal
 */

import type { Route } from "./+types/users.$id.edit";
import { useParams, useNavigate } from "react-router";
import { useState } from "react";
import { PageLayout } from "~/components/layout/PageLayout";
import { UserFormModal } from "~/features/users/components/UserFormModal";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { LoadingState } from "~/components/common/LoadingState";
import { ErrorState } from "~/components/common/ErrorState";
import { useUser, useUpdateUser } from "~/features/users/hooks/useUsers";
import { showToast } from "~/components/common/Toast";
import type { UserUpdate } from "~/features/users/types/user.types";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Editar Usuario - AiutoX ERP" },
    { name: "description", content: "Editar información del usuario" },
  ];
}

export default function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t: _ } = useTranslation();
  const { user, loading, error } = useUser(id || null);
  const { mutateAsync: updateUserAsync, isPending: updating } = useUpdateUser();
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleSubmit = async (data: UserUpdate) => {
    if (!id) return;
    try {
      await updateUserAsync({ userId: id, data });
      showToast("Usuario actualizado exitosamente", "success");
      setIsModalOpen(false);
      void navigate(`/users/${id}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al actualizar el usuario";
      showToast(errorMessage, "error");
      throw err;
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    void navigate(`/users/${id}`);
  };

  return (
    <PageLayout
      title="Editar Usuario"
      description={user?.email || "Modifica la información del usuario"}
      breadcrumb={[
        { label: "Usuarios", href: "/users" },
        { label: user?.email || id || "", href: `/users/${id}` },
        { label: "Editar" },
      ]}
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
        <UserFormModal
          open={isModalOpen}
          onClose={handleClose}
          user={user}
          onSubmit={handleSubmit}
          loading={updating}
        />
      )}
    </PageLayout>
  );
}
