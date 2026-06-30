/**
 * Sistema de traducciones con autodescubrimiento de módulos
 * Implementa Fase 2: Sistema de Autodescubrimiento
 */

// Importar traducciones comunes
import { translations as commonEn } from "./common/en";
import { translations as commonEs } from "./common/es";

// Importar traducciones legacy existentes
import { translations as enTranslations } from "./en";
import { translations as esTranslations } from "./es";
import { searchTranslations as enSearchTranslations } from "./search.en";
import { searchTranslations as esSearchTranslations } from "./search.es";

// Tipo para claves anidadas
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

// Interfaz para traducciones de módulo
interface ModuleTranslations {
  [key: string]: {
    es: Record<string, unknown>;
    en: Record<string, unknown>;
  };
}

interface ModuleTranslationFile {
  translations?: Record<string, unknown>;
  default?: Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Converts flat dot-notation keys to nested objects.
 * e.g. { "billing.title": "X" } → { billing: { title: "X" } }
 * Already-nested objects pass through unchanged.
 */
function flatToNested(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (key.includes(".") && typeof value === "string") {
      const parts = key.split(".");
      let cur = result;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]!;
        if (!isPlainObject(cur[part])) cur[part] = {};
        cur = cur[part] as Record<string, unknown>;
      }
      cur[parts[parts.length - 1]!] = value;
    } else {
      // Already nested or non-string value — merge as-is
      if (isPlainObject(value) && isPlainObject(result[key])) {
        result[key] = deepMergeRecords(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

function deepMergeRecords(
  base: Record<string, unknown>,
  extra: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, extraValue] of Object.entries(extra)) {
    const baseValue = result[key];

    if (isPlainObject(baseValue) && isPlainObject(extraValue)) {
      result[key] = deepMergeRecords(baseValue, extraValue);
      continue;
    }

    result[key] = extraValue;
  }

  return result;
}

// Descubrir y cargar traducciones de módulos
const loadModuleTranslations = (): ModuleTranslations => {
  const modules: ModuleTranslations = {};

  try {
    // Usar Vite's import.meta.glob para descubrir archivos de módulos
    const moduleFiles = import.meta.glob("../../../features/**/i18n/*.ts", {
      eager: true,
    });

    for (const path in moduleFiles) {
      const matches = path.match(/features\/([^/]+)\/i18n\/(.+)\.ts$/);
      if (matches) {
        const moduleName = matches[1];
        const lang = matches[2];

        if (moduleName && lang) {
          const moduleBucket = modules[moduleName] ?? { es: {}, en: {} };
          modules[moduleName] = moduleBucket;

          if (lang === "es" || lang === "en") {
            const fileModule = moduleFiles[path] as ModuleTranslationFile;
            const raw = fileModule.translations ?? fileModule.default ?? {};
            moduleBucket[lang] = flatToNested(raw);
          }
        }
      }
    }
  } catch (error) {
    // Si import.meta.glob no está disponible o hay error, usar objeto vacío
    console.warn(
      "No se pudieron cargar traducciones de módulos automáticamente:",
      error
    );
  }

  return modules;
};

// Cargar traducciones de módulos
const moduleTranslations = loadModuleTranslations();

function mergeModuleTranslationsByLanguage(
  language: "es" | "en"
): Record<string, unknown> {
  return Object.values(moduleTranslations).reduce<Record<string, unknown>>(
    (acc, trans) => {
      return deepMergeRecords(acc, trans[language] ?? {});
    },
    {}
  );
}

const mergedModuleEn = mergeModuleTranslationsByLanguage("en");
const mergedModuleEs = mergeModuleTranslationsByLanguage("es");

const enBase = {
  ...commonEn,
  ...enTranslations,
  search: {
    ...enTranslations.search,
    ...enSearchTranslations,
  },
  common: {
    ...commonEn,
    ...enTranslations.common,
    ...enSearchTranslations.common,
  },
  // Direct task translations (priority keys)
  "tasks.filtersAssignedToPlaceholder": "Filter by assignee...",
  "tasks.advancedFilters": "Advanced Filters",
  "tasks.status.title": "Status",
  "tasks.priority.title": "Priority",
};

const esBase = {
  ...commonEs,
  ...esTranslations,
  search: {
    ...esTranslations.search,
    ...esSearchTranslations,
  },
  common: {
    ...commonEs,
    ...esTranslations.common,
    ...esSearchTranslations.common,
  },
};

// Consolidar todas las traducciones
const translations = {
  en: deepMergeRecords(enBase, mergedModuleEn),
  es: deepMergeRecords(esBase, mergedModuleEs),
} as const;

export default translations;
export type TranslationPath = NestedKeyOf<typeof translations.es>;
