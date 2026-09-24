/**
 * UserFormModal Component
 *
 * Modal/drawer wrapper for UserForm
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { UserForm } from "./UserForm";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { User, UserCreate, UserUpdate } from "../types/user.types";

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
  onSubmit: (data: UserCreate | UserUpdate) => Promise<void>;
  loading?: boolean;
  isSelfEdit?: boolean; // Nuevo prop para modo edición propia
}

/**
 * UserFormModal component
 */
export function UserFormModal({
  open,
  onClose,
  user,
  onSubmit,
  loading = false,
  isSelfEdit = false,
}: UserFormModalProps) {
  const { t } = useTranslation();

  const handleSubmit = async (data: UserCreate | UserUpdate) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user
              ? t("users.editUser") || "Editar Usuario"
              : t("users.createUser") || "Crear Nuevo Usuario"}
          </DialogTitle>
          <DialogDescription>
            {user
              ? t("users.editUserDescription") ||
                "Actualiza la información del usuario"
              : t("users.createUserDescription") ||
                "Completa el formulario para crear un nuevo usuario"}
          </DialogDescription>
        </DialogHeader>

        <UserForm
          user={user}
          onSubmit={handleSubmit}
          onCancel={onClose}
          loading={loading}
          isSelfEdit={isSelfEdit}
        />
      </DialogContent>
    </Dialog>
  );
}
