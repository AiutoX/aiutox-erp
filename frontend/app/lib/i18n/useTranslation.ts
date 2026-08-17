/**
 * Simple i18n hook for translations
 * Provides type-safe access to translation strings
 * Supports multiple languages with fallback to Spanish
 * Integrates with backend general config settings
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "~/lib/api/client";
import type { StandardResponse } from "~/lib/api/types/common.types";
import translations from "./translations";

interface GeneralSettings {
  timezone: string;
  date_format: string;
  time_format: "12h" | "24h";
  currency: string;
  language: string;
}

type SupportedLanguage = "es" | "en";


/**
 * Get nested value from object by dot-notation path
 */
function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): string | undefined {
  const result = path.split(".").reduce(
    (current, key) => {
      if (current && typeof current === "object" && key in current) {
        return current[key] as Record<string, unknown> | string | undefined;
      }
      return undefined;
    },
    obj as Record<string, unknown> | string | undefined
  );

  if (typeof result === "string") {
    return result;
  }

  if (
    result &&
    typeof result === "object" &&
    "__value" in result &&
    typeof result.__value === "string"
  ) {
    return result.__value;
  }

  return undefined;
}

/**
 * Get user's preferred language from backend config, localStorage, or browser settings
 */
function getInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "es";

  // Check localStorage first (for immediate access before backend loads)
  const stored = localStorage.getItem("i18n_language");
  if (stored === "es" || stored === "en") {
    return stored;
  }

  // Fallback to browser language
  const browserLang = navigator.language.split("-")[0];
  return browserLang === "en" ? "en" : "es";
}

/**
 * Hook to access translations
 * Usage: const { t, setLanguage, language } = useTranslation(); t('savedFilters.title')
 *
 * This hook automatically syncs with the backend general config settings.
 * When the language is changed in /config/general, it will update automatically.
 */
export function useTranslation() {
  const [language, setLanguageState] =
    useState<SupportedLanguage>(getInitialLanguage);

  // Fetch general config to get language preference from backend
  const { data: generalConfig } = useQuery({
    queryKey: ["config", "general"],
    queryFn: async () => {
      try {
        const response =
          await apiClient.get<StandardResponse<GeneralSettings>>(
            "/config/general"
          );
        return response.data.data;
      } catch (error) {
        // If backend is not available or user not authenticated, return null
        // This allows the hook to work with localStorage fallback
        console.warn("Could not fetch general config for language:", error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1, // Only retry once
  });

  // Sync language from backend config when available
  useEffect(() => {
    if (generalConfig?.language) {
      const configLang = generalConfig.language.toLowerCase();
      // Only update if it's a supported language
      if (configLang === "es" || configLang === "en") {
        const supportedLang = configLang;
        setLanguageState(supportedLang);
        // Also update localStorage to keep them in sync
        if (typeof window !== "undefined") {
          localStorage.setItem("i18n_language", supportedLang);
        }
      }
    }
  }, [generalConfig?.language]);

  // Get translations based on current language
  const getTranslations = useCallback(() => {
    return language === "en" ? translations.en : translations.es;
  }, [language]);

  // Update language in both localStorage and trigger backend update
  // Note: The actual backend update should be done in config.general.tsx
  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("i18n_language", lang);
    }
  }, []);

  // Translation function with fallback
  const t = useCallback(
    ((key: string): string => {
      const activeTranslations = getTranslations();
      const value = getNestedValue(activeTranslations, key);

      if (!value && language !== "es") {
        const fallbackValue = getNestedValue(translations.es, key);
        if (fallbackValue) {
          return fallbackValue;
        }
      }
      return value || key;
    }),
    [language, getTranslations]
  );

  // Sync with localStorage changes (for multi-tab support)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "i18n_language" && e.newValue) {
        if (e.newValue === "es" || e.newValue === "en") {
          setLanguageState(e.newValue);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Derive number/currency locale from the user's configured currency
  // COP → es-CO, USD → en-US, EUR → es-ES, MXN → es-MX, etc.
  const currency = generalConfig?.currency ?? "COP";
  const numberLocale = (() => {
    const map: Record<string, string> = {
      COP: "es-CO",
      USD: "en-US",
      EUR: "es-ES",
      MXN: "es-MX",
      PEN: "es-PE",
      CLP: "es-CL",
      ARS: "es-AR",
      BRL: "pt-BR",
      GBP: "en-GB",
    };
    return map[currency] ?? "es-CO";
  })();

  return { t, setLanguage, language, currency, numberLocale };
}
