"""dc_advanced_schema — Data Collection Advanced DB changes.

New tables:
  - dc_sync_states       (A3: per-device delta sync checkpoint)
  - dc_api_keys          (A4: programmatic access API keys)
  - dc_brand_assets      (A7: tenant-scoped brand library)
  - dc_form_builder_audit_logs  (A7: field-level builder change tracking)

New columns in dc_sync_events:
  - sequence  BIGINT NOT NULL (A3: for delta sync ordering)

New columns in dc_form_submissions:
  - score  JSONB nullable (A2: scoring engine result)

New columns in dc_forms:
  - rendering_mode  VARCHAR(20) NOT NULL default 'standard'

New columns in dc_form_fields (stored in JSONB schema — no migration needed):
  - css_classes, inline_style, html_attributes, custom_css_block, translations,
    calculated_expression are stored inside dc_forms.schema JSONB (no migration)

Indexes + extensions:
  - CREATE EXTENSION pg_trgm
  - GIN index on dc_form_submissions.data

Revision ID: dc_advanced_schema
Revises: af9bd3614be8
Create Date: 2026-04-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "dc_advanced_schema"
down_revision: str | None = "af9bd3614be8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # 0. Extensions                                                        #
    # ------------------------------------------------------------------ #
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

    # ------------------------------------------------------------------ #
    # 1. NEW COLUMN: dc_sync_events.sequence (A3 delta sync ordering)     #
    # ------------------------------------------------------------------ #
    # PostgreSQL SEQUENCE for global ordering of sync events
    op.execute(
        "CREATE SEQUENCE IF NOT EXISTS dc_sync_events_sequence_seq "
        "START 1 INCREMENT 1 NO CYCLE;"
    )
    op.add_column(
        "dc_sync_events",
        sa.Column(
            "sequence",
            sa.BigInteger(),
            nullable=True,  # nullable initially; backfill below; then NOT NULL
            server_default=sa.text("nextval('dc_sync_events_sequence_seq')"),
        ),
    )
    # Backfill existing rows with sequential values
    op.execute(
        "UPDATE dc_sync_events "
        "SET sequence = nextval('dc_sync_events_sequence_seq') "
        "WHERE sequence IS NULL;"
    )
    # Make non-nullable now that all rows have a value
    op.alter_column("dc_sync_events", "sequence", nullable=False)
    op.create_index(
        "ix_dc_sync_events_sequence", "dc_sync_events", ["sequence"], unique=True
    )

    # ------------------------------------------------------------------ #
    # 2. NEW TABLE: dc_sync_states (A3 per-device checkpoint)             #
    # ------------------------------------------------------------------ #
    op.create_table(
        "dc_sync_states",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("device_id", sa.String(255), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "last_synced_sequence",
            sa.BigInteger(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "last_synced_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "device_info",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
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
    )
    op.create_unique_constraint(
        "uq_dc_sync_states", "dc_sync_states", ["tenant_id", "device_id", "user_id"]
    )
    op.create_index("ix_dc_sync_states_tenant", "dc_sync_states", ["tenant_id"])
    op.create_index("ix_dc_sync_states_device", "dc_sync_states", ["device_id"])

    # ------------------------------------------------------------------ #
    # 3. NEW COLUMN: dc_form_submissions.score (A2 scoring engine)        #
    # ------------------------------------------------------------------ #
    op.add_column(
        "dc_form_submissions",
        sa.Column("score", postgresql.JSONB(), nullable=True),
    )

    # GIN index on submissions.data for full-text search (A6/A7)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_dc_form_submissions_data_gin "
        "ON dc_form_submissions USING GIN (data jsonb_path_ops);"
    )

    # ------------------------------------------------------------------ #
    # 4. NEW COLUMN: dc_forms.rendering_mode                              #
    # ------------------------------------------------------------------ #
    op.add_column(
        "dc_forms",
        sa.Column(
            "rendering_mode",
            sa.String(20),
            nullable=False,
            server_default="standard",
        ),
    )

    # ------------------------------------------------------------------ #
    # 5. NEW TABLE: dc_api_keys (A4 programmatic access)                  #
    # ------------------------------------------------------------------ #
    op.create_table(
        "dc_api_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("key_hash", sa.String(64), nullable=False),
        sa.Column("key_prefix", sa.String(10), nullable=False),
        sa.Column(
            "scope",
            postgresql.JSONB(),
            nullable=False,
            server_default='{"type": "global"}',
        ),
        sa.Column("last_used_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("expires_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_dc_api_keys_hash", "dc_api_keys", ["key_hash"], unique=True)
    op.create_index("ix_dc_api_keys_tenant", "dc_api_keys", ["tenant_id"])

    # ------------------------------------------------------------------ #
    # 6. NEW TABLE: dc_brand_assets (A7)                                  #
    # ------------------------------------------------------------------ #
    op.create_table(
        "dc_brand_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("asset_type", sa.String(50), nullable=False),
        sa.Column("file_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("url", sa.String(1000), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
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
    )
    op.create_index("ix_dc_brand_assets_tenant", "dc_brand_assets", ["tenant_id"])

    # ------------------------------------------------------------------ #
    # 7. NEW TABLE: dc_form_builder_audit_logs (A7)                       #
    # ------------------------------------------------------------------ #
    op.create_table(
        "dc_form_builder_audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "form_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dc_forms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("field_id", sa.String(255), nullable=True),
        sa.Column("old_value", postgresql.JSONB(), nullable=True),
        sa.Column("new_value", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_dc_form_builder_audit_logs_form",
        "dc_form_builder_audit_logs",
        ["form_id"],
    )
    op.create_index(
        "ix_dc_form_builder_audit_logs_tenant",
        "dc_form_builder_audit_logs",
        ["tenant_id"],
    )


def downgrade() -> None:
    # Reverse in opposite order

    # 7. dc_form_builder_audit_logs
    op.drop_index("ix_dc_form_builder_audit_logs_tenant", "dc_form_builder_audit_logs")
    op.drop_index("ix_dc_form_builder_audit_logs_form", "dc_form_builder_audit_logs")
    op.drop_table("dc_form_builder_audit_logs")

    # 6. dc_brand_assets
    op.drop_index("ix_dc_brand_assets_tenant", "dc_brand_assets")
    op.drop_table("dc_brand_assets")

    # 5. dc_api_keys
    op.drop_index("ix_dc_api_keys_tenant", "dc_api_keys")
    op.drop_index("ix_dc_api_keys_hash", "dc_api_keys")
    op.drop_table("dc_api_keys")

    # 4. dc_forms.rendering_mode
    op.drop_column("dc_forms", "rendering_mode")

    # 3. dc_form_submissions.score + GIN index
    op.execute("DROP INDEX IF EXISTS idx_dc_form_submissions_data_gin;")
    op.drop_column("dc_form_submissions", "score")

    # 2. dc_sync_states
    op.drop_index("ix_dc_sync_states_device", "dc_sync_states")
    op.drop_index("ix_dc_sync_states_tenant", "dc_sync_states")
    op.drop_constraint("uq_dc_sync_states", "dc_sync_states")
    op.drop_table("dc_sync_states")

    # 1. dc_sync_events.sequence
    op.drop_index("ix_dc_sync_events_sequence", "dc_sync_events")
    op.drop_column("dc_sync_events", "sequence")
    op.execute("DROP SEQUENCE IF EXISTS dc_sync_events_sequence_seq;")
