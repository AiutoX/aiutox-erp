/**
 * Search module translations - English
 */

export const searchTranslations = {
  // Common
  title: "Search",
  placeholder: "Search...",
  clearSearch: "Clear search",
  loading: "Searching...",
  match: "match",

  // Search Bar
  search: {
    placeholder: "Search...",
    noResults: "No results found",
    recentSearches: "Recent Searches",
    clearRecent: "Clear recent searches",
    loading: "Searching...",

    // Search Results Page
    resultsFor: "Results for",
    noResultsFor: 'No results found for "{query}"',
    tryDifferent: "Try different keywords or remove search filters",

    // Result Types
    types: {
      all: "All Results",
      user: "Users",
      document: "Documents",
      file: "Files",
      task: "Tasks",
      comment: "Comments",
      activity: "Activities",
      audit: "Audit Logs",
      settings: "Settings",
      notification: "Notifications",
      event: "Events",
    },

    // Filters
    filters: {
      title: "Filters",
      apply: "Apply Filters",
      clear: "Clear All",
      type: "Type",
      date: "Date",
      status: "Status",

      // Date filters
      dateRange: {
        any: "Any Time",
        today: "Today",
        yesterday: "Yesterday",
        thisWeek: "This Week",
        thisMonth: "This Month",
        lastMonth: "Last Month",
        custom: "Custom Range",
      },
    },

    // Suggestions
    suggestions: {
      title: "Did you mean?",
      noSuggestions: "No suggestions available",
    },

    // Keyboard Shortcuts
    shortcuts: {
      press: "Press",
      toSearch: "to search",
      navigate: "to navigate",
      close: "to close",
      open: "Press / to search",
      select: "Enter to select",
      newTab: "⌘+Enter to open in new tab",
    },
  },

  // Search Results Page
  resultsCount: '{count} results for "{query}"',
  noResults: "No results found",
  noResultsTitle: "No results found",
  noResultsDescription:
    "Try adjusting your search or filter to find what you're looking for.",
  popularSearches: "Popular searches",
  loadingMore: "Loading more results...",

  // Empty States
  empty: {
    title: "What are you looking for?",
    description: "Search for users, documents, tasks, and more...",
  },

  // Error States
  error: {
    title: "Error",
    fetchFailed: "Failed to fetch search results. Please try again.",
    saveFailed: "Failed to save search query.",
    clearFailed: "Failed to clear search history.",
  },

  // Common UI
  common: {
    loading: "Loading...",
    error: "Error",
    retry: "Retry",
    loadMore: "Load more",
  },
} as const;
