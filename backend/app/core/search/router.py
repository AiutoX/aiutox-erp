"""Search router."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.auth.dependencies import require_permission
from app.core.db.deps import get_db
from app.core.exceptions import APIException
from app.core.search.schemas import SearchResponse, SuggestionsResponse
from app.core.search.service import SearchService
from app.core.users.models import User
from app.schemas.common import StandardResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get(
    "/",
    response_model=StandardResponse[SearchResponse],
    summary="Search across entities",
    tags=["Search"],
)
async def search(
    current_user: Annotated[User, Depends(require_permission("search.read"))],
    db: Annotated[Session, Depends(get_db)],
    q: str = Query(..., min_length=2, max_length=500, description="Search query"),
    entity_types: str | None = Query(
        None, description="Comma-separated entity types (e.g., task,file)"
    ),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
) -> StandardResponse[SearchResponse]:
    """Search across all registered entities."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="USER_NO_TENANT",
            message="User must have a tenant assigned to perform searches",
        )

    try:
        service = SearchService(db)

        entity_types_list = (
            [e.strip() for e in entity_types.split(",")] if entity_types else None
        )

        result = await service.search(
            tenant_id=current_user.tenant_id,
            query=q,
            entity_types=entity_types_list,
            limit=limit,
            offset=offset,
        )

        return StandardResponse(data=result)  # type: ignore[arg-type]
    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        raise


@router.get(
    "/suggest",
    response_model=StandardResponse[SuggestionsResponse],
    summary="Get search suggestions",
    tags=["Search"],
)
async def suggest(
    current_user: Annotated[User, Depends(require_permission("search.read"))],
    db: Annotated[Session, Depends(get_db)],
    q: str = Query(..., min_length=2, max_length=500),
    limit: int = Query(10, ge=1, le=100),
) -> StandardResponse[SuggestionsResponse]:
    """Get search suggestions for a query."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="USER_NO_TENANT",
            message="User must have a tenant assigned to perform searches",
        )

    try:
        service = SearchService(db)
        suggestions = await service.get_suggestions(
            tenant_id=current_user.tenant_id,
            query=q,
            limit=limit,
        )

        return StandardResponse(
            data=SuggestionsResponse(query=q, suggestions=suggestions)  # type: ignore[arg-type]
        )
    except Exception as e:
        logger.error(f"Suggestions failed: {e}", exc_info=True)
        raise
