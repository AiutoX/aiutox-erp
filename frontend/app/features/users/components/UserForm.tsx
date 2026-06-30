/**
 * UserForm Component
 *
 * Form for creating/editing users with validation using react-hook-form and zod
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { sanitizeUserFormData } from "~/lib/security/sanitizeFormData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { uploadFile } from "~/features/files/api/files.api";
import { useAuthStore } from "~/stores/authStore";
import { showToast } from "~/components/common/Toast";
import type { User, UserCreate, UserUpdate } from "../types/user.types";
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateFormData,
  type UserUpdateFormData,
} from "../validations/user.schema";
import { useState } from "react";

interface UserFormProps {
  user?: User | null;
  onSubmit: (data: UserCreate | UserUpdate) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  isSelfEdit?: boolean; // Nuevo prop para modo edición propia
}

/**
 * UserForm component
 */
export function UserForm({
  user,
  onSubmit,
  onCancel,
  loading,
  isSelfEdit = false,
}: UserFormProps) {
  const { t } = useTranslation();
  const { user: authUser } = useAuthStore();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const isEditing = !!user;
  const schema = isEditing ? userUpdateSchema : userCreateSchema;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<UserCreateFormData | UserUpdateFormData>({
    resolver: zodResolver(schema),
    defaultValues: user
      ? {
          email: user.email,
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          middle_name: user.middle_name || "",
          full_name: user.full_name || "",
          date_of_birth: user.date_of_birth || "",
          gender: user.gender || "",
          nationality: user.nationality || "",
          marital_status: user.marital_status || "",
          job_title: user.job_title || "",
          department: user.department || "",
          employee_id: user.employee_id || "",
          preferred_language: user.preferred_language || "es",
          timezone: user.timezone || "",
          avatar_url: user.avatar_url || "",
          bio: user.bio || "",
          notes: user.notes || "",
          is_active: user.is_active,
          two_factor_enabled: user.two_factor_enabled,
        }
      : {
          preferred_language: "es",
          is_active: true,
          two_factor_enabled: false,
        },
  });

  const isActive = watch("is_active");
  const twoFactorEnabled = watch("two_factor_enabled");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith("image/")) {
        showToast(
          "Por favor selecciona un archivo de imagen válido",
          "warning"
        );
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast("La imagen no debe exceder 5MB", "warning");
        return;
      }

      // Guardar el archivo y crear preview
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarPreview(base64);
        console.warn(
          "[UserForm] Avatar file selected:",
          file.name,
          file.size,
          file.type
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    setValue("avatar_url", null);
    console.warn("[UserForm] Avatar removed from form");
  };

  const onSubmitForm = async (
    data: UserCreateFormData | UserUpdateFormData
  ) => {
    console.warn("[UserForm] onSubmitForm called:", {
      isEditing,
      isSelfEdit,
      data,
    });

    const cleanedData: Partial<UserCreate | UserUpdate> = {};

    try {
      // Si hay un archivo de avatar, subirlo primero
      let avatarUrl = data.avatar_url;
      if (avatarFile) {
        setIsUploadingAvatar(true);
        try {
          console.warn("[UserForm] Uploading avatar file...");
          const fileResponse = await uploadFile(avatarFile, {
            entity_type: "user",
            entity_id: authUser?.id ?? user?.id ?? undefined,
            description: "Avatar de usuario",
          });
          avatarUrl = fileResponse.data.storage_url;
          console.warn("[UserForm] Avatar uploaded successfully:", avatarUrl);
        } catch (error) {
          console.error("[UserForm] Error uploading avatar:", error);
          showToast(
            "Error al subir el avatar. Por favor intenta nuevamente.",
            "error"
          );
          return;
        } finally {
          setIsUploadingAvatar(false);
        }
      }

      // Sanitize inputs before submission
      // Filter data to only include compatible fields before sanitizing
      const compatibleData: Partial<UserCreate | UserUpdate> = {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        nationality: data.nationality,
        marital_status: data.marital_status,
        job_title: data.job_title,
        department: data.department,
        employee_id: data.employee_id,
        preferred_language: data.preferred_language,
        timezone: data.timezone,
        avatar_url: data.avatar_url,
        bio: data.bio,
        notes: data.notes,
        // is_active and two_factor_enabled are not part of UserCreate | UserUpdate types
        // full_name will be handled separately if needed
      };

      const sanitizedData = sanitizeUserFormData(compatibleData);
      console.warn("[UserForm] Data sanitized:", sanitizedData);

      // finalData is now the sanitized compatible data
      const finalData = sanitizedData;

      // Actualizar avatar_url si se subió un archivo
      if (avatarUrl && avatarUrl !== data.avatar_url) {
        (finalData as Record<string, unknown>).avatar_url = avatarUrl;
        console.warn("[UserForm] Avatar URL added to finalData:", avatarUrl);
      }

      // En modo self-edit, eliminar explícitamente campos prohibidos
      if (isSelfEdit) {
        const forbiddenFields = [
          "first_name",
          "middle_name",
          "last_name",
          "full_name",
          "is_active",
          "two_factor_enabled",
          "email", // El email tampoco debe cambiarse en self-edit
        ];

        forbiddenFields.forEach((field) => {
          delete (cleanedData as Record<string, unknown>)[field];
        });

        console.warn(
          "[UserForm] Forbidden fields removed in self-edit mode:",
          forbiddenFields
        );
      }

      console.warn("[UserForm] Final data to submit:", cleanedData);

      void onSubmit(cleanedData);
      console.warn("[UserForm] onSubmit completed successfully");
    } catch (error: unknown) {
      console.error("[UserForm] Error in onSubmitForm:", error);
      const errObj =
        error && typeof error === "object"
          ? (error as Record<string, unknown>)
          : {};
      if ("response" in errObj) {
        const resp = errObj.response as Record<string, unknown>;
        console.error("[UserForm] Error response details:", {
          status: resp.status,
          statusText: resp.statusText,
          data: resp.data,
        });
      } else if ("request" in errObj) {
        console.error("[UserForm] Error request details:", errObj.request);
      } else if ("message" in errObj) {
        console.error("[UserForm] Error message:", errObj.message);
      }

      // Log the data that was being sent
      console.error("[UserForm] Data that caused error:", cleanedData);
      throw error;
    }
  };

  // Log form state for debugging
  if (Object.keys(errors).length > 0) {
    console.warn("[UserForm] Form validation errors:", errors);
  }

  return (
    <form
      onSubmit={(e) => {
        console.warn("[UserForm] Form submit event triggered");
        e.preventDefault();
        void handleSubmit(onSubmitForm)(e);
      }}
      className="space-y-6"
    >
      {/* Avatar Upload */}
      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                className="w-12 h-12 text-muted-foreground"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          {avatarPreview && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 cursor-pointer hover:bg-destructive/90 transition-colors shadow-lg border-2 border-background"
              title="Eliminar avatar"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        <div className="flex-1">
          <Label className="text-sm font-medium text-foreground">Avatar</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Sube una imagen de perfil. Formatos: JPG, PNG, GIF. Máximo 5MB.
          </p>
          <div className="flex gap-2">
            <label
              htmlFor="avatar-upload"
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-all duration-200 ease-in-out shadow-sm hover:shadow-md ${
                isUploadingAvatar ? "opacity-50 cursor-not-allowed" : ""
              }`}
              style={{
                backgroundColor: isUploadingAvatar
                  ? "hsl(var(--muted))"
                  : "hsl(var(--brand-primary))",
                color: isUploadingAvatar
                  ? "hsl(var(--muted-foreground))"
                  : "hsl(var(--primary-foreground))",
              }}
              onMouseEnter={(e) => {
                if (!isUploadingAvatar) {
                  e.currentTarget.style.backgroundColor =
                    "hsl(var(--brand-primary) / 0.9)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isUploadingAvatar) {
                  e.currentTarget.style.backgroundColor =
                    "hsl(var(--brand-primary))";
                }
              }}
            >
              {isUploadingAvatar ? (
                <>
                  <svg
                    className="w-4 h-4 mr-2 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Subiendo...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Subir Imagen
                </>
              )}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {avatarPreview && (
              <button
                type="button"
                onClick={() => {
                  setAvatarPreview(null);
                  setValue("avatar_url", null);
                  console.warn("[UserForm] Avatar removed from form");
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90 cursor-pointer transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Eliminar
              </button>
            )}
          </div>
        </div>
        {/* Campo oculto para avatar_url */}
        <input type="hidden" {...register("avatar_url")} />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">
          {t("users.email") || "Email"}{" "}
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          disabled={loading || isSubmitting}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Password (only for create) */}
      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="password">
            {t("users.password") || "Contraseña"}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="password"
            type="password"
            {...register("password")}
            disabled={loading || isSubmitting}
          />
          {"password" in errors && errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
      )}

      {/* Name fields - Ocultar en modo self-edit */}
      {!isSelfEdit && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="first_name">
              {t("users.firstName") || "Nombre"}
            </Label>
            <Input
              id="first_name"
              {...register("first_name")}
              disabled={loading || isSubmitting}
              aria-describedby={
                errors.first_name ? "first_name-error" : undefined
              }
            />
            {errors.first_name && (
              <p id="first_name-error" className="text-sm text-destructive">
                {errors.first_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="middle_name">
              {t("users.middleName") || "Segundo Nombre"}
            </Label>
            <Input
              id="middle_name"
              {...register("middle_name")}
              disabled={loading || isSubmitting}
              aria-describedby={
                errors.middle_name ? "middle_name-error" : undefined
              }
            />
            {errors.middle_name && (
              <p id="middle_name-error" className="text-sm text-destructive">
                {errors.middle_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">
              {t("users.lastName") || "Apellido"}
            </Label>
            <Input
              id="last_name"
              {...register("last_name")}
              disabled={loading || isSubmitting}
              aria-describedby={
                errors.last_name ? "last_name-error" : undefined
              }
            />
            {errors.last_name && (
              <p id="last_name-error" className="text-sm text-destructive">
                {errors.last_name.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Personal Information */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">
            {t("users.dateOfBirth") || "Fecha de Nacimiento"}
          </Label>
          <Input
            id="date_of_birth"
            type="date"
            {...register("date_of_birth")}
            disabled={loading || isSubmitting}
            aria-describedby={
              errors.date_of_birth ? "date_of_birth-error" : undefined
            }
          />
          {errors.date_of_birth && (
            <p id="date_of_birth-error" className="text-sm text-destructive">
              {errors.date_of_birth.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">{t("users.gender") || "Género"}</Label>
          <Select
            onValueChange={(value) => setValue("gender", value)}
            defaultValue={watch("gender") || ""}
            disabled={loading || isSubmitting}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t("users.selectGender") || "Seleccionar género"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">
                {t("users.genderMale") || "Masculino"}
              </SelectItem>
              <SelectItem value="female">
                {t("users.genderFemale") || "Femenino"}
              </SelectItem>
              <SelectItem value="other">
                {t("users.genderOther") || "Otro"}
              </SelectItem>
              <SelectItem value="prefer_not_to_say">
                {t("users.genderPreferNotToSay") || "Prefiero no decir"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Professional Information */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="job_title">{t("users.jobTitle") || "Cargo"}</Label>
          <Input
            id="job_title"
            {...register("job_title")}
            disabled={loading || isSubmitting}
            aria-describedby={errors.job_title ? "job_title-error" : undefined}
          />
          {errors.job_title && (
            <p id="job_title-error" className="text-sm text-destructive">
              {errors.job_title.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">
            {t("users.department") || "Departamento"}
          </Label>
          <Input
            id="department"
            {...register("department")}
            disabled={loading || isSubmitting}
            aria-describedby={
              errors.department ? "department-error" : undefined
            }
          />
          {errors.department && (
            <p id="department-error" className="text-sm text-destructive">
              {errors.department.message}
            </p>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="preferred_language">
            {t("users.preferredLanguage") || "Idioma Preferido"}
          </Label>
          <Select
            onValueChange={(value) => setValue("preferred_language", value)}
            defaultValue={watch("preferred_language") || "es"}
            disabled={loading || isSubmitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">
            {t("users.timezone") || "Zona Horaria"}
          </Label>
          <Input
            id="timezone"
            placeholder={t("users.timezonePlaceholder") || "America/Bogota"}
            {...register("timezone")}
            disabled={loading || isSubmitting}
          />
        </div>
      </div>

      {/* Additional fields */}
      <div className="space-y-2">
        <Label htmlFor="bio">{t("users.bio") || "Biografía"}</Label>
        <Textarea
          id="bio"
          {...register("bio")}
          rows={3}
          disabled={loading || isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t("users.notes") || "Notas"}</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          rows={3}
          disabled={loading || isSubmitting}
        />
      </div>

      {/* Status switches - Ocultar en modo self-edit */}
      {isEditing && !isSelfEdit && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">
                {t("users.isActive") || "Usuario Activo"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("users.isActiveDescription") ||
                  "Desactivar un usuario lo deshabilita sin eliminarlo"}
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActive ?? true}
              onCheckedChange={(checked) => setValue("is_active", checked)}
              disabled={loading || isSubmitting}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="two_factor_enabled">
                {t("users.twoFactorEnabled") || "Autenticación de Dos Factores"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("users.twoFactorDescription") ||
                  "Habilitar 2FA para mayor seguridad"}
              </p>
            </div>
            <Switch
              id="two_factor_enabled"
              checked={twoFactorEnabled ?? false}
              onCheckedChange={(checked) =>
                setValue("two_factor_enabled", checked)
              }
              disabled={loading || isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading || isSubmitting}
          >
            {t("users.cancel") || "Cancelar"}
          </Button>
        )}
        <Button type="submit" disabled={loading || isSubmitting}>
          {loading || isSubmitting
            ? t("common.saving") || "Guardando..."
            : isEditing
              ? t("users.updateUser") || "Actualizar Usuario"
              : t("users.createUser") || "Crear Usuario"}
        </Button>
      </div>
    </form>
  );
}
