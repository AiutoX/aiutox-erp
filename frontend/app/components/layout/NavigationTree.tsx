/**
 * NavigationTree - Componente de navegación jerárquica (3 niveles)
 *
 * Renderiza la navegación en 3 niveles:
 * - Nivel 1: Categoría/Grupo (expandible)
 * - Nivel 2: Módulo (expandible)
 * - Nivel 3: Items/Páginas (enlaces)
 *
 * Filtra automáticamente por permisos del usuario.
 */

import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { GridIcon } from "@hugeicons/core-free-icons";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useNavigation } from "~/hooks/useNavigation";
import { useCategoryCollapse } from "~/hooks/useCategoryCollapse";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "~/components/ui/collapsible";
import type { NavigationItem, ModuleNode } from "~/lib/modules/types";
import { cn } from "~/lib/utils";
import { useCalendarModalStore } from "~/stores/calendarModalStore";
import { useModulesStore } from "~/stores/modulesStore";

const LONG_LABEL_TOOLTIP_THRESHOLD = 18;

/**
 * Determines if a navigation item path is active for the current location.
 *
 * Handles the case where two sibling routes share a prefix, e.g.:
 *   /organizations       → Organizaciones
 *   /organizations/contacts → Contactos
 *
 * Without this check, visiting /organizations/contacts would incorrectly
 * highlight both items because "/organizations/contacts".startsWith("/organizations").
 *
 * @param itemPath - The navigation item's path (e.g. "/organizations")
 * @param currentPath - The current browser pathname (e.g. "/organizations/contacts")
 * @param allNavPaths - All registered navigation paths for sibling collision detection
 */
function isPathActive(
  itemPath: string,
  currentPath: string,
  allNavPaths?: string[]
): boolean {
  // Exact match
  if (currentPath === itemPath) return true;

  // Prefix match — verify it's a proper child route, not a sibling collision
  if (itemPath !== "/" && currentPath.startsWith(itemPath)) {
    const nextChar = currentPath[itemPath.length];
    // No next char means exact match (already handled above), but be safe
    if (nextChar === undefined) return true;
    // Query string on the same route
    if (nextChar === "?" || nextChar === "#") return true;
    // Next char is "/" — could be a child route OR a sibling collision
    if (nextChar === "/") {
      // Extract the immediate next segment after itemPath
      const remainder = currentPath.slice(itemPath.length + 1); // e.g. "contacts" or "123/edit"
      const nextSegment = remainder.split("/")[0] ?? "";

      // If we have the full nav path list, check for sibling collision
      if (allNavPaths) {
        const siblingPath = `${itemPath}/${nextSegment}`;
        // If a sibling route exists with this exact prefix, this is NOT a child
        if (allNavPaths.some((p) => p === siblingPath || p.startsWith(siblingPath + "/"))) {
          return false;
        }
      }

      // Heuristic: if the next segment looks like a resource ID (numeric or UUID),
      // it's a child route. If it looks like a named sub-route, it might be a sibling.
      // We rely on allNavPaths for accuracy; without it, default to true (legacy behavior).
      return true;
    }
  }

  return false;
}

/**
 * Componente para renderizar un item de navegación (Nivel 3)
 */
interface NavigationItemComponentProps {
  item: NavigationItem;
  isCollapsed: boolean;
  level: number; // Nivel de anidación (0 = root, 1 = category, 2 = module, 3 = item)
}

function NavigationItemComponent({
  item,
  isCollapsed,
  level: _level,
}: NavigationItemComponentProps) {
  const location = useLocation();
  const calendarModal = useCalendarModalStore();
  const { navigationTree } = useModulesStore();

  // Collect all nav paths for sibling collision detection
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

  // Check if item is active
  const isActive = useMemo(() => {
    if (item.to === "/calendar" && calendarModal.isOpen) {
      return true;
    }
    // For items with query strings, compare full path+search
    const fullLocation = location.pathname + location.search;
    if (item.to.includes("?")) {
      return fullLocation === item.to || fullLocation.startsWith(item.to + "&");
    }
    return isPathActive(item.to, location.pathname, allNavPaths);
  }, [calendarModal.isOpen, location.pathname, location.search, item.to, allNavPaths]);

  // Ensure item.to is a valid string
  if (!item.to || typeof item.to !== "string") {
    console.error("[NavigationTree] Invalid item.to:", item);
    return null;
  }

  // Debug: Log files item to verify it's correct
  if (item.id === "files") {
    console.warn("[NavigationTree] Files item:", {
      id: item.id,
      to: item.to,
      label: item.label,
    });
  }

  return (
    <Link
      to={item.to}
      onClick={(e) => {
        // Handle calendar modal
        if (item.to === "/calendar") {
          e.preventDefault();
          e.stopPropagation();
          calendarModal.open(location.pathname);
        }

        // Debug: Log click event for files item
        if (item.id === "files") {
          console.warn("[NavigationTree] Files link clicked:", {
            to: item.to,
            currentPath: location.pathname,
            target: e.currentTarget.href,
            preventDefault: e.defaultPrevented,
          });
          // Ensure navigation happens
          if (item.to && item.to !== location.pathname) {
            console.warn("[NavigationTree] Navigating to:", item.to);
          }
        }
      }}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mx-2 border-l-2",
        "transition-all duration-150 ease-in-out",
        "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isActive
          ? "bg-primary/10 text-primary border-l-primary"
          : "text-foreground hover:text-primary border-l-transparent",
        isCollapsed && "justify-center px-2 py-2.5"
      )}
      aria-current={isActive ? "page" : undefined}
      aria-label={isCollapsed ? item.label : undefined}
      title={
        isCollapsed || item.label.length > LONG_LABEL_TOOLTIP_THRESHOLD
          ? item.label
          : undefined
      }
    >
      <HugeiconsIcon
        icon={item.icon ?? GridIcon}
        size={isCollapsed ? 22 : 18}
        color={isActive ? "hsl(var(--primary))" : "hsl(var(--foreground))"}
        strokeWidth={1.5}
        className="transition-colors duration-150"
      />
      <span
        className={cn(
          "flex-1 truncate transition-all duration-150",
          isCollapsed && "opacity-0 w-0 invisible"
        )}
      >
        {item.label}
      </span>
      {item.badge !== undefined && item.badge > 0 && !isCollapsed && (
        <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-full transition-all duration-150">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  );
}

/**
 * Componente para renderizar un módulo (Nivel 2)
 */
interface ModuleNodeComponentProps {
  module: ModuleNode;
  isCollapsed: boolean;
  categoryName: string;
}

function ModuleNodeComponent({
  module,
  isCollapsed,
  categoryName: _categoryName,
}: ModuleNodeComponentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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

  // Check if any item in this module is active
  const hasActiveItem = module.items.some((item) => {
    return isPathActive(item.to, location.pathname, allNavPaths);
  });

  // Auto-expand if has active item
  if (hasActiveItem && !isExpanded) {
    setIsExpanded(true);
  }

  // ✅ SIMPLIFIED: If module has only 1 item, render it as a direct link (no expandable button)
  if (module.items.length === 1) {
    const firstItem = module.items[0];
    if (!firstItem) return null;

    return (
      <NavigationItemComponent
        item={firstItem}
        isCollapsed={isCollapsed}
        level={0} // Direct item, no nesting
      />
    );
  }

  if (isCollapsed) {
    // In collapsed mode, show one representative icon-only entry per module
    const firstItem = module.items[0];
    if (!firstItem) {
      return null;
    }

    return <NavigationItemComponent item={firstItem} isCollapsed level={0} />;
  }

  return (
    <div className="space-y-1 m-1">
      {/* Module header (clickable to expand/collapse) - only if multiple items */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md mx-2",
          "transition-all duration-150 ease-in-out",
          "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          hasActiveItem
            ? "bg-primary/5 text-primary"
            : "text-foreground hover:text-primary"
        )}
        aria-expanded={isExpanded}
        aria-label={`${module.name} module`}
        title={
          module.name.length > LONG_LABEL_TOOLTIP_THRESHOLD
            ? module.name
            : undefined
        }
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 transition-transform duration-150" />
        ) : (
          <ChevronRight className="h-4 w-4 transition-transform duration-150" />
        )}
        <span
          className="flex-1 text-left truncate"
          title={
            module.name.length > LONG_LABEL_TOOLTIP_THRESHOLD
              ? module.name
              : undefined
          }
        >
          {module.name}
        </span>
      </button>

      {/* Module items (Nivel 3) */}
      {isExpanded && (
        <div className="ml-4 space-y-0.5">
          {module.items.map((item) => (
            <NavigationItemComponent
              key={item.id}
              item={item}
              isCollapsed={false}
              level={2}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Componente para renderizar una categoría (Nivel 1)
 */
interface CategoryNodeComponentProps {
  categoryName: string;
  modules: Map<string, ModuleNode>;
  isCollapsed: boolean;
  isExpanded: boolean;
  onToggle: (categoryName: string) => void;
}

// Collator fijo en "es" para ordenar alfabéticamente sin importar el idioma de la UI
const ALPHA_COLLATOR = new Intl.Collator("es", {
  sensitivity: "base",
  numeric: true,
});

/** Devuelve todos los NavigationItems aplanados de una lista de ModuleNodes */
function flattenModuleItems(moduleList: ModuleNode[]): NavigationItem[] {
  return moduleList.flatMap((m) => m.items);
}

interface ModuleGroup {
  moduleId: string;
  moduleName: string;
  items: NavigationItem[];
}

function groupByModule(
  items: NavigationItem[],
  nameById: Map<string, string>
): ModuleGroup[] {
  const map = new Map<string, ModuleGroup>();
  for (const item of items) {
    const moduleId = item.sourceModule ?? "__unknown__";
    if (!map.has(moduleId)) {
      map.set(moduleId, {
        moduleId,
        moduleName: nameById.get(moduleId) ?? moduleId,
        items: [],
      });
    }
    map.get(moduleId)!.items.push(item);
  }
  for (const group of map.values()) {
    group.items = group.items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }
  return [...map.values()].sort((a, b) => {
    const aOrder = Math.min(...a.items.map((i) => i.order ?? 99));
    const bOrder = Math.min(...b.items.map((i) => i.order ?? 99));
    if (aOrder !== bOrder) return aOrder - bOrder;
    return ALPHA_COLLATOR.compare(a.moduleName, b.moduleName);
  });
}

function ConfigModuleGroupComponent({ group }: { group: ModuleGroup }) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);

  const hasActive = group.items.some((item) => {
    const fullLocation = location.pathname + location.search;
    if (item.to.includes("?"))
      return fullLocation === item.to || fullLocation.startsWith(item.to + "&");
    return isPathActive(item.to, location.pathname);
  });

  if (group.items.length === 1) {
    return (
      <NavigationItemComponent
        item={group.items[0]!}
        isCollapsed={false}
        level={0}
      />
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md mx-1",
          "transition-all duration-150 ease-in-out",
          "hover:bg-accent focus:outline-none",
          hasActive
            ? "text-primary"
            : "text-foreground/70 hover:text-primary"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-150" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-150" />
        )}
        <span className="flex-1 text-left truncate">{group.moduleName}</span>
      </button>
      {isExpanded && (
        <div className="ml-4 space-y-0.5 border-l border-border/50 pl-1">
          {group.items.map((item) => (
            <NavigationItemComponent
              key={item.id}
              item={item}
              isCollapsed={false}
              level={2}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryNodeComponent({
  categoryName,
  modules,
  isCollapsed,
  isExpanded,
  onToggle,
}: CategoryNodeComponentProps) {
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

  const isConfigurationCategory = useMemo(() => {
    const n = categoryName.toLowerCase();
    return n.includes("config") || n.includes("setting");
  }, [categoryName]);

  const moduleList = useMemo(() => Array.from(modules.values()), [modules]);

  const collapsedPrimaryModules = useMemo(
    () => moduleList.filter((m) => !m.id.endsWith("-direct")),
    [moduleList]
  );

  const hasActiveItem = moduleList.some((module) =>
    module.items.some((item) => isPathActive(item.to, location.pathname, allNavPaths))
  );

  const { modules: storeModules } = useModulesStore();

  const { moduleNameById, moduleTypeById } = useMemo(() => {
    const nameMap = new Map<string, string>();
    const typeMap = new Map<string, string>();
    for (const m of storeModules) {
      nameMap.set(m.id, m.name);
      typeMap.set(m.id, m.type);
    }
    return { moduleNameById: nameMap, moduleTypeById: typeMap };
  }, [storeModules]);

  // ── Grupos para la categoría Configuración ──────────────────────────────────
  const { coreGroups, businessGroups } = useMemo(() => {
    if (!isConfigurationCategory) return { coreGroups: [], businessGroups: [] };

    const all = flattenModuleItems(moduleList);
    // Classify by source module type; fall back to URL prefix for static items
    const coreItems = all.filter((item) => {
      const type = item.sourceModule
        ? moduleTypeById.get(item.sourceModule)
        : undefined;
      if (type) return type === "core";
      return item.to?.startsWith("/config/");
    });
    const businessItems = all.filter((item) => {
      const type = item.sourceModule
        ? moduleTypeById.get(item.sourceModule)
        : undefined;
      if (type) return type === "business";
      return !item.to?.startsWith("/config/");
    });
    return {
      coreGroups: groupByModule(coreItems, moduleNameById),
      businessGroups: groupByModule(businessItems, moduleNameById),
    };
  }, [isConfigurationCategory, moduleList, moduleNameById, moduleTypeById]);

  // ── Colapsado ───────────────────────────────────────────────────────────────
  if (isCollapsed) {
    if (collapsedPrimaryModules.length === 0) return null;
    return (
      <div className="space-y-1 m-1">
        {collapsedPrimaryModules.map((module) => (
          <ModuleNodeComponent
            key={module.id}
            module={module}
            isCollapsed={isCollapsed}
            categoryName={categoryName}
          />
        ))}
      </div>
    );
  }

  // ── _root (Dashboard, etc.) ─────────────────────────────────────────────────
  if (categoryName === "_root") {
    return (
      <div className="space-y-1 m-1">
        {moduleList.map((module) => (
          <ModuleNodeComponent
            key={module.id}
            module={module}
            isCollapsed={isCollapsed}
            categoryName={categoryName}
          />
        ))}
      </div>
    );
  }

  // ── Categoría Configuración con sub-grupos ──────────────────────────────────
  if (isConfigurationCategory) {
    return (
      <Collapsible
        open={isExpanded}
        onOpenChange={() => onToggle(categoryName)}
      >
        <div className="space-y-1 m-1">
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md mx-2",
                "transition-all duration-150 ease-in-out",
                "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "data-[state=open]:bg-primary/5 data-[state=open]:text-primary",
                hasActiveItem
                  ? "bg-primary/5 text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150" />
              )}
              <span className="flex-1 text-left truncate">{categoryName}</span>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="ml-1 space-y-3 pt-1">
            {/* Sub-grupo: Módulos Core */}
            {coreGroups.length > 0 && (
              <div className="space-y-0.5">
                <p className="px-3 pt-1 pb-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                  Sistema
                </p>
                {coreGroups.map((group) => (
                  <ConfigModuleGroupComponent
                    key={group.moduleId}
                    group={group}
                  />
                ))}
              </div>
            )}

            {/* Sub-grupo: Módulos de Negocio */}
            {businessGroups.length > 0 && (
              <div className="space-y-0.5 border-t border-border/40 pt-2">
                <p className="px-3 pt-1 pb-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                  Negocio
                </p>
                {businessGroups.map((group) => (
                  <ConfigModuleGroupComponent
                    key={group.moduleId}
                    group={group}
                  />
                ))}
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // ── Otras categorías (comportamiento original) ──────────────────────────────
  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggle(categoryName)}>
      <div className="space-y-1 m-1">
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md mx-2",
              "transition-all duration-150 ease-in-out",
              "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "data-[state=open]:bg-primary/5 data-[state=open]:text-primary",
              hasActiveItem
                ? "bg-primary/5 text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
            aria-expanded={isExpanded}
            aria-label={`${categoryName} category`}
            title={
              categoryName.length > LONG_LABEL_TOOLTIP_THRESHOLD
                ? categoryName
                : undefined
            }
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150" />
            )}
            <span
              className="flex-1 text-left truncate"
              title={
                categoryName.length > LONG_LABEL_TOOLTIP_THRESHOLD
                  ? categoryName
                  : undefined
              }
            >
              {categoryName}
            </span>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="ml-2 space-y-1">
          {moduleList.map((module) => {
            // Direct items (e.g. static nav entries) — render flat
            if (module.id.endsWith("-direct")) {
              return (
                <div key={module.id} className="space-y-0.5 m-1">
                  {module.items.map((item) => (
                    <NavigationItemComponent
                      key={item.id}
                      item={item}
                      isCollapsed={isCollapsed}
                      level={0}
                    />
                  ))}
                </div>
              );
            }
            // Single module in category → skip the redundant intermediate header
            // and render items directly, indented one level
            if (moduleList.length === 1) {
              return (
                <div key={module.id} className="space-y-0.5 ml-4">
                  {module.items.map((item) => (
                    <NavigationItemComponent
                      key={item.id}
                      item={item}
                      isCollapsed={isCollapsed}
                      level={2}
                    />
                  ))}
                </div>
              );
            }
            return (
              <ModuleNodeComponent
                key={module.id}
                module={module}
                isCollapsed={isCollapsed}
                categoryName={categoryName}
              />
            );
          })}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/**
 * NavigationTree - Componente principal
 *
 * Renderiza el árbol completo de navegación jerárquica.
 */
interface NavigationTreeProps {
  isCollapsed?: boolean;
}

export function NavigationTree({ isCollapsed = false }: NavigationTreeProps) {
  const navigationTree = useNavigation();
  const { toggleCategory, isExpanded, collapseAll } = useCategoryCollapse({
    maxExpanded: 2,
  });

  useEffect(() => {
    if (isCollapsed) {
      collapseAll();
    }
  }, [isCollapsed, collapseAll]);

  if (!navigationTree || navigationTree.categories.size === 0) {
    return (
      <div
        className={cn(
          "py-8 text-center text-sm text-muted-foreground",
          isCollapsed ? "px-2" : "px-4"
        )}
      >
        {isCollapsed ? (
          <div
            className="flex justify-center"
            title="No hay módulos disponibles"
          >
            <HugeiconsIcon
              icon={GridIcon}
              size={24}
              color="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
            />
          </div>
        ) : (
          "No hay módulos disponibles"
        )}
      </div>
    );
  }

  return (
    <nav className="space-y-2" aria-label="Navegación principal">
      {Array.from(navigationTree.categories.entries()).map(
        ([categoryName, categoryNode]) => (
          <CategoryNodeComponent
            key={categoryName}
            categoryName={categoryName}
            modules={categoryNode.modules}
            isCollapsed={isCollapsed}
            isExpanded={isExpanded(categoryName)}
            onToggle={toggleCategory}
          />
        )
      )}
    </nav>
  );
}
