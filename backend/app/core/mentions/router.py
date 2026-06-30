"""FastAPI router for mentions module."""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_current_user
from app.core.db.deps import get_db
from app.core.mentions.schemas import (
    MentionCreate,
    MentionRead,
    MentionResolve,
    MentionsListResponse,
)
from app.core.mentions.service import MentionService
from app.core.users.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mentions", tags=["mentions"])

CurrentUser = Annotated[User, Depends(get_current_user)]


def get_mention_service(session: Session = Depends(get_db)) -> MentionService:
    """Get mention service instance."""
    return MentionService(session)


# ======================
# MENTION ENDPOINTS
# ======================


@router.post("/", response_model=MentionRead, status_code=201)
async def create_mention(
    mention_data: MentionCreate,
    current_user: CurrentUser,
    service: MentionService = Depends(get_mention_service),
) -> MentionRead:
    """Create a new mention.

    Requires: mentions.write permission
    """
    raise NotImplementedError


@router.get("/user/unresolved", response_model=MentionsListResponse)
async def get_unresolved_mentions(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = None,  # type: ignore[assignment]
    service: MentionService = Depends(get_mention_service),
) -> MentionsListResponse:
    """Get all unresolved mentions for current user.

    Requires: mentions.read permission
    """
    raise NotImplementedError


@router.get("/user", response_model=MentionsListResponse)
async def get_user_mentions(
    resolved: bool | None = None,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = None,  # type: ignore[assignment]
    service: MentionService = Depends(get_mention_service),
) -> MentionsListResponse:
    """Get all mentions for current user.

    Requires: mentions.read permission
    """
    raise NotImplementedError


@router.get(
    "/entity/{mencionable_type}/{mencionable_id}", response_model=MentionsListResponse
)
async def get_entity_mentions(
    mencionable_type: str,
    mencionable_id: UUID,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = None,  # type: ignore[assignment]
    service: MentionService = Depends(get_mention_service),
) -> MentionsListResponse:
    """Get all mentions for an entity.

    Requires: mentions.read permission
    """
    raise NotImplementedError


@router.patch("/{mention_id}/resolve", response_model=MentionRead)
async def resolve_mention(
    mention_id: UUID,
    resolve_data: MentionResolve,
    current_user: CurrentUser = None,  # type: ignore[assignment]
    service: MentionService = Depends(get_mention_service),
) -> MentionRead:
    """Resolve a mention.

    Requires: mentions.write permission
    """
    raise NotImplementedError


@router.delete("/{mention_id}", status_code=204)
async def delete_mention(
    mention_id: UUID,
    current_user: CurrentUser = None,  # type: ignore[assignment]
    service: MentionService = Depends(get_mention_service),
) -> None:
    """Delete a mention.

    Requires: mentions.delete permission
    """
    raise NotImplementedError
