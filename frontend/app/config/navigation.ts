import { HomeIcon, Calendar01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

/**
 * Configuración de items de navegación del sidebar
 */

export interface NavItem {
  id: string;
  label: string;
  icon: IconSvgElement;
  to?: string; // Opcional si tiene children
  permission?: string; // Permiso requerido para mostrar el item
  badge?: number; // Contador opcional (ej: notificaciones)
  order?: number;
  children?: NavItem[]; // Sub-items
  requiresAnyPermission?: string[]; // Mostrar si tiene al menos uno de estos permisos
  requiresModuleSetting?: {
    module: string;
    key: string;
    value?: boolean;
  };
  category?: string; // Categoría de navegación (ej: "Configuración"). Si no se especifica, va a _root
}

/**
 * Items de navegación principales
 *
 * Mantiene únicamente accesos raíz globales. El resto de la navegación se
 * inyecta dinámicamente desde los módulos descubiertos.
 */
export const navigationItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: HomeIcon,
    to: "/",
  },
  {
    id: "calendar",
    label: "Mi calendario",
    icon: Calendar01Icon,
    to: "/calendar",
    permission: "calendar.view",
    requiresModuleSetting: {
      module: "tasks",
      key: "calendar.enabled",
      value: true,
    },
  },
];
