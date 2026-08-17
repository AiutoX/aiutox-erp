/**
 * Create User Page
 * Página para crear un nuevo usuario usando modal
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { UserFormModal } from "~/features/users/components/UserFormModal";
import { useCreateUser } from "~/features/users/hooks/useUsers";
import type {
  UserCreate,
  UserUpdate as _UserUpdate,
} from "~/features/users/types/user.types";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";

export default function CreateUserPage() {
  const navigate = useNavigate();
  const { t: _ } = useTranslation();
  const { create, loading } = useCreateUser();
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleSubmit = async (data: UserCreate | _UserUpdate) => {
    try {
      await create(data as UserCreate);
      showToast("Usuario creado exitosamente", "success");
      setIsModalOpen(false);
      void navigate("/users");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al crear el usuario";
      showToast(errorMessage, "error");
      throw error;
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    void navigate("/users");
  };

  return (
    <PageLayout
      title="Crear Usuario"
      description="Completa el formulario para crear un nuevo usuario"
      breadcrumb={[
        { label: "Usuarios", href: "/users" },
        { label: "Crear Usuario" },
      ]}
    >
      <UserFormModal
        open={isModalOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </PageLayout>
  );
}
