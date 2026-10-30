"""RBAC permissions for the comments module.

Matches what the live, mounted router (app/api/v1/comments.py) actually checks via
require_permission(), and what auth.permissions.MODULE_ROLES["comments"] grants for
real role assignment. See tests/core/comments/test_permissions.py.
"""

# Comments permissions
COMMENTS_VIEW = "comments.view"
COMMENTS_CREATE = "comments.create"
COMMENTS_EDIT = "comments.edit"
COMMENTS_DELETE = "comments.delete"
COMMENTS_MANAGE = "comments.manage"

# All comments permissions
ALL_COMMENTS_PERMISSIONS = [
    COMMENTS_VIEW,
    COMMENTS_CREATE,
    COMMENTS_EDIT,
    COMMENTS_DELETE,
    COMMENTS_MANAGE,
]

# Permission descriptions
PERMISSION_DESCRIPTIONS = {
    COMMENTS_VIEW: "View comments and threads",
    COMMENTS_CREATE: "Create comments and mention users",
    COMMENTS_EDIT: "Edit own comments (author-only, never another user's comment)",
    COMMENTS_DELETE: "Delete own comments (author-only)",
    COMMENTS_MANAGE: "Delete any comment for moderation (never grants edit rights over another user's comment)",
}
