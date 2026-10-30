/**
 * Modules Store (Zustand)
 *
 * Manages module state with encrypted persistence.
 * Integrates with ModuleRegistry for discovery and caching.
 */

import { create } from "zustand";
import type { FrontendModule, NavigationTree } from "../lib/modules/types";
import { moduleRegistry } from "../lib/modules/registry";
import {
  cacheModuleData,
  getCachedModuleData as _getCachedModuleData,
  clearExpiredCache,
} from "../lib/storage/moduleCache";
import { useAuthStore } from "./authStore";

interface ModulesState {
  /** Registered modules */
  modules: FrontendModule[];
  /** Navigation tree (3-level hierarchy) */
  navigationTree: NavigationTree | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether modules have been loaded */
  isInitialized: boolean;

  /** Load modules from backend and cache */
  loadModules: () => Promise<void>;
  /** Register a module locally */
  registerModule: (module: FrontendModule) => void;
  /** Clear expired cache entries */
  clearExpiredCache: () => Promise<number>;
  /** Clear all modules and cache */
  clear: () => Promise<void>;
  /** Refresh modules from backend */
  refresh: () => Promise<void>;
}

export const useModulesStore = create<ModulesState>((set, get) => ({
  modules: [],
  navigationTree: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  loadModules: async () => {
    const state = get();
    if (state.isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Discover modules from backend (with cache)
      const modules = await moduleRegistry.discoverModules();

      // Build navigation tree (includes static items from navigation.ts)
      const navigationTree = moduleRegistry.getNavigationTree();

      // Update state
      set({
        modules,
        navigationTree,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
    } catch (error) {
      console.error("Failed to load modules:", error);

      // ✅ IMPORTANTE: Incluso si falla, construir árbol con items estáticos
      try {
        const navigationTree = moduleRegistry.getNavigationTree();
        set({
          modules: [], // Sin módulos del backend
          navigationTree, // Pero SÍ con items estáticos de navigation.ts
          isLoading: false,
          isInitialized: true,
          error:
            error instanceof Error
              ? error
              : new Error("Failed to load modules"),
        });
      } catch {
        // Si hasta esto falla, al menos marcar como inicializado
        set({
          isLoading: false,
          isInitialized: true, // ← Marcar como inicializado para no reintentar
          error:
            error instanceof Error
              ? error
              : new Error("Failed to load modules"),
        });
      }
    }
  },

  registerModule: (module: FrontendModule) => {
    // Register in registry
    moduleRegistry.registerModule(module);

    // Update state
    const modules = [...get().modules];
    const existingIndex = modules.findIndex((m) => m.id === module.id);
    if (existingIndex >= 0) {
      modules[existingIndex] = module;
    } else {
      modules.push(module);
    }

    // Rebuild navigation tree
    const navigationTree = moduleRegistry.getNavigationTree();

    set({ modules, navigationTree });

    // Cache the updated modules
    const user = useAuthStore.getState().user;
    if (user?.id) {
      cacheModuleData(user.id, modules).catch((error) => {
        console.warn("Failed to cache modules:", error);
      });
    }
  },

  clearExpiredCache: async () => {
    try {
      const clearedCount = await clearExpiredCache();
      return clearedCount;
    } catch (error) {
      console.error("Failed to clear expired cache:", error);
      return 0;
    }
  },

  clear: async () => {
    await moduleRegistry.clear();
    set({
      modules: [],
      navigationTree: null,
      isInitialized: false,
      error: null,
    });
  },

  refresh: async () => {
    // Clear current state
    await get().clear();

    // Reload modules
    await get().loadModules();
  },
}));

/**
 * Initialize modules on app startup
 *
 * Should be called once when the app loads
 */
export async function initializeModules(): Promise<void> {
  const store = useModulesStore.getState();

  // Clear expired cache first
  await store.clearExpiredCache();

  // Load modules
  await store.loadModules();
}
