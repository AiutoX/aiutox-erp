"""RBAC permissions for the activities module."""

# Activities permissions
ACTIVITIES_READ = "activities.read"
ACTIVITIES_WRITE = "activities.write"
ACTIVITIES_DELETE = "activities.delete"
ACTIVITIES_ADMIN = "activities.admin"

# All activities permissions
ALL_ACTIVITIES_PERMISSIONS = [
    ACTIVITIES_READ,
    ACTIVITIES_WRITE,
    ACTIVITIES_DELETE,
    ACTIVITIES_ADMIN,
]

# Permission descriptions
PERMISSION_DESCRIPTIONS = {
    ACTIVITIES_READ: "View activity logs and history",
    ACTIVITIES_WRITE: "Create and update activities",
    ACTIVITIES_DELETE: "Delete activities from logs",
    ACTIVITIES_ADMIN: "Manage all activity settings and filters",
}
