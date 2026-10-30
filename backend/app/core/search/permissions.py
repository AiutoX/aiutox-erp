"""Search module permission constants."""

SEARCH_VIEW = "search.view"  # Use search functionality
SEARCH_MANAGE = "search.manage"  # Manage search configuration / reindex

ALL_SEARCH_PERMISSIONS = [SEARCH_VIEW, SEARCH_MANAGE]

PERMISSION_DESCRIPTIONS = {
    SEARCH_VIEW: "Use search functionality across entities",
    SEARCH_MANAGE: "Manage search indexes and configuration",
}
