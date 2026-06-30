/**
 * Dashboard widget registry — defines all available widgets with their metadata,
 * module links, and quick actions.
 */

import { CMOSDashboard } from "./components/CMOSDashboard";
import { FinancialDashboard } from "./components/FinancialDashboard";
import { RealEstateDashboard } from "./components/RealEstateDashboard";
import type { DashboardWidget } from "./types/widget-registry.types";

export const WIDGET_REGISTRY: DashboardWidget[] = [
  {
    id: "real-estate",
    labelKey: "dashboard.widgets.realEstate",
    descriptionKey: "dashboard.widgets.realEstateDesc",
    permission: "leases.read",
    component: RealEstateDashboard,
    defaultEnabled: true,
    colSpan: 3,
    moduleHref: "/properties",
    accentColor: "#023E87",
    quickActions: [
      {
        labelKey: "dashboard.quickActions.properties",
        href: "/properties",
        icon: "Building2",
      },
      {
        labelKey: "dashboard.quickActions.leases",
        href: "/leases",
        icon: "FileText",
      },
      {
        labelKey: "dashboard.quickActions.billing",
        href: "/billing",
        icon: "Receipt",
      },
    ],
  },
  {
    id: "financial",
    labelKey: "dashboard.widgets.financial",
    descriptionKey: "dashboard.widgets.financialDesc",
    permission: "finances.read",
    component: FinancialDashboard,
    defaultEnabled: true,
    colSpan: 3,
    moduleHref: "/finances",
    accentColor: "#00B6BC",
    quickActions: [
      {
        labelKey: "dashboard.quickActions.finances",
        href: "/finances",
        icon: "BarChart3",
      },
      {
        labelKey: "dashboard.quickActions.billing",
        href: "/billing",
        icon: "Receipt",
      },
    ],
  },
  {
    id: "cmms",
    labelKey: "dashboard.widgets.cmms",
    descriptionKey: "dashboard.widgets.cmmsDesc",
    permission: "maintenance.read",
    component: CMOSDashboard,
    defaultEnabled: true,
    colSpan: 3,
    moduleHref: "/cmms",
    accentColor: "#6366f1",
    quickActions: [
      {
        labelKey: "dashboard.quickActions.cmms",
        href: "/cmms",
        icon: "Wrench",
      },
    ],
  },
];
