"""RBAC permissions for the reporting module."""

# Reporting permissions
REPORTING_READ = "reporting.read"
REPORTING_RUN = "reporting.run"
REPORTING_ADMIN = "reporting.admin"

# All reporting permissions
ALL_REPORTING_PERMISSIONS = [
    REPORTING_READ,
    REPORTING_RUN,
    REPORTING_ADMIN,
]

# Permission descriptions
PERMISSION_DESCRIPTIONS = {
    REPORTING_READ: "View available reports and data sources",
    REPORTING_RUN: "Execute reports and generate reports",
    REPORTING_ADMIN: "Manage all report definitions and configurations",
}
