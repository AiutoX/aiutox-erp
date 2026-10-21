"""Add dc_geolocation_captures table for GPS location storage (Sprint 10)

Revision ID: add_geolocation_table
Revises: add_media_capture_table
Create Date: 2026-04-15 21:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_geolocation_table"
down_revision: str | None = "add_media_capture_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create dc_geolocation_captures table for GPS location storage."""
    op.create_table(
        "dc_geolocation_captures",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "submission_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            index=True,
        ),
        # GPS Coordinates (WGS84, 8 decimals = ~1.1mm accuracy)
        sa.Column("latitude", sa.Numeric(precision=10, scale=8), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=11, scale=8), nullable=False),
        # Accuracy in meters (confidence radius)
        sa.Column("accuracy", sa.Numeric(precision=8, scale=2), nullable=False),
        # Optional altitude (meters above sea level)
        sa.Column("altitude", sa.Numeric(precision=8, scale=2), nullable=True),
        # Optional speed (m/s)
        sa.Column("speed", sa.Numeric(precision=6, scale=2), nullable=True),
        # Optional heading (degrees, 0-360)
        sa.Column("heading", sa.Numeric(precision=5, scale=1), nullable=True),
        # Timestamps
        sa.Column(
            "captured_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("uploaded_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        # Sync tracking (for offline)
        sa.Column(
            "is_synced",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "last_sync_attempt", postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
        sa.Column("sync_error", sa.String(length=500), nullable=True),
        # Optional metadata
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'{}'::jsonb"),
        ),
        # Standard timestamps
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        # Foreign keys
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["submission_id"],
            ["dc_form_submissions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for query performance
    # Fast lookup by submission
    op.create_index(
        "ix_dc_geolocation_submission",
        "dc_geolocation_captures",
        ["submission_id"],
        unique=False,
    )
    # Fast lookup by tenant (for cleanup/archival)
    op.create_index(
        "ix_dc_geolocation_tenant",
        "dc_geolocation_captures",
        ["tenant_id"],
        unique=False,
    )
    # Composite index for querying pending syncs
    op.create_index(
        "ix_dc_geolocation_pending_sync",
        "dc_geolocation_captures",
        ["tenant_id", "is_synced", "captured_at"],
        unique=False,
    )


def downgrade() -> None:
    """Drop dc_geolocation_captures table and indexes."""
    op.drop_index(
        "ix_dc_geolocation_pending_sync",
        table_name="dc_geolocation_captures",
    )
    op.drop_index(
        "ix_dc_geolocation_tenant",
        table_name="dc_geolocation_captures",
    )
    op.drop_index(
        "ix_dc_geolocation_submission",
        table_name="dc_geolocation_captures",
    )
    op.drop_table("dc_geolocation_captures")
