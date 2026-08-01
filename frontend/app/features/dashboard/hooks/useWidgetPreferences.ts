/**
 * Hook for persisting dashboard widget preferences per user via localStorage.
 * TODO: Replace localStorage with GET/PUT /api/v1/preferences/dashboard when that
 *       endpoint is implemented in the backend.
 */

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "~/stores/authStore";
import { WIDGET_REGISTRY } from "../widget-registry";

const STORAGE_KEY_PREFIX = "aiutox-dashboard-widgets-";

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function getDefaultEnabled(): string[] {
  return WIDGET_REGISTRY.filter((w) => w.defaultEnabled).map((w) => w.id);
}

function loadPreferences(userId: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return getDefaultEnabled();
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed as string[];
    return getDefaultEnabled();
  } catch {
    return getDefaultEnabled();
  }
}

function savePreferences(userId: string, enabledWidgets: string[]): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(enabledWidgets));
  } catch {
    // Ignore storage errors (e.g. private browsing quota)
  }
}

export interface UseWidgetPreferencesResult {
  enabledWidgets: string[];
  toggleWidget: (id: string) => void;
  resetToDefaults: () => void;
}

export function useWidgetPreferences(): UseWidgetPreferencesResult {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "anonymous";

  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(() =>
    loadPreferences(userId)
  );

  // Re-load when userId changes (e.g. after login)
  useEffect(() => {
    setEnabledWidgets(loadPreferences(userId));
  }, [userId]);

  const toggleWidget = useCallback(
    (id: string) => {
      setEnabledWidgets((prev) => {
        const next = prev.includes(id)
          ? prev.filter((w) => w !== id)
          : [...prev, id];
        savePreferences(userId, next);
        return next;
      });
    },
    [userId]
  );

  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultEnabled();
    savePreferences(userId, defaults);
    setEnabledWidgets(defaults);
  }, [userId]);

  return { enabledWidgets, toggleWidget, resetToDefaults };
}
