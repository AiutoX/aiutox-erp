/**
 * ContactMethodForm Component
 *
 * Form for creating/editing contact methods
 */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import type { ContactMethod, ContactMethodType } from "../types/user.types";

interface ContactMethodFormProps {
  method?: ContactMethod | null;
  onSubmit: (data: {
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
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * ContactMethodForm component
 */
export function ContactMethodForm({
  method,
  onSubmit,
  onCancel,
  loading = false,
}: ContactMethodFormProps) {
  const isEditing = !!method;
  const [methodType, setMethodType] = useState<ContactMethodType>(
    method?.method_type || "email"
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<{
    method_type: ContactMethodType;
    value: string;
    label: string;
    is_primary: boolean;
    address_line1: string;
    address_line2: string;
    city: string;
    state_province: string;
    postal_code: string;
    country: string;
  }>({
    defaultValues: method
      ? {
          method_type: method.method_type,
          value: method.value,
          label: method.label || "",
          is_primary: method.is_primary,
          address_line1: method.address_line1 || "",
          address_line2: method.address_line2 || "",
          city: method.city || "",
          state_province: method.state_province || "",
          postal_code: method.postal_code || "",
          country: method.country || "",
        }
      : {
          method_type: "email",
          value: "",
          label: "",
          is_primary: false,
          address_line1: "",
          address_line2: "",
          city: "",
          state_province: "",
          postal_code: "",
          country: "",
        },
  });

  const isPrimary = watch("is_primary");

  useEffect(() => {
    if (method) {
      setMethodType(method.method_type);
    }
  }, [method]);

  const onSubmitForm = async (data: {
    method_type?: ContactMethodType;
    value?: string | null;
    label?: string | null;
    is_primary?: boolean | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state_province?: string | null;
    postal_code?: string | null;
    country?: string | null;
  }) => {
    await onSubmit(data);
  };

  const isAddress = methodType === "address";

  return (
    <form
      onSubmit={handleSubmit(onSubmitForm)}
      className="space-y-4 rounded-md border p-4"
    >
      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="method_type">Tipo de Método</Label>
          <Select
            value={methodType}
            onValueChange={(value) => {
              setMethodType(value as ContactMethodType);
              setValue("method_type", value as ContactMethodType);
            }}
            disabled={loading || isSubmitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Teléfono</SelectItem>
              <SelectItem value="mobile">Móvil</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="address">Dirección</SelectItem>
              <SelectItem value="website">Sitio Web</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {!isAddress ? (
        <div className="space-y-2">
          <Label htmlFor="value">
            {methodType === "email"
              ? "Email"
              : methodType === "website"
                ? "URL"
                : "Número"}
          </Label>
          <Input
            id="value"
            type={
              methodType === "email"
                ? "email"
                : methodType === "website"
                  ? "url"
                  : "tel"
            }
            {...register("value", { required: "Este campo es requerido" })}
            disabled={loading || isSubmitting}
          />
          {errors.value && (
            <p className="text-sm text-destructive">
              {errors.value.message as string}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address_line1">Dirección Línea 1 *</Label>
            <Input
              id="address_line1"
              {...register("address_line1", {
                required: "Este campo es requerido",
              })}
              disabled={loading || isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_line2">Dirección Línea 2</Label>
            <Input
              id="address_line2"
              {...register("address_line2")}
              disabled={loading || isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                {...register("city", { required: "Este campo es requerido" })}
                disabled={loading || isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state_province">Estado/Provincia</Label>
              <Input
                id="state_province"
                {...register("state_province")}
                disabled={loading || isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Código Postal</Label>
              <Input
                id="postal_code"
                {...register("postal_code")}
                disabled={loading || isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">País *</Label>
              <Input
                id="country"
                placeholder="CO"
                maxLength={2}
                {...register("country", {
                  required: "Este campo es requerido",
                })}
                disabled={loading || isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="label">Etiqueta (opcional)</Label>
        <Input
          id="label"
          placeholder="Trabajo, Personal, etc."
          {...register("label")}
          disabled={loading || isSubmitting}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="is_primary">Método Principal</Label>
          <p className="text-sm text-muted-foreground">
            Marcar como método de contacto principal
          </p>
        </div>
        <Switch
          id="is_primary"
          checked={isPrimary ?? false}
          onCheckedChange={(checked) => setValue("is_primary", checked)}
          disabled={loading || isSubmitting}
        />
      </div>

      <div className="flex items-center justify-end gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading || isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || isSubmitting}>
          {loading || isSubmitting
            ? "Guardando..."
            : isEditing
              ? "Actualizar"
              : "Agregar"}
        </Button>
      </div>
    </form>
  );
}
