"""Canonical auth models: RefreshToken, ModuleRole, DelegatedPermission."""

from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Column, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.db.session import Base

if TYPE_CHECKING:
    from app.core.users.models import User  # noqa: F401


class RefreshToken(Base):
    """RefreshToken model for storing refresh tokens with hash."""

    __tablename__ = "refresh_tokens"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    revoked_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    user = relationship("User", back_populates="refresh_tokens")

    def __repr__(self) -> str:
        return f"<RefreshToken(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"


class ModuleRole(Base):
    """ModuleRole model for internal module roles assignment."""

    __tablename__ = "module_roles"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    module = Column(String(100), nullable=False)
    role_name = Column(String(100), nullable=False)
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

    user = relationship("User", back_populates="module_roles", foreign_keys=[user_id])
    granter = relationship("User", foreign_keys=[granted_by])

    __table_args__ = (
        UniqueConstraint(
            "user_id", "module", "role_name", name="uq_module_roles_user_module_role"
        ),
        Index("idx_module_roles_user_module", "user_id", "module"),
    )

    def __repr__(self) -> str:
        return f"<ModuleRole(id={self.id}, user_id={self.user_id}, module={self.module}, role_name={self.role_name})>"


class DelegatedPermission(Base):
    """DelegatedPermission model for permission delegation by module leaders."""

    __tablename__ = "delegated_permissions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    granted_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        index=True,
    )
    module = Column(String(100), nullable=False)
    permission = Column(String(255), nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    revoked_at = Column(TIMESTAMP(timezone=True), nullable=True)

    user = relationship(
        "User", back_populates="delegated_permissions", foreign_keys=[user_id]
    )
    granter = relationship("User", foreign_keys=[granted_by])

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "module",
            "permission",
            "granted_by",
            name="uq_delegated_permissions_user_module_permission_granter",
        ),
        Index("idx_delegated_permissions_user_id", "user_id"),
        Index("idx_delegated_permissions_granted_by", "granted_by"),
    )

    @property
    def is_active(self) -> bool:
        if self.revoked_at is not None:
            return False
        if self.expires_at is None:
            return True
        return self.expires_at > datetime.now(UTC)

    def __repr__(self) -> str:
        return (
            f"<DelegatedPermission(id={self.id}, user_id={self.user_id}, "
            f"module={self.module}, permission={self.permission}, "
            f"granted_by={self.granted_by})>"
        )


class RolePermission(Base):
    """RolePermission model for storing custom permissions per role.

    Allows overriding the hardcoded ROLE_PERMISSIONS with tenant-specific
    role definitions stored in the database.
    """

    __tablename__ = "role_permissions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(50), nullable=False)
    permission = Column(String(255), nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "role",
            "permission",
            name="uq_role_permissions_tenant_role_permission",
        ),
        Index("idx_role_permissions_tenant_role", "tenant_id", "role"),
    )

    def __repr__(self) -> str:
        return (
            f"<RolePermission(id={self.id}, tenant_id={self.tenant_id}, "
            f"role={self.role}, permission={self.permission})>"
        )
