/**
 * Quick Actions Registry System
 *
 * Sistema centralizado para registrar y gestionar acciones rápidas del topbar.
 * Combina registro por módulo, filtrado por permisos y contextualización.
 */

/**
 * Interfaz para una acción rápida
 */
export interface QuickAction {
  /** Identificador único de la acción */
  id: string;
  /** Etiqueta para mostrar (debe usar traducciones) */
  label: string;
  /** Icono del componente Hugeicons */
  icon: unknown;
  /** Ruta a la que navega la acción */
  route: string;
  /** Permiso requerido para mostrar esta acción */
  permission: string;
  /** Prioridad para ordenamiento (menor = más alto) */
  priority: number;
  /** Siempre visible independientemente del contexto */
  global?: boolean;
  /** Páginas donde es relevante (rutas parciales) */
  context?: string[];
  /** Módulo al que pertenece */
  module: string;
}

/**
 * Registry central de acciones rápidas
 */
class QuickActionsRegistry {
  private actions: Map<string, QuickAction> = new Map();

  /**
   * Registra una nueva acción rápida
   */
  register(action: QuickAction): void {
    this.actions.set(action.id, action);
  }

  /**
   * Elimina una acción rápida
   */
  unregister(id: string): void {
    this.actions.delete(id);
  }

  /**
   * Obtiene todas las acciones registradas
   */
  getAll(): QuickAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Filtra acciones por permisos y contexto
   */
  filter(
    userPermissions: string[],
    currentPath: string,
    maxResults: number = 5
  ): QuickAction[] {
    return this.getAll()
      .filter((action) => {
        // Verificar permisos
        if (
          !userPermissions.includes("*") &&
          !userPermissions.includes(action.permission)
        ) {
          return false;
        }

        // Acciones globales siempre se incluyen
        if (action.global) {
          return true;
        }

        // Verificar contexto
        if (action.context && action.context.length > 0) {
          return action.context.some((contextPath) =>
            currentPath.includes(contextPath)
          );
        }

        // Si no tiene contexto, incluir por defecto
        return true;
      })
      .sort((a, b) => a.priority - b.priority)
      .slice(0, maxResults);
  }

  /**
   * Limpia el registry
   */
  clear(): void {
    this.actions.clear();
  }
}

// Instancia global del registry
export const quickActionsRegistry = new QuickActionsRegistry();

/**
 * Acciones rápidas predefinidas del sistema
 */
export const systemQuickActions: QuickAction[] = [
  {
    id: "new-task",
    label: "layout.header.newTask",
    icon: () => null, // Se asignará después de importar el icono
    route: "/tasks-create",
    permission: "tasks.create",
    priority: 1,
    global: true,
    module: "tasks",
  },
  {
    id: "new-product",
    label: "layout.header.newProduct",
    icon: () => null, // Se asignará después de importar el icono
    route: "/products-create",
    permission: "products.create",
    priority: 2,
    context: ["products", "inventory"],
    module: "products",
  },
  {
    id: "upload-file",
    label: "layout.header.uploadFile",
    icon: () => null, // Se asignará después de importar el icono
    route: "/files",
    permission: "files.create",
    priority: 3,
    global: true,
    module: "files",
  },
  {
    id: "new-approval",
    label: "layout.header.newApproval",
    icon: () => null, // Se asignará después de importar el icono
    route: "/approvals-create",
    permission: "approvals.create",
    priority: 4,
    global: true,
    module: "approvals",
  },
  {
    id: "new-tag",
    label: "layout.header.newTag",
    icon: () => null, // Se asignará después de importar el icono
    route: "/tags-create",
    permission: "tags.create",
    priority: 5,
    context: ["files", "products", "tasks"],
    module: "tags",
  },
  {
    id: "new-user",
    label: "layout.header.newUser",
    icon: () => null, // Se asignará después de importar el icono
    route: "/users-create",
    permission: "users.create",
    priority: 6,
    global: true,
    module: "users",
  },
  {
    id: "new-event",
    label: "layout.header.newEvent",
    icon: () => null, // Se asignará después de importar el icono
    route: "/calendar-create",
    permission: "calendar.create",
    priority: 7,
    context: ["calendar"],
    module: "calendar",
  },
  {
    id: "new-template",
    label: "layout.header.newTemplate",
    icon: () => null, // Se asignará después de importar el icono
    route: "/templates-create",
    permission: "templates.create",
    priority: 8,
    context: ["reporting", "automation"],
    module: "templates",
  },
  {
    id: "new-integration",
    label: "layout.header.newIntegration",
    icon: () => null, // Se asignará después de importar el icono
    route: "/integrations-create",
    permission: "integrations.create",
    priority: 9,
    context: ["config.integrations"],
    module: "integrations",
  },
  {
    id: "new-automation",
    label: "layout.header.newAutomation",
    icon: () => null, // Se asignará después de importar el icono
    route: "/automation-create",
    permission: "automation.create",
    priority: 10,
    context: ["automation"],
    module: "automation",
  },
];

/**
 * Inicializa las acciones rápidas del sistema
 */
export function initializeQuickActions(): void {
  // Registrar acciones del sistema inmediatamente (sin esperar iconos)
  systemQuickActions.forEach((action) => {
    quickActionsRegistry.register(action);
  });

  // Importar iconos dinámicamente después de registrar
  import("@hugeicons/core-free-icons")
    .then(({ Add01Icon, Package01Icon, FileUploadIcon }) => {
      if (systemQuickActions[0]) systemQuickActions[0].icon = Add01Icon;
      if (systemQuickActions[1]) systemQuickActions[1].icon = Package01Icon;
      if (systemQuickActions[2]) systemQuickActions[2].icon = FileUploadIcon;
      // Icons assigned successfully
    })
    .catch(() => {
      // Error loading icons - continue without icons
    });
}
