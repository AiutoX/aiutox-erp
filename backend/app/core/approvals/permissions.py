"""RBAC permissions for the approvals module."""

# Approval permissions (4 total)
APPROVAL_READ = "approvals.read"
APPROVAL_WRITE = "approvals.write"
APPROVAL_APPROVE = "approvals.approve"
APPROVAL_ADMIN = "approvals.admin"

# All approval permissions
ALL_APPROVAL_PERMISSIONS = [
    APPROVAL_READ,
    APPROVAL_WRITE,
    APPROVAL_APPROVE,
    APPROVAL_ADMIN,
]

# Permission descriptions
PERMISSION_DESCRIPTIONS = {
    APPROVAL_READ: "View approvals",
    APPROVAL_WRITE: "Create and edit approvals",
    APPROVAL_APPROVE: "Approve or reject approvals",
    APPROVAL_ADMIN: "Manage all approval settings",
}
