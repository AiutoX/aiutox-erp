/**
 * Dashboard feature — public API
 */

export { RealEstateDashboard } from "./components/RealEstateDashboard";
export { FinancialDashboard } from "./components/FinancialDashboard";
export { CMOSDashboard } from "./components/CMOSDashboard";
export {
  useRealEstateDashboard,
  useFinancialDashboard,
  useCMOSDashboard,
} from "./hooks/useDashboard";
export { useWidgetPreferences } from "./hooks/useWidgetPreferences";
export { WIDGET_REGISTRY } from "./widget-registry";
export * from "./types/dashboard.types";
export * from "./types/widget-registry.types";
export * from "./api/dashboard.api";
