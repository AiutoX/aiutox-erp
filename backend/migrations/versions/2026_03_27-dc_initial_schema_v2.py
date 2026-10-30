"""dc_initial_schema_v2 — 6 dc_* tables for data_collection module MVP

Revision ID: dc_initial_schema_v2
Revises: inv_expansion_v2
Create Date: 2026-03-27

Tables created:
  - dc_forms
  - dc_form_versions
  - dc_lookup_tables
  - dc_form_submissions
  - dc_dashboards
  - dc_sync_events
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "dc_initial_schema_v2"
down_revision: str | None = "inv_expansion_v2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── dc_forms ────────────────────────────────────────────────────────────
    op.create_table(
        "dc_forms",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("visibility", sa.String(length=50), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("schema", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("settings", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("allow_anonymous", sa.Boolean(), nullable=False),
        sa.Column("opens_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("closes_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("max_responses", sa.Integer(), nullable=True),
        sa.Column("encryption_enabled", sa.Boolean(), nullable=False),
        sa.Column("encryption_public_key", sa.Text(), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("updated_by", sa.UUID(), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "slug", name="uq_dc_forms_tenant_slug"),
    )
    op.create_index("ix_dc_forms_slug", "dc_forms", ["slug"], unique=False)
    op.create_index("ix_dc_forms_status", "dc_forms", ["status"], unique=False)
    op.create_index("ix_dc_forms_tenant", "dc_forms", ["tenant_id"], unique=False)
    # GIN index on schema JSONB for field-level querying
    op.execute("CREATE INDEX ix_dc_forms_schema_gin ON dc_forms USING GIN (schema)")

    # ── dc_form_versions ────────────────────────────────────────────────────
    op.create_table(
        "dc_form_versions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("form_id", sa.UUID(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column(
            "schema_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("changelog", sa.Text(), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["form_id"], ["dc_forms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "form_id", "version_number", name="uq_dc_form_versions_form_version"
        ),
    )
    op.create_index(
        "ix_dc_form_versions_form", "dc_form_versions", ["form_id"], unique=False
    )
    op.create_index(
        "ix_dc_form_versions_tenant", "dc_form_versions", ["tenant_id"], unique=False
    )

    # ── dc_lookup_tables ────────────────────────────────────────────────────
    op.create_table(
        "dc_lookup_tables",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("items", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "tenant_id", "slug", name="uq_dc_lookup_tables_tenant_slug"
        ),
    )
    op.create_index(
        "ix_dc_lookup_tables_tenant", "dc_lookup_tables", ["tenant_id"], unique=False
    )

    # ── dc_form_submissions ─────────────────────────────────────────────────
    op.create_table(
        "dc_form_submissions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("local_id", sa.String(length=255), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("form_id", sa.UUID(), nullable=False),
        sa.Column("form_version", sa.String(length=50), nullable=True),
        sa.Column("form_version_id", sa.UUID(), nullable=True),
        sa.Column("parent_submission_id", sa.UUID(), nullable=True),
        sa.Column("submitter_id", sa.UUID(), nullable=True),
        sa.Column("submitter_email", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("sync_source", sa.String(length=50), nullable=True),
        sa.Column(
            "client_created_at", postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["form_id"], ["dc_forms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["form_version_id"], ["dc_form_versions.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["parent_submission_id"],
            ["dc_form_submissions.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(["submitter_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "local_id", "tenant_id", name="uq_dc_submissions_local_id_tenant"
        ),
    )
    op.create_index(
        "ix_dc_submissions_tenant", "dc_form_submissions", ["tenant_id"], unique=False
    )
    op.create_index(
        "ix_dc_submissions_form", "dc_form_submissions", ["form_id"], unique=False
    )
    op.create_index(
        "ix_dc_submissions_status", "dc_form_submissions", ["status"], unique=False
    )
    # GIN index on data JSONB for field-level querying
    op.execute(
        "CREATE INDEX ix_dc_submissions_data_gin ON dc_form_submissions USING GIN (data)"
    )

    # ── dc_dashboards ───────────────────────────────────────────────────────
    op.create_table(
        "dc_dashboards",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("layout", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("widgets", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("filters", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_dc_dashboards_tenant", "dc_dashboards", ["tenant_id"], unique=False
    )

    # ── dc_sync_events ──────────────────────────────────────────────────────
    op.create_table(
        "dc_sync_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("sync_batch_id", sa.String(length=255), nullable=True),
        sa.Column("operation_type", sa.String(length=50), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_local_id", sa.String(length=255), nullable=True),
        sa.Column("entity_server_id", sa.UUID(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column(
            "conflict_detail",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("synced_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_dc_sync_events_batch", "dc_sync_events", ["sync_batch_id"], unique=False
    )
    op.create_index(
        "ix_dc_sync_events_status", "dc_sync_events", ["status"], unique=False
    )
    op.create_index(
        "ix_dc_sync_events_tenant", "dc_sync_events", ["tenant_id"], unique=False
    )


def downgrade() -> None:
    op.drop_table("dc_sync_events")
    op.drop_table("dc_dashboards")
    op.drop_table("dc_form_submissions")
    op.drop_table("dc_lookup_tables")
    op.drop_table("dc_form_versions")
    op.drop_table("dc_forms")
