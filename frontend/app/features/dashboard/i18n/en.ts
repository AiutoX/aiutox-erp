export const translations = {
  dashboard: {
    title: "Dashboard",
    description: "Main control panel of AiutoX ERP",
    welcome: "Welcome",
    welcomeDescription: "Main system panel",
    comingSoon: "Dashboard content coming soon",
    configure: "Customize",
    configureWidgets: "Dashboard Widgets",
    resetDefaults: "Restore defaults",
    errorLoading: "Error loading dashboard",
    noData: "No data available",
    emptyTitle: "No widgets to show",
    emptyDescription:
      "You have no widgets enabled. Use Customize to choose the ones you want to see.",
    emptyNoneAvailable:
      "No widgets are available for your account. This depends on your organization's enabled modules and your permissions. Check with your administrator.",
    widgets: {
      realEstate: "Real Estate",
      realEstateDesc: "Occupancy, aging portfolio, expiring contracts",
      financial: "Financial",
      financialDesc: "Monthly P&L, cash flow, top revenue properties",
      cmms: "Maintenance",
      cmmsDesc: "Work orders by status, MTTR, top failing assets",
    },

    realEstate: {
      title: "Real Estate Dashboard",
      ocupacionTitle: "Property occupancy",
      agingTitle: "Overdue portfolio (aging)",
      contratosTitle: "Expiring contracts",
      otsCriticasTitle: "Critical / high work orders",
      total: "properties",
      ocupados: "Occupied",
      disponibles: "Available",
      mantenimiento: "In maintenance",
      otros: "Others",
    },

    financial: {
      title: "Financial Dashboard",
      plTitle: "P&L current month",
      ingresos: "Revenue",
      egresos: "Expenses",
      neto: "Net result",
      flujoCajaTitle: "Cash flow",
      topRentablesTitle: "Top 5 properties by revenue",
      topMorososTitle: "Top 5 debtors",
    },

    cmms: {
      title: "CMMS Dashboard",
      otsByStatusTitle: "Work orders by status",
      mttrTitle: "MTTR last 6 months",
      mttrLabel: "Avg hours",
      pmTitle: "PM Compliance",
      pmDescription: "% preventive orders completed on time",
      topAssetsTitle: "Top assets by failures",
      failures: "failures",
    },
  },
};
