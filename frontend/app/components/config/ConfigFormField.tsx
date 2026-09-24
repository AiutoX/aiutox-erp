/**
 * ConfigFormField - Campo de formulario con label, input, error y validación
 *
 * Componente reutilizable para campos de formulario en páginas de configuración
 */

import type { ReactNode } from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export interface ConfigFormFieldProps {
  /** Label del campo */
  label: string;
  /** ID del input (debe coincidir con htmlFor del label) */
  id: string;
  /** Valor del campo */
  value?: string | number;
  /** Callback cuando cambia el valor */
  onChange?: (value: string) => void;
  /** Tipo de input */
  type?: "text" | "email" | "password" | "number" | "url" | "tel";
  /** Placeholder */
  placeholder?: string;
  /** Si el campo está deshabilitado */
  disabled?: boolean;
  /** Si el campo es requerido */
  required?: boolean;
  /** Mensaje de error */
  error?: string;
  /** Descripción o ayuda del campo */
  description?: string;
  /** Clases CSS adicionales */
  className?: string;
  /** Input personalizado (si se proporciona, se usa en lugar del Input por defecto) */
  input?: ReactNode;
  /** data-testid para tests */
  "data-testid"?: string;
}

/**
 * Campo de formulario para configuración
 */
export function ConfigFormField({
  label,
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  required = false,
  error,
  description,
  className,
  input,
  "data-testid": dataTestId,
}: ConfigFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {input ? (
        <>
          <Label
            id={`${id}-label`}
            className={
              required
                ? "after:content-['*'] after:ml-0.5 after:text-destructive"
                : ""
            }
          >
            {label}
          </Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <div data-testid={dataTestId} aria-labelledby={`${id}-label`}>
            {input}
          </div>
        </>
      ) : (
        <>
          <Label
            htmlFor={id}
            className={
              required
                ? "after:content-['*'] after:ml-0.5 after:text-destructive"
                : ""
            }
          >
            {label}
          </Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          <Input
            id={id}
            type={type}
            value={value ?? ""}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            data-testid={dataTestId}
            className={error ? "border-destructive" : ""}
          />
        </>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
