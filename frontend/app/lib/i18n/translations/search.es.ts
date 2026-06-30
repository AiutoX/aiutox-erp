/**
 * Search module translations - Spanish
 */

export const searchTranslations = {
  // Common
  title: "Buscar",
  placeholder: "Buscar...",
  clearSearch: "Limpiar búsqueda",
  loading: "Buscando...",
  match: "coincidencia",

  // Search Bar
  search: {
    placeholder: "Buscar...",
    noResults: "No se encontraron resultados",
    recentSearches: "Búsquedas recientes",
    clearRecent: "Limpiar búsquedas recientes",
    loading: "Buscando...",

    // Search Results Page
    resultsFor: "Resultados para",
    noResultsFor: 'No se encontraron resultados para "{query}"',
    tryDifferent:
      "Intenta con palabras clave diferentes o elimina filtros de búsqueda",

    // Result Types
    types: {
      all: "Todos los resultados",
      user: "Usuarios",
      document: "Documentos",
      file: "Archivos",
      task: "Tareas",
      comment: "Comentarios",
      activity: "Actividades",
      audit: "Registros de auditoría",
      settings: "Configuración",
      notification: "Notificaciones",
      event: "Eventos",
    },

    // Filters
    filters: {
      title: "Filtros",
      apply: "Aplicar Filtros",
      clear: "Limpiar Todo",
      type: "Tipo",
      date: "Fecha",
      status: "Estado",

      // Date filters
      dateRange: {
        any: "Cualquier fecha",
        today: "Hoy",
        yesterday: "Ayer",
        thisWeek: "Esta semana",
        thisMonth: "Este mes",
        lastMonth: "Mes pasado",
        custom: "Rango personalizado",
      },
    },

    // Suggestions
    suggestions: {
      title: "¿Quisiste decir?",
      noSuggestions: "No hay sugerencias disponibles",
    },

    // Keyboard Shortcuts
    shortcuts: {
      press: "Presiona",
      toSearch: "para buscar",
      navigate: "para navegar",
      close: "para cerrar",
      open: "Presiona / para buscar",
      select: "Enter para seleccionar",
      newTab: "⌘+Enter para abrir en nueva pestaña",
    },
  },

  // Search Results Page
  resultsCount: '{count} resultados para "{query}"',
  noResults: "No se encontraron resultados",
  noResultsTitle: "No se encontraron resultados",
  noResultsDescription:
    "Intenta ajustar tu búsqueda o filtros para encontrar lo que buscas.",
  popularSearches: "Búsquedas populares",
  loadingMore: "Cargando más resultados...",

  // Empty States
  empty: {
    title: "¿Qué estás buscando?",
    description: "Busca usuarios, documentos, tareas y más...",
  },

  // Error States
  error: {
    title: "Error",
    fetchFailed:
      "Error al obtener resultados de búsqueda. Por favor, inténtalo de nuevo.",
    saveFailed: "Error al guardar la búsqueda.",
    clearFailed: "Error al limpiar el historial de búsquedas.",
  },

  // Common UI
  common: {
    loading: "Cargando...",
    error: "Error",
    retry: "Reintentar",
    loadMore: "Cargar más",
  },
} as const;
