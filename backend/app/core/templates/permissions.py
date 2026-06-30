"""RBAC permissions for the templates module."""

# Templates permissions
TEMPLATES_READ = "templates.read"
TEMPLATES_WRITE = "templates.write"
TEMPLATES_DELETE = "templates.delete"
TEMPLATES_ADMIN = "templates.admin"

# All templates permissions
ALL_TEMPLATES_PERMISSIONS = [
    TEMPLATES_READ,
    TEMPLATES_WRITE,
    TEMPLATES_DELETE,
    TEMPLATES_ADMIN,
]

# Permission descriptions
PERMISSION_DESCRIPTIONS = {
    TEMPLATES_READ: "View templates and render history",
    TEMPLATES_WRITE: "Create and update templates",
    TEMPLATES_DELETE: "Delete templates",
    TEMPLATES_ADMIN: "Manage all template settings and categories",
}
