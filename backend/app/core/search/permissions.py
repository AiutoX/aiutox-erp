"""Search module permission constants."""

SEARCH_READ = "search.read"  # Use search functionality
SEARCH_ADMIN = "search.admin"  # Manage search configuration

ALL_SEARCH_PERMISSIONS = [SEARCH_READ, SEARCH_ADMIN]

PERMISSION_DESCRIPTIONS = {
    SEARCH_READ: "Use search functionality across entities",
    SEARCH_ADMIN: "Manage search indexes and configuration",
}
