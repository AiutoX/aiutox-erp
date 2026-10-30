"""Add maintenance spare parts: spare_parts and work_order_spare_parts tables

Revision ID: 2026_03_15_spare_parts
Revises: 2026_03_15_maintenance
Create Date: 2026-03-15 21:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "2026_03_15_spare_parts"
down_revision = "2026_03_15_maintenance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── maintenance_spare_parts ────────────────────────────────────────────
    op.create_table(
        "maintenance_spare_parts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("part_number", sa.String(100), nullable=True),
        sa.Column("marca", sa.String(100), nullable=True),
        sa.Column("unit", sa.String(10), nullable=False, server_default="pieza"),
        sa.Column("stock_actual", sa.Integer, nullable=False, server_default="0"),
        sa.Column("stock_minimo", sa.Integer, nullable=False, server_default="0"),
        sa.Column("proveedor", sa.String(255), nullable=True),
        sa.Column(
            "costo_unitario", sa.Numeric(14, 2), nullable=False, server_default="0"
        ),
        sa.Column("ubicacion", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_spare_part_tenant", "maintenance_spare_parts", ["tenant_id"])
    op.create_index(
        "ix_spare_part_tenant_active",
        "maintenance_spare_parts",
        ["tenant_id", "is_active"],
    )

    # ── maintenance_work_order_spare_parts ────────────────────────────────
    op.create_table(
        "maintenance_work_order_spare_parts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("work_order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("spare_part_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("cantidad_usada", sa.Integer, nullable=False),
        # Snapshot at consumption time — NEVER updated
        sa.Column("costo_unitario_snapshot", sa.Numeric(14, 2), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_wo_spare_part_work_order",
        "maintenance_work_order_spare_parts",
        ["work_order_id"],
    )
    op.create_index(
        "ix_wo_spare_part_spare_part",
        "maintenance_work_order_spare_parts",
        ["spare_part_id"],
    )
    op.create_index(
        "ix_wo_spare_part_tenant",
        "maintenance_work_order_spare_parts",
        ["tenant_id"],
    )


def downgrade() -> None:
    op.drop_table("maintenance_work_order_spare_parts")
    op.drop_table("maintenance_spare_parts")
