/**
 * Navigation hooks
 *
 * Provides hooks for hierarchical navigation with permission-based filtering.
 * Supports 3-level navigation: Category → Module → Items
 */

import { useMemo } from "react";
import { useLocation } from "react-router";
import { useModulesStore } from "../stores/modulesStore";
import { usePermissions } from "./usePermissions";
import { useTaskModuleSettings } from "~/features/tasks/hooks/useTasks";
import type {
  NavigationTree,
  NavigationItem,
  CategoryNode,
  ModuleNode,
} from "../lib/modules/types";

/**
 * Hook to get complete navigation tree
 *
 * Returns the full navigation tree with all categories, modules, and items.
 * Items are filtered by user permissions.
 */
export function useNavigation(): NavigationTree | null {
  const { navigationTree } = useModulesStore();
  const { permissions, hasPermission, hasAnyPermission } = usePermissions();
  const { data: taskSettingsData } = useTaskModuleSettings();
  const taskSettings = taskSettingsData?.data;

  return useMemo(() => {
    if (!navigationTree) {
      return null;
    }

    const hasWildcardPermission = permissions.includes("*");
    if (hasWildcardPermission) {
      return navigationTree;
    }

    const isItemEnabledBySettings = (item: NavigationItem) => {
      if (!item.requiresModuleSetting) {
        return true;
      }

      const { module, key, value = true } = item.requiresModuleSetting;
      if (module === "tasks") {
        if (!taskSettings) {
          return false;
        }
        const settingsMap: Record<string, boolean | undefined> = {
          "calendar.enabled": taskSettings.calendar_enabled,
          "board.enabled": taskSettings.board_enabled,
          "inbox.enabled": taskSettings.inbox_enabled,
          "list.enabled": taskSettings.list_enabled,
          "stats.enabled": taskSettings.stats_enabled,
        };
        return settingsMap[key] === value;
      }

      return true;
    };

    // Filter navigation tree by permissions
    const filteredCategories = new Map<string, CategoryNode>();

    for (const [categoryName, categoryNode] of navigationTree.categories) {
      // Check if category has requiresAnyPermission
      const requiresAnyPerm = categoryNode.requiresAnyPermission;
      if (requiresAnyPerm && requiresAnyPerm.length > 0) {
        // Check if user has at least one of the required permissions
        const hasAny = hasAnyPermission(requiresAnyPerm);
        if (!hasAny) {
          continue; // Skip this category
        }
      }

      const filteredModules = new Map<string, ModuleNode>();

      for (const [moduleId, moduleNode] of categoryNode.modules) {
        // Check module-level permission
        if (moduleNode.permission && !hasPermission(moduleNode.permission)) {
          continue;
        }

        // Filter items by permissions
        const filteredItems = moduleNode.items.filter((item) => {
          if (!item.permission) {
            return isItemEnabledBySettings(item);
          }
          const hasItemPerm = hasPermission(item.permission);
          return hasItemPerm && isItemEnabledBySettings(item);
        });

        // Only include module if it has visible items
        if (filteredItems.length > 0) {
          filteredModules.set(moduleId, {
            ...moduleNode,
            items: filteredItems,
          });
        }
      }

      // Only include category if it has visible modules
      if (filteredModules.size > 0) {
        filteredCategories.set(categoryName, {
          ...categoryNode,
          modules: filteredModules,
        });
      }
    }

    // Build filtered allItems list
    const allItems: NavigationItem[] = [];
    for (const categoryNode of filteredCategories.values()) {
      for (const moduleNode of categoryNode.modules.values()) {
        allItems.push(...moduleNode.items);
      }
    }

    return {
      categories: filteredCategories,
      allItems,
    };
  }, [
    navigationTree,
    permissions,
    hasPermission,
    hasAnyPermission,
    taskSettings,
  ]);
}

/**
 * Hook to get navigation grouped by category
 *
 * Returns navigation items organized by category for easier rendering.
 */
export function useNavigationByCategory(): Map<string, CategoryNode> | null {
  const navigationTree = useNavigation();

  return useMemo(() => {
    if (!navigationTree) {
      return null;
    }

    return navigationTree.categories;
  }, [navigationTree]);
}

/**
 * Hook to get flat list of navigation items
 *
 * Returns a flat list of all navigation items (filtered by permissions).
 * Useful for simple navigation lists.
 */
export function useNavigationItems(): NavigationItem[] {
  const navigationTree = useNavigation();

  return useMemo(() => {
    if (!navigationTree) {
      return [];
    }

    return navigationTree.allItems;
  }, [navigationTree]);
}

/**
 * Hook to get active navigation item
 *
 * Determines which navigation item is currently active based on the current route.
 */
export function useActiveNavigationItem(): NavigationItem | null {
  const location = useLocation();
  const navigationItems = useNavigationItems();

  return useMemo(() => {
    // Find exact match first
    const exactMatch = navigationItems.find(
      (item) => item.to === location.pathname
    );
    if (exactMatch) {
      return exactMatch;
    }

    // Find prefix match (for nested routes)
    // But ensure it's a proper path segment (not just a prefix match)
    const prefixMatch = navigationItems.find((item) => {
      if (item.to === "/") {
        return false; // Don't match root for nested routes
      }
      if (location.pathname.startsWith(item.to)) {
        // Ensure it's a proper path segment by checking the next character
        const nextChar = location.pathname[item.to.length];
        return nextChar === undefined || nextChar === "/" || nextChar === "?";
      }
      return false;
    });

    return prefixMatch || null;
  }, [location.pathname, navigationItems]);
}

/**
 * Hook to check if a navigation item is active
 *
 * @param item - Navigation item to check
 */
export function useIsNavigationItemActive(item: NavigationItem): boolean {
  const location = useLocation();
  const { navigationTree } = useModulesStore();

  const allNavPaths = useMemo(() => {
    if (!navigationTree) return [];
    const paths: string[] = [];
    for (const cat of navigationTree.categories.values()) {
      for (const mod of cat.modules.values()) {
        for (const navItem of mod.items) {
          if (navItem.to) paths.push(navItem.to);
        }
      }
    }
    return paths;
  }, [navigationTree]);

  return useMemo(() => {
    if (location.pathname === item.to) return true;
    if (item.to !== "/" && location.pathname.startsWith(item.to)) {
      const nextChar = location.pathname[item.to.length];
      if (nextChar === undefined || nextChar === "?" || nextChar === "#") return true;
      if (nextChar === "/") {
        const remainder = location.pathname.slice(item.to.length + 1);
        const nextSegment = remainder.split("/")[0] ?? "";
        if (allNavPaths.length > 0) {
          const siblingPath = `${item.to}/${nextSegment}`;
          if (allNavPaths.some((p) => p === siblingPath || p.startsWith(siblingPath + "/"))) {
            return false;
          }
        }
        return true;
      }
    }
    return false;
  }, [location.pathname, item.to, allNavPaths]);
}

/**
 * Hook to get navigation items for a specific module
 *
 * @param moduleId - Module identifier
 */
export function useModuleNavigationItems(moduleId: string): NavigationItem[] {
  const navigationTree = useNavigation();

  return useMemo(() => {
    if (!navigationTree) {
      return [];
    }

    // Find module in navigation tree
    for (const categoryNode of navigationTree.categories.values()) {
      const moduleNode = categoryNode.modules.get(moduleId);
      if (moduleNode) {
        return moduleNode.items;
      }
    }

    return [];
  }, [navigationTree, moduleId]);
}

/**
 * Hook to get navigation items for a specific category
 *
 * @param categoryName - Category name
 */
export function useCategoryNavigationItems(categoryName: string): ModuleNode[] {
  const navigationTree = useNavigation();

  return useMemo(() => {
    if (!navigationTree) {
      return [];
    }

    const categoryNode = navigationTree.categories.get(categoryName);
    if (!categoryNode) {
      return [];
    }

    return Array.from(categoryNode.modules.values());
  }, [navigationTree, categoryName]);
}
