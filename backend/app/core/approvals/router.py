"""FastAPI router for core.approvals module."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.approvals.models import Approval
from app.core.approvals.schemas import (
    ApprovalApprove,
    ApprovalCancel,
    ApprovalCreate,
    ApprovalListResponse,
    ApprovalReject,
    ApprovalResponse,
    ApprovalUpdate,
)
from app.core.approvals.service import ApprovalService
from app.core.auth import get_current_user
from app.core.db.deps import get_db
from app.core.responses import StandardResponse
from app.core.users.models import User

router = APIRouter(prefix="/approvals", tags=["approvals"])


def get_approval_service(db: Session = Depends(get_db)) -> ApprovalService:
    """Get approval service instance."""
    return ApprovalService(db)


async def get_approval_by_id(
    approval_id: UUID,
    service: ApprovalService = Depends(get_approval_service),
    current_user: User = Depends(get_current_user),
) -> Approval:
    """Get approval by ID with tenant isolation."""
    approval = service.get_approval(approval_id, current_user.tenant_id)
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approval not found",
        )
    return approval


@router.get("/", response_model=StandardResponse[ApprovalListResponse])
async def list_approvals(
    status_filter: str | None = None,
    approver_id: UUID | None = None,
    requester_id: UUID | None = None,
    skip: int = 0,
    limit: int = 100,
    service: ApprovalService = Depends(get_approval_service),
    current_user: User = Depends(get_current_user),
):
    """List all approvals for tenant with optional filters."""
    try:
        approvals = service.list_approvals(
            tenant_id=current_user.tenant_id,
            status=status_filter,
            approver_id=approver_id,
            requester_id=requester_id,
            skip=skip,
            limit=limit,
        )

        return StandardResponse(
            data=ApprovalListResponse(
                data=[ApprovalResponse.model_validate(a) for a in approvals],
                total=len(approvals),
                skip=skip,
                limit=limit,
            )
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/{approval_id}", response_model=StandardResponse[ApprovalResponse])
async def get_approval(
    approval: Approval = Depends(get_approval_by_id),
):
    """Get a specific approval by ID."""
    return StandardResponse(data=ApprovalResponse.model_validate(approval))


@router.post(
    "/",
    response_model=StandardResponse[ApprovalResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_approval(
    approval_data: ApprovalCreate,
    service: ApprovalService = Depends(get_approval_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new approval request."""
    try:
        if approval_data.tenant_id != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create approval for different tenant",
            )

        approval = await service.create_approval(
            **approval_data.model_dump(exclude={"tenant_id"}),
            tenant_id=current_user.tenant_id,
        )

        return StandardResponse(
            data=ApprovalResponse.model_validate(approval),
            message="Approval created successfully",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put("/{approval_id}", response_model=StandardResponse[ApprovalResponse])
async def update_approval(
    approval_id: UUID,
    approval_data: ApprovalUpdate,
    approval: Approval = Depends(get_approval_by_id),
    service: ApprovalService = Depends(get_approval_service),
):
    """Update an approval (only if pending)."""
    try:
        updated = service.update_approval(
            approval,
            **approval_data.model_dump(exclude_none=True),
        )

        return StandardResponse(
            data=ApprovalResponse.model_validate(updated),
            message="Approval updated successfully",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/{approval_id}/approve", response_model=StandardResponse[ApprovalResponse]
)
async def approve_approval(
    approval_id: UUID,
    approve_data: ApprovalApprove,
    approval: Approval = Depends(get_approval_by_id),
    service: ApprovalService = Depends(get_approval_service),
):
    """Approve an approval request."""
    try:
        updated = await service.approve_approval(
            approval,
            approver_id=approve_data.approver_id,
        )

        return StandardResponse(
            data=ApprovalResponse.model_validate(updated),
            message="Approval approved successfully",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{approval_id}/reject", response_model=StandardResponse[ApprovalResponse])
async def reject_approval(
    approval_id: UUID,
    reject_data: ApprovalReject,
    approval: Approval = Depends(get_approval_by_id),
    service: ApprovalService = Depends(get_approval_service),
):
    """Reject an approval request with reason."""
    try:
        updated = await service.reject_approval(
            approval,
            approver_id=reject_data.approver_id,
            reason=reject_data.reason,
        )

        return StandardResponse(
            data=ApprovalResponse.model_validate(updated),
            message="Approval rejected successfully",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{approval_id}/cancel", response_model=StandardResponse[ApprovalResponse])
async def cancel_approval(
    approval_id: UUID,
    cancel_data: ApprovalCancel,
    approval: Approval = Depends(get_approval_by_id),
    service: ApprovalService = Depends(get_approval_service),
):
    """Cancel an approval request."""
    try:
        updated = await service.cancel_approval(
            approval,
            user_id=cancel_data.user_id,
        )

        return StandardResponse(
            data=ApprovalResponse.model_validate(updated),
            message="Approval cancelled successfully",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{approval_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_approval(
    approval_id: UUID,
    approval: Approval = Depends(get_approval_by_id),
    service: ApprovalService = Depends(get_approval_service),
):
    """Delete an approval (only if pending)."""
    try:
        service.delete_approval(approval)
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
