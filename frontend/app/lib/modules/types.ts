/**
 * Types for module system and hierarchical navigation
 *
 * These types support the autodiscovery system for modules with 3-level navigation:
 * Level 1: Category/Group
 * Level 2: Module
 * Level 3: Pages/Actions
 *
 * Aligned with backend module metadata structure in `rules/module-meta.md`
 */

import type { IconSvgElement } from "@hugeicons/react";

export type ModuleType = "core" | "business";

export interface ModuleNavigationSettingRequirement {
  module: string;
  key: string;
  value?: unknown;
}

export interface ModuleNavigationItemDTO {
  id: string;
  label: string;
  path: string;
  permission?: string;
  icon?: string;
  category?: string;
  order?: number;
  badge?: number;
  requires_module_setting?: ModuleNavigationSettingRequirement | null;
}

export interface ModuleNavigationPayload {
  navigation_items?: ModuleNavigationItemDTO[];
  settings_links?: ModuleNavigationItemDTO[];
}

export interface NavigationItem {
  id: string;
  label: string;
  to: string;
  icon?: IconSvgElement;
  permission?: string;
  badge?: number;
  order?: number;
  isActive?: boolean;
  iconToken?: string;
  requiresModuleSetting?: ModuleNavigationSettingRequirement;
  sourceModule?: string;
}

/**
 * Module route definition
 */
export interface ModuleRoute {
  /** Route path */
  path: string;
  /** Required permission to access this route */
  permission?: string;
  /** Route metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Navigation hierarchy structure (3 levels)
 */
export interface NavigationHierarchy {
  /** Level 1: Category/Group name */
  category: string;
  /** Level 2: Module identifier */
  module: string;
  /** Level 3: Navigation items (pages/actions) */
  items: NavigationItem[];
  /** Order for sorting categories */
  categoryOrder?: number;
  /** Order for sorting modules within category */
  moduleOrder?: number;
}

/**
 * Frontend module metadata
 *
 * This represents a module that can be discovered and registered in the frontend.
 * It includes all information needed for navigation, permissions, and routing.
 */
export interface FrontendModule {
  id: string;
  name: string;
  type: ModuleType;
  enabled: boolean;
  description?: string;
  dependsOn?: string[];
  routes: ModuleRoute[];
  permissions: string[];
  navigation?: NavigationHierarchy;
  order?: number;
  category?: string;
  navigationItems?: ModuleNavigationItemDTO[];
  settingsLinks?: ModuleNavigationItemDTO[];
}

/**
 * Navigation tree structure
 *
 * Organized by category → module → items
 */
export interface NavigationTree {
  /** Categories with their modules */
  categories: Map<string, CategoryNode>;
  /** Flat list of all navigation items (for quick lookup) */
  allItems: NavigationItem[];
}

/**
 * Category node in navigation tree
 */
export interface CategoryNode {
  /** Category name */
  name: string;
  /** Order for sorting */
  order: number;
  /** Modules in this category */
  modules: Map<string, ModuleNode>;
  /** Optional permission requirement - user needs at least one of these permissions */
  requiresAnyPermission?: string[];
}

/**
 * Module node in navigation tree
 */
export interface ModuleNode {
  /** Module identifier */
  id: string;
  /** Module name */
  name: string;
  /** Order for sorting */
  order: number;
  /** Navigation items in this module */
  items: NavigationItem[];
  /** Main route for this module (if any) */
  mainRoute?: string;
  /** Required permission to access this module */
  permission?: string;
}

/**
 * Module permission with tenant information
 */
export interface ModulePermission {
  /** Permission string (e.g., "inventory.view") */
  permission: string;
  /** Module this permission belongs to */
  moduleId: string;
  /** Tenant ID (if tenant-specific) */
  tenantId?: string;
  /** Description of the permission */
  description?: string;
}

/**
 * Permission group organized by module
 */
export interface PermissionGroup {
  /** Module identifier */
  moduleId: string;
  /** Module name */
  moduleName: string;
  /** Permissions in this module */
  permissions: ModulePermission[];
  /** Category of the module */
  category?: string;
}

/**
 * Tenant-specific module permissions
 */
export interface TenantModulePermissions {
  /** Tenant ID */
  tenantId: string;
  /** Permissions grouped by module */
  permissionsByModule: Map<string, ModulePermission[]>;
}

/**
 * Extended module permission with tenant and module information
 */
export interface ExtendedModulePermission extends ModulePermission {
  /** Tenant ID */
  tenantId: string;
  /** Module ID */
  moduleId: string;
  /** Whether permission is from role or delegated */
  source?: "role" | "delegated";
  /** Expiration date (for delegated permissions) */
  expiresAt?: string | null;
}

/**
 * Response from backend module list endpoint
 * GET /api/v1/config/modules
 */
export interface ModuleSettingField {
  key: string;
  label: string;
  /** "text" | "number" | "boolean" | "select" */
  type: string;
  default?: unknown;
  description?: string;
  options?: string[];
  required?: boolean;
  min_value?: number;
  max_value?: number;
}

export interface ModuleListItem extends ModuleNavigationPayload {
  id: string;
  name: string;
  type: ModuleType;
  enabled: boolean;
  dependencies?: string[];
  description?: string;
  settings_schema?: ModuleSettingField[];
}

/**
 * Response from backend module info endpoint
 * GET /api/v1/config/modules/{module_id}
 */
export interface ModuleInfoResponse extends ModuleNavigationPayload {
  id: string;
  name: string;
  type: ModuleType;
  enabled: boolean;
  dependencies?: string[];
  description?: string;
  has_router?: boolean;
  model_count?: number;
}
