"""HTTP surface of the reference data read API (ISSUE-026, contract C23).

Five read-only endpoints mounted at ``/reference`` by
``app/api/v1/lazy_router.py``. Any authenticated user may call them (no
permission string): the data is global and public-domain. There is no write
route by design (RULE-018) -- FastAPI answers 405 for POST/PUT/PATCH/DELETE.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from pydantic import AfterValidator
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_current_user
from app.core.db.deps import get_db
from app.core.input_guards import reject_control_chars
from app.core.reference_data.cache import get_reference_cache
from app.core.reference_data.schemas import (
    RefAdminDivisionDetailOut,
    RefAdminDivisionOut,
    RefCountriesOut,
    RefCurrenciesOut,
    RefLanguagesOut,
)
from app.core.reference_data.service import ReferenceService
from app.core.users.models import User
from app.schemas.common import PaginationMeta, StandardListResponse, StandardResponse

router = APIRouter()

_Q_MAX_LENGTH = 100


def get_reference_service(
    db: Annotated[Session, Depends(get_db)],
) -> ReferenceService:
    """Dependency factory: ReferenceService wired to the fail-open cache."""
    return ReferenceService(db, cache=get_reference_cache())


# SEC-230-02: every string that becomes an SQL parameter is guarded against
# control characters (NUL makes the driver raise -> 500) before the query.
_NoControlChars = AfterValidator(reject_control_chars)
_QueryQ = Annotated[
    str | None,
    Query(
        max_length=_Q_MAX_LENGTH,
        description=(
            "Accent/case-insensitive match on code or either name "
            f"(max {_Q_MAX_LENGTH} characters)."
        ),
    ),
    _NoControlChars,
]
_QueryIncludeInactive = Annotated[
    bool,
    Query(description="Include rows removed from the current source."),
]


@router.get(
    "/countries",
    response_model=StandardResponse[RefCountriesOut],
    summary="List countries",
    description=(
        "All ISO 3166-1 countries with Spanish and English names, ordered by "
        "code. Not paginated (about 250 rows)."
    ),
)
async def list_countries(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[ReferenceService, Depends(get_reference_service)],
    q: _QueryQ = None,
    include_inactive: _QueryIncludeInactive = False,
) -> StandardResponse[RefCountriesOut]:
    """`GET /reference/countries` (AC-REF-06)."""
    return StandardResponse(
        data=service.countries(q=q, include_inactive=include_inactive)
    )


@router.get(
    "/currencies",
    response_model=StandardResponse[RefCurrenciesOut],
    summary="List currencies",
    description=(
        "All ISO 4217 currencies with names, symbol and minor units, ordered "
        "by code. Not paginated."
    ),
)
async def list_currencies(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[ReferenceService, Depends(get_reference_service)],
    q: _QueryQ = None,
    include_inactive: _QueryIncludeInactive = False,
) -> StandardResponse[RefCurrenciesOut]:
    """`GET /reference/currencies` (AC-REF-06)."""
    return StandardResponse(
        data=service.currencies(q=q, include_inactive=include_inactive)
    )


@router.get(
    "/languages",
    response_model=StandardResponse[RefLanguagesOut],
    summary="List languages",
    description=(
        "All ISO 639-1 languages with localized and native names, ordered by "
        "code. Not paginated."
    ),
)
async def list_languages(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[ReferenceService, Depends(get_reference_service)],
    q: _QueryQ = None,
    include_inactive: _QueryIncludeInactive = False,
) -> StandardResponse[RefLanguagesOut]:
    """`GET /reference/languages` (AC-REF-06)."""
    return StandardResponse(
        data=service.languages(q=q, include_inactive=include_inactive)
    )


@router.get(
    "/divisions",
    response_model=StandardListResponse[RefAdminDivisionOut],
    summary="List administrative divisions of a country",
    description=(
        "Departments (level 1) and municipalities (level 2) of a country, "
        "filterable by level and parent, ordered by name then code. Unknown "
        "country: 404 REFERENCE_COUNTRY_NOT_FOUND. A known country without "
        "divisions returns an empty page."
    ),
)
async def list_divisions(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[ReferenceService, Depends(get_reference_service)],
    country: Annotated[
        str,
        Query(min_length=1, max_length=10, description="ISO alpha-2 code."),
        _NoControlChars,
    ],
    level: Annotated[int | None, Query(ge=1, le=2)] = None,
    parent_code: Annotated[str | None, Query(max_length=20), _NoControlChars] = None,
    q: _QueryQ = None,
    include_inactive: _QueryIncludeInactive = False,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=500)] = 200,
) -> StandardListResponse[RefAdminDivisionOut]:
    """`GET /reference/divisions` (AC-REF-07)."""
    rows, total = service.divisions(
        country=country,
        level=level,
        parent_code=parent_code,
        q=q,
        include_inactive=include_inactive,
        page=page,
        page_size=page_size,
    )
    total_pages = (total + page_size - 1) // page_size if total else 0
    return StandardListResponse(
        data=rows,
        meta=PaginationMeta(
            total=total, page=page, page_size=page_size, total_pages=total_pages
        ),
    )


@router.get(
    "/divisions/{country}/{code}",
    response_model=StandardResponse[RefAdminDivisionDetailOut],
    summary="Get one administrative division",
    description=(
        "One division by country and code (inactive rows included), with its "
        "parent and the dataset edition. Unknown: 404 "
        "REFERENCE_DIVISION_NOT_FOUND."
    ),
)
async def get_division(
    country: Annotated[str, Path(max_length=10), _NoControlChars],
    code: Annotated[str, Path(max_length=20), _NoControlChars],
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[ReferenceService, Depends(get_reference_service)],
) -> StandardResponse[RefAdminDivisionDetailOut]:
    """`GET /reference/divisions/{country}/{code}` (AC-REF-08)."""
    return StandardResponse(data=service.division(country, code))
