/**
 * Dashboard widget registry types
 */

import type { ComponentType } from "react";

export interface DashboardQuickAction {
  /** i18n label key */
  labelKey: string;
  /** Route path */
  href: string;
  /** lucide icon name — caller resolves */
  icon: string;
}

export interface DashboardWidget {
  id: string;
  labelKey: string;
  descriptionKey: string;
  permission: string;
  component: ComponentType;
  defaultEnabled: boolean;
  colSpan: 1 | 2 | 3;
  /** Route to open the full module */
  moduleHref?: string;
  /** Accent color for the module section header (Tailwind bg class) */
  accentColor?: string;
  /** Quick-access actions shown in the module header */
  quickActions?: DashboardQuickAction[];
}

export interface WidgetPreferences {
  enabledWidgets: string[];
}
