"""RBAC permissions for the comments module."""

# Comments permissions
COMMENTS_READ = "comments.read"
COMMENTS_WRITE = "comments.write"
COMMENTS_DELETE = "comments.delete"
COMMENTS_ADMIN = "comments.admin"

# All comments permissions
ALL_COMMENTS_PERMISSIONS = [
    COMMENTS_READ,
    COMMENTS_WRITE,
    COMMENTS_DELETE,
    COMMENTS_ADMIN,
]

# Permission descriptions
PERMISSION_DESCRIPTIONS = {
    COMMENTS_READ: "View comments and threads",
    COMMENTS_WRITE: "Create and update comments, mention users",
    COMMENTS_DELETE: "Delete comments",
    COMMENTS_ADMIN: "Manage all comment settings and moderation",
}
