"""inv_expansion_v2

Revision ID: inv_expansion_v2
Revises: 2026_03_22_spare_parts_wh
Create Date: 2026-03-23

Adds Lot, ProductQuantity, OperationType, StockOperation, OrderPoint models.
Expands Warehouse (reception_steps, delivery_steps, is_active, address).
Expands Location (parent_id, location_type, barcode, capacity, is_active).
Expands StockMove (lot_id, operation_id, state, notes, done_at; move_type → enum).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "inv_expansion_v2"
down_revision: str | None = "2026_03_22_spare_parts_wh"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Use VARCHAR for all enum columns during table creation, then cast to enum
# types afterwards. This avoids the SQLAlchemy/Alembic double-create bug.


def upgrade() -> None:
    # ── New enum types ─────────────────────────────────────────────────────────
    op.execute(
        "CREATE TYPE locationtype AS ENUM "
        "('internal','input','output','virtual','production','scrap')"
    )
    op.execute("CREATE TYPE trackingtype AS ENUM ('none','lot','serial')")
    op.execute(
        "CREATE TYPE movetype AS ENUM "
        "('receipt','delivery','internal','adjustment','scrap')"
    )
    op.execute("CREATE TYPE movestate AS ENUM ('draft','confirmed','done','cancelled')")
    op.execute(
        "CREATE TYPE operationtypecategory AS ENUM "
        "('receipt','delivery','internal','adjustment')"
    )
    op.execute(
        "CREATE TYPE reservationmethod AS ENUM ('at_confirm','manual','by_date')"
    )
    op.execute(
        "CREATE TYPE stockoperationstate AS ENUM "
        "('draft','confirmed','assigned','done','cancelled')"
    )
    op.execute("CREATE TYPE orderpointtrigger AS ENUM ('automatic','manual')")

    # ── Expand warehouses ─────────────────────────────────────────────────────
    op.add_column("warehouses", sa.Column("address", sa.Text(), nullable=True))
    op.add_column(
        "warehouses",
        sa.Column("reception_steps", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "warehouses",
        sa.Column("delivery_steps", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "warehouses",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.create_check_constraint(
        "ck_warehouses_reception_steps", "warehouses", "reception_steps IN (1, 2, 3)"
    )
    op.create_check_constraint(
        "ck_warehouses_delivery_steps", "warehouses", "delivery_steps IN (1, 2, 3)"
    )

    # ── Expand locations ──────────────────────────────────────────────────────
    op.add_column(
        "locations",
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    # Use varchar, cast to enum after
    op.add_column(
        "locations",
        sa.Column(
            "location_type", sa.String(20), nullable=False, server_default="internal"
        ),
    )
    op.add_column("locations", sa.Column("barcode", sa.String(100), nullable=True))
    op.add_column("locations", sa.Column("capacity", sa.Numeric(18, 6), nullable=True))
    op.add_column(
        "locations",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.execute("ALTER TABLE locations ALTER COLUMN location_type DROP DEFAULT")
    op.execute(
        "ALTER TABLE locations ALTER COLUMN location_type "
        "TYPE locationtype USING location_type::locationtype"
    )
    op.execute(
        "ALTER TABLE locations ALTER COLUMN location_type "
        "SET DEFAULT 'internal'::locationtype"
    )
    op.create_foreign_key(
        "fk_locations_parent_id",
        "locations",
        "locations",
        ["parent_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("idx_locations_parent_id", "locations", ["parent_id"])
    op.create_index("idx_locations_barcode", "locations", ["barcode"])

    # ── Expand stock_moves ────────────────────────────────────────────────────
    op.add_column(
        "stock_moves",
        sa.Column("lot_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "stock_moves",
        sa.Column("operation_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    # state column as varchar, cast after
    op.add_column(
        "stock_moves",
        sa.Column("state", sa.String(20), nullable=False, server_default="draft"),
    )
    op.execute("ALTER TABLE stock_moves ALTER COLUMN state DROP DEFAULT")
    op.execute(
        "ALTER TABLE stock_moves ALTER COLUMN state "
        "TYPE movestate USING state::movestate"
    )
    op.execute(
        "ALTER TABLE stock_moves ALTER COLUMN state " "SET DEFAULT 'draft'::movestate"
    )
    op.add_column("stock_moves", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column(
        "stock_moves",
        sa.Column("done_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
    )
    # Convert move_type from varchar to enum
    op.execute(
        "ALTER TABLE stock_moves ALTER COLUMN move_type "
        "TYPE movetype USING move_type::movetype"
    )
    op.create_index("idx_stock_moves_lot_id", "stock_moves", ["lot_id"])
    op.create_index("idx_stock_moves_operation_id", "stock_moves", ["operation_id"])
    op.create_index("idx_stock_moves_state", "stock_moves", ["state"])
    op.create_index(
        "idx_stock_moves_tenant_product", "stock_moves", ["tenant_id", "product_id"]
    )

    # ── Create lots ───────────────────────────────────────────────────────────
    op.create_table(
        "lots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("tracking_type", sa.String(10), nullable=False, server_default="lot"),
        sa.Column("expiration_date", sa.Date(), nullable=True),
        sa.Column("use_date", sa.Date(), nullable=True),
        sa.Column("removal_date", sa.Date(), nullable=True),
        sa.Column("alert_date", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.execute("ALTER TABLE lots ALTER COLUMN tracking_type DROP DEFAULT")
    op.execute(
        "ALTER TABLE lots ALTER COLUMN tracking_type "
        "TYPE trackingtype USING tracking_type::trackingtype"
    )
    op.execute(
        "ALTER TABLE lots ALTER COLUMN tracking_type " "SET DEFAULT 'lot'::trackingtype"
    )
    op.create_index("idx_lots_tenant_id", "lots", ["tenant_id"])
    op.create_index("idx_lots_tenant_product", "lots", ["tenant_id", "product_id"])
    op.create_unique_constraint(
        "uq_lots_tenant_product_name", "lots", ["tenant_id", "product_id", "name"]
    )

    # FK stock_moves.lot_id → lots
    op.create_foreign_key(
        "fk_stock_moves_lot_id",
        "stock_moves",
        "lots",
        ["lot_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # ── Create operation_types ─────────────────────────────────────────────────
    op.create_table(
        "operation_types",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "warehouse_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("warehouses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("operation_type", sa.String(20), nullable=False),
        sa.Column(
            "default_source_location_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("locations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "default_dest_location_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("locations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "reservation_method",
            sa.String(20),
            nullable=False,
            server_default="at_confirm",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.execute(
        "ALTER TABLE operation_types ALTER COLUMN operation_type "
        "TYPE operationtypecategory USING operation_type::operationtypecategory"
    )
    op.execute(
        "ALTER TABLE operation_types ALTER COLUMN reservation_method DROP DEFAULT"
    )
    op.execute(
        "ALTER TABLE operation_types ALTER COLUMN reservation_method "
        "TYPE reservationmethod USING reservation_method::reservationmethod"
    )
    op.execute(
        "ALTER TABLE operation_types ALTER COLUMN reservation_method "
        "SET DEFAULT 'at_confirm'::reservationmethod"
    )
    op.create_index(
        "idx_operation_types_tenant_warehouse",
        "operation_types",
        ["tenant_id", "warehouse_id"],
    )
    op.create_unique_constraint(
        "uq_operation_types_tenant_wh_code",
        "operation_types",
        ["tenant_id", "warehouse_id", "code"],
    )

    # ── Create stock_operations ────────────────────────────────────────────────
    op.create_table(
        "stock_operations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "operation_type_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("operation_types.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "warehouse_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("warehouses.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("state", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("scheduled_date", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("origin", sa.String(255), nullable=True),
        sa.Column("partner_name", sa.String(255), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "assigned_to_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("done_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("cancelled_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.execute("ALTER TABLE stock_operations ALTER COLUMN state DROP DEFAULT")
    op.execute(
        "ALTER TABLE stock_operations ALTER COLUMN state "
        "TYPE stockoperationstate USING state::stockoperationstate"
    )
    op.execute(
        "ALTER TABLE stock_operations ALTER COLUMN state "
        "SET DEFAULT 'draft'::stockoperationstate"
    )
    op.create_index(
        "idx_stock_operations_tenant_state",
        "stock_operations",
        ["tenant_id", "state"],
    )
    op.create_index(
        "idx_stock_operations_tenant_warehouse",
        "stock_operations",
        ["tenant_id", "warehouse_id"],
    )

    # FK stock_moves.operation_id → stock_operations
    op.create_foreign_key(
        "fk_stock_moves_operation_id",
        "stock_moves",
        "stock_operations",
        ["operation_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # ── Create product_quantities ──────────────────────────────────────────────
    op.create_table(
        "product_quantities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "location_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("locations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "lot_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lots.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("quantity", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column(
            "reserved_quantity",
            sa.Numeric(18, 6),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint("quantity >= 0", name="ck_product_qty_quantity_nonneg"),
        sa.CheckConstraint(
            "reserved_quantity >= 0", name="ck_product_qty_reserved_nonneg"
        ),
        sa.UniqueConstraint(
            "tenant_id",
            "product_id",
            "location_id",
            "lot_id",
            name="uq_product_qty_tenant_product_location_lot",
        ),
    )
    op.create_index(
        "idx_product_quantities_tenant_product",
        "product_quantities",
        ["tenant_id", "product_id"],
    )
    op.create_index(
        "idx_product_quantities_tenant_location",
        "product_quantities",
        ["tenant_id", "location_id"],
    )

    # ── Create order_points ────────────────────────────────────────────────────
    op.create_table(
        "order_points",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "warehouse_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("warehouses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "location_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("locations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("min_qty", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("max_qty", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column(
            "qty_multiple", sa.Numeric(18, 6), nullable=False, server_default="1"
        ),
        sa.Column("trigger", sa.String(20), nullable=False, server_default="automatic"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint("min_qty >= 0", name="ck_order_points_min_qty_nonneg"),
        sa.CheckConstraint("max_qty >= min_qty", name="ck_order_points_max_gte_min"),
        sa.CheckConstraint("qty_multiple > 0", name="ck_order_points_qty_multiple_pos"),
    )
    op.execute("ALTER TABLE order_points ALTER COLUMN trigger DROP DEFAULT")
    op.execute(
        "ALTER TABLE order_points ALTER COLUMN trigger "
        "TYPE orderpointtrigger USING trigger::orderpointtrigger"
    )
    op.execute(
        "ALTER TABLE order_points ALTER COLUMN trigger "
        "SET DEFAULT 'automatic'::orderpointtrigger"
    )
    op.create_index(
        "idx_order_points_tenant_product",
        "order_points",
        ["tenant_id", "product_id"],
    )
    op.create_index(
        "idx_order_points_tenant_warehouse",
        "order_points",
        ["tenant_id", "warehouse_id"],
    )


def downgrade() -> None:
    op.drop_table("order_points")
    op.drop_table("product_quantities")

    op.drop_constraint("fk_stock_moves_operation_id", "stock_moves", type_="foreignkey")
    op.drop_table("stock_operations")
    op.drop_table("operation_types")

    op.drop_constraint("fk_stock_moves_lot_id", "stock_moves", type_="foreignkey")
    op.drop_table("lots")

    # Revert stock_moves
    op.drop_index("idx_stock_moves_tenant_product", "stock_moves")
    op.drop_index("idx_stock_moves_state", "stock_moves")
    op.drop_index("idx_stock_moves_operation_id", "stock_moves")
    op.drop_index("idx_stock_moves_lot_id", "stock_moves")
    op.drop_column("stock_moves", "done_at")
    op.drop_column("stock_moves", "notes")
    op.execute(
        "ALTER TABLE stock_moves ALTER COLUMN state TYPE varchar(20) USING state::text"
    )
    op.drop_column("stock_moves", "state")
    op.drop_column("stock_moves", "operation_id")
    op.drop_column("stock_moves", "lot_id")
    op.execute(
        "ALTER TABLE stock_moves ALTER COLUMN move_type "
        "TYPE varchar(30) USING move_type::text"
    )

    # Revert locations
    op.drop_constraint("fk_locations_parent_id", "locations", type_="foreignkey")
    op.drop_index("idx_locations_barcode", "locations")
    op.drop_index("idx_locations_parent_id", "locations")
    op.drop_column("locations", "is_active")
    op.drop_column("locations", "capacity")
    op.drop_column("locations", "barcode")
    op.execute(
        "ALTER TABLE locations ALTER COLUMN location_type "
        "TYPE varchar(20) USING location_type::text"
    )
    op.drop_column("locations", "location_type")
    op.drop_column("locations", "parent_id")

    # Revert warehouses
    op.drop_constraint("ck_warehouses_delivery_steps", "warehouses", type_="check")
    op.drop_constraint("ck_warehouses_reception_steps", "warehouses", type_="check")
    op.drop_column("warehouses", "is_active")
    op.drop_column("warehouses", "delivery_steps")
    op.drop_column("warehouses", "reception_steps")
    op.drop_column("warehouses", "address")

    # Drop enums
    op.execute("DROP TYPE orderpointtrigger")
    op.execute("DROP TYPE stockoperationstate")
    op.execute("DROP TYPE reservationmethod")
    op.execute("DROP TYPE operationtypecategory")
    op.execute("DROP TYPE movestate")
    op.execute("DROP TYPE movetype")
    op.execute("DROP TYPE trackingtype")
    op.execute("DROP TYPE locationtype")
