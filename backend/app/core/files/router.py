"""Files router for file and document management."""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query, UploadFile, status
from fastapi import File as FastAPIFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth.dependencies import require_permission
from app.core.db.deps import get_db
from app.core.files.schemas import FileResponse
from app.core.files.service import FileService
from app.core.users.models import User
from app.schemas.common import StandardResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def get_file_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("files.read"))],
) -> FileService:
    """Dependency to get FileService."""
    return FileService(db, tenant_id=current_user.tenant_id)  # type: ignore[arg-type]


@router.post(
    "/upload",
    response_model=StandardResponse[FileResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Upload file",
    tags=["Files"],
)
async def upload_file(
    current_user: Annotated[User, Depends(require_permission("files.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = FastAPIFile(..., description="File to upload"),
    folder_id: UUID | None = Query(None, description="Folder ID"),
    description: str | None = Query(None, description="File description"),
    entity_type: str | None = Query(
        None, description="Entity type (e.g., property, product)"
    ),
    entity_id: UUID | None = Query(None, description="Entity ID"),
) -> StandardResponse[FileResponse]:
    """Upload a new file."""
    if not current_user.tenant_id:
        raise Exception("User must have a tenant assigned")

    service = FileService(db, tenant_id=current_user.tenant_id)  # type: ignore[arg-type]
    content = await file.read()

    file_obj = await service.upload_file(
        file_content=content,
        filename=file.filename or "file",
        entity_type=entity_type,
        entity_id=entity_id,
        tenant_id=current_user.tenant_id,
        folder_id=folder_id,
        description=description,
        user_id=current_user.id,
    )

    return StandardResponse(data=file_obj)


@router.get(
    "/",
    response_model=StandardResponse[list[FileResponse]],
    summary="List files",
    tags=["Files"],
)
async def list_files(
    current_user: Annotated[User, Depends(require_permission("files.read"))],
    service: Annotated[FileService, Depends(get_file_service)],
    folder_id: UUID | None = Query(None),
    entity_type: str | None = Query(None, description="Entity type filter"),
    entity_id: UUID | None = Query(None, description="Entity ID filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
) -> StandardResponse[list[FileResponse]]:
    """List files in folder."""
    if not current_user.tenant_id:
        raise Exception("User must have a tenant assigned")

    files, total = await service.list_files(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
        entity_type=entity_type,
        entity_id=entity_id,
    )

    return StandardResponse(data=[FileResponse.model_validate(f) for f in files])


@router.get(
    "/{file_id}",
    response_model=StandardResponse[FileResponse],
    summary="Get file details",
    tags=["Files"],
)
async def get_file(
    current_user: Annotated[User, Depends(require_permission("files.read"))],
    service: Annotated[FileService, Depends(get_file_service)],
    file_id: UUID = Path(...),
) -> StandardResponse[FileResponse]:
    """Get file details."""
    if not current_user.tenant_id:
        raise Exception("User must have a tenant assigned")

    file_obj = service.get_file(file_id, current_user.tenant_id)
    if not file_obj:
        raise Exception("File not found")

    return StandardResponse(data=file_obj)


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete file",
    tags=["Files"],
)
async def delete_file(
    current_user: Annotated[User, Depends(require_permission("files.delete"))],
    service: Annotated[FileService, Depends(get_file_service)],
    file_id: UUID = Path(...),
) -> None:
    """Delete a file."""
    if not current_user.tenant_id:
        raise Exception("User must have a tenant assigned")

    await service.delete_file(file_id, current_user.tenant_id)
