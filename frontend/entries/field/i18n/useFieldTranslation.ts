/**
 * Lightweight i18n hook for AiutoX Field App.
 *
 * Keeps the field app bundle isolated from the main ERP's TanStack Query-based
 * useTranslation (which has a backend API dependency).
 *
 * Language detection order:
 *  1. localStorage 'field_lang' (set from Settings)
 *  2. Navigator language
 *  3. Fallback: 'es'
 */
import { useState, useCallback } from "react";
import esTranslations from "./es";
import enTranslations from "./en";

type SupportedLang = "es" | "en";

const translations: Record<SupportedLang, typeof esTranslations> = {
  es: esTranslations,
  en: enTranslations as unknown as typeof esTranslations,
};

function detectLang(): SupportedLang {
  const stored = localStorage.getItem("field_lang");
  if (stored === "en" || stored === "es") return stored;
  const nav = navigator.language.split("-")[0];
  if (nav === "en") return "en";
  return "es";
}

function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
  vars?: Record<string, string | number>
): string {
  const result = path.split(".").reduce((cur, key) => {
    if (cur && typeof cur === "object" && key in cur) {
      return (cur as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);

  if (typeof result !== "string") return path; // fallback: key itself

  if (!vars) return result;
  return result.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
}

export function useFieldTranslation() {
  const [lang, setLangState] = useState<SupportedLang>(detectLang);

  const setLang = useCallback((newLang: SupportedLang) => {
    localStorage.setItem("field_lang", newLang);
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const dict = translations[lang] ?? translations.es;
      return getNestedValue(
        dict,
        key,
        vars
      );
    },
    [lang]
  );

  return { t, lang, setLang };
}
