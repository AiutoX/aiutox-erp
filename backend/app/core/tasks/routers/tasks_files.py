"""Task files endpoints."""

import ipaddress
import logging
from typing import Annotated
from urllib.parse import urlparse
from uuid import UUID

from aiutox_sdk.auth import limiter, require_permission
from aiutox_sdk.db import get_db
from aiutox_sdk.response import StandardListResponse, StandardResponse
from aiutox_sdk.tasks import get_task_file_service
from aiutox_sdk.users import User
from fastapi import APIRouter, Depends, Path, Query, Request, status
from sqlalchemy.orm import Session

from aiutox_sdk.exceptions import APIException

_MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

_BLOCKED_MIME_TYPES = {
    "application/x-msdownload",
    "application/x-executable",
    "application/x-msdos-program",
    "application/x-sh",
    "application/x-shellscript",
    "text/x-shellscript",
    "application/x-bat",
    "application/x-msi",
}


def _validate_file_url(url: str) -> None:
    """Validate file URL against SSRF and scheme restrictions."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_URL_SCHEME",
            message="File URL must use http or https scheme. Other schemes are not allowed.",
        )
    hostname = parsed.hostname or ""
    if hostname.lower() in ("localhost",):
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="URL_NOT_ALLOWED",
            message="File URL pointing to localhost is not allowed.",
        )
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise APIException(
                status_code=status.HTTP_400_BAD_REQUEST,
                code="URL_NOT_ALLOWED",
                message="File URL pointing to private or reserved IP addresses is not allowed.",
            )
    except ValueError:
        pass  # Not an IP, hostname is fine


logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/{task_id}/files",
    response_model=StandardResponse[dict],
    status_code=status.HTTP_201_CREATED,
    summary="Attach file to task",
    description="Attach an existing file to a task. Requires tasks.manage permission.",
)
@limiter.limit("10/minute")
async def attach_file_to_task(
    request: Request,
    task_id: Annotated[UUID, Path(..., description="Task ID")],
    current_user: Annotated[User, Depends(require_permission("tasks.manage"))],
    db: Annotated[Session, Depends(get_db)],
    file_id: UUID = Query(..., description="File ID from files module"),
    file_name: str = Query(..., description="File name"),
    file_size: int = Query(..., description="File size in bytes"),
    file_type: str = Query(..., description="File MIME type"),
    file_url: str = Query(..., description="File URL"),
) -> StandardResponse[dict]:
    """Attach file to task."""
    logger.info(
        "Attaching file to task: task_id=%s, user_id=%s, file_id=%s",
        task_id,
        current_user.id,
        file_id,
    )

    # Validar parámetros requeridos
    if not file_id or not file_name or not file_size or not file_type or not file_url:
        logger.error("Missing required parameters for file attachment")
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MISSING_PARAMETERS",
            message="File ID, name, size, type, and URL are required",
        )

    # Validate file size
    if file_size > _MAX_FILE_SIZE:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="FILE_TOO_LARGE",
            message=f"File size exceeds maximum allowed size of {_MAX_FILE_SIZE // (1024 * 1024)}MB.",
        )

    # Validate MIME type (block executables and scripts)
    if file_type in _BLOCKED_MIME_TYPES:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="FILE_TYPE_NOT_ALLOWED",
            message=f"File type '{file_type}' is not allowed.",
        )

    # Validate URL against SSRF and scheme restrictions
    _validate_file_url(file_url)

    file_service = get_task_file_service(db)

    try:
        attachment = file_service.attach_file(
            task_id=task_id,
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            file_id=file_id,
            file_name=file_name,
            file_size=file_size,
            file_type=file_type,
            file_url=file_url,
        )

        logger.info(
            "File attached successfully: task_id=%s, file_id=%s", task_id, file_id
        )

        return StandardResponse(
            data=attachment,
            message="File attached to task successfully",
        )
    except ValueError as e:
        logger.error("Failed to attach file: %s", str(e))
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="TASK_NOT_FOUND",
            message=str(e),
        )


@router.delete(
    "/{task_id}/files/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Detach file from task",
    description="Remove a file attachment from a task. Requires tasks.manage permission.",
)
async def detach_file_from_task(
    task_id: Annotated[UUID, Path(..., description="Task ID")],
    file_id: Annotated[UUID, Path(..., description="File ID")],
    current_user: Annotated[User, Depends(require_permission("tasks.manage"))],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Detach file from task."""
    logger.info(
        "Detaching file from task: task_id=%s, file_id=%s, user_id=%s",
        task_id,
        file_id,
        current_user.id,
    )

    file_service = get_task_file_service(db)

    try:
        success = file_service.detach_file(
            task_id=task_id,
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            file_id=file_id,
        )
    except ValueError as e:
        logger.error("Failed to detach file: %s", str(e))
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="TASK_NOT_FOUND",
            message=str(e),
        )

    if not success:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="FILE_NOT_FOUND",
            message="File attachment not found or already detached.",
        )

    logger.info(
        "File detach result: task_id=%s, file_id=%s, success=%s",
        task_id,
        file_id,
        success,
    )


@router.get(
    "/{task_id}/files",
    response_model=StandardListResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="List task files",
    description="List all files attached to a task. Requires tasks.view permission.",
)
async def list_task_files(
    task_id: Annotated[UUID, Path(..., description="Task ID")],
    current_user: Annotated[User, Depends(require_permission("tasks.view"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardListResponse[dict]:
    """List task files."""
    logger.info(
        "Listing files for task: task_id=%s, user_id=%s", task_id, current_user.id
    )

    file_service = get_task_file_service(db)

    files = file_service.list_files(
        task_id=task_id,
        tenant_id=current_user.tenant_id,
    )

    logger.info("Retrieved %d files for task %s", len(files), task_id)

    return StandardListResponse(
        data=files,
        meta={
            "total": len(files),
            "page": 1,
            "page_size": len(files) if len(files) > 0 else 20,
            "total_pages": 1,
        },
        message="Task files retrieved successfully",
    )
