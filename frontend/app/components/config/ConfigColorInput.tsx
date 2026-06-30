/**
 * ConfigColorInput - Input de color con preview y validación hexadecimal
 *
 * Componente para seleccionar colores en configuración de tema
 */

import { useState, useEffect } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

export interface ConfigColorInputProps {
  /** Label del campo */
  label: string;
  /** ID del input */
  id: string;
  /** Valor del color (hexadecimal) */
  value?: string;
  /** Callback cuando cambia el valor */
  onChange?: (value: string) => void;
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
  /** data-testid para tests */
  "data-testid"?: string;
}

/**
 * Valida si un string es un color hexadecimal válido
 */
function isValidHexColor(value: string): boolean {
  if (!value) return false;
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(value);
}

/**
 * Normaliza un color hexadecimal (agrega # si falta, convierte a mayúsculas)
 */
function normalizeHexColor(value: string): string {
  if (!value) return "";
  let normalized = value.trim();
  if (!normalized.startsWith("#")) {
    normalized = `#${normalized}`;
  }
  return normalized.toUpperCase();
}

/**
 * Input de color para configuración
 */
export function ConfigColorInput({
  label,
  id,
  value = "",
  onChange,
  disabled = false,
  required = false,
  error,
  description,
  className,
  "data-testid": dataTestId,
}: ConfigColorInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setInputValue(value);
    setIsValid(!value || isValidHexColor(value));
  }, [value]);

  const handleChange = (newValue: string) => {
    setInputValue(newValue);
    const normalized = normalizeHexColor(newValue);
    const valid = !newValue || isValidHexColor(normalized);
    setIsValid(valid);

    if (valid && normalized) {
      onChange?.(normalized);
    } else if (!newValue) {
      onChange?.("");
    }
  };

  const handleBlur = () => {
    if (inputValue && !isValidHexColor(inputValue)) {
      // Intentar normalizar
      const normalized = normalizeHexColor(inputValue);
      if (isValidHexColor(normalized)) {
        setInputValue(normalized);
        onChange?.(normalized);
        setIsValid(true);
      }
    }
  };

  const showError = error || (!isValid && inputValue);

  return (
    <div className={cn("space-y-2", className)}>
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
      <div className="grid grid-cols-[64px_1fr] items-center gap-3">
        {/* Color picker nativo */}
        <input
          type="color"
          id={`${id}-picker`}
          value={isValid && inputValue ? inputValue : "#000000"}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="h-10 w-16 cursor-pointer rounded border border-input disabled:cursor-not-allowed disabled:opacity-50"
          data-testid={dataTestId ? `${dataTestId}-picker` : undefined}
        />
        {/* Input de texto para valor hexadecimal */}
        <Input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="#000000"
          disabled={disabled}
          required={required}
          data-testid={dataTestId}
          className={cn("font-mono", showError ? "border-destructive" : "")}
        />
      </div>
      {showError && (
        <p className="text-sm text-destructive" role="alert">
          {error || "Color hexadecimal inválido (formato: #RRGGBB o #RGB)"}
        </p>
      )}
    </div>
  );
}
