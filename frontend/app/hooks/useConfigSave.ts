/**
 * useConfigSave - Hook para guardar configuración con optimistic updates
 *
 * Proporciona funcionalidad para guardar configuración con actualizaciones optimistas
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { showToast } from "~/components/common/Toast";

export interface UseConfigSaveOptions<T> {
  /** Query key para invalidar cache después de guardar */
  queryKey: string[];
  /** Función para guardar la configuración */
  saveFn: (values: T) => Promise<T>;
  /** Mensaje de éxito */
  successMessage?: string;
  /** Mensaje de error */
  errorMessage?: string;
  /** Callback después de guardar exitosamente */
  onSuccess?: (data: T) => void;
  /** Callback en caso de error */
  onError?: (error: Error) => void;
}

export interface UseConfigSaveReturn<T> {
  /** Función para guardar */
  save: (values: T) => Promise<void>;
  /** Si está guardando */
  isSaving: boolean;
  /** Error al guardar */
  error: Error | null;
}

/**
 * Hook para guardar configuración con optimistic updates
 */
export function useConfigSave<T>({
  queryKey,
  saveFn,
  successMessage = "Configuración guardada exitosamente",
  errorMessage = "Error al guardar la configuración",
  onSuccess,
  onError,
}: UseConfigSaveOptions<T>): UseConfigSaveReturn<T> {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: saveFn,
    onMutate: async (newValues) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({ queryKey });

      // Snapshot del valor anterior
      const previousValues = queryClient.getQueryData<T>(queryKey);

      // Optimistic update
      queryClient.setQueryData<T>(queryKey, newValues);

      return { previousValues };
    },
    onError: (error: Error, _newValues, context) => {
      // Revertir optimistic update en caso de error
      if (context?.previousValues) {
        queryClient.setQueryData<T>(queryKey, context.previousValues);
      }
      showToast(errorMessage, "error");
      onError?.(error);
    },
    onSuccess: (data) => {
      // Invalidar y refetch para asegurar sincronización
      void queryClient.invalidateQueries({ queryKey });
      showToast(successMessage, "success");
      onSuccess?.(data);
    },
    onSettled: () => {
      // Asegurar que los datos estén sincronizados
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const save = useCallback(
    async (values: T) => {
      await mutation.mutateAsync(values);
    },
    [mutation]
  );

  return {
    save,
    isSaving: mutation.isPending,
    error: mutation.error,
  };
}
