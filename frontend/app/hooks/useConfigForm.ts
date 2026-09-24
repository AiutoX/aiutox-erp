/**
 * useConfigForm - Hook para manejo de formularios de configuración con validación
 *
 * Proporciona estado y validación para formularios de configuración
 */

import { useState, useCallback, useMemo } from "react";
import { z } from "zod";

export interface UseConfigFormOptions<T> {
  /** Valores iniciales del formulario */
  initialValues: T;
  /** Esquema de validación Zod */
  schema?: z.ZodSchema<T>;
  /** Callback cuando cambian los valores */
  onChange?: (values: T, hasChanges: boolean) => void;
}

export interface UseConfigFormReturn<T> {
  /** Valores actuales del formulario */
  values: T;
  /** Valores originales (para reset) */
  originalValues: T;
  /** Si hay cambios sin guardar */
  hasChanges: boolean;
  /** Errores de validación */
  errors: Partial<Record<keyof T, string>>;
  /** Si el formulario es válido */
  isValid: boolean;
  /** Actualizar un campo */
  setValue: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Actualizar múltiples campos */
  setValues: (values: Partial<T>) => void;
  /** Resetear a valores originales */
  reset: () => void;
  /** Validar el formulario */
  validate: () => boolean;
  /** Resetear valores originales (útil después de guardar) */
  updateOriginalValues: (newValues: T) => void;
}

/**
 * Hook para manejo de formularios de configuración
 */
export function useConfigForm<T extends Record<string, unknown>>({
  initialValues,
  schema,
  onChange,
}: UseConfigFormOptions<T>): UseConfigFormReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [originalValues, setOriginalValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  // Calcular si hay cambios
  const hasChanges = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(originalValues);
  }, [values, originalValues]);

  // Validar el formulario
  const validate = useCallback((): boolean => {
    if (!schema) {
      setErrors({});
      return true;
    }

    try {
      schema.parse(values);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof T, string>> = {};
        error.errors.forEach((err) => {
          const path = err.path[0] as keyof T;
          if (path) {
            newErrors[path] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  }, [values, schema]);

  // Actualizar un campo
  const setValue = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setValuesState((prev) => {
        const newValues = { ...prev, [key]: value };
        onChange?.(
          newValues,
          JSON.stringify(newValues) !== JSON.stringify(originalValues)
        );
        return newValues;
      });
      // Limpiar error del campo si existe
      if (errors[key]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    },
    [onChange, originalValues, errors]
  );

  // Actualizar múltiples campos
  const setValues = useCallback(
    (newValues: Partial<T>) => {
      setValuesState((prev) => {
        const updated = { ...prev, ...newValues };
        onChange?.(
          updated,
          JSON.stringify(updated) !== JSON.stringify(originalValues)
        );
        return updated;
      });
    },
    [onChange, originalValues]
  );

  // Resetear a valores originales
  const reset = useCallback(() => {
    setValuesState(originalValues);
    setErrors({});
    onChange?.(originalValues, false);
  }, [originalValues, onChange]);

  // Actualizar valores originales (después de guardar)
  const updateOriginalValues = useCallback(
    (newValues: T) => {
      setOriginalValues(newValues);
      setValuesState(newValues);
      setErrors({});
      onChange?.(newValues, false);
    },
    [onChange]
  );

  // Validar automáticamente cuando cambian los valores
  const isValid = useMemo(() => {
    if (!schema) return true;
    try {
      schema.parse(values);
      return Object.keys(errors).length === 0;
    } catch {
      return false;
    }
  }, [values, schema, errors]);

  return {
    values,
    originalValues,
    hasChanges,
    errors,
    isValid,
    setValue,
    setValues,
    reset,
    validate,
    updateOriginalValues,
  };
}
