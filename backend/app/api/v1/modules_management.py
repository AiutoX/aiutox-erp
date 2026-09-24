"""Module management endpoints — F8-T01, F8-T02, F8-T04.

Endpoints for:
- Module export (JSON/CSV)
- Module uninstall (with backup)
- Tenant-level module switching (enable/disable)
"""

import json
import zipfile
from io import BytesIO

from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db.deps import get_db
from app.core.exceptions import APIException
from app.core.module_registry import get_module_registry
from app.core.modules.export_service import ModuleExportService
from app.core.modules.module_events import ModuleEventPublisher
from app.core.modules.uninstall_service import ModuleUninstallService
from app.core.users.models import User

router = APIRouter(prefix="/api/v1/modules", tags=["module-management"])


@router.get("/{module_id}/export")
def export_module_data(
    module_id: str,
    format: str = "json",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export module data for tenant.

    F8-T01: Data export API per module

    Formats:
    - json: Single JSON file with all tables
    - csv: ZIP containing CSV files per table

    Args:
        module_id: Module to export
        format: json or csv
        current_user: Current user (used for tenant_id)
        db: Database session

    Returns:
        File download (JSON or ZIP)
    """
    # TODO: Check module admin permission
    # if not current_user.has_module_permission(module_id, "export"):
    #     raise_forbidden("Cannot export module data")

    tenant_id = current_user.tenant_id

    # Get module models from registry
    registry = get_module_registry()
    module = registry.get_module(module_id)
    if not module:
        raise APIException(
            code="MODULE_NOT_FOUND",
            message=f"Module {module_id} not found in registry",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    models = module.get_models()

    export_service = ModuleExportService(db)

    if format == "json":
        # Export as single JSON file
        export_data = export_service.export_module_json(
            tenant_id=tenant_id,
            module_id=module_id,
            models=models,
        )

        json_str = json.dumps(export_data, indent=2)
        filename = f"{module_id}_{current_user.tenant_id}_export.json"

        return StreamingResponse(
            iter([json_str]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    elif format == "csv":
        # Export as ZIP of CSV files
        csv_files = export_service.export_module_csv(
            tenant_id=tenant_id,
            module_id=module_id,
            models=models,
        )

        # Create ZIP file in memory
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for filename, content in csv_files.items():
                zip_file.writestr(filename, content)

        zip_buffer.seek(0)
        filename = f"{module_id}_{current_user.tenant_id}_export.zip"

        return StreamingResponse(
            iter([zip_buffer.getvalue()]),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    else:
        raise APIException(
            code="INVALID_FORMAT",
            message=f"Format {format} not supported. Use 'json' or 'csv'.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


@router.post("/{module_id}/uninstall/validate")
def validate_uninstall(
    module_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Validate that module can be safely uninstalled.

    F8-T02: Safe uninstall workflow (validation phase)
    F8-T03: Cascade safety validation

    Returns:
        Validation result with warnings and blockers
    """
    tenant_id = current_user.tenant_id

    registry = get_module_registry()
    module = registry.get_module(module_id)
    if not module:
        raise APIException(
            code="MODULE_NOT_FOUND",
            message=f"Module {module_id} not found in registry",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    models = module.get_models()

    uninstall_service = ModuleUninstallService(db)
    validation = uninstall_service.validate_uninstall(
        tenant_id=tenant_id,
        module_id=module_id,
        models=models,
        check_dependencies=True,
    )

    return {
        "module_id": module_id,
        "validation": validation,
    }


@router.post("/{module_id}/uninstall/prepare")
def prepare_uninstall(
    module_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Prepare module uninstall: validate and create backup.

    F8-T02: Safe uninstall workflow (backup phase)

    Returns:
        Uninstall plan with backup export data
    """
    tenant_id = current_user.tenant_id

    registry = get_module_registry()
    module = registry.get_module(module_id)
    if not module:
        raise APIException(
            code="MODULE_NOT_FOUND",
            message=f"Module {module_id} not found in registry",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    models = module.get_models()

    uninstall_service = ModuleUninstallService(db)
    plan = uninstall_service.prepare_uninstall(
        tenant_id=tenant_id,
        module_id=module_id,
        models=models,
    )

    return plan


@router.post("/{module_id}/uninstall/execute")
async def execute_uninstall_module(
    module_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Execute module uninstall: delete data and disable module.

    F8-T02: Safe uninstall workflow (execution phase)
    F8-T05: Publishes uninstall.completed event

    Returns:
        Uninstall result summary
    """
    tenant_id = current_user.tenant_id

    registry = get_module_registry()
    module = registry.get_module(module_id)
    if not module:
        raise APIException(
            code="MODULE_NOT_FOUND",
            message=f"Module {module_id} not found in registry",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    models = module.get_models()

    uninstall_service = ModuleUninstallService(db)
    result = uninstall_service.execute_uninstall(
        tenant_id=tenant_id,
        module_id=module_id,
        models=models,
    )

    # Publish event for F8-T05 audit trail
    event_publisher = ModuleEventPublisher(event_bus=None)
    await event_publisher.publish_uninstall_completed(
        module_id=module_id,
        tenant_id=tenant_id,
        deleted_records=result["deleted_records"],
        backup_id=None,
        user_id=current_user.id,
    )

    return result


@router.put("/{module_id}/enable")
def enable_module(
    module_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enable module for tenant.

    F8-T04: Tenant-level module switching

    Returns:
        Updated tenant_modules record
    """
    tenant_id = current_user.tenant_id

    from app.models import TenantModule

    tenant_module = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == tenant_id,
            TenantModule.module_id == module_id,
        )
        .first()
    )

    if not tenant_module:
        raise APIException(
            code="MODULE_NOT_FOUND",
            message=f"Module {module_id} not installed for tenant",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    tenant_module.is_enabled = True
    db.commit()
    db.refresh(tenant_module)

    return {
        "module_id": tenant_module.module_id,
        "is_enabled": tenant_module.is_enabled,
        "enabled_at": tenant_module.enabled_at,
    }


@router.put("/{module_id}/disable")
def disable_module(
    module_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable module for tenant (without uninstall).

    F8-T04: Tenant-level module switching

    Does NOT delete data; module can be re-enabled later.

    Returns:
        Updated tenant_modules record
    """
    tenant_id = current_user.tenant_id

    from app.models import TenantModule

    tenant_module = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == tenant_id,
            TenantModule.module_id == module_id,
        )
        .first()
    )

    if not tenant_module:
        raise APIException(
            code="MODULE_NOT_FOUND",
            message=f"Module {module_id} not installed for tenant",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    tenant_module.is_enabled = False
    db.commit()
    db.refresh(tenant_module)

    return {
        "module_id": tenant_module.module_id,
        "is_enabled": tenant_module.is_enabled,
        "disabled_at": tenant_module.disabled_at,
    }
