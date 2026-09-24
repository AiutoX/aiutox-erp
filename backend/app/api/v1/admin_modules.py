"""Admin endpoints for module lifecycle management."""

from typing import Annotated

from aiutox_sdk.auth import require_permission
from aiutox_sdk.response import StandardListResponse, StandardResponse
from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.core.db.deps import get_db
from app.core.tenant_modules.models import TenantModule
from app.core.tenant_modules.service import (
    InvalidModuleStateError,
    ModuleHasDependentsError,
    ModuleNotFoundError,
    TenantModuleService,
)
from app.core.users.models import User

router = APIRouter(prefix="/admin/modules", tags=["admin-modules"])


@router.get("")
async def list_modules(
    current_user: Annotated[User, Depends(require_permission("admin.modules.view"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardListResponse:
    """List all modules with their state for the current tenant.

    Returns:
        List of module info objects with state, version, tier
    """
    modules = db.query(TenantModule).filter_by(tenant_id=current_user.tenant_id).all()

    total = len(modules)
    return StandardListResponse(
        data=[
            {
                "module": m.module,
                "version": m.version,
                "tier": m.tier,
                "state": m.state.value,
                "installed_at": m.installed_at.isoformat() if m.installed_at else None,
                "grace_deadline": (
                    m.grace_deadline.isoformat() if m.grace_deadline else None
                ),
            }
            for m in modules
        ],
        meta={"total": total, "page": 1, "page_size": total or 1, "total_pages": 1},
    )


@router.post("/{module_id}/install")
async def install_module(
    module_id: str,
    current_user: Annotated[User, Depends(require_permission("admin.modules.install"))],
    db: Annotated[Session, Depends(get_db)],
    version: Annotated[str, Query()] = "1.0.0",
    tier: Annotated[str, Query()] = "basic",
) -> StandardResponse:
    """Install a module for the current tenant.

    Args:
        module_id: Module to install
        version: Version (default: 1.0.0)
        tier: Tier level (default: basic)

    Returns:
        Confirmation with install plan
    """
    service = TenantModuleService(db)

    try:
        plan = service.install(
            tenant_id=current_user.tenant_id,
            module_id=module_id,
            version=version,
            tier=tier,
        )
        db.commit()

        return StandardResponse(
            data={
                "module": module_id,
                "version": version,
                "tier": tier,
                "install_order": plan.install_order,
            }
        )
    except ModuleNotFoundError as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise e


@router.post("/{module_id}/disable")
async def disable_module(
    module_id: str,
    current_user: Annotated[User, Depends(require_permission("admin.modules.disable"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse:
    """Disable a module (reversible).

    Args:
        module_id: Module to disable

    Returns:
        Confirmation
    """
    service = TenantModuleService(db)

    try:
        service.disable(tenant_id=current_user.tenant_id, module_id=module_id)
        db.commit()

        return StandardResponse(data={"module": module_id, "state": "disabled"})
    except (
        ModuleNotFoundError,
        InvalidModuleStateError,
        ModuleHasDependentsError,
    ) as e:
        db.rollback()
        raise e


@router.post("/{module_id}/enable")
async def enable_module(
    module_id: str,
    current_user: Annotated[User, Depends(require_permission("admin.modules.enable"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse:
    """Enable a disabled module.

    Args:
        module_id: Module to enable

    Returns:
        Confirmation
    """
    service = TenantModuleService(db)

    try:
        service.enable(tenant_id=current_user.tenant_id, module_id=module_id)
        db.commit()

        return StandardResponse(data={"module": module_id, "state": "active"})
    except (ModuleNotFoundError, InvalidModuleStateError) as e:
        db.rollback()
        raise e


@router.post("/{module_id}/uninstall-request")
async def uninstall_request_module(
    module_id: str,
    background_tasks: BackgroundTasks,
    current_user: Annotated[
        User, Depends(require_permission("admin.modules.uninstall"))
    ],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse:
    """Request uninstall of a module (90-day grace period).

    Schedules reminder notifications at t+7, t+30, t+60 days via
    BackgroundTasks (DoD#10).

    Args:
        module_id: Module to uninstall

    Returns:
        Confirmation with grace deadline
    """
    service = TenantModuleService(db)

    try:
        service.uninstall_request(tenant_id=current_user.tenant_id, module_id=module_id)
        db.commit()

        tm = (
            db.query(TenantModule)
            .filter_by(tenant_id=current_user.tenant_id, module=module_id)
            .first()
        )

        # Schedule grace period reminder notifications (DoD#10)
        if tm and tm.grace_deadline:
            from app.core.tenant_modules.grace_period_scheduler import (
                schedule_grace_period_reminders,
            )

            background_tasks.add_task(
                schedule_grace_period_reminders,
                current_user.tenant_id,
                module_id,
                tm.grace_deadline,
            )

        return StandardResponse(
            data={
                "module": module_id,
                "state": "grace_period",
                "grace_deadline": tm.grace_deadline.isoformat() if tm else None,
            }
        )
    except (ModuleNotFoundError, InvalidModuleStateError) as e:
        db.rollback()
        raise e


@router.post("/{module_id}/reactivate")
async def reactivate_module(
    module_id: str,
    current_user: Annotated[
        User, Depends(require_permission("admin.modules.reactivate"))
    ],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse:
    """Cancel uninstall request and reactivate module.

    Args:
        module_id: Module to reactivate

    Returns:
        Confirmation
    """
    service = TenantModuleService(db)

    try:
        service.reactivate(tenant_id=current_user.tenant_id, module_id=module_id)
        db.commit()

        return StandardResponse(data={"module": module_id, "state": "active"})
    except ModuleNotFoundError as e:
        db.rollback()
        raise e


@router.post("/{module_id}/export")
async def export_module(
    module_id: str,
    current_user: Annotated[User, Depends(require_permission("admin.modules.export"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse:
    """Export module data to a ZIP archive stored via core/files.

    Transitions state: grace_period → exported.
    Returns file_id for download and record_count.
    """
    service = TenantModuleService(db)

    try:
        result = service.export(
            tenant_id=current_user.tenant_id,
            module_id=module_id,
            user_id=current_user.id,
        )
        db.commit()

        return StandardResponse(
            data={
                "module": module_id,
                "state": "exported",
                "file_id": result["file_id"],
                "filename": result["filename"],
                "record_count": result["record_count"],
            }
        )
    except (ModuleNotFoundError, InvalidModuleStateError) as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise e


@router.post("/{module_id}/hard-uninstall")
async def hard_uninstall_module(
    module_id: str,
    current_user: Annotated[User, Depends(require_permission("admin.modules.destroy"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse:
    """Irreversibly delete all module data and run alembic downgrade.

    Requires exported state (call /export first).
    Requires permission: admin.modules.destroy (more restrictive than uninstall).
    Transitions state: exported → uninstalled.
    """
    service = TenantModuleService(db)

    try:
        result = service.hard_uninstall(
            tenant_id=current_user.tenant_id,
            module_id=module_id,
        )
        db.commit()

        return StandardResponse(
            data={
                "module": module_id,
                "state": "uninstalled",
                "deleted_records": result.get("deleted_records", {}),
            }
        )
    except (ModuleNotFoundError, InvalidModuleStateError) as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise e
