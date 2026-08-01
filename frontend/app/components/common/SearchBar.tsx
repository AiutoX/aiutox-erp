/**
 * SearchBar - Barra de búsqueda consistente
 *
 * Componente reutilizable para búsquedas en listas y tablas
 */

import { useState, useEffect } from "react";
import { Input } from "~/components/ui/input";
import { SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "~/lib/utils";

export interface SearchBarProps {
  /** Valor de búsqueda */
  value?: string;
  /** Callback cuando cambia el valor */
  onChange?: (value: string) => void;
  /** Placeholder */
  placeholder?: string;
  /** Si está deshabilitado */
  disabled?: boolean;
  /** Debounce en milisegundos (default: 300) */
  debounceMs?: number;
  /** Clases CSS adicionales */
  className?: string;
  /** data-testid para tests */
  "data-testid"?: string;
}

/**
 * Barra de búsqueda con debounce
 */
export function SearchBar({
  value: controlledValue,
  onChange,
  placeholder = "Buscar...",
  disabled = false,
  debounceMs = 300,
  className,
  "data-testid": dataTestId,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(controlledValue || "");

  useEffect(() => {
    setInternalValue(controlledValue || "");
  }, [controlledValue]);

  useEffect(() => {
    if (!onChange) return;

    const timer = setTimeout(() => {
      onChange(internalValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, debounceMs, onChange]);

  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <HugeiconsIcon
          icon={SearchIcon}
          size={20}
          className="text-muted-foreground"
        />
      </div>
      <Input
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={dataTestId}
        className="pl-10"
      />
    </div>
  );
}
