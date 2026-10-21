"""Add maintenance_requests table (Request Portal).

Tenant-facing maintenance request feature: inquilinos submit requests
that staff review and optionally convert to WorkOrders on approval.

State machine: pending → reviewing → approved | rejected

Revision ID: 2026_03_21_maint_requests
Revises: 2026_03_16_fix_mentions
Create Date: 2026-03-21 10:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "2026_03_21_maint_requests"
down_revision = "2026_03_16_fix_mentions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "maintenance_requests",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submitted_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("descripcion", sa.Text, nullable=True),
        sa.Column("prioridad", sa.String(10), nullable=False, server_default="medium"),
        sa.Column("estado", sa.String(20), nullable=False, server_default="pending"),
        sa.Column(
            "fotos",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        # Review fields
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("review_notes", sa.Text, nullable=True),
        sa.Column("reviewed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        # Link to created WorkOrder (set on approval)
        sa.Column("work_order_id", postgresql.UUID(as_uuid=True), nullable=True),
        # Timestamps
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # Indexes
    op.create_index("ix_maint_req_tenant", "maintenance_requests", ["tenant_id"])
    op.create_index("ix_maint_req_property", "maintenance_requests", ["property_id"])
    op.create_index("ix_maint_req_estado", "maintenance_requests", ["estado"])
    op.create_index(
        "ix_maint_req_submitted_by", "maintenance_requests", ["submitted_by"]
    )
    op.create_index(
        "ix_maint_req_tenant_estado",
        "maintenance_requests",
        ["tenant_id", "estado"],
    )


def downgrade() -> None:
    op.drop_index("ix_maint_req_tenant_estado", table_name="maintenance_requests")
    op.drop_index("ix_maint_req_submitted_by", table_name="maintenance_requests")
    op.drop_index("ix_maint_req_estado", table_name="maintenance_requests")
    op.drop_index("ix_maint_req_property", table_name="maintenance_requests")
    op.drop_index("ix_maint_req_tenant", table_name="maintenance_requests")
    op.drop_table("maintenance_requests")
