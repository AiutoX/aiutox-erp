"""Import/Export module permission constants."""

IMPORT_EXPORT_READ = "import_export.read"  # View import/export jobs and templates
IMPORT_EXPORT_WRITE = (
    "import_export.write"  # Create and manage import/export operations
)
IMPORT_EXPORT_DELETE = "import_export.delete"  # Delete import/export jobs and templates
IMPORT_EXPORT_ADMIN = "import_export.admin"  # Full import/export administration

ALL_IMPORT_EXPORT_PERMISSIONS = [
    IMPORT_EXPORT_READ,
    IMPORT_EXPORT_WRITE,
    IMPORT_EXPORT_DELETE,
    IMPORT_EXPORT_ADMIN,
]

PERMISSION_DESCRIPTIONS = {
    IMPORT_EXPORT_READ: "View import/export jobs, templates, and download export files",
    IMPORT_EXPORT_WRITE: "Create and manage import/export operations, upload files",
    IMPORT_EXPORT_DELETE: "Delete import/export jobs and templates",
    IMPORT_EXPORT_ADMIN: "Full import/export administration and configuration",
}
