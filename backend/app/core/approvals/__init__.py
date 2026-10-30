"""Approvals module for approval workflows."""

from app.core.approvals.permissions import (
    ALL_APPROVAL_PERMISSIONS,
    APPROVAL_ADMIN,
    APPROVAL_APPROVE,
    APPROVAL_READ,
    APPROVAL_WRITE,
)
from app.core.approvals.service import ApprovalService

__all__ = [
    "ApprovalService",
    "APPROVAL_READ",
    "APPROVAL_WRITE",
    "APPROVAL_APPROVE",
    "APPROVAL_ADMIN",
    "ALL_APPROVAL_PERMISSIONS",
]
