/**
 * UserContactMethods Component
 *
 * Manages contact methods (email, phone, address, etc.) for a user
 */

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Plus, Edit, Trash2, Mail, Phone, MapPin, Globe } from "lucide-react";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { showToast } from "~/components/common/Toast";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  useContactMethods,
  useCreateContactMethod,
  useUpdateContactMethod,
  useDeleteContactMethod,
} from "../hooks/useContactMethods";
import { ContactMethodForm } from "./ContactMethodForm";
import type {
  ContactMethod,
  ContactMethodType,
  User,
} from "../types/user.types";

interface UserContactMethodsProps {
  user: User;
  onUpdate?: () => void;
}

/**
 * Get icon for contact method type
 */
function getContactMethodIcon(type: ContactMethodType) {
  switch (type) {
    case "email":
      return Mail;
    case "phone":
    case "mobile":
      return Phone;
    case "address":
      return MapPin;
    case "website":
      return Globe;
    default:
      return Mail;
  }
}

/**
 * UserContactMethods component
 */
export function UserContactMethods({
  user,
  onUpdate,
}: UserContactMethodsProps) {
  const { t } = useTranslation();
  const {
    contactMethods,
    loading,
    refresh,
    error: contactMethodsError,
  } = useContactMethods("user", user.id);
  const {
    create,
    loading: creating,
    error: createError,
  } = useCreateContactMethod();
  const {
    update,
    loading: updating,
    error: updateError,
  } = useUpdateContactMethod();
  const {
    remove,
    loading: deleting,
    error: deleteError,
  } = useDeleteContactMethod();

  const [editingMethod, setEditingMethod] = useState<ContactMethod | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    methodId: string | null;
  }>({ open: false, methodId: null });

  const handleCreate = async (data: {
    method_type?: ContactMethodType;
    value?: string | null;
    label?: string | null;
    is_primary?: boolean | null;
    // Address fields
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state_province?: string | null;
    postal_code?: string | null;
    country?: string | null;
  }) => {
    if (!data.method_type) {
      showToast(
        t("users.contactMethodRequired") || "Tipo de método es requerido",
        "error"
      );
      return;
    }

    // For address type, construct value from address fields
    let contactValue = data.value;
    if (data.method_type === "address") {
      // Validate required address fields
      if (!data.address_line1 || !data.city || !data.country) {
        showToast(
          t("users.addressFieldsRequired") ||
            "Dirección línea 1, ciudad y país son requeridos",
          "error"
        );
        return;
      }
      // Construct value from address fields
      const addressParts = [
        data.address_line1,
        data.address_line2,
        data.city,
        data.state_province,
        data.postal_code,
        data.country,
      ].filter(Boolean);
      contactValue = addressParts.join(", ");
    } else if (!contactValue) {
      // For non-address types, value is required
      showToast(
        t("users.contactMethodRequired") ||
          "Tipo de método y valor son requeridos",
        "error"
      );
      return;
    }

    // Check for existing errors before attempting creation
    if (createError) {
      console.error(
        "[UserContactMethods] Create error before attempt:",
        createError
      );
      showToast(
        t("users.contactMethodCreateError") ||
          "Error al crear el método de contacto",
        "error"
      );
      return;
    }

    console.log("[UserContactMethods] Creating contact method:", {
      entity_type: "user",
      entity_id: user.id,
      method_type: data.method_type,
      value: contactValue,
      isAddress: data.method_type === "address",
    });

    try {
      const result = await create({
        entity_type: "user",
        entity_id: user.id,
        method_type: data.method_type,
        value: contactValue || "", // Use constructed value for addresses
        label: data.label,
        is_primary: data.is_primary ?? false,
        address_line1: data.address_line1,
        address_line2: data.address_line2,
        city: data.city,
        state_province: data.state_province,
        postal_code: data.postal_code,
        country: data.country,
      });

      if (result) {
        console.log(
          "[UserContactMethods] Contact method created successfully:",
          result
        );
        showToast(
          t("users.contactMethodCreateSuccess") ||
            "Método de contacto creado exitosamente",
          "success"
        );
        setShowForm(false);
        // Refresh is now handled automatically by React Query cache invalidation
        // but we call it explicitly to ensure immediate UI update
        refresh();
        onUpdate?.();
      } else {
        // Check for error after creation attempt
        const errorMessage =
          t("users.contactMethodCreateError") ||
          "Error al crear el método de contacto";
        console.error(
          "[UserContactMethods] Failed to create contact method:",
          createError
        );
        showToast(errorMessage, "error");
      }
    } catch (error) {
      console.error(
        "[UserContactMethods] Exception during contact method creation:",
        error
      );
      showToast(
        error instanceof Error
          ? error.message
          : t("users.contactMethodCreateError") ||
              "Error al crear el método de contacto",
        "error"
      );
    }
  };

  const handleUpdate = async (
    methodId: string,
    data: {
      value?: string | null;
      label?: string | null;
      is_primary?: boolean | null;
    }
  ) => {
    // Check for existing errors before attempting update
    if (updateError) {
      console.error(
        "[UserContactMethods] Update error before attempt:",
        updateError
      );
      showToast(
        t("users.contactMethodUpdateError") ||
          "Error al actualizar el método de contacto",
        "error"
      );
      return;
    }

    console.log("[UserContactMethods] Updating contact method:", {
      methodId,
      data,
    });

    try {
      const result = await update(methodId, data);
      if (result) {
        console.log(
          "[UserContactMethods] Contact method updated successfully:",
          result
        );
        showToast(
          t("users.contactMethodUpdateSuccess") ||
            "Método de contacto actualizado exitosamente",
          "success"
        );
        setEditingMethod(null);
        // Refresh is now handled automatically by React Query cache invalidation
        refresh();
        onUpdate?.();
      } else {
        // Check for error after update attempt
        const errorMessage =
          t("users.contactMethodUpdateError") ||
          "Error al actualizar el método de contacto";
        console.error(
          "[UserContactMethods] Failed to update contact method:",
          updateError
        );
        showToast(errorMessage, "error");
      }
    } catch (error) {
      console.error(
        "[UserContactMethods] Exception during contact method update:",
        error
      );
      showToast(
        error instanceof Error
          ? error.message
          : t("users.contactMethodUpdateError") ||
              "Error al actualizar el método de contacto",
        "error"
      );
    }
  };

  const handleDelete = async (methodId: string) => {
    setDeleteConfirm({ open: true, methodId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.methodId) return;

    // Check for existing errors before attempting delete
    if (deleteError) {
      console.error(
        "[UserContactMethods] Delete error before attempt:",
        deleteError
      );
      showToast(
        t("users.contactMethodDeleteError") ||
          "Error al eliminar el método de contacto",
        "error"
      );
      setDeleteConfirm({ open: false, methodId: null });
      return;
    }

    console.log(
      "[UserContactMethods] Deleting contact method:",
      deleteConfirm.methodId
    );

    try {
      const success = await remove(deleteConfirm.methodId);
      if (success) {
        console.log("[UserContactMethods] Contact method deleted successfully");
        showToast(
          t("users.contactMethodDeleteSuccess") ||
            "Método de contacto eliminado exitosamente",
          "success"
        );
        // Refresh is now handled automatically by React Query cache invalidation
        refresh();
        onUpdate?.();
      } else {
        // Check for error after delete attempt
        const errorMessage =
          t("users.contactMethodDeleteError") ||
          "Error al eliminar el método de contacto";
        console.error(
          "[UserContactMethods] Failed to delete contact method:",
          deleteError
        );
        showToast(errorMessage, "error");
      }
    } catch (error) {
      console.error(
        "[UserContactMethods] Exception during contact method deletion:",
        error
      );
      showToast(
        error instanceof Error
          ? error.message
          : t("users.contactMethodDeleteError") ||
              "Error al eliminar el método de contacto",
        "error"
      );
    }
    setDeleteConfirm({ open: false, methodId: null });
  };

  // Log errors for debugging
  // Log errors for debugging
  if (contactMethodsError) {
    console.error(
      "[UserContactMethods] Error loading contact methods:",
      contactMethodsError
    );
    // Log more details about the error
    if (contactMethodsError instanceof Error) {
      console.error("[UserContactMethods] Error details:", {
        message: contactMethodsError.message,
        name: contactMethodsError.name,
        stack: contactMethodsError.stack,
      });
    }
  }

  // Log current state for debugging
  console.log("[UserContactMethods] Current state:", {
    contactMethodsCount: contactMethods.length,
    loading,
    error: contactMethodsError?.message,
    errorType: contactMethodsError?.constructor?.name,
    userId: user.id,
    apiBaseUrl:
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner
          size="md"
          text={
            t("users.loadingContactMethods") ||
            "Cargando métodos de contacto..."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t("users.contactMethodsTitle") || "Métodos de Contacto"}
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditingMethod(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("users.addContactMethod") || "Agregar Método"}
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-md border p-8 text-center">
          <LoadingSpinner size="sm" />
          <p className="text-sm text-muted-foreground mt-2">
            {t("users.loadingContactMethods") ||
              "Cargando métodos de contacto..."}
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && contactMethodsError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium">
            {t("users.contactMethodCreateError") ||
              "Error al cargar métodos de contacto"}
          </p>
          <p className="text-xs text-destructive/80 mt-1">
            {contactMethodsError.message || "Error desconocido"}
          </p>
          {contactMethodsError.message?.includes("Network Error") && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-destructive/60">
                Verifica que el servidor del backend esté corriendo en:
              </p>
              <p className="text-xs font-mono text-destructive/80">
                {import.meta.env.VITE_API_BASE_URL ||
                  "http://localhost:8000/api/v1"}
              </p>
              <p className="text-xs text-destructive/60 mt-1">
                Endpoint esperado: /api/v1/contact-methods
              </p>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                console.log("[UserContactMethods] Retry button clicked");
                refresh();
              }}
            >
              {t("users.retry") || "Reintentar"}
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !contactMethodsError && contactMethods.length === 0 && (
        <div className="rounded-md border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("users.noContactMethods") ||
              "No hay métodos de contacto registrados"}
          </p>
        </div>
      )}

      {/* List of contact methods */}
      {!loading && !contactMethodsError && contactMethods.length > 0 && (
        <div className="space-y-2">
          {contactMethods.map((method) => {
            const Icon = getContactMethodIcon(method.method_type);
            const isEditing = editingMethod?.id === method.id;

            if (isEditing) {
              return (
                <ContactMethodForm
                  key={method.id}
                  method={method}
                  onSubmit={async (data) => {
                    await handleUpdate(method.id, {
                      value: data.value,
                      label: data.label,
                      is_primary: data.is_primary,
                    });
                  }}
                  onCancel={() => setEditingMethod(null)}
                  loading={updating}
                />
              );
            }

            return (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-md border p-4"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium capitalize">
                        {method.method_type}
                      </p>
                      {method.is_primary && (
                        <span className="rounded-full bg-[#023E87]/10 px-2 py-0.5 text-xs text-[#023E87]">
                          Principal
                        </span>
                      )}
                      {method.is_verified && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          {t("users.verified") || "Verificado"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {method.value}
                    </p>
                    {method.label && (
                      <p className="text-xs text-muted-foreground">
                        {method.label}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingMethod(method)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(method.id)}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <ContactMethodForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={creating}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, methodId: null })}
        onConfirm={confirmDelete}
        title={
          t("users.deleteContactMethodTitle") || "Eliminar Método de Contacto"
        }
        description={
          t("users.deleteContactMethodDescription") ||
          "¿Estás seguro de que deseas eliminar este método de contacto?"
        }
        confirmText={t("users.delete") || "Eliminar"}
        cancelText={t("users.cancel") || "Cancelar"}
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
