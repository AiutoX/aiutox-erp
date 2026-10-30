"""Pydantic schemas for core.approvals module."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# Base schemas
class ApprovalBase(BaseModel):
    """Base schema for Approval with common fields."""

    title: str = Field(..., max_length=255, min_length=1, description="Approval title")
    description: str | None = Field(
        None, max_length=1000, description="Approval description"
    )
    amount: Decimal | None = Field(
        None, ge=0, decimal_places=2, description="Approval amount"
    )
    currency: str = Field("USD", max_length=3, description="Currency code")
    due_date: date | None = Field(None, description="Due date for approval")
    approver_id: UUID | None = Field(None, description="Approver user ID")
    entity_type: str | None = Field(
        None, max_length=50, description="Polymorphic entity type"
    )
    entity_id: UUID | None = Field(None, description="Polymorphic entity ID")
    context: dict[str, Any] = Field(
        default_factory=dict, description="Additional context"
    )
    metadata: dict[str, Any] = Field(default_factory=dict, description="Metadata")

    model_config = ConfigDict(from_attributes=True)


class ApprovalCreate(ApprovalBase):
    """Schema for creating a new approval."""

    tenant_id: UUID = Field(..., description="Tenant ID")
    requested_by_id: UUID = Field(..., description="User requesting approval")


class ApprovalUpdate(BaseModel):
    """Schema for updating an existing approval."""

    title: str | None = Field(
        None, max_length=255, min_length=1, description="Approval title"
    )
    description: str | None = Field(
        None, max_length=1000, description="Approval description"
    )
    amount: Decimal | None = Field(
        None, ge=0, decimal_places=2, description="Approval amount"
    )
    due_date: date | None = Field(None, description="Due date for approval")
    approver_id: UUID | None = Field(None, description="Approver user ID")
    context: dict[str, Any] = Field(
        default_factory=dict, description="Additional context"
    )
    metadata: dict[str, Any] = Field(default_factory=dict, description="Metadata")


class ApprovalApprove(BaseModel):
    """Schema for approving an approval."""

    approver_id: UUID = Field(..., description="User approving")


class ApprovalReject(BaseModel):
    """Schema for rejecting an approval."""

    approver_id: UUID = Field(..., description="User rejecting")
    reason: str = Field(
        ..., max_length=500, min_length=1, description="Rejection reason"
    )


class ApprovalCancel(BaseModel):
    """Schema for cancelling an approval."""

    user_id: UUID = Field(..., description="User cancelling")


# Response schemas
class ApprovalResponse(ApprovalBase):
    """Response schema for Approval."""

    id: UUID
    tenant_id: UUID
    status: str = Field(..., description="Current status")
    requested_by_id: UUID | None = Field(None, description="User who requested")
    approver_id: UUID | None = Field(None, description="User who approved/rejected")
    rejection_reason: str | None = Field(
        None, description="Rejection reason if rejected"
    )
    created_at: datetime
    updated_at: datetime


class ApprovalListResponse(BaseModel):
    """Response for listing approvals."""

    data: list[ApprovalResponse]
    total: int
    skip: int
    limit: int

    model_config = ConfigDict(from_attributes=True)


class StandardResponse(BaseModel):
    """Standard response wrapper."""

    data: Any = None
    error: str | None = None
    message: str | None = None

    model_config = ConfigDict(from_attributes=True)
