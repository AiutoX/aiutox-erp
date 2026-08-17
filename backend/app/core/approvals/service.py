"""Approval service for business logic."""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.core.approvals.events import get_approval_event_publisher
from app.core.approvals.models import (
    Approval,
    ApprovalAction,
    ApprovalDelegation,
    ApprovalFlow,
    ApprovalRequest,
    ApprovalStatus,
    ApprovalStep,
)
from app.core.logging import get_logger
from app.core.pubsub.publisher import EventPublisher

logger = get_logger(__name__)


class ApprovalRepository:
    """Repository for approval data access."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # -------------------------------------------------------------------------
    # ApprovalFlow
    # -------------------------------------------------------------------------

    def get_approval_steps_by_flow(
        self, flow_id: UUID, tenant_id: UUID
    ) -> list[ApprovalStep]:
        return (
            self.db.query(ApprovalStep)
            .filter(
                ApprovalStep.flow_id == flow_id,
                ApprovalStep.tenant_id == tenant_id,
            )
            .order_by(ApprovalStep.step_order)
            .all()
        )


class ApprovalService:
    """Service for approval management."""

    def __init__(
        self,
        db: Session,
        event_publisher: EventPublisher | None = None,
        flow_runs_service=None,
    ):
        """Initialize approval service."""
        self.db = db
        self.event_publisher = (
            event_publisher
            if event_publisher is not None
            else get_approval_event_publisher()
        )
        self.flow_runs_service = flow_runs_service
        self.repository = ApprovalRepository(db)

    # =========================================================================
    # ApprovalFlow methods
    # =========================================================================

    def create_approval_flow(
        self,
        flow_data: dict,
        tenant_id: UUID,
        user_id: UUID,
    ) -> ApprovalFlow:
        """Create a new approval flow."""
        flow = ApprovalFlow(
            tenant_id=tenant_id,
            name=flow_data["name"],
            description=flow_data.get("description"),
            flow_type=flow_data.get("flow_type", "sequential"),
            module=flow_data.get("module", "generic"),
            conditions=flow_data.get("conditions"),
            is_active=flow_data.get("is_active", True),
            created_by=user_id,
        )
        self.db.add(flow)
        self.db.commit()
        self.db.refresh(flow)
        logger.info(f"ApprovalFlow created: {flow.id}")
        return flow

    def get_approval_flows(
        self,
        tenant_id: UUID,
        module: str | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[ApprovalFlow]:
        """List approval flows."""
        query = self.db.query(ApprovalFlow).filter(
            ApprovalFlow.tenant_id == tenant_id,
            ApprovalFlow.deleted_at.is_(None),
        )
        if module:
            query = query.filter(ApprovalFlow.module == module)
        if is_active is not None:
            query = query.filter(ApprovalFlow.is_active == is_active)
        return (
            query.order_by(ApprovalFlow.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_approval_flow(self, flow_id: UUID, tenant_id: UUID) -> ApprovalFlow | None:
        """Get a specific approval flow."""
        return (
            self.db.query(ApprovalFlow)
            .filter(
                ApprovalFlow.id == flow_id,
                ApprovalFlow.tenant_id == tenant_id,
                ApprovalFlow.deleted_at.is_(None),
            )
            .first()
        )

    def update_approval_flow(
        self,
        flow_id: UUID,
        flow_data: dict,
        tenant_id: UUID,
        user_id: UUID,
    ) -> ApprovalFlow:
        """Update an approval flow."""
        flow = self.get_approval_flow(flow_id, tenant_id)
        if not flow:
            raise ValueError(f"Approval flow {flow_id} not found")

        for key, value in flow_data.items():
            if hasattr(flow, key):
                setattr(flow, key, value)
        flow.updated_by = user_id  # type: ignore[assignment]
        self.db.commit()
        self.db.refresh(flow)
        return flow

    def delete_approval_flow(self, flow_id: UUID, tenant_id: UUID) -> None:
        """Soft-delete an approval flow."""
        flow = self.get_approval_flow(flow_id, tenant_id)
        if not flow:
            raise ValueError(f"Approval flow {flow_id} not found")

        # Check for active requests
        active = (
            self.db.query(ApprovalRequest)
            .filter(
                ApprovalRequest.flow_id == flow_id,
                ApprovalRequest.tenant_id == tenant_id,
                ApprovalRequest.status == "pending",
            )
            .count()
        )
        if active:
            raise ValueError("Cannot delete flow with active requests")

        flow.deleted_at = datetime.now(UTC)  # type: ignore[assignment]
        flow.is_active = False  # type: ignore[assignment]
        self.db.commit()

    # =========================================================================
    # ApprovalStep methods
    # =========================================================================

    def add_approval_step(
        self,
        flow_id: UUID,
        tenant_id: UUID,
        step_data: dict,
    ) -> ApprovalStep:
        """Add a step to an approval flow."""
        flow = self.get_approval_flow(flow_id, tenant_id)
        if not flow:
            raise ValueError(f"Approval flow {flow_id} not found")

        step = ApprovalStep(
            tenant_id=tenant_id,
            flow_id=flow_id,
            step_order=step_data.get("step_order", 1),
            name=step_data["name"],
            description=step_data.get("description"),
            approver_type=step_data.get("approver_type", "user"),
            approver_id=step_data.get("approver_id"),
            approver_role=step_data.get("approver_role"),
            approver_rule=step_data.get("approver_rule"),
            require_all=step_data.get("require_all", False),
            min_approvals=step_data.get("min_approvals"),
            form_schema=step_data.get("form_schema"),
            print_config=step_data.get("print_config"),
            rejection_required=step_data.get("rejection_required", False),
        )
        self.db.add(step)
        self.db.commit()
        self.db.refresh(step)
        return step

    def get_approval_steps_by_flow(
        self, flow_id: UUID, tenant_id: UUID
    ) -> list[ApprovalStep]:
        """Get all steps for a flow."""
        return self.repository.get_approval_steps_by_flow(flow_id, tenant_id)

    def update_approval_step(
        self,
        step_id: UUID,
        flow_id: UUID,
        step_data: dict,
        tenant_id: UUID,
    ) -> ApprovalStep:
        """Update an approval step."""
        step = (
            self.db.query(ApprovalStep)
            .filter(
                ApprovalStep.id == step_id,
                ApprovalStep.flow_id == flow_id,
                ApprovalStep.tenant_id == tenant_id,
            )
            .first()
        )
        if not step:
            raise ValueError(f"Approval step {step_id} not found")

        for key, value in step_data.items():
            if hasattr(step, key):
                setattr(step, key, value)
        self.db.commit()
        self.db.refresh(step)
        return step

    def delete_approval_step(
        self, step_id: UUID, flow_id: UUID, tenant_id: UUID
    ) -> None:
        """Delete an approval step."""
        step = (
            self.db.query(ApprovalStep)
            .filter(
                ApprovalStep.id == step_id,
                ApprovalStep.flow_id == flow_id,
                ApprovalStep.tenant_id == tenant_id,
            )
            .first()
        )
        if not step:
            raise ValueError(f"Approval step {step_id} not found")
        self.db.delete(step)
        self.db.commit()

    def delete_all_flow_steps(self, flow_id: UUID, tenant_id: UUID) -> None:
        """Delete all steps for a flow."""
        flow = self.get_approval_flow(flow_id, tenant_id)
        if not flow:
            raise ValueError(f"Approval flow {flow_id} not found")
        self.db.query(ApprovalStep).filter(
            ApprovalStep.flow_id == flow_id,
            ApprovalStep.tenant_id == tenant_id,
        ).delete()
        self.db.commit()

    # =========================================================================
    # ApprovalRequest methods
    # =========================================================================

    def create_approval_request(
        self,
        request_data: dict,
        tenant_id: UUID,
        user_id: UUID,
    ) -> ApprovalRequest:
        """Create an approval request."""
        req = ApprovalRequest(
            tenant_id=tenant_id,
            flow_id=request_data["flow_id"],
            title=request_data["title"],
            description=request_data.get("description"),
            entity_type=request_data.get("entity_type", "generic"),
            entity_id=request_data.get("entity_id"),
            status="pending",
            current_step=1,
            requested_by=user_id,
            request_metadata=request_data.get("metadata"),
        )
        self.db.add(req)
        self.db.commit()
        self.db.refresh(req)

        # Create flow run if flow_runs_service is available
        if self.flow_runs_service:
            try:
                self.flow_runs_service.create_flow_run(
                    flow_id=req.flow_id,
                    entity_type=req.entity_type,
                    entity_id=req.entity_id,
                    tenant_id=tenant_id,
                    run_metadata={
                        "approval_request_id": str(req.id),
                        "flow_type": "approval",
                    },
                )
            except Exception as e:
                logger.warning(f"Failed to create flow run: {e}")

        logger.info(f"ApprovalRequest created: {req.id}")
        return req

    def get_approval_requests(
        self,
        tenant_id: UUID,
        flow_id: UUID | None = None,
        entity_type: str | None = None,
        entity_id: UUID | None = None,
        status: str | None = None,
        requested_by: UUID | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[ApprovalRequest]:
        """List approval requests."""
        query = self.db.query(ApprovalRequest).filter(
            ApprovalRequest.tenant_id == tenant_id
        )
        if flow_id:
            query = query.filter(ApprovalRequest.flow_id == flow_id)
        if entity_type:
            query = query.filter(ApprovalRequest.entity_type == entity_type)
        if entity_id:
            query = query.filter(ApprovalRequest.entity_id == entity_id)
        if status:
            query = query.filter(ApprovalRequest.status == status)
        return (
            query.order_by(ApprovalRequest.requested_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_approval_request(
        self, request_id: UUID, tenant_id: UUID
    ) -> ApprovalRequest | None:
        """Get a specific approval request."""
        return (
            self.db.query(ApprovalRequest)
            .filter(
                ApprovalRequest.id == request_id,
                ApprovalRequest.tenant_id == tenant_id,
            )
            .first()
        )

    def approve_request(
        self,
        request_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        comment: str | None = None,
        form_data: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ApprovalRequest:
        """Approve a request at the current step."""
        req = self.get_approval_request(request_id, tenant_id)
        if not req:
            raise ValueError(f"Approval request {request_id} not found")

        action = ApprovalAction(
            tenant_id=tenant_id,
            request_id=request_id,
            action_type="approve",
            step_order=req.current_step,
            comment=comment,
            form_data=form_data,
            acted_by=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(action)

        # Check if this was the last step
        steps = self.get_approval_steps_by_flow(req.flow_id, tenant_id)  # type: ignore[arg-type]
        max_step = max((s.step_order for s in steps), default=1)

        if req.current_step >= max_step:
            req.status = "approved"  # type: ignore[assignment]
            req.completed_at = datetime.now(UTC)  # type: ignore[assignment]
            if self.flow_runs_service:
                self._complete_flow_run(req, tenant_id, user_id)
        else:
            req.current_step += 1  # type: ignore[assignment]

        self.db.commit()
        self.db.refresh(req)
        return req

    def reject_request(
        self,
        request_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        comment: str | None = None,
        rejection_reason: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ApprovalRequest:
        """Reject a request."""
        req = self.get_approval_request(request_id, tenant_id)
        if not req:
            raise ValueError(f"Approval request {request_id} not found")

        action = ApprovalAction(
            tenant_id=tenant_id,
            request_id=request_id,
            action_type="reject",
            step_order=req.current_step,
            comment=comment,
            rejection_reason=rejection_reason,
            acted_by=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(action)

        req.status = "rejected"  # type: ignore[assignment]
        req.completed_at = datetime.now(UTC)  # type: ignore[assignment]
        if self.flow_runs_service:
            self._fail_flow_run(req, tenant_id, user_id)

        self.db.commit()
        self.db.refresh(req)
        return req

    def cancel_request(
        self, request_id: UUID, tenant_id: UUID, user_id: UUID
    ) -> ApprovalRequest:
        """Cancel a request."""
        req = self.get_approval_request(request_id, tenant_id)
        if not req:
            raise ValueError(f"Approval request {request_id} not found")
        if req.status != "pending":
            raise ValueError(f"Cannot cancel request with status '{req.status}'")

        action = ApprovalAction(
            tenant_id=tenant_id,
            request_id=request_id,
            action_type="cancel",
            step_order=req.current_step,
            acted_by=user_id,
        )
        self.db.add(action)

        req.status = "cancelled"  # type: ignore[assignment]
        req.completed_at = datetime.now(UTC)  # type: ignore[assignment]
        self.db.commit()
        self.db.refresh(req)
        return req

    def bulk_approve_requests(
        self,
        request_ids: list[UUID],
        tenant_id: UUID,
        user_id: UUID,
        comment: str | None = None,
    ) -> list[ApprovalRequest]:
        """Bulk approve requests."""
        results = []
        for rid in request_ids:
            try:
                req = self.approve_request(rid, tenant_id, user_id, comment=comment)
                results.append(req)
            except Exception as e:
                logger.warning(f"Failed to approve request {rid}: {e}")
        return results

    def bulk_reject_requests(
        self,
        request_ids: list[UUID],
        tenant_id: UUID,
        user_id: UUID,
        rejection_reason: str | None = None,
        comment: str | None = None,
    ) -> list[ApprovalRequest]:
        """Bulk reject requests."""
        results = []
        for rid in request_ids:
            try:
                req = self.reject_request(
                    rid,
                    tenant_id,
                    user_id,
                    comment=comment,
                    rejection_reason=rejection_reason,
                )
                results.append(req)
            except Exception as e:
                logger.warning(f"Failed to reject request {rid}: {e}")
        return results

    def get_approval_actions(
        self, request_id: UUID, tenant_id: UUID
    ) -> list[ApprovalAction]:
        """Get all actions for a request."""
        return (
            self.db.query(ApprovalAction)
            .filter(
                ApprovalAction.request_id == request_id,
                ApprovalAction.tenant_id == tenant_id,
            )
            .order_by(ApprovalAction.acted_at)
            .all()
        )

    def get_request_timeline(self, request_id: UUID, tenant_id: UUID) -> list[dict]:
        """Get timeline of actions and delegations for a request."""
        req = self.get_approval_request(request_id, tenant_id)
        if not req:
            raise ValueError(f"Approval request {request_id} not found")

        # Start with a request_created event
        timeline = [
            {
                "type": "request_created",
                "timestamp": req.requested_at.isoformat() if req.requested_at else None,
                "actor_id": str(req.requested_by) if req.requested_by else None,
                "data": {
                    "title": req.title,
                    "entity_type": req.entity_type,
                    "entity_id": str(req.entity_id) if req.entity_id else None,
                    "status": req.status,
                },
            }
        ]

        actions = self.get_approval_actions(request_id, tenant_id)
        for action in actions:
            timeline.append(
                {
                    "type": "action",
                    "timestamp": (
                        action.acted_at.isoformat() if action.acted_at else None
                    ),
                    "actor_id": str(action.acted_by) if action.acted_by else None,
                    "data": {
                        "action_type": action.action_type,
                        "step_order": (
                            str(action.step_order)
                            if action.step_order is not None
                            else None
                        ),
                        "comment": action.comment,
                        "rejection_reason": action.rejection_reason,
                    },
                }
            )

        delegations = self.get_delegations(request_id, tenant_id)
        for d in delegations:
            timeline.append(
                {
                    "type": "delegation",
                    "timestamp": d.created_at.isoformat() if d.created_at else None,
                    "actor_id": str(d.from_user_id),
                    "data": {
                        "from_user_id": str(d.from_user_id),
                        "to_user_id": str(d.to_user_id),
                        "reason": d.reason,
                    },
                }
            )

        timeline.sort(key=lambda x: str(x.get("timestamp") or ""))
        return timeline

    def get_approval_stats(self, tenant_id: UUID) -> dict:
        """Get approval statistics for a tenant."""
        base = self.db.query(ApprovalRequest).filter(
            ApprovalRequest.tenant_id == tenant_id
        )
        total = base.count()
        pending = (
            self.db.query(ApprovalRequest)
            .filter(
                ApprovalRequest.tenant_id == tenant_id,
                ApprovalRequest.status == "pending",
            )
            .count()
        )
        approved = (
            self.db.query(ApprovalRequest)
            .filter(
                ApprovalRequest.tenant_id == tenant_id,
                ApprovalRequest.status == "approved",
            )
            .count()
        )
        rejected = (
            self.db.query(ApprovalRequest)
            .filter(
                ApprovalRequest.tenant_id == tenant_id,
                ApprovalRequest.status == "rejected",
            )
            .count()
        )
        cancelled = (
            self.db.query(ApprovalRequest)
            .filter(
                ApprovalRequest.tenant_id == tenant_id,
                ApprovalRequest.status == "cancelled",
            )
            .count()
        )
        return {
            "total_requests": total,
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "cancelled": cancelled,
            "status_counts": {
                "pending": pending,
                "approved": approved,
                "rejected": rejected,
                "cancelled": cancelled,
            },
        }

    def get_entity_approval_status(
        self, entity_type: str, entity_id: UUID, tenant_id: UUID
    ) -> dict | None:
        """Get the latest approval status for an entity."""
        req = (
            self.db.query(ApprovalRequest)
            .filter(
                ApprovalRequest.entity_type == entity_type,
                ApprovalRequest.entity_id == entity_id,
                ApprovalRequest.tenant_id == tenant_id,
            )
            .order_by(ApprovalRequest.requested_at.desc())
            .first()
        )
        if not req:
            return None
        return {
            "request_id": str(req.id),
            "status": req.status,
            "current_step": req.current_step,
            "requested_at": req.requested_at.isoformat() if req.requested_at else None,
            "completed_at": req.completed_at.isoformat() if req.completed_at else None,
        }

    def get_or_create_request_by_entity(
        self,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        flow_id: UUID | None = None,
        title: str | None = None,
        description: str | None = None,
        auto_create: bool = False,
    ) -> ApprovalRequest | None:
        """Get existing pending request or create a new one."""
        existing = (
            self.db.query(ApprovalRequest)
            .filter(
                ApprovalRequest.entity_type == entity_type,
                ApprovalRequest.entity_id == entity_id,
                ApprovalRequest.tenant_id == tenant_id,
                ApprovalRequest.status == "pending",
            )
            .first()
        )
        if existing:
            return existing

        if auto_create and flow_id and title:
            return self.create_approval_request(
                request_data={
                    "flow_id": flow_id,
                    "title": title,
                    "description": description,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                },
                tenant_id=tenant_id,
                user_id=user_id,
            )
        return None

    def user_can_approve_step(
        self,
        request_id: UUID,
        step_order: int,
        user_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Check if a user can approve the given step of a request."""
        req = self.get_approval_request(request_id, tenant_id)
        if not req or req.current_step != step_order:
            return False

        steps = self.get_approval_steps_by_flow(req.flow_id, tenant_id)  # type: ignore[arg-type]
        current = next((s for s in steps if s.step_order == step_order), None)
        if not current:
            return False

        if current.approver_type == "user" and current.approver_id == user_id:
            return True
        if current.approver_type in ("role", "dynamic"):
            return True  # Simplified: allow any user for role/dynamic
        return False

    def get_request_widget_data(self, tenant_id: UUID, user_id: UUID) -> dict:
        """Get widget data for a user's pending approvals."""
        pending = (
            self.db.query(ApprovalRequest)
            .filter(
                ApprovalRequest.tenant_id == tenant_id,
                ApprovalRequest.status == "pending",
            )
            .count()
        )
        return {"pending_count": pending, "user_id": str(user_id)}

    # =========================================================================
    # ApprovalDelegation methods
    # =========================================================================

    def delegate_approval(
        self,
        request_id: UUID,
        tenant_id: UUID,
        from_user_id: UUID,
        to_user_id: UUID,
        reason: str | None = None,
        expires_at=None,
    ) -> ApprovalDelegation:
        """Delegate an approval to another user."""
        delegation = ApprovalDelegation(
            tenant_id=tenant_id,
            request_id=request_id,
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            reason=reason,
            expires_at=expires_at,
            is_active=True,
        )
        self.db.add(delegation)
        self.db.commit()
        self.db.refresh(delegation)
        return delegation

    def get_delegations(
        self, request_id: UUID, tenant_id: UUID
    ) -> list[ApprovalDelegation]:
        """Get all delegations for a request."""
        return (
            self.db.query(ApprovalDelegation)
            .filter(
                ApprovalDelegation.request_id == request_id,
                ApprovalDelegation.tenant_id == tenant_id,
            )
            .all()
        )

    # =========================================================================
    # Legacy Approval methods (simple approval model)
    # =========================================================================

    async def create_approval(
        self,
        tenant_id: UUID,
        title: str,
        requested_by_id: UUID,
        description: str | None = None,
        approver_id: UUID | None = None,
        amount: Decimal | None = None,
        currency: str = "USD",
        due_date: date | None = None,
        entity_type: str | None = None,
        entity_id: UUID | None = None,
        context: dict | None = None,
        metadata: dict | None = None,
    ) -> Approval:
        """Create a new simple approval."""
        approval = Approval(
            tenant_id=tenant_id,
            title=title,
            description=description,
            requested_by_id=requested_by_id,
            approver_id=approver_id,
            amount=amount,
            currency=currency,
            due_date=due_date,
            status=ApprovalStatus.PENDING,
            entity_type=entity_type,
            entity_id=entity_id,
            context=context or {},
            approval_metadata=metadata,
        )
        self.db.add(approval)
        self.db.commit()
        self.db.refresh(approval)
        logger.info(f"Approval created: {approval.id} ({title})")
        return approval

    def get_approval(self, approval_id: UUID, tenant_id: UUID) -> Approval | None:
        """Get a simple approval by ID."""
        return (
            self.db.query(Approval)
            .filter(
                and_(
                    Approval.id == approval_id,
                    Approval.tenant_id == tenant_id,
                )
            )
            .first()
        )

    def list_approvals(
        self,
        tenant_id: UUID,
        status: str | None = None,
        approver_id: UUID | None = None,
        requester_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Approval]:
        """List simple approvals."""
        query = self.db.query(Approval).filter(Approval.tenant_id == tenant_id)
        if status:
            query = query.filter(Approval.status == status)
        if approver_id:
            query = query.filter(Approval.approver_id == approver_id)
        if requester_id:
            query = query.filter(Approval.requested_by_id == requester_id)
        return (
            query.order_by(Approval.requested_at.desc()).offset(skip).limit(limit).all()
        )

    def update_approval(self, approval: Approval, **kwargs) -> Approval:
        """Update fields on a simple approval. Raises ValueError if not pending."""
        if approval.status != ApprovalStatus.PENDING:
            raise ValueError(f"Cannot update approval with status {approval.status}")
        for key, value in kwargs.items():
            if hasattr(approval, key):
                setattr(approval, key, value)
        self.db.commit()
        self.db.refresh(approval)
        return approval

    async def approve_approval(self, approval: Approval, approver_id: UUID) -> Approval:
        """Approve a simple approval."""
        approval.status = ApprovalStatus.APPROVED  # type: ignore[assignment]
        approval.approver_id = approver_id  # type: ignore[assignment]
        approval.approved_at = datetime.now(UTC)  # type: ignore[assignment]
        self.db.commit()
        self.db.refresh(approval)
        return approval

    async def reject_approval(
        self, approval: Approval, approver_id: UUID, reason: str | None = None
    ) -> Approval:
        """Reject a simple approval."""
        approval.status = ApprovalStatus.REJECTED  # type: ignore[assignment]
        approval.approver_id = approver_id  # type: ignore[assignment]
        approval.rejection_reason = reason  # type: ignore[assignment]
        approval.approved_at = datetime.now(UTC)  # type: ignore[assignment]
        self.db.commit()
        self.db.refresh(approval)
        return approval

    async def cancel_approval(self, approval: Approval, user_id: UUID) -> Approval:
        """Cancel a simple approval."""
        approval.status = ApprovalStatus.CANCELLED  # type: ignore[assignment]
        approval.approved_at = datetime.now(UTC)  # type: ignore[assignment]
        self.db.commit()
        self.db.refresh(approval)
        return approval

    def delete_approval(self, approval: Approval) -> None:
        """Delete a simple approval."""
        if approval.status != ApprovalStatus.PENDING:
            raise ValueError(f"Cannot delete approval with status {approval.status}")
        self.db.delete(approval)
        self.db.commit()

    # =========================================================================
    # Flow run helpers
    # =========================================================================

    def _complete_flow_run(
        self, req: ApprovalRequest, tenant_id: UUID, user_id: UUID | None = None
    ) -> None:
        if not self.flow_runs_service:
            return
        try:
            run = self.flow_runs_service.get_flow_run_by_entity(
                entity_type=req.entity_type,
                entity_id=req.entity_id,
                tenant_id=tenant_id,
            )
            if run:
                meta = dict(run.run_metadata or {})
                if user_id:
                    meta["approved_by"] = str(user_id)
                self.flow_runs_service.complete_flow_run(run.id, tenant_id, meta)
        except Exception as e:
            logger.warning(f"Failed to complete flow run: {e}")

    def _fail_flow_run(
        self, req: ApprovalRequest, tenant_id: UUID, user_id: UUID | None = None
    ) -> None:
        if not self.flow_runs_service:
            return
        try:
            run = self.flow_runs_service.get_flow_run_by_entity(
                entity_type=req.entity_type,
                entity_id=req.entity_id,
                tenant_id=tenant_id,
            )
            if run:
                meta = dict(run.run_metadata or {})
                if user_id:
                    meta["rejected_by"] = str(user_id)
                self.flow_runs_service.fail_flow_run(
                    run.id, tenant_id, "Approval request rejected", meta
                )
        except Exception as e:
            logger.warning(f"Failed to fail flow run: {e}")
