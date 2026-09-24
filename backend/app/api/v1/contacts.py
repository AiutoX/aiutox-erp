"""Contacts router — full CRUD + search."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.auth.dependencies import get_current_user
from app.core.contacts.models import Contact, OrganizationContact
from app.core.db.deps import get_db
from app.core.users.models import User
from app.schemas.common import PaginationMeta, StandardListResponse, StandardResponse
from app.schemas.contact import ContactCreate, ContactResponse, ContactUpdate

router = APIRouter(prefix="/contacts", tags=["contacts"])


def _membership_options():
    return joinedload(Contact.org_memberships).joinedload(
        OrganizationContact.organization
    )


def _list_options():
    return [
        joinedload(Contact.org_memberships).joinedload(
            OrganizationContact.organization
        ),
        joinedload(Contact.contact_methods),
    ]


def _get_contact_or_404(db: Session, tenant_id: UUID, contact_id: UUID) -> Contact:
    contact = (
        db.query(Contact)
        .options(_membership_options())
        .filter(Contact.id == contact_id, Contact.tenant_id == tenant_id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.get(
    "/",
    response_model=StandardListResponse[ContactResponse],
    status_code=status.HTTP_200_OK,
    summary="List contacts",
)
async def list_contacts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    organization_id: UUID | None = Query(None),
    is_active: bool | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[ContactResponse]:
    query = (
        db.query(Contact)
        .options(*_list_options())
        .filter(Contact.tenant_id == current_user.tenant_id)
    )

    if organization_id is not None:
        query = query.join(
            OrganizationContact,
            (OrganizationContact.contact_id == Contact.id)
            & (OrganizationContact.organization_id == organization_id),
        )
    if is_active is not None:
        query = query.filter(Contact.is_active == is_active)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                func.lower(Contact.full_name).like(func.lower(term)),
                func.lower(Contact.first_name).like(func.lower(term)),
                func.lower(Contact.last_name).like(func.lower(term)),
            )
        )

    total = query.distinct().count()
    items = (
        query.distinct()
        .order_by(Contact.full_name)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return StandardListResponse(
        data=[ContactResponse.model_validate(c) for c in items],
        meta=PaginationMeta(
            total=total, page=page, page_size=page_size, total_pages=total_pages
        ),
    )


@router.get(
    "/search",
    response_model=StandardListResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Search contacts (lightweight)",
)
async def search_contacts(
    q: str | None = Query(None, min_length=1, max_length=100),
    is_active: bool = Query(True),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardListResponse[dict]:
    query = db.query(Contact).filter(Contact.tenant_id == current_user.tenant_id)

    if is_active is not None:
        query = query.filter(Contact.is_active == is_active)
    if q:
        term = f"%{q}%"
        query = query.filter(
            or_(
                func.ilike(Contact.full_name, term),
                func.ilike(Contact.first_name, term),
                func.ilike(Contact.last_name, term),
            )
        )

    contacts = query.order_by(Contact.full_name).limit(limit).all()
    data = [
        {
            "id": str(c.id),
            "full_name": c.full_name
            or f"{c.first_name or ''} {c.last_name or ''}".strip(),
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": None,
            "phone": None,
        }
        for c in contacts
    ]
    return StandardListResponse(
        data=data,
        meta=PaginationMeta(
            total=len(data), page=1, page_size=len(data) or 1, total_pages=1
        ),
    )


@router.get(
    "/{contact_id}",
    response_model=StandardResponse[ContactResponse],
    status_code=status.HTTP_200_OK,
    summary="Get contact by ID",
)
async def get_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardResponse[ContactResponse]:
    contact = _get_contact_or_404(db, current_user.tenant_id, contact_id)
    return StandardResponse(data=ContactResponse.model_validate(contact))


@router.post(
    "/",
    response_model=StandardResponse[ContactResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create contact",
)
async def create_contact(
    payload: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardResponse[ContactResponse]:
    data = payload.model_dump(exclude={"tenant_id"})
    if not data.get("full_name"):
        parts = [data.get("first_name") or "", data.get("last_name") or ""]
        joined = " ".join(p for p in parts if p).strip()
        if joined:
            data["full_name"] = joined
    contact = Contact(tenant_id=current_user.tenant_id, **data)
    db.add(contact)
    db.commit()
    # Re-fetch with memberships loaded so organization_id property works
    contact = _get_contact_or_404(
        db,
        current_user.tenant_id,
        contact.id,  # type: ignore[arg-type]
    )
    return StandardResponse(data=ContactResponse.model_validate(contact))


@router.patch(
    "/{contact_id}",
    response_model=StandardResponse[ContactResponse],
    status_code=status.HTTP_200_OK,
    summary="Update contact",
)
async def update_contact(
    contact_id: UUID,
    payload: ContactUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StandardResponse[ContactResponse]:
    contact = _get_contact_or_404(db, current_user.tenant_id, contact_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return StandardResponse(data=ContactResponse.model_validate(contact))


@router.delete(
    "/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete contact",
)
async def delete_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    contact = _get_contact_or_404(db, current_user.tenant_id, contact_id)
    contact.is_active = False  # type: ignore[assignment]
    db.commit()
