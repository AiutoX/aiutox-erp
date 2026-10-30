"""Channel identities router: employee self-service channel linking."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from redis.asyncio import Redis
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_current_user
from app.core.db.deps import get_db
from app.core.exceptions import raise_forbidden, raise_not_found
from app.core.integrations.channels.telegram_link import generate_link_code
from app.core.redis import get_redis_client as _get_redis_client
from app.core.users.models import User
from app.repositories.channel_identity_repository import ChannelIdentityRepository
from app.schemas.channel_identity import ChannelIdentityResponse, LinkCodeResponse
from app.schemas.common import StandardListResponse, StandardResponse

router = APIRouter()


async def get_redis_dependency() -> Redis:
    """Dependency wrapper so Redis is overridable in tests via
    app.dependency_overrides, matching pubsub.py's get_redis_client pattern."""
    return await _get_redis_client()


@router.get(
    "",
    response_model=StandardListResponse[ChannelIdentityResponse],
    status_code=status.HTTP_200_OK,
    summary="List my linked channel identities",
    description="List the current user's own active channel identities.",
)
async def list_channel_identities(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardListResponse[ChannelIdentityResponse]:
    repository = ChannelIdentityRepository(db)
    identities = repository.list_for_user(
        tenant_id=current_user.tenant_id, user_id=current_user.id
    )
    data = [ChannelIdentityResponse.model_validate(i) for i in identities]
    return StandardListResponse(
        data=data,
        meta={
            "total": len(data),
            "page": 1,
            "page_size": max(len(data), 1),
            "total_pages": 1,
        },
    )


@router.delete(
    "/{identity_id}",
    response_model=StandardResponse[dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Unlink a channel identity",
    description="Deactivate one of the current user's own channel identities.",
)
async def deactivate_channel_identity(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    identity_id: UUID = Path(...),
) -> StandardResponse[dict[str, Any]]:
    repository = ChannelIdentityRepository(db)
    try:
        repository.deactivate(
            tenant_id=current_user.tenant_id,
            identity_id=identity_id,
            user_id=current_user.id,
        )
    except ValueError as exc:
        message = str(exc)
        if "not owned by" in message:
            raise_forbidden(
                code="CHANNEL_IDENTITY_NOT_OWNED",
                message="You can only unlink your own channel identities",
            )
        raise_not_found("ChannelIdentity", str(identity_id))

    return StandardResponse(data={"id": str(identity_id), "deactivated": True})


@router.post(
    "/telegram/link-code",
    response_model=StandardResponse[LinkCodeResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Generate a Telegram linking code",
    description="Generate a single-use, 10-minute code to link Telegram by messaging the tenant's bot.",
)
async def create_telegram_link_code(
    current_user: Annotated[User, Depends(get_current_user)],
    redis: Annotated[Redis, Depends(get_redis_dependency)],
) -> StandardResponse[LinkCodeResponse]:
    code = await generate_link_code(
        redis, user_id=current_user.id, tenant_id=current_user.tenant_id
    )
    return StandardResponse(data=LinkCodeResponse(code=code, expires_in=600))
