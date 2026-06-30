"""RBAC permissions for mentions module."""

# Standard mention permissions
MENTION_READ = "mentions.read"
MENTION_WRITE = "mentions.write"
MENTION_DELETE = "mentions.delete"
MENTION_ADMIN = "mentions.admin"

# All permissions for this module
ALL_PERMISSIONS = [
    MENTION_READ,
    MENTION_WRITE,
    MENTION_DELETE,
    MENTION_ADMIN,
]
