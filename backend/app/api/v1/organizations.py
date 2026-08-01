"""Organizations CRUD API — list, create, get, update + bank accounts subroutes."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.core.auth.dependencies import get_current_user
from app.core.contacts.models import Contact, OrganizationContact
from app.core.db.deps import get_db
from app.core.exceptions import raise_not_found
from app.core.users.models import Organization, OrganizationBankAccount, User
from app.schemas.common import PaginationMeta, StandardListResponse, StandardResponse
from app.schemas.organization import (
    OrganizationBankAccountCreate,
    OrganizationBankAccountResponse,
    OrganizationBankAccountUpdate,
    OrganizationCreate,
    OrganizationResponse,
    OrganizationUpdate,
    OrgContactCreate,
    OrgContactResponse,
    OrgContactUpdate,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])


def _get_org_or_404(db: Session, tenant_id: UUID, org_id: UUID) -> Organization:
    org = (
        db.query(Organization)
        .options(selectinload(Organization.bank_accounts))
        .filter(
            Organization.id == org_id,
            Organization.tenant_id == tenant_id,
        )
        .first()
    )
    if not org:
        raise_not_found("Organization", str(org_id))
    return org  # type: ignore[return-value]


def _get_bank_account_or_404(
    db: Session, tenant_id: UUID, org_id: UUID, ba_id: UUID
) -> OrganizationBankAccount:
    ba = (
        db.query(OrganizationBankAccount)
        .filter(
            OrganizationBankAccount.id == ba_id,
            OrganizationBankAccount.organization_id == org_id,
            OrganizationBankAccount.tenant_id == tenant_id,
        )
        .first()
    )
    if not ba:
        raise_not_found("OrganizationBankAccount", str(ba_id))
    return ba  # type: ignore[return-value]


# ── Organizations ──────────────────────────────────────────────────────────────


@router.get(
    "",
    response_model=StandardListResponse[OrganizationResponse],
    status_code=status.HTTP_200_OK,
    summary="List organizations",
)
async def list_organizations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    search: str | None = Query(None, max_length=200),
    organization_type: str | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=500),
) -> StandardListResponse[OrganizationResponse]:
    q = (
        db.query(Organization)
        .options(selectinload(Organization.bank_accounts))
        .filter(Organization.tenant_id == current_user.tenant_id)
    )
    if is_active is not None:
        q = q.filter(Organization.is_active == is_active)
    if organization_type:
        q = q.filter(Organization.organization_type == organization_type)
    if search:
        term = f"%{search}%"
        q = q.filter(
            or_(
                func.ilike(Organization.name, term),
                func.ilike(Organization.num_doc, term),
            )
        )
    total = q.count()
    items = (
        q.order_by(Organization.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return StandardListResponse(
        data=[OrganizationResponse.model_validate(o) for o in items],
        meta=PaginationMeta(
            total=total, page=page, page_size=page_size, total_pages=total_pages
        ),
    )


@router.post(
    "",
    response_model=StandardResponse[OrganizationResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create organization",
)
async def create_organization(
    payload: OrganizationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[OrganizationResponse]:
    org = Organization(
        tenant_id=current_user.tenant_id,
        **payload.model_dump(exclude={"tenant_id"}),
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    db.expire(org, ["bank_accounts"])
    return StandardResponse(data=OrganizationResponse.model_validate(org))


@router.get(
    "/{org_id}",
    response_model=StandardResponse[OrganizationResponse],
    status_code=status.HTTP_200_OK,
    summary="Get organization",
)
async def get_organization(
    org_id: Annotated[UUID, Path(...)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[OrganizationResponse]:
    org = _get_org_or_404(db, current_user.tenant_id, org_id)
    return StandardResponse(data=OrganizationResponse.model_validate(org))


@router.patch(
    "/{org_id}",
    response_model=StandardResponse[OrganizationResponse],
    status_code=status.HTTP_200_OK,
    summary="Update organization",
)
async def update_organization(
    org_id: Annotated[UUID, Path(...)],
    payload: OrganizationUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[OrganizationResponse]:
    org = _get_org_or_404(db, current_user.tenant_id, org_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    db.commit()
    db.refresh(org)
    return StandardResponse(data=OrganizationResponse.model_validate(org))


# ── Bank Accounts ──────────────────────────────────────────────────────────────


@router.get(
    "/{org_id}/bank-accounts",
    response_model=StandardListResponse[OrganizationBankAccountResponse],
    status_code=status.HTTP_200_OK,
    summary="List bank accounts for an organization",
)
async def list_bank_accounts(
    org_id: Annotated[UUID, Path(...)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardListResponse[OrganizationBankAccountResponse]:
    _get_org_or_404(db, current_user.tenant_id, org_id)
    items = (
        db.query(OrganizationBankAccount)
        .filter(
            OrganizationBankAccount.organization_id == org_id,
            OrganizationBankAccount.tenant_id == current_user.tenant_id,
        )
        .order_by(OrganizationBankAccount.is_primary.desc())
        .all()
    )
    return StandardListResponse(
        data=[OrganizationBankAccountResponse.model_validate(b) for b in items],
        meta=PaginationMeta(
            total=len(items), page=1, page_size=len(items) or 1, total_pages=1
        ),
    )


@router.post(
    "/{org_id}/bank-accounts",
    response_model=StandardResponse[OrganizationBankAccountResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add bank account to organization",
)
async def add_bank_account(
    org_id: Annotated[UUID, Path(...)],
    payload: OrganizationBankAccountCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[OrganizationBankAccountResponse]:
    _get_org_or_404(db, current_user.tenant_id, org_id)
    ba = OrganizationBankAccount(
        tenant_id=current_user.tenant_id,
        organization_id=org_id,
        **payload.model_dump(),
    )
    db.add(ba)
    db.commit()
    db.refresh(ba)
    return StandardResponse(data=OrganizationBankAccountResponse.model_validate(ba))


@router.put(
    "/{org_id}/bank-accounts/{ba_id}",
    response_model=StandardResponse[OrganizationBankAccountResponse],
    status_code=status.HTTP_200_OK,
    summary="Update bank account",
)
async def update_bank_account(
    org_id: Annotated[UUID, Path(...)],
    ba_id: Annotated[UUID, Path(...)],
    payload: OrganizationBankAccountUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[OrganizationBankAccountResponse]:
    ba = _get_bank_account_or_404(db, current_user.tenant_id, org_id, ba_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(ba, field, value)
    db.commit()
    db.refresh(ba)
    return StandardResponse(data=OrganizationBankAccountResponse.model_validate(ba))


@router.delete(
    "/{org_id}/bank-accounts/{ba_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete bank account (set is_active=False)",
)
async def delete_bank_account(
    org_id: Annotated[UUID, Path(...)],
    ba_id: Annotated[UUID, Path(...)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    ba = _get_bank_account_or_404(db, current_user.tenant_id, org_id, ba_id)
    ba.is_active = False  # type: ignore[assignment]
    db.commit()


# ── Organization Contacts (M:M) ────────────────────────────────────────────────


def _get_membership_or_404(
    db: Session, tenant_id: UUID, org_id: UUID, contact_id: UUID
) -> OrganizationContact:
    membership = (
        db.query(OrganizationContact)
        .filter(
            OrganizationContact.organization_id == org_id,
            OrganizationContact.contact_id == contact_id,
            OrganizationContact.tenant_id == tenant_id,
        )
        .first()
    )
    if not membership:
        raise_not_found("OrganizationContact", f"{org_id}/{contact_id}")
    return membership  # type: ignore[return-value]


def _membership_to_response(m: OrganizationContact) -> OrgContactResponse:
    contact = m.contact
    return OrgContactResponse(
        id=m.id,  # type: ignore[arg-type]
        contact_id=m.contact_id,  # type: ignore[arg-type]
        organization_id=m.organization_id,  # type: ignore[arg-type]
        full_name=contact.full_name if contact else None,
        first_name=contact.first_name if contact else None,
        last_name=contact.last_name if contact else None,
        job_title=m.job_title,
        department=m.department,
        role_tag=(
            m.role_tag.value
            if m.role_tag and hasattr(m.role_tag, "value")
            else m.role_tag
        ),
        is_primary=m.is_primary,
        notes=m.notes,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


@router.get(
    "/{org_id}/contacts",
    response_model=StandardListResponse[OrgContactResponse],
    status_code=status.HTTP_200_OK,
    summary="List contacts for an organization",
)
async def list_org_contacts(
    org_id: Annotated[UUID, Path(...)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardListResponse[OrgContactResponse]:
    _get_org_or_404(db, current_user.tenant_id, org_id)
    from sqlalchemy.orm import joinedload

    memberships = (
        db.query(OrganizationContact)
        .options(joinedload(OrganizationContact.contact))
        .filter(
            OrganizationContact.organization_id == org_id,
            OrganizationContact.tenant_id == current_user.tenant_id,
        )
        .order_by(OrganizationContact.is_primary.desc())
        .all()
    )
    data = [_membership_to_response(m) for m in memberships]
    return StandardListResponse(
        data=data,
        meta=PaginationMeta(
            total=len(data), page=1, page_size=len(data) or 1, total_pages=1
        ),
    )


@router.post(
    "/{org_id}/contacts",
    response_model=StandardResponse[OrgContactResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Link a contact to an organization (or create + link)",
)
async def add_org_contact(
    org_id: Annotated[UUID, Path(...)],
    payload: OrgContactCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[OrgContactResponse]:
    from sqlalchemy.orm import joinedload

    _get_org_or_404(db, current_user.tenant_id, org_id)

    contact_id = payload.contact_id
    if contact_id is None:
        # Create a new contact on-the-fly
        if not payload.full_name and not payload.first_name:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=422, detail="contact_id or full_name/first_name required"
            )
        full_name = (
            payload.full_name
            or f"{payload.first_name or ''} {payload.last_name or ''}".strip()
        )
        contact = Contact(
            tenant_id=current_user.tenant_id,
            full_name=full_name,
            first_name=payload.first_name,
            last_name=payload.last_name,
            job_title=payload.job_title,
            department=payload.department,
            is_active=True,
        )
        db.add(contact)
        db.flush()
        contact_id = contact.id  # type: ignore[assignment]
    else:
        # Verify contact belongs to tenant
        contact = (
            db.query(Contact)
            .filter(
                Contact.id == contact_id, Contact.tenant_id == current_user.tenant_id
            )
            .first()  # type: ignore[assignment]
        )
        if not contact:
            raise_not_found("Contact", str(contact_id))

    # Unset other primaries for this org if setting as primary
    if payload.is_primary:
        db.query(OrganizationContact).filter(
            OrganizationContact.organization_id == org_id,
            OrganizationContact.tenant_id == current_user.tenant_id,
        ).update({"is_primary": False})

    from app.core.contacts.models import OrgContactRole

    role = None
    if payload.role_tag:
        try:
            role = OrgContactRole(payload.role_tag)
        except ValueError:
            role = None

    membership = OrganizationContact(
        tenant_id=current_user.tenant_id,
        organization_id=org_id,
        contact_id=contact_id,
        job_title=payload.job_title,
        department=payload.department,
        role_tag=role,
        is_primary=payload.is_primary,
        notes=payload.notes,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)

    membership = (
        db.query(OrganizationContact)
        .options(joinedload(OrganizationContact.contact))
        .filter(OrganizationContact.id == membership.id)
        .first()
    )
    return StandardResponse(data=_membership_to_response(membership))  # type: ignore[arg-type]


@router.patch(
    "/{org_id}/contacts/{contact_id}",
    response_model=StandardResponse[OrgContactResponse],
    status_code=status.HTTP_200_OK,
    summary="Update a contact's role within an organization",
)
async def update_org_contact(
    org_id: Annotated[UUID, Path(...)],
    contact_id: Annotated[UUID, Path(...)],
    payload: OrgContactUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[OrgContactResponse]:
    from sqlalchemy.orm import joinedload

    membership = _get_membership_or_404(db, current_user.tenant_id, org_id, contact_id)

    if payload.is_primary:
        db.query(OrganizationContact).filter(
            OrganizationContact.organization_id == org_id,
            OrganizationContact.tenant_id == current_user.tenant_id,
            OrganizationContact.id != membership.id,
        ).update({"is_primary": False})

    from app.core.contacts.models import OrgContactRole

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "role_tag" and value is not None:
            try:
                value = OrgContactRole(value)
            except ValueError:
                value = None
        setattr(membership, field, value)

    db.commit()
    membership = (
        db.query(OrganizationContact)
        .options(joinedload(OrganizationContact.contact))
        .filter(OrganizationContact.id == membership.id)
        .first()
    )
    return StandardResponse(data=_membership_to_response(membership))  # type: ignore[arg-type]


@router.delete(
    "/{org_id}/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unlink a contact from an organization",
)
async def remove_org_contact(
    org_id: Annotated[UUID, Path(...)],
    contact_id: Annotated[UUID, Path(...)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    membership = _get_membership_or_404(db, current_user.tenant_id, org_id, contact_id)
    db.delete(membership)
    db.commit()
