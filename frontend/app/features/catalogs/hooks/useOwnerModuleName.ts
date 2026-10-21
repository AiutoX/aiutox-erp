/**
 * useOwnerModuleName -- resolves a catalog list's `owner_module` id to a
 * human-readable name for the admin screen.
 *
 * Resolution order:
 *  1. the catalogs i18n group label (`catalogs.admin.groups.<id>`), when one
 *     exists -- business modules cannot add keys under the "catalogs"
 *     namespace, so this only covers the few ids the feature labels itself;
 *  2. the module's display name from the modules store (the same backend
 *     metadata the sidebar uses);
 *  3. the raw module id.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useCallback } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useModulesStore } from "~/stores/modulesStore";

export function useOwnerModuleName(): (ownerModule: string) => string {
  const { t } = useTranslation();
  const modules = useModulesStore((state) => state.modules);

  return useCallback(
    (ownerModule: string) => {
      const key = `catalogs.admin.groups.${ownerModule}`;
      const translated = t(key);
      if (translated && translated !== key) return translated;

      const displayName = modules
        .find((module) => module.id === ownerModule)
        ?.name?.trim();
      return displayName || ownerModule;
    },
    [t, modules]
  );
}
