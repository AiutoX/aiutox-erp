/**
 * User Quick Actions Preferences
 * Sistema para gestionar preferencias de acciones rápidas por usuario
 */

export interface UserQuickActionsPreferences {
  /** Acciones habilitadas por el usuario */
  enabledActions: string[];
  /** Orden personalizado de acciones */
  customOrder: string[];
  /** Máximo de acciones visibles */
  maxVisible: number;
  /** Preferencias de contexto */
  contextSettings: {
    /** Mostrar acciones contextuales */
    showContextual: boolean;
    /** Contextos habilitados */
    enabledContexts: string[];
  };
}

/**
 * Preferencias por defecto
 */
export const defaultQuickActionsPreferences: UserQuickActionsPreferences = {
  enabledActions: ["new-task", "new-product", "upload-file"],
  customOrder: ["new-task", "new-product", "upload-file"],
  maxVisible: 5,
  contextSettings: {
    showContextual: true,
    enabledContexts: ["products", "files", "tasks"],
  },
};

/**
 * Hook para gestionar preferencias de acciones rápidas
 */
export function useQuickActionsPreferences() {
  // TODO: Implementar con Zustand o Context API
  // Por ahora simulamos con localStorage

  const getPreferences = (): UserQuickActionsPreferences => {
    if (typeof window === "undefined") {
      return defaultQuickActionsPreferences;
    }

    try {
      const saved = localStorage.getItem("quick-actions-preferences");
      return saved ? JSON.parse(saved) : defaultQuickActionsPreferences;
    } catch (error) {
      console.error("Error loading preferences:", error);
      return defaultQuickActionsPreferences;
    }
  };

  const savePreferences = (preferences: UserQuickActionsPreferences): void => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        "quick-actions-preferences",
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  };

  const updatePreferences = (
    updates: Partial<UserQuickActionsPreferences>
  ): void => {
    const current = getPreferences();
    const updated = { ...current, ...updates };
    savePreferences(updated);
  };

  const resetPreferences = (): void => {
    savePreferences(defaultQuickActionsPreferences);
  };

  const isActionEnabled = (actionId: string): boolean => {
    const preferences = getPreferences();
    return preferences.enabledActions.includes(actionId);
  };

  const getActionOrder = (): string[] => {
    const preferences = getPreferences();
    return preferences.customOrder;
  };

  const getMaxVisible = (): number => {
    const preferences = getPreferences();
    return preferences.maxVisible;
  };

  const isContextEnabled = (context: string): boolean => {
    const preferences = getPreferences();
    return preferences.contextSettings.enabledContexts.includes(context);
  };

  return {
    getPreferences,
    savePreferences,
    updatePreferences,
    resetPreferences,
    isActionEnabled,
    getActionOrder,
    getMaxVisible,
    isContextEnabled,
  };
}
