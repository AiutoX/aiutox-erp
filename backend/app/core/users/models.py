"""Canonical models for users, roles, and organizations."""

from datetime import UTC, datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.db.session import Base

if TYPE_CHECKING:
    from app.core.auth.models import (  # noqa: F401
        DelegatedPermission,
        ModuleRole,
        RefreshToken,
    )
    from app.core.contacts.models import Contact, OrganizationContact  # noqa: F401
    from app.core.tasks.models.task_template import TaskTemplate  # noqa: F401
    from app.core.tenants.models import Tenant  # noqa: F401


class User(Base):
    """User model with authentication, tenant support, and personal information."""

    __tablename__ = "users"

    id: UUID = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)  # type: ignore[assignment]
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    middle_name = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    nationality = Column(String(2), nullable=True)
    marital_status = Column(String(20), nullable=True)

    job_title = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    employee_id = Column(String(100), nullable=True, unique=True, index=True)

    preferred_language = Column(String(10), default="es", nullable=False)
    timezone = Column(String(50), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    last_login_at = Column(TIMESTAMP(timezone=True), nullable=True)
    email_verified_at = Column(TIMESTAMP(timezone=True), nullable=True)
    phone_verified_at = Column(TIMESTAMP(timezone=True), nullable=True)
    two_factor_enabled = Column(Boolean, default=False, nullable=False)

    tenant_id: UUID = Column(  # type: ignore[assignment]
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    tenant = relationship("Tenant", back_populates="users")
    global_roles = relationship(
        "UserRole",
        back_populates="user",
        foreign_keys="UserRole.user_id",
        cascade="all, delete-orphan",
    )
    module_roles = relationship(
        "ModuleRole",
        back_populates="user",
        foreign_keys="ModuleRole.user_id",
        cascade="all, delete-orphan",
    )
    delegated_permissions = relationship(
        "DelegatedPermission",
        back_populates="user",
        foreign_keys="DelegatedPermission.user_id",
        cascade="all, delete-orphan",
    )
    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
    created_templates = relationship(
        "TaskTemplate", back_populates="creator", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, tenant_id={self.tenant_id})>"


class UserRole(Base):
    """UserRole model for global roles assignment."""

    __tablename__ = "user_roles"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(50), nullable=False)
    granted_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    user = relationship("User", back_populates="global_roles", foreign_keys=[user_id])
    granter = relationship("User", foreign_keys=[granted_by])

    __table_args__ = (
        UniqueConstraint("user_id", "role", name="uq_user_roles_user_role"),
    )

    def __repr__(self) -> str:
        return f"<UserRole(id={self.id}, user_id={self.user_id}, role={self.role})>"


class OrganizationType(PyEnum):
    """Types of business organizations."""

    CUSTOMER = "customer"
    SUPPLIER = "supplier"
    PARTNER = "partner"
    OTHER = "other"


class Organization(Base):
    """Organization model for business entities (customers, suppliers, partners)."""

    __tablename__ = "organizations"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    legal_name = Column(String(255), nullable=True)
    tax_id = Column(String(100), nullable=True, index=True)
    tipo_doc = Column(String(10), nullable=True)
    num_doc = Column(String(50), nullable=True)
    organization_type = Column(String(50), nullable=False, index=True)
    industry = Column(String(100), nullable=True)
    website = Column(String(500), nullable=True)
    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    tenant = relationship("Tenant", backref="organizations")
    # viewonly — managed through org_contacts (OrganizationContact junction)
    contacts = relationship(
        "Contact",
        secondary="organization_contacts",
        back_populates="organizations",
        viewonly=True,
        lazy="select",
    )
    org_contacts = relationship(
        "OrganizationContact",
        back_populates="organization",
        cascade="all, delete-orphan",
        order_by="OrganizationContact.is_primary.desc()",
    )
    bank_accounts = relationship(
        "OrganizationBankAccount",
        back_populates="organization",
        cascade="all, delete-orphan",
        order_by="OrganizationBankAccount.is_primary.desc()",
    )

    __table_args__ = (
        Index("ix_organizations_tenant_type", "tenant_id", "organization_type"),
        UniqueConstraint("tenant_id", "tax_id", name="uq_organizations_tenant_tax_id"),
    )

    def __repr__(self) -> str:
        return f"<Organization(id={self.id}, name={self.name}, tenant_id={self.tenant_id})>"


class OrganizationBankAccount(Base):
    """Bank accounts linked to an organization (1:M)."""

    __tablename__ = "organization_bank_accounts"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    bank_name = Column(String(100), nullable=False)
    account_type = Column(String(30), nullable=False)
    account_number = Column(String(50), nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    organization = relationship("Organization", back_populates="bank_accounts")

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "account_number",
            name="uq_org_bank_accounts_org_account",
        ),
        Index("ix_org_bank_accounts_tenant_org", "tenant_id", "organization_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<OrganizationBankAccount(id={self.id}, org_id={self.organization_id}, "
            f"bank={self.bank_name})>"
        )


class DocumentType(PyEnum):
    """Types of identification documents."""

    DNI = "dni"
    PASSPORT = "passport"
    DRIVERS_LICENSE = "drivers_license"
    NATIONAL_ID = "national_id"
    TAX_ID = "tax_id"
    OTHER = "other"


class PersonIdentificationEntityType(PyEnum):
    """Types of entities that can have identification information."""

    USER = "user"
    EMPLOYEE = "employee"
    CONTACT = "contact"


class PersonIdentification(Base):
    """Person identification model for document and identification information."""

    __tablename__ = "person_identifications"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    entity_type = Column(
        Enum(PersonIdentificationEntityType, native_enum=False, length=50),
        nullable=False,
        index=True,
    )
    entity_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    document_type = Column(
        Enum(DocumentType, native_enum=False, length=50),
        nullable=True,
    )
    document_number = Column(String(100), nullable=True, index=True)
    tax_id = Column(String(100), nullable=True)
    social_security_number = Column(String(100), nullable=True)
    issuing_country = Column(String(2), nullable=True)
    issuing_date = Column(TIMESTAMP(timezone=True), nullable=True)
    expiration_date = Column(TIMESTAMP(timezone=True), nullable=True)
    issuing_authority = Column(String(255), nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_person_identifications_entity", "entity_type", "entity_id"),
        UniqueConstraint(
            "entity_type",
            "entity_id",
            "document_type",
            "document_number",
            name="uq_person_identifications_entity_document",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<PersonIdentification(id={self.id}, entity_type={self.entity_type}, "
            f"document_type={self.document_type})>"
        )
