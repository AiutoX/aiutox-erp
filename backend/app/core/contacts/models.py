"""Canonical CRM contact models — contacts, contact methods, and org memberships."""

from datetime import UTC, datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
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
    from app.core.tenants.models import Tenant  # noqa: F401
    from app.core.users.models import Organization  # noqa: F401


class ContactMethodType(PyEnum):
    """Types of contact methods."""

    EMAIL = "email"
    PHONE = "phone"
    MOBILE = "mobile"
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    ADDRESS = "address"
    WEBSITE = "website"
    FAX = "fax"


class ContactEntityType(PyEnum):
    """Types of entities that can have contact methods."""

    USER = "user"
    CONTACT = "contact"
    ORGANIZATION = "organization"
    EMPLOYEE = "employee"
    TENANT = "tenant"


class OrgContactRole(PyEnum):
    """Functional role of a contact within an organization."""

    LEGAL_REP = "legal_rep"
    BILLING = "billing"
    OPERATIONS = "operations"
    ADMIN = "admin"
    TECHNICAL = "technical"
    OTHER = "other"


class Contact(Base):
    """Contact model for persons who interact with the tenant's organizations."""

    __tablename__ = "contacts"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    middle_name = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    is_primary_contact = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
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

    tenant = relationship("Tenant", backref="contacts")
    org_memberships = relationship(
        "OrganizationContact",
        back_populates="contact",
        cascade="all, delete-orphan",
        lazy="select",
    )
    # viewonly secondary for convenient access to Organization objects
    organizations = relationship(
        "Organization",
        secondary="organization_contacts",
        back_populates="contacts",
        viewonly=True,
        lazy="select",
    )
    # Polymorphic relationship to contact_methods (entity_type == 'contact')
    contact_methods = relationship(
        "ContactMethod",
        primaryjoin=(
            "and_(foreign(ContactMethod.entity_id) == Contact.id, "
            "ContactMethod.entity_type == 'contact')"
        ),
        viewonly=True,
        lazy="select",
    )

    @property
    def organization_id(self):
        """Backward-compat: primary org membership's organization_id, or first."""
        if not self.org_memberships:
            return None
        primary = next((m for m in self.org_memberships if m.is_primary), None)
        return (primary or self.org_memberships[0]).organization_id

    def __repr__(self) -> str:
        return f"<Contact(id={self.id}, full_name={self.full_name})>"


class OrganizationContact(Base):
    """Junction table: many-to-many between organizations and contacts.

    Stores the role and context of a contact within a specific organization.
    """

    __tablename__ = "organization_contacts"

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
        index=True,
    )
    contact_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_title = Column(String(150), nullable=True)
    department = Column(String(150), nullable=True)
    role_tag = Column(
        Enum(OrgContactRole, native_enum=False, length=20),
        nullable=True,
    )
    is_primary = Column(Boolean, default=False, nullable=False)
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

    organization = relationship("Organization", back_populates="org_contacts")
    contact = relationship("Contact", back_populates="org_memberships")

    @property
    def organization_name(self) -> str | None:
        """Convenience accessor for embedding in ContactResponse."""
        return self.organization.name if self.organization else None

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "contact_id",
            name="uq_organization_contacts_org_contact",
        ),
        Index("ix_org_contacts_tenant_org", "tenant_id", "organization_id"),
        Index("ix_org_contacts_tenant_contact", "tenant_id", "contact_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<OrganizationContact(org={self.organization_id}, "
            f"contact={self.contact_id}, role={self.role_tag})>"
        )


class ContactMethod(Base):
    """Contact method model for polymorphic contact information."""

    __tablename__ = "contact_methods"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    entity_type = Column(
        Enum(ContactEntityType, native_enum=False, length=50),
        nullable=False,
        index=True,
    )
    entity_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    method_type = Column(
        Enum(ContactMethodType, native_enum=False, length=50),
        nullable=False,
    )
    value = Column(String(500), nullable=False)
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state_province = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(2), nullable=True)
    label = Column(String(100), nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_at = Column(TIMESTAMP(timezone=True), nullable=True)
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

    __table_args__ = (
        Index("ix_contact_methods_entity", "entity_type", "entity_id"),
        UniqueConstraint(
            "entity_type",
            "entity_id",
            "method_type",
            "value",
            name="uq_contact_methods_entity_type_value",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<ContactMethod(id={self.id}, entity_type={self.entity_type}, "
            f"method_type={self.method_type})>"
        )


EntityType = ContactEntityType

__all__ = [
    "Contact",
    "ContactEntityType",
    "ContactMethod",
    "ContactMethodType",
    "EntityType",
    "OrgContactRole",
    "OrganizationContact",
]
