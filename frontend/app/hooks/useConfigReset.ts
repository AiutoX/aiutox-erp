/**
 * useConfigReset - Hook para resetear cambios a valores originales
 *
 * Proporciona funcionalidad para resetear formularios de configuración
 */

import { useCallback, useState } from "react";
import type { UseConfigFormReturn } from "./useConfigForm";

export interface UseConfigResetOptions<T> {
  /** Hook de formulario */
  form: UseConfigFormReturn<T>;
  /** Callback antes de resetear */
  onBeforeReset?: () => void | Promise<void>;
  /** Callback después de resetear */
  onAfterReset?: () => void | Promise<void>;
  /** Mensaje de confirmación (si se proporciona, muestra confirmación) */
  confirmMessage?: string;
}

export interface UseConfigResetReturn {
  /** Función para resetear */
  reset: () => Promise<void>;
  /** Si está reseteando */
  isResetting: boolean;
}

/**
 * Hook para resetear configuración
 */
export function useConfigReset<T>(
  options: UseConfigResetOptions<T>
): UseConfigResetReturn {
  const { form, onBeforeReset, onAfterReset, confirmMessage } = options;
  const [isResetting, setIsResetting] = useState(false);

  const reset = useCallback(async () => {
    // Mostrar confirmación si se solicita
    if (confirmMessage) {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;
    }

    try {
      setIsResetting(true);
      await onBeforeReset?.();
      form.reset();
      await onAfterReset?.();
    } finally {
      setIsResetting(false);
    }
  }, [form, onBeforeReset, onAfterReset, confirmMessage]);

  return {
    reset,
    isResetting,
  };
}
