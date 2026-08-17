/**
 * Hook for persisting dashboard widget preferences server-side via
 * GET/PUT /api/v1/users/me/widgets.
 */

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { putMyWidgets } from "../api/widgets.api";
import { useAvailableWidgets, useMyWidgets } from "./useWidgets";
import type { WidgetPreferenceBatchItem } from "../types/widgets-api.types";

export interface UseWidgetPreferencesResult {
  enabledWidgets: string[];
  toggleWidget: (id: string) => void;
  resetToDefaults: () => void;
}

export function useWidgetPreferences(): UseWidgetPreferencesResult {
  const queryClient = useQueryClient();
  const { data: availableData } = useAvailableWidgets();
  const { data: myWidgetsData } = useMyWidgets();

  const availableWidgets = useMemo(
    () => availableData?.data ?? [],
    [availableData]
  );

  const enabledWidgets = useMemo(
    () => (myWidgetsData?.data ?? []).map((p) => p.widget_id),
    [myWidgetsData]
  );

  const persist = useCallback(
    (widgetIds: string[]) => {
      const items: WidgetPreferenceBatchItem[] = widgetIds.map((widget_id) => {
        const manifest = availableWidgets.find((w) => w.widget_id === widget_id);
        return {
          widget_id,
          width: manifest?.width ?? 4,
          height: manifest?.height ?? 2,
        };
      });
      void putMyWidgets(items).then(() => {
        void queryClient.invalidateQueries({ queryKey: ["widgets", "my-widgets"] });
      });
    },
    [availableWidgets, queryClient]
  );

  const toggleWidget = useCallback(
    (id: string) => {
      const next = enabledWidgets.includes(id)
        ? enabledWidgets.filter((w) => w !== id)
        : [...enabledWidgets, id];
      persist(next);
    },
    [enabledWidgets, persist]
  );

  const resetToDefaults = useCallback(() => {
    const defaults = availableWidgets
      .filter((w) => w.default_enabled)
      .map((w) => w.widget_id);
    persist(defaults);
  }, [availableWidgets, persist]);

  return { enabledWidgets, toggleWidget, resetToDefaults };
}
