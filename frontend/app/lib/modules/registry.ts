/**
 * Module Registry
 *
 * Handles automatic discovery of modules from backend,
 * local registration, and building hierarchical navigation tree.
 *
 * Features:
 * - Automatic discovery from backend API
 * - Encrypted local cache with TTL
 * - Hierarchical navigation tree (3 levels)
 * - Permission-based filtering
 * - Tenant-based filtering
 */

import type {
  FrontendModule,
  NavigationTree,
  NavigationHierarchy,
  NavigationItem,
  CategoryNode,
  ModuleNode,
  ModuleListItem,
  ModuleInfoResponse,
  ModuleNavigationItemDTO,
} from "./types";
import type { IconSvgElement } from "@hugeicons/react";
import {
  Activity01Icon,
  Audit01Icon,
  BriefcaseDollarIcon,
  Building01Icon,
  Calendar01Icon,
  Comment01Icon,
  ContactBookIcon,
  ContractsIcon,
  Exchange01Icon,
  FileEditIcon,
  FlashIcon,
  FolderLibraryIcon,
  GlobeIcon,
  GridIcon,
  HomeIcon,
  InvoiceIcon,
  KanbanIcon,
  MedalFirstPlaceIcon,
  Notification01Icon,
  Package01Icon,
  PieChart01Icon,
  PlugIcon,
  SearchIcon,
  Settings01Icon,
  ShieldIcon,
  ShoppingCart01Icon,
  Tag01Icon,
  Task01Icon,
  UserGroupIcon,
  WarehouseIcon,
  WorkflowSquare01Icon,
  ZapIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { getModules, getModuleMetadata } from "../api/modules.api";
import {
  cacheModuleData,
  getCachedModuleData,
  cacheModuleList,
  clearModuleCache,
} from "../storage/moduleCache";
import { useAuthStore } from "../../stores/authStore";
import { navigationItems } from "../../config/navigation";

const ICON_TOKEN_MAP: Record<string, IconSvgElement> = {
  calendar: Calendar01Icon,
  settings: Settings01Icon,
  plug: PlugIcon,
  grid: GridIcon,
  home: HomeIcon,
};

const MODULE_ICON_MAP: Record<string, IconSvgElement> = {
  // Operación
  tasks: Task01Icon,
  approvals: WorkflowSquare01Icon,
  files: FolderLibraryIcon,
  calendar: Calendar01Icon,
  // Gestión comercial
  products: ShoppingCart01Icon,
  inventory: WarehouseIcon,
  crm: ContactBookIcon,
  leases: ContractsIcon,
  maintenance: Wrench01Icon,
  properties: Building01Icon,
  data_collection: FileEditIcon, // Form builder icon
  // Finanzas
  billing: InvoiceIcon,
  finances: BriefcaseDollarIcon,
  // Core / infra
  users: UserGroupIcon,
  auth: ShieldIcon,
  audit: Audit01Icon,
  config: Settings01Icon,
  notifications: Notification01Icon,
  integrations: GlobeIcon,
  import_export: Exchange01Icon,
  search: SearchIcon,
  automation: FlashIcon,
  gamification: MedalFirstPlaceIcon,
  // Contextual
  templates: FileEditIcon,
  comments: Comment01Icon,
  tags: Tag01Icon,
  activities: Activity01Icon,
  reporting: PieChart01Icon,
  pubsub: ZapIcon,
  // Productos / catálogo sub-items
  catalog: ShoppingCart01Icon,
};

const DEFAULT_ICON = GridIcon;

/**
 * Module Registry class
 *
 * Singleton pattern for managing modules
 */
// Maps module IDs that should be merged into a shared navbar group
const MODULE_GROUP_MAP: Record<string, { groupId: string; groupName: string }> =
  {
    // Gestión Financiera
    billing: { groupId: "billing-finances", groupName: "Gestión Financiera" },
    finances: { groupId: "billing-finances", groupName: "Gestión Financiera" },
    // Inventario (agrupa inventory + products)
    inventory: { groupId: "inventario", groupName: "Inventario" },
    products: { groupId: "inventario", groupName: "Inventario" },
    // CRM (ya agrupa CRM + Pipelines internamente, pero lo ponemos en su propio grupo)
    crm: { groupId: "crm-group", groupName: "CRM" },
    // Gestión de Inmuebles
    leases: { groupId: "real-estate", groupName: "Gestión de Inmuebles" },
    maintenance: { groupId: "real-estate", groupName: "Gestión de Inmuebles" },
    properties: { groupId: "real-estate", groupName: "Gestión de Inmuebles" },
  };

class ModuleRegistry {
  private modules: Map<string, FrontendModule> = new Map();
  private navigationTree: NavigationTree | null = null;
  private isInitialized = false;

  /**
   * Get current user ID from auth store
   */
  private getUserId(): string {
    const user = useAuthStore.getState().user;
    return user?.id || "anonymous";
  }

  private inferContextualIcon(
    dto: ModuleNavigationItemDTO,
    moduleId: string
  ): IconSvgElement {
    const semanticText = `${dto.label} ${dto.path} ${dto.id}`.toLowerCase();

    if (semanticText.includes("audit") || semanticText.includes("auditor")) {
      return Audit01Icon;
    }
    if (
      semanticText.includes("rol") ||
      semanticText.includes("permiso") ||
      semanticText.includes("permission")
    ) {
      return ShieldIcon;
    }
    if (semanticText.includes("usuario") || semanticText.includes("user")) {
      return UserGroupIcon;
    }
    if (semanticText.includes("archivo") || semanticText.includes("file")) {
      return FolderLibraryIcon;
    }
    if (
      semanticText.includes("import") ||
      semanticText.includes("export") ||
      semanticText.includes("exportar")
    ) {
      return Exchange01Icon;
    }
    if (
      semanticText.includes("integr") ||
      semanticText.includes("webhook") ||
      semanticText.includes("hook")
    ) {
      return GlobeIcon;
    }
    if (semanticText.includes("calendar") || semanticText.includes("calend")) {
      return Calendar01Icon;
    }
    if (
      semanticText.includes("pipeline") ||
      semanticText.includes("flujo") ||
      semanticText.includes("embudo")
    ) {
      return KanbanIcon;
    }
    if (
      semanticText.includes("movimiento") ||
      semanticText.includes("movement") ||
      semanticText.includes("stock")
    ) {
      return Package01Icon;
    }
    if (semanticText.includes("task") || semanticText.includes("tarea")) {
      return Task01Icon;
    }
    if (semanticText.includes("workflow") || semanticText.includes("aprobac")) {
      return WorkflowSquare01Icon;
    }
    if (
      semanticText.includes("factura") ||
      semanticText.includes("invoice") ||
      semanticText.includes("billing") ||
      semanticText.includes("cobro")
    ) {
      return InvoiceIcon;
    }
    if (
      semanticText.includes("finanz") ||
      semanticText.includes("finance") ||
      semanticText.includes("period")
    ) {
      return BriefcaseDollarIcon;
    }
    if (
      semanticText.includes("propiedad") ||
      semanticText.includes("edificio") ||
      semanticText.includes("building")
    ) {
      return Building01Icon;
    }
    if (
      semanticText.includes("inventario") ||
      semanticText.includes("inventory") ||
      semanticText.includes("almac")
    ) {
      return WarehouseIcon;
    }
    if (
      semanticText.includes("producto") ||
      semanticText.includes("product") ||
      semanticText.includes("catalog")
    ) {
      return ShoppingCart01Icon;
    }
    if (
      semanticText.includes("crm") ||
      semanticText.includes("cliente") ||
      semanticText.includes("customer") ||
      semanticText.includes("contac")
    ) {
      return ContactBookIcon;
    }
    if (semanticText.includes("notif")) {
      return Notification01Icon;
    }
    if (semanticText.includes("search") || semanticText.includes("busq")) {
      return SearchIcon;
    }
    if (semanticText.includes("auto") || semanticText.includes("flash")) {
      return FlashIcon;
    }
    if (
      semanticText.includes("gamif") ||
      semanticText.includes("logro") ||
      semanticText.includes("punto")
    ) {
      return MedalFirstPlaceIcon;
    }
    if (
      semanticText.includes("report") ||
      semanticText.includes("analyt") ||
      semanticText.includes("estadist")
    ) {
      return PieChart01Icon;
    }
    if (
      semanticText.includes("actividad") ||
      semanticText.includes("activity")
    ) {
      return Activity01Icon;
    }
    if (semanticText.includes("coment") || semanticText.includes("comment")) {
      return Comment01Icon;
    }
    if (
      semanticText.includes("contrato") ||
      semanticText.includes("arriend") ||
      semanticText.includes("lease")
    ) {
      return ContractsIcon;
    }

    return MODULE_ICON_MAP[moduleId] ?? DEFAULT_ICON;
  }

  private toNavigationItem(
    dto: ModuleNavigationItemDTO,
    moduleId: string,
    index: number
  ): NavigationItem | null {
    if (!dto.path) {
      return null;
    }

    const normalizedIconToken = dto.icon?.toLowerCase();
    let iconComponent = normalizedIconToken
      ? ICON_TOKEN_MAP[normalizedIconToken]
      : undefined;

    if (
      !iconComponent ||
      normalizedIconToken === "grid" ||
      normalizedIconToken === "settings"
    ) {
      iconComponent = this.inferContextualIcon(dto, moduleId);
    }

    const requiresModuleSetting = dto.requires_module_setting
      ? {
          module: dto.requires_module_setting.module,
          key: dto.requires_module_setting.key,
          value: dto.requires_module_setting.value,
        }
      : undefined;

    return {
      id: dto.id || `${moduleId}-${index}`,
      label: dto.label,
      to: dto.path,
      icon: iconComponent,
      iconToken: dto.icon,
      permission: dto.permission,
      badge: dto.badge,
      order: dto.order,
      requiresModuleSetting,
      sourceModule: moduleId,
    };
  }

  private appendModuleNavigation(
    categories: Map<string, CategoryNode>,
    allItems: NavigationItem[],
    navigation: NavigationHierarchy,
    moduleNameOverride?: string,
    directItems = false
  ): void {
    const {
      category,
      module: moduleId,
      items,
      categoryOrder,
      moduleOrder,
    } = navigation;

    let categoryNode = categories.get(category);
    if (!categoryNode) {
      categoryNode = {
        name: category,
        order: categoryOrder || 99,
        modules: new Map(),
      };
      categories.set(category, categoryNode);
    }

    const group = !directItems ? MODULE_GROUP_MAP[moduleId] : undefined;
    const resolvedId = directItems
      ? `${moduleId}-direct`
      : (group?.groupId ?? moduleId);
    const resolvedName = directItems
      ? ""
      : (group?.groupName ?? moduleNameOverride ?? moduleId);

    const moduleNode: ModuleNode = {
      id: resolvedId,
      name: resolvedName,
      order: moduleOrder || 99,
      items,
      mainRoute: items[0]?.to,
      permission: items[0]?.permission,
    };

    const existing = categoryNode.modules.get(moduleNode.id);
    if (existing) {
      existing.items.push(...items);
    } else {
      categoryNode.modules.set(moduleNode.id, moduleNode);
    }
    allItems.push(...items);
  }

  /**
   * Discover modules from backend and cache locally
   *
   * This method:
   * 1. Checks local cache first
   * 2. Fetches from backend if cache is missing/expired
   * 3. Caches the result with encryption
   * 4. Registers modules locally
   */
  async discoverModules(): Promise<FrontendModule[]> {
    const userId = this.getUserId();

    // Always reset in-memory state before rebuilding from cache/backend.
    // This prevents stale modules/navigation from previous users or refreshes.
    this.modules.clear();
    this.navigationTree = null;

    // Read cache as fallback only. We prefer fresh backend discovery to avoid
    // keeping stale/partial navigation forever after schema changes.
    const cachedModules = await getCachedModuleData(userId);

    // Fetch from backend
    try {
      const response = await getModules();
      const moduleList = response.data;

      // Fetch detailed metadata for each module
      const modules: FrontendModule[] = [];

      for (const moduleItem of moduleList) {
        try {
          // Use moduleItem directly (it has all needed info)
          // Optionally fetch detailed metadata if needed
          let moduleInfo = moduleItem;
          try {
            const moduleInfoResponse = await getModuleMetadata(moduleItem.id);
            moduleInfo = {
              ...moduleItem,
              ...moduleInfoResponse.data,
            };
          } catch {
            moduleInfo = moduleItem;
          }

          // Convert backend module info to FrontendModule
          const navigationItemsDto = moduleInfo.navigation_items ?? [];
          const settingsLinksDto = moduleInfo.settings_links ?? [];
          const frontendModule: FrontendModule = {
            id: moduleInfo.id,
            name: moduleInfo.name,
            type: moduleInfo.type,
            enabled: moduleInfo.enabled,
            description: moduleInfo.description,
            dependsOn: moduleInfo.dependencies,
            routes: this.extractRoutesFromModule(moduleInfo),
            permissions: [],
            navigation: this.buildNavigationHierarchy(
              navigationItemsDto,
              moduleInfo
            ),
            order: this.getDefaultOrder(moduleInfo.type),
            navigationItems: navigationItemsDto,
            settingsLinks: settingsLinksDto,
          };

          modules.push(frontendModule);
          this.modules.set(frontendModule.id, frontendModule);
        } catch (error) {
          console.warn(
            `Failed to fetch metadata for module ${moduleItem.id}:`,
            error
          );
        }
      }

      // Cache the modules
      await cacheModuleData(userId, modules);
      await cacheModuleList(userId, moduleList);

      this.isInitialized = true;
      return modules;
    } catch (error) {
      console.error("Failed to discover modules:", error);

      if (cachedModules && cachedModules.length > 0) {
        for (const module of cachedModules) {
          this.modules.set(module.id, module);
        }
        this.isInitialized = true;
        return cachedModules;
      }

      throw error;
    }
  }

  /**
   * Extract routes from module metadata
   */
  private extractRoutesFromModule(
    moduleInfo: ModuleListItem | ModuleInfoResponse
  ): FrontendModule["routes"] {
    // Default routes based on module ID
    const routes: FrontendModule["routes"] = [
      {
        path: `/${moduleInfo.id}`,
        permission: `${moduleInfo.id}.view`,
      },
    ];

    // Add more routes based on module type
    if (moduleInfo.type === "business") {
      routes.push(
        {
          path: `/${moduleInfo.id}/create`,
          permission: `${moduleInfo.id}.create`,
        },
        {
          path: `/${moduleInfo.id}/:id`,
          permission: `${moduleInfo.id}.view`,
        },
        {
          path: `/${moduleInfo.id}/:id/edit`,
          permission: `${moduleInfo.id}.edit`,
        }
      );
    }

    return routes;
  }

  /**
   * Build navigation hierarchy from module metadata
   */
  private buildNavigationHierarchy(
    itemsDto: ModuleNavigationItemDTO[],
    moduleInfo: ModuleListItem | ModuleInfoResponse | FrontendModule
  ): NavigationHierarchy | undefined {
    if (!itemsDto || itemsDto.length === 0) {
      return undefined;
    }

    const categoryOverride = itemsDto[0]?.category;
    const category = categoryOverride ?? this.getCategoryForModule(moduleInfo);
    const items = itemsDto
      .map((item, idx) => this.toNavigationItem(item, moduleInfo.id, idx))
      .filter((item): item is NavigationItem => Boolean(item))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (items.length === 0) {
      return undefined;
    }

    return {
      category,
      module: moduleInfo.id,
      items,
      categoryOrder: this.getCategoryOrder(category),
      moduleOrder: this.getDefaultOrder(moduleInfo.type),
    };
  }

  /**
   * Get category for module based on type and ID
   *
   * ✅ UPDATED: Maps modules to new navigation categories:
   * - Core modules → Configuración, Sistema, Automatización, Análisis
   * - Business modules → Gestión/Catálogo
   */
  private getCategoryForModule(
    moduleInfo: ModuleListItem | ModuleInfoResponse | FrontendModule
  ): string {
    // Core modules mapped to new categories
    if (moduleInfo.type === "core") {
      const coreCategoryMap: Record<string, string> = {
        auth: "Configuración",
        users: "Configuración",
        audit: "Configuración",
        config: "Configuración",
        preferences: "Configuración",
        notifications: "Configuración",
        pubsub: "Sistema",
        automation: "Automatización",
        reporting: "Análisis",
      };
      return coreCategoryMap[moduleInfo.id] ?? "Sistema";
    }

    // Infrastructure modules mapped to categories
    const infraCategoryMap: Record<string, string> = {
      files: "Operación",
      tasks: "Operación",
      approvals: "Operación",
      calendar: "Operación",
      tags: "Gestión",
      filters: "Gestión",
      templates: "Gestión",
      comments: "Contextual",
      views: "Contextual",
      activities: "Contextual",
      search: "Análisis",
      integrations: "Configuración",
      import_export: "Configuración",
      gamification: "Configuración",
    };

    // Per-module category overrides
    const moduleCategoryMap: Record<string, string> = {
      // Gestión Financiera
      billing: "Gestión Financiera",
      finances: "Gestión Financiera",
      // CRM
      crm: "CRM",
      customers: "CRM",
      sales: "CRM",
      purchases: "CRM",
      // Inventario
      inventory: "Inventario",
      products: "Inventario",
      // Gestión de Inmuebles
      leases: "Gestión de Inmuebles",
      maintenance: "Gestión de Inmuebles",
      properties: "Gestión de Inmuebles",
      // Data Collection
      data_collection: "Recolección de Datos",
    };

    const infraCategory = infraCategoryMap[moduleInfo.id];
    if (infraCategory) return infraCategory;

    const moduleCategory = moduleCategoryMap[moduleInfo.id];
    if (moduleCategory) return moduleCategory;

    // Default (fallback for unknown business modules)
    return "Gestión";
  }

  /**
   * Get category order for sorting
   */
  private getCategoryOrder(category: string): number {
    const orderMap: Record<string, number> = {
      Operación: 10,
      "Gestión Financiera": 20,
      CRM: 30,
      Inventario: 40,
      "Gestión de Inmuebles": 50,
      Gestión: 55, // fallback — no debería verse
      Sistema: 60,
      Automatización: 80,
      Contextual: 90,
      Análisis: 100,
      _root: -1,
      // Configuración always last
      Configuración: 999,
    };

    return orderMap[category] || 99;
  }

  /**
   * Get default order for module
   */
  private getDefaultOrder(type: "core" | "business"): number {
    return type === "core" ? 1 : 10;
  }

  /**
   * Get module label (singular form for display)
   */
  /**
   * Register a module locally
   *
   * This allows modules to register themselves programmatically
   * without requiring backend discovery
   */
  registerModule(module: FrontendModule): void {
    this.modules.set(module.id, module);
    // Invalidate navigation tree to force rebuild
    this.navigationTree = null;
  }

  /**
   * Get a registered module by ID
   */
  getModule(moduleId: string): FrontendModule | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Get all registered modules
   */
  getAllModules(): FrontendModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Build hierarchical navigation tree
   *
   * Organizes modules into 3-level hierarchy:
   * Category → Module → Items
   * Also integrates static navigation items from navigation.ts
   *
   * ✅ FIXED: Avoids duplicates by tracking all IDs from static navigation
   * and skipping dynamic modules that already exist in the tree
   */
  getNavigationTree(): NavigationTree {
    // Return cached tree if available
    if (this.navigationTree) {
      return this.navigationTree;
    }

    const categories = new Map<string, CategoryNode>();
    const allItems: NavigationItem[] = [];

    // ✅ FIXED: Create a set to track all IDs already used in static navigation
    // This prevents duplicates when adding dynamic modules
    const usedIds = new Set<string>();

    // 1. Add static navigation items (global sections only)
    for (const navItem of navigationItems) {
      // Handle top-level items without children (e.g., "Dashboard")
      if (!navItem.children || navItem.children.length === 0) {
        // Skip creating category for standalone items - they'll be added directly to a "Root" category
        // For now, we'll add them to a special category that renders as direct links
        // If item specifies a category, use it; otherwise default to _root
        const categoryName = navItem.category ?? "_root"; // Special category for top-level items
        let categoryNode = categories.get(categoryName);
        if (!categoryNode) {
          categoryNode = {
            name: categoryName,
            order: -1, // Before all other categories
            modules: new Map(),
          };
          categories.set(categoryName, categoryNode);
        }

        // ✅ FIXED: Track this ID to prevent duplicates
        usedIds.add(navItem.id);

        // Create a module node for this item (but it will render as a direct link, not expandable)
        // Debug: Log files item to verify it's correct
        if (navItem.id === "files") {
          console.warn("[ModuleRegistry] Processing files navItem:", {
            id: navItem.id,
            to: navItem.to,
            label: navItem.label,
          });
        }

        const moduleNode: ModuleNode = {
          id: navItem.id,
          name: navItem.label,
          order: 0,
          items: [
            {
              id: navItem.id,
              label: navItem.label,
              to: navItem.to || "#", // Fallback to "#" if to is undefined
              icon: navItem.icon,
              permission: navItem.permission,
              order: 0,
              requiresModuleSetting: navItem.requiresModuleSetting,
            },
          ],
          mainRoute: navItem.to,
          permission: navItem.permission,
        };

        categoryNode.modules.set(navItem.id, moduleNode);
        allItems.push(...moduleNode.items);
      } else {
        // Handle categories with children (keep structure for non-config sections)
        const categoryName = navItem.label;
        let categoryNode = categories.get(categoryName);
        if (!categoryNode) {
          categoryNode = {
            name: categoryName,
            order: 1000, // Last category
            modules: new Map(),
          };
          categories.set(categoryName, categoryNode);
        }

        if (navItem.requiresAnyPermission) {
          (
            categoryNode as { requiresAnyPermission?: string[] }
          ).requiresAnyPermission = navItem.requiresAnyPermission;
        }

        for (const child of navItem.children) {
          usedIds.add(child.id);
          const moduleNode: ModuleNode = {
            id: child.id,
            name: child.label,
            order: child.order ?? 0,
            items: [
              {
                id: child.id,
                label: child.label,
                to: child.to ?? "#",
                icon: child.icon,
                permission: child.permission,
                order: child.order ?? 0,
                requiresModuleSetting: child.requiresModuleSetting,
              },
            ],
            mainRoute: child.to,
            permission: child.permission,
          };

          categoryNode.modules.set(child.id, moduleNode);
          allItems.push(...moduleNode.items);
        }
      }
    }

    // 2. Group modules from backend by category and merge
    for (const module of this.modules.values()) {
      if (!module.enabled) {
        continue;
      }
      const navigationItemsFromContract = module.navigationItems ?? [];
      const settingsLinksFromContract = module.settingsLinks ?? [];

      if (
        navigationItemsFromContract.length === 0 &&
        settingsLinksFromContract.length === 0
      ) {
        // Legacy fallback: keep old behavior for modules that still don't publish
        // navigation contract yet, so they remain visible in sidebar.
        if (module.navigation) {
          this.appendModuleNavigation(
            categories,
            allItems,
            module.navigation,
            module.name
          );
          continue;
        }

        const defaultViewRoute = module.routes[0]?.path ?? `/${module.id}`;
        const legacyFallbackItems: ModuleNavigationItemDTO[] = [
          {
            id: `${module.id}.main`,
            label: module.name,
            path: defaultViewRoute,
            permission: `${module.id}.view`,
            icon: "grid",
            order: 0,
          },
        ];

        if (module.type === "business") {
          legacyFallbackItems.push({
            id: `${module.id}.create`,
            label: `Crear ${module.name}`,
            path: `/${module.id}/create`,
            permission: `${module.id}.create`,
            icon: "grid",
            order: 10,
          });
        }

        const legacyNavigation = this.buildNavigationHierarchy(
          legacyFallbackItems,
          module
        );
        if (legacyNavigation && !usedIds.has(module.id)) {
          this.appendModuleNavigation(
            categories,
            allItems,
            legacyNavigation,
            module.name
          );
        }
        continue;
      }

      const groupedNavigationByCategory = navigationItemsFromContract.reduce<
        Record<string, ModuleNavigationItemDTO[]>
      >((acc, item) => {
        const category = item.category ?? this.getCategoryForModule(module);
        (acc[category] ??= []).push(item);
        return acc;
      }, {});

      for (const [category, dtoItems] of Object.entries(
        groupedNavigationByCategory
      )) {
        const navigation = this.buildNavigationHierarchy(dtoItems, module);
        if (!navigation) {
          continue;
        }

        if (usedIds.has(module.id) && category !== "Configuración") {
          continue;
        }

        this.appendModuleNavigation(
          categories,
          allItems,
          navigation,
          module.name
        );
      }

      const groupedSettingsByCategory = settingsLinksFromContract
        .map((link: ModuleNavigationItemDTO) => ({
          ...link,
          category: link.category ?? "Configuración",
        }))
        .reduce<Record<string, ModuleNavigationItemDTO[]>>((acc, item) => {
          const category = item.category ?? "Configuración";
          (acc[category] ??= []).push(item);
          return acc;
        }, {});

      for (const dtoItems of Object.values(groupedSettingsByCategory)) {
        const navigation = this.buildNavigationHierarchy(dtoItems, module);
        if (!navigation) {
          continue;
        }

        this.appendModuleNavigation(
          categories,
          allItems,
          navigation,
          module.name,
          true
        );
      }
    }

    // Sort categories
    const sortedCategories = new Map(
      Array.from(categories.entries()).sort((a, b) => a[1].order - b[1].order)
    );

    // Sort modules within each category
    for (const categoryNode of sortedCategories.values()) {
      const sortedModules = new Map(
        Array.from(categoryNode.modules.entries()).sort(
          (a, b) => a[1].order - b[1].order
        )
      );
      categoryNode.modules = sortedModules;
    }

    this.navigationTree = {
      categories: sortedCategories,
      allItems,
    };

    return this.navigationTree;
  }

  /**
   * Get navigation items filtered by permissions
   *
   * @param hasPermission - Function to check if user has permission
   * @param tenantId - Optional tenant ID for filtering
   */
  getNavigationItems(
    hasPermission: (permission: string) => boolean,
    _tenantId?: string
  ): NavigationItem[] {
    const tree = this.getNavigationTree();
    const filteredItems: NavigationItem[] = [];

    for (const categoryNode of tree.categories.values()) {
      for (const moduleNode of categoryNode.modules.values()) {
        // Check module-level permission
        if (moduleNode.permission && !hasPermission(moduleNode.permission)) {
          continue;
        }

        // Filter items by permissions
        for (const item of moduleNode.items) {
          if (!item.permission || hasPermission(item.permission)) {
            filteredItems.push(item);
          }
        }
      }
    }

    return filteredItems;
  }

  /**
   * Discover and register frontend modules installed as npm packages.
   *
   * Packages that implement the @aiutox module contract must export a
   * `registerFrontendModule(app)` function. This method iterates over a
   * statically-defined list of known plugin package names (populated at
   * build time or via env), dynamically imports each one, and calls
   * `registerFrontendModule` with a lightweight app adapter.
   *
   * Usage: call once at app startup, before `discoverModules()`.
   */
  async discoverNpmPlugins(
    pluginPackages: string[] = []
  ): Promise<void> {
    const adapter = {
      registerNavItem: (item: {
        id: string;
        label: string;
        path: string;
        icon?: string;
      }) => {
        const moduleId = item.id.split(".")[0] ?? item.id;
        const existing = this.modules.get(moduleId);
        if (!existing) {
          // Register a minimal FrontendModule so nav items are merged from backend.
          // Full module data comes from discoverModules(); this is just a signal.
        }
      },
    };

    for (const pkg of pluginPackages) {
      try {
        const mod = await import(/* @vite-ignore */ pkg);
        if (typeof mod.registerFrontendModule === "function") {
          mod.registerFrontendModule(adapter);
        }
      } catch (err) {
        console.warn(`[ModuleRegistry] Failed to load npm plugin "${pkg}":`, err);
      }
    }
  }

  /**
   * Clear all registered modules and cache
   */
  async clear(): Promise<void> {
    const userId = this.getUserId();
    this.modules.clear();
    this.navigationTree = null;
    this.isInitialized = false;
    // clearModuleCache is synchronous, no await needed
    clearModuleCache(userId);
  }

  /**
   * Check if registry is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const moduleRegistry = new ModuleRegistry();
