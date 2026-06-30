"""Add dc_media_captures table for audio/video/photo storage (Sprint 9)

Revision ID: add_media_capture_table
Revises: add_sync_state_table
Create Date: 2026-04-08 21:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_media_capture_table"
down_revision: str | None = "dc_approval_audit_logs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create dc_media_captures table for audio/video/photo capture storage."""
    op.create_table(
        "dc_media_captures",
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
        # Field ID in form schema (e.g., "audio_field", "video_field")
        sa.Column("field_id", sa.String(length=255), nullable=False),
        # Media type: MIME type (e.g., "audio/webm", "video/mp4", "image/jpeg")
        sa.Column("media_type", sa.String(length=50), nullable=False),
        # Cloud storage reference (S3, Azure Blob, etc.)
        sa.Column("file_key", sa.String(length=255), nullable=False),
        # File size in bytes
        sa.Column("file_size", sa.Integer(), nullable=False),
        # Duration in milliseconds (for audio/video)
        sa.Column("duration", sa.Integer(), nullable=True),
        # Media metadata
        sa.Column(
            "codec", sa.String(length=50), nullable=True
        ),  # "opus", "h264", "jpeg"
        sa.Column("bitrate", sa.Integer(), nullable=True),  # bits per second
        sa.Column(
            "resolution", sa.String(length=20), nullable=True
        ),  # "1920x1080" for video
        # For offline: reference to blob in IndexedDB
        # Format: "local-media-{submission_id}-{field_id}-{timestamp}"
        sa.Column("blob_reference", sa.String(length=255), nullable=True),
        # Timestamps
        sa.Column(
            "captured_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("uploaded_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        # Encryption status
        sa.Column(
            "is_encrypted",
            sa.String(length=20),
            nullable=False,
            server_default="none",
        ),  # "none", "aes-256-gcm"
        sa.Column(
            "encryption_version", sa.String(length=10), nullable=True
        ),  # "1", "2", etc.
        # Sync tracking (for offline)
        sa.Column(
            "is_synced",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),  # "pending", "synced", "failed"
        sa.Column(
            "last_sync_attempt", postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
        sa.Column("sync_error", sa.String(length=500), nullable=True),
        # Optional metadata (e.g., thumbnail_url, processing_status)
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
        "ix_dc_media_captures_submission",
        "dc_media_captures",
        ["submission_id"],
        unique=False,
    )
    # Fast lookup by field
    op.create_index(
        "ix_dc_media_captures_field",
        "dc_media_captures",
        ["field_id"],
        unique=False,
    )
    # Fast lookup by tenant (for cleanup/archival)
    op.create_index(
        "ix_dc_media_captures_tenant",
        "dc_media_captures",
        ["tenant_id"],
        unique=False,
    )
    # Composite index for querying pending syncs (A7-T05)
    op.create_index(
        "ix_dc_media_captures_pending_sync",
        "dc_media_captures",
        ["tenant_id", "is_synced", "captured_at"],
        unique=False,
    )
    # Index for encrypted media queries
    op.create_index(
        "ix_dc_media_captures_encrypted",
        "dc_media_captures",
        ["tenant_id", "is_encrypted"],
        unique=False,
    )
    # Index for media type queries (e.g., "get all videos")
    op.create_index(
        "ix_dc_media_captures_media_type",
        "dc_media_captures",
        ["tenant_id", "media_type"],
        unique=False,
    )


def downgrade() -> None:
    """Drop dc_media_captures table and indexes."""
    op.drop_index(
        "ix_dc_media_captures_media_type",
        table_name="dc_media_captures",
    )
    op.drop_index(
        "ix_dc_media_captures_encrypted",
        table_name="dc_media_captures",
    )
    op.drop_index(
        "ix_dc_media_captures_pending_sync",
        table_name="dc_media_captures",
    )
    op.drop_index(
        "ix_dc_media_captures_tenant",
        table_name="dc_media_captures",
    )
    op.drop_index(
        "ix_dc_media_captures_field",
        table_name="dc_media_captures",
    )
    op.drop_index(
        "ix_dc_media_captures_submission",
        table_name="dc_media_captures",
    )
    op.drop_table("dc_media_captures")
