/**
 * Dashboard feature — public API
 */

export { RealEstateDashboard } from "./components/RealEstateDashboard";
export { FinancialDashboard } from "./components/FinancialDashboard";
export { CMOSDashboard } from "./components/CMOSDashboard";
export {
  useRealEstateWidgetData,
  useFinancesWidgetData,
  useCmmsWidgetData,
} from "./hooks/useWidgetData";
export { useWidgetPreferences } from "./hooks/useWidgetPreferences";
export { useAvailableWidgets, useMyWidgets } from "./hooks/useWidgets";
export { resolveWidgetComponent } from "./widgetComponentResolver";
export * from "./types/dashboard.types";
export * from "./types/widgets-api.types";
export * from "./api/widget-data.api";
export * from "./api/widgets.api";
