"""TenantModuleTier model — commercial tier gating per tenant per module."""

from datetime import datetime
from uuid import UUID as _UUID

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.session import Base

_TIER_ORDER = {"basic": 1, "pro": 2, "enterprise": 3}


class TierLevel(str):
    """Ordered commercial tier string. Supports < / > comparisons by tier rank."""

    BASIC: "TierLevel"
    PRO: "TierLevel"
    ENTERPRISE: "TierLevel"

    def __new__(cls, value: str) -> "TierLevel":
        if value not in _TIER_ORDER:
            raise ValueError(
                f"Unknown tier: {value!r}. Must be one of {list(_TIER_ORDER)}"
            )
        obj = str.__new__(cls, value)
        return obj

    def _rank(self) -> int:
        return _TIER_ORDER[str(self)]

    def __lt__(self, other: object) -> bool:
        if isinstance(other, str):
            return self._rank() < _TIER_ORDER.get(str(other), 0)
        return NotImplemented

    def __le__(self, other: object) -> bool:
        if isinstance(other, str):
            return self._rank() <= _TIER_ORDER.get(str(other), 0)
        return NotImplemented

    def __gt__(self, other: object) -> bool:
        if isinstance(other, str):
            return self._rank() > _TIER_ORDER.get(str(other), 0)
        return NotImplemented

    def __ge__(self, other: object) -> bool:
        if isinstance(other, str):
            return self._rank() >= _TIER_ORDER.get(str(other), 0)
        return NotImplemented

    def __repr__(self) -> str:
        return f"TierLevel({str(self)!r})"


TierLevel.BASIC = TierLevel("basic")
TierLevel.PRO = TierLevel("pro")
TierLevel.ENTERPRISE = TierLevel("enterprise")


class TenantModuleTier(Base):
    """Commercial tier assignment for a tenant's module.

    Records which tier a tenant has contracted for a specific module,
    along with license metadata and expiration tracking. This is the
    source of truth for tier gating; TenantModule.tier is a denormalized
    cache updated from this table.
    """

    __tablename__ = "tenant_module_tiers"

    tenant_id: Mapped[_UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        primary_key=True,
    )
    module_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    tier: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="basic",
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    license_token_jti: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "module_id", name="uq_tenant_module_tiers"),
    )

    def __repr__(self) -> str:
        return (
            f"<TenantModuleTier(tenant={self.tenant_id}, module={self.module_id}, "
            f"tier={self.tier}, expires_at={self.expires_at})>"
        )
