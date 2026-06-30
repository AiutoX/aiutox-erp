"""Add is_spare_parts_warehouse flag to warehouses table.

Enables the Maintenance module to designate which warehouse stores spare parts
for Work Orders. Consumptions are recorded via maintenance.spare_parts.consumed
event → inventory consumer creates a StockMove with move_type='maintenance_consumption'.

Revision ID: 2026_03_22_spare_parts_wh
Revises: 2026_03_21_maint_requests
Create Date: 2026-03-22 10:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "2026_03_22_spare_parts_wh"
down_revision = "2026_03_21_maint_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "warehouses",
        sa.Column(
            "is_spare_parts_warehouse",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_index(
        "idx_warehouses_spare_parts",
        "warehouses",
        ["tenant_id", "is_spare_parts_warehouse"],
    )


def downgrade() -> None:
    op.drop_index("idx_warehouses_spare_parts", table_name="warehouses")
    op.drop_column("warehouses", "is_spare_parts_warehouse")
