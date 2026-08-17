"""RBAC permissions for tags module."""

# Tags module permissions (4 standard permissions)
TAGS_READ = "tags.read"  # View tags and entity-tag relationships
TAGS_WRITE = "tags.write"  # Create, apply, and update tags
TAGS_DELETE = "tags.delete"  # Remove tags and entity-tag relationships
TAGS_ADMIN = "tags.admin"  # Full administration of tags module

ALL_PERMISSIONS = [
    TAGS_READ,
    TAGS_WRITE,
    TAGS_DELETE,
    TAGS_ADMIN,
]

# Permission descriptions for UI/documentation
PERMISSION_DESCRIPTIONS = {
    TAGS_READ: "Read and view tags and tag relationships",
    TAGS_WRITE: "Write, create, apply and update tags",
    TAGS_DELETE: "Delete and remove tags and tag relationships",
    TAGS_ADMIN: "Administer tags module (all permissions)",
}
