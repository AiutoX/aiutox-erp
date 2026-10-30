/**
 * Hook para gestionar acciones rápidas del topbar
 *
 * Combina registro por módulo, filtrado por permisos y contextualización.
 */

import { useMemo } from "react";
import { useLocation } from "react-router";
import { useAuthStore } from "~/stores/authStore";
import {
  quickActionsRegistry,
  type QuickAction,
} from "~/lib/quickActions/registry";
import { useQuickActionsStore } from "~/stores/quickActionsStore";

/**
 * Hook para obtener acciones rápidas filtradas por permisos y contexto
 */
export function useQuickActions(maxResults: number = 5): QuickAction[] {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const { lastUpdate } = useQuickActionsStore();

  return useMemo(() => {
    const userPermissions = user?.permissions || [];
    const currentPath = location.pathname;

    const filteredActions = quickActionsRegistry.filter(
      userPermissions,
      currentPath,
      maxResults
    );

    return filteredActions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.permissions, location.pathname, maxResults, lastUpdate]); // lastUpdate triggers recompute when registry changes
}

/**
 * Hook para verificar si una acción rápida está disponible
 */
export function useQuickActionAvailability(actionId: string): boolean {
  const quickActions = useQuickActions();

  return useMemo(() => {
    return quickActions.some((action) => action.id === actionId);
  }, [quickActions, actionId]);
}

/**
 * Hook para obtener acciones rápidas globales (siempre visibles)
 */
export function useGlobalQuickActions(): QuickAction[] {
  const user = useAuthStore((state) => state.user);

  return useMemo(() => {
    const userPermissions = user?.permissions || [];

    return quickActionsRegistry
      .getAll()
      .filter((action) => {
        // Solo acciones globales
        if (!action.global) {
          return false;
        }

        // Verificar permisos
        return userPermissions.includes(action.permission);
      })
      .sort((a, b) => a.priority - b.priority);
  }, [user?.permissions]);
}
