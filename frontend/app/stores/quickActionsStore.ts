/**
 * Quick Actions Store - Zustand
 * Estado global para acciones rápidas y notificaciones
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { QuickAction } from "~/lib/quickActions/registry";

interface QuickActionsStore {
  // Estado
  actions: Map<string, QuickAction>;
  isInitialized: boolean;
  lastUpdate: number;

  // Acciones
  registerAction: (action: QuickAction) => void;
  unregisterAction: (id: string) => void;
  clearActions: () => void;
  initializeActions: (actions: QuickAction[]) => void;
  getAllActions: () => QuickAction[];
  getAction: (id: string) => QuickAction | undefined;
  getActionsCount: () => number;

  // Notificaciones
  incrementVersion: () => void;
}

export const useQuickActionsStore = create<QuickActionsStore>()(
  devtools(
    (set, get) => ({
      // Estado inicial
      actions: new Map(),
      isInitialized: false,
      lastUpdate: Date.now(),

      // Acciones del store

      /**
       * Registra una nueva acción en el store
       * @param action - Acción a registrar
       */
      registerAction: (action) => {
        set((state) => {
          const newActions = new Map(state.actions);
          newActions.set(action.id, action);
          state.lastUpdate = Date.now();
          return {
            ...state,
            actions: newActions,
          };
        });
      },

      /**
       * Elimina una acción del store
       * @param id - ID de la acción a eliminar
       */
      unregisterAction: (id) => {
        set((state) => {
          const newActions = new Map(state.actions);
          newActions.delete(id);
          state.lastUpdate = Date.now();
          return {
            ...state,
            actions: newActions,
          };
        });
      },

      /**
       * Limpia todas las acciones del store
       */
      clearActions: () => {
        set((state) => ({
          ...state,
          actions: new Map(),
          lastUpdate: Date.now(),
        }));
      },

      /**
       * Inicializa el store con un conjunto de acciones
       * @param actions - Array de acciones a inicializar
       */
      initializeActions: (actions) => {
        const newActions = new Map();
        actions.forEach((action) => {
          newActions.set(action.id, action);
        });

        set((state) => ({
          ...state,
          actions: newActions,
          isInitialized: true,
          lastUpdate: Date.now(),
        }));
      },

      /**
       * Obtiene todas las acciones del store como array
       * @returns Array de acciones registradas
       */
      getAllActions: () => {
        return Array.from(get().actions.values());
      },

      /**
       * Obtiene una acción específica por ID
       * @param id - ID de la acción a buscar
       * @returns La acción encontrada o undefined
       */
      getAction: (id) => {
        return get().actions.get(id);
      },

      /**
       * Obtiene el número de acciones registradas
       * @returns Número total de acciones
       */
      getActionsCount: () => {
        return get().actions.size;
      },

      // Notificaciones para forzar actualizaciones

      /**
       * Incrementa la versión del store para forzar actualizaciones
       * Útil para notificar cambios a componentes suscritos
       */
      incrementVersion: () => {
        set((state) => ({
          ...state,
          lastUpdate: Date.now(),
        }));
      },
    }),
    {
      name: "quick-actions-store",
    }
  )
);
