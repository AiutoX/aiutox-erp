"""dc_medium_schema — Data Collection Medium DB changes.

New tables: dc_form_folders, dc_form_groups, dc_respondent_links, dc_cases
New columns: dc_forms (folder/template/navigation), dc_form_submissions (draft/analytics),
             dc_lookup_tables (remote/cascading)

Revision ID: af9bd3614be8
Revises: dc_initial_schema_v2
Create Date: 2026-04-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "af9bd3614be8"
down_revision: str | None = "dc_initial_schema_v2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # 1. NEW TABLE: dc_form_folders (must precede dc_forms FK)            #
    # ------------------------------------------------------------------ #
    op.create_table(
        "dc_form_folders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "parent_folder_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dc_form_folders.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
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
    op.create_index("ix_dc_form_folders_tenant", "dc_form_folders", ["tenant_id"])

    # ------------------------------------------------------------------ #
    # 2. NEW COLUMNS: dc_forms                                            #
    # ------------------------------------------------------------------ #
    op.add_column(
        "dc_forms",
        sa.Column(
            "folder_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dc_form_folders.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "dc_forms",
        sa.Column("estimated_completion_time", sa.Integer(), nullable=True),
    )
    op.add_column(
        "dc_forms",
        sa.Column(
            "navigation_type",
            sa.String(20),
            nullable=False,
            server_default="wizard",
        ),
    )
    op.add_column(
        "dc_forms",
        sa.Column(
            "prefill_config",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column(
        "dc_forms",
        sa.Column("is_template", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "dc_forms",
        sa.Column("template_category", sa.String(100), nullable=True),
    )
    op.add_column(
        "dc_forms",
        sa.Column(
            "template_tags",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "dc_forms",
        sa.Column(
            "available_languages",
            postgresql.JSONB(),
            nullable=False,
            server_default='["es"]',
        ),
    )

    # ------------------------------------------------------------------ #
    # 3. NEW TABLE: dc_form_groups                                        #
    # ------------------------------------------------------------------ #
    op.create_table(
        "dc_form_groups",
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
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("collapsible", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "collapsed_by_default", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column(
            "parent_group_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dc_form_groups.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "ui_properties",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("columns", sa.Integer(), nullable=True),
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
    op.create_index("ix_dc_form_groups_form", "dc_form_groups", ["form_id"])
    op.create_index("ix_dc_form_groups_tenant", "dc_form_groups", ["tenant_id"])

    # ------------------------------------------------------------------ #
    # 4. NEW TABLE: dc_respondent_links                                   #
    # ------------------------------------------------------------------ #
    op.create_table(
        "dc_respondent_links",
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
        sa.Column("token", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("respondent_email", sa.String(255), nullable=True),
        sa.Column("used_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("expires_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
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
    )
    op.create_index(
        "ix_dc_respondent_links_token", "dc_respondent_links", ["token"], unique=True
    )
    op.create_index("ix_dc_respondent_links_form", "dc_respondent_links", ["form_id"])
    op.create_index(
        "ix_dc_respondent_links_tenant", "dc_respondent_links", ["tenant_id"]
    )

    # ------------------------------------------------------------------ #
    # 5. NEW TABLE: dc_cases                                              #
    # ------------------------------------------------------------------ #
    op.create_table(
        "dc_cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="open"),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "form_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dc_forms.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "submission_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dc_form_submissions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "assigned_to",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("priority", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("resolved_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
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
    op.create_index("ix_dc_cases_entity", "dc_cases", ["entity_type", "entity_id"])
    op.create_index("ix_dc_cases_tenant", "dc_cases", ["tenant_id"])

    # ------------------------------------------------------------------ #
    # 6. NEW COLUMNS: dc_form_submissions                                 #
    # ------------------------------------------------------------------ #
    op.add_column(
        "dc_form_submissions",
        sa.Column("draft_data", postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        "dc_form_submissions",
        sa.Column("time_started", postgresql.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "dc_form_submissions",
        sa.Column("time_completed", postgresql.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "dc_form_submissions",
        sa.Column("ip_hash", sa.String(64), nullable=True),
    )
    op.add_column(
        "dc_form_submissions",
        sa.Column("geolocation", postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        "dc_form_submissions",
        sa.Column("invalidated_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "dc_form_submissions",
        sa.Column(
            "invalidated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "dc_form_submissions",
        sa.Column("device_type", sa.String(30), nullable=True),
    )
    op.add_column(
        "dc_form_submissions",
        sa.Column("referrer_url", sa.String(500), nullable=True),
    )
    op.add_column(
        "dc_form_submissions",
        sa.Column(
            "page_events",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "dc_form_submissions",
        sa.Column(
            "field_events",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
    )

    # ------------------------------------------------------------------ #
    # 7. NEW COLUMNS: dc_lookup_tables                                    #
    # ------------------------------------------------------------------ #
    op.add_column(
        "dc_lookup_tables",
        sa.Column("remote_url", sa.String(500), nullable=True),
    )
    op.add_column(
        "dc_lookup_tables",
        sa.Column("refresh_interval", sa.Integer(), nullable=True),
    )
    op.add_column(
        "dc_lookup_tables",
        sa.Column("filter_parent_field", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    # Reverse in opposite order

    # 7. dc_lookup_tables columns
    op.drop_column("dc_lookup_tables", "filter_parent_field")
    op.drop_column("dc_lookup_tables", "refresh_interval")
    op.drop_column("dc_lookup_tables", "remote_url")

    # 6. dc_form_submissions columns
    op.drop_column("dc_form_submissions", "field_events")
    op.drop_column("dc_form_submissions", "page_events")
    op.drop_column("dc_form_submissions", "referrer_url")
    op.drop_column("dc_form_submissions", "device_type")
    op.drop_column("dc_form_submissions", "invalidated_by")
    op.drop_column("dc_form_submissions", "invalidated_at")
    op.drop_column("dc_form_submissions", "geolocation")
    op.drop_column("dc_form_submissions", "ip_hash")
    op.drop_column("dc_form_submissions", "time_completed")
    op.drop_column("dc_form_submissions", "time_started")
    op.drop_column("dc_form_submissions", "draft_data")

    # 5. dc_cases
    op.drop_index("ix_dc_cases_tenant", "dc_cases")
    op.drop_index("ix_dc_cases_entity", "dc_cases")
    op.drop_table("dc_cases")

    # 4. dc_respondent_links
    op.drop_index("ix_dc_respondent_links_tenant", "dc_respondent_links")
    op.drop_index("ix_dc_respondent_links_form", "dc_respondent_links")
    op.drop_index("ix_dc_respondent_links_token", "dc_respondent_links")
    op.drop_table("dc_respondent_links")

    # 3. dc_form_groups
    op.drop_index("ix_dc_form_groups_tenant", "dc_form_groups")
    op.drop_index("ix_dc_form_groups_form", "dc_form_groups")
    op.drop_table("dc_form_groups")

    # 2. dc_forms columns
    op.drop_column("dc_forms", "available_languages")
    op.drop_column("dc_forms", "template_tags")
    op.drop_column("dc_forms", "template_category")
    op.drop_column("dc_forms", "is_template")
    op.drop_column("dc_forms", "prefill_config")
    op.drop_column("dc_forms", "navigation_type")
    op.drop_column("dc_forms", "estimated_completion_time")
    op.drop_column("dc_forms", "folder_id")

    # 1. dc_form_folders
    op.drop_index("ix_dc_form_folders_tenant", "dc_form_folders")
    op.drop_table("dc_form_folders")
