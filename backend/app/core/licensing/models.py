"""SQLAlchemy model for tenant_licenses — P10-T05."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.session import Base


class TenantLicense(Base):
    """Stores activated License JWTs per tenant.

    Each row represents one activated license. A tenant can have multiple
    historical records but only one non-revoked active license at a time.
    The license_jti (JWT ID) is the canonical identity of the license.
    """

    __tablename__ = "tenant_licenses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    license_jti: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(nullable=False)
    expires_at: Mapped[datetime] = mapped_column(nullable=False, index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    modules_json: Mapped[str] = mapped_column(
        String(4096), nullable=False, default="{}"
    )
    activated_by: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=lambda: datetime.now(UTC),
        server_default=text("now()"),
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "license_jti", name="uq_tenant_license_jti"),
    )

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None and self.expires_at > datetime.now(UTC)
