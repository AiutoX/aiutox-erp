"""RBAC permissions for the notifications module."""

# Notifications permissions
NOTIFICATIONS_READ = "notifications.read"
NOTIFICATIONS_WRITE = "notifications.write"

# All notifications permissions
ALL_NOTIFICATIONS_PERMISSIONS = [
    NOTIFICATIONS_READ,
    NOTIFICATIONS_WRITE,
]

# Permission descriptions
PERMISSION_DESCRIPTIONS = {
    NOTIFICATIONS_READ: "View notification templates and queue status",
    NOTIFICATIONS_WRITE: "Create, update, and manage notification templates",
}
