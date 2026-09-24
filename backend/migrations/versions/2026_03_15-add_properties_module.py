"""Add properties module: buildings, properties, property_assets tables

Revision ID: 2026_03_15_properties
Revises: 2026_03_14_index_rates
Create Date: 2026-03-15 10:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "2026_03_15_properties"
down_revision = "2026_03_14_index_rates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── buildings ──────────────────────────────────────────────────────────────
    op.create_table(
        "buildings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("department", sa.String(100), nullable=True),
        sa.Column("neighborhood", sa.String(100), nullable=True),
        sa.Column("tipo", sa.String(20), nullable=False, server_default="residential"),
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

    op.create_index("idx_buildings_tenant", "buildings", ["tenant_id"])

    # ── properties ─────────────────────────────────────────────────────────────
    op.create_table(
        "properties",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "building_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("buildings.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("unit_number", sa.String(50), nullable=True),
        sa.Column("floor", sa.Integer, nullable=True),
        sa.Column("tipo", sa.String(20), nullable=False, server_default="apartment"),
        sa.Column(
            "ownership_type", sa.String(30), nullable=False, server_default="own"
        ),
        sa.Column("estado", sa.String(20), nullable=False, server_default="available"),
        sa.Column("area_m2", sa.Numeric(10, 2), nullable=True),
        sa.Column("construction_year", sa.Integer, nullable=True),
        sa.Column("estrato", sa.Integer, nullable=True),
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
        sa.CheckConstraint(
            "estrato IS NULL OR (estrato >= 1 AND estrato <= 6)",
            name="ck_properties_estrato",
        ),
    )

    op.create_index("idx_properties_tenant", "properties", ["tenant_id"])
    op.create_index("idx_properties_building", "properties", ["building_id"])
    op.create_index(
        "idx_properties_tenant_estado", "properties", ["tenant_id", "estado"]
    )

    # ── property_assets ────────────────────────────────────────────────────────
    op.create_table(
        "property_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "property_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("properties.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("marca", sa.String(100), nullable=True),
        sa.Column("modelo", sa.String(100), nullable=True),
        sa.Column("serial", sa.String(100), nullable=True),
        sa.Column("garantia_hasta", sa.Date, nullable=True),
        sa.Column("proveedor", sa.String(200), nullable=True),
        sa.Column("vida_util_anos", sa.Integer, nullable=True),
        sa.Column("notas", sa.Text, nullable=True),
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

    op.create_index(
        "idx_property_assets_tenant_property",
        "property_assets",
        ["tenant_id", "property_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_property_assets_tenant_property", table_name="property_assets")
    op.drop_table("property_assets")

    op.drop_index("idx_properties_tenant_estado", table_name="properties")
    op.drop_index("idx_properties_building", table_name="properties")
    op.drop_index("idx_properties_tenant", table_name="properties")
    op.drop_table("properties")

    op.drop_index("idx_buildings_tenant", table_name="buildings")
    op.drop_table("buildings")
