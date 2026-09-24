"""widgets_001 — migrate user_widget_preferences to full grid-layout schema

Revision ID: widgets_001
Revises: work_items_001
Create Date: 2026-04-19

Migrates the existing user_widget_preferences table (which had a simple
`position` + `visible` schema) to the full grid-layout schema with
position_x, position_y, width, height, settings_json, created_at, updated_at.
If the table does not exist yet, creates it from scratch.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "widgets_001"
down_revision = "work_items_001"
branch_labels = ("widgets",)
depends_on = None

_TABLE = "user_widget_preferences"


def _columns_exist(inspector: sa.engine.Inspector, table: str) -> set[str]:
    return {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _TABLE not in inspector.get_table_names():
        # Fresh install — create the full schema directly
        op.create_table(
            _TABLE,
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("widget_id", sa.String(length=128), nullable=False),
            sa.Column("position_x", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("position_y", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("width", sa.Integer(), nullable=False, server_default="4"),
            sa.Column("height", sa.Integer(), nullable=False, server_default="2"),
            sa.Column("settings_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "widget_id", name="uq_user_widget"),
        )
        op.create_index("ix_user_widget_prefs_user", _TABLE, ["tenant_id", "user_id"])
        return

    # Existing table — migrate columns
    existing_cols = _columns_exist(inspector, _TABLE)

    # Drop old FK constraints (they reference tenants/users with CASCADE)
    existing_fks = {fk["name"] for fk in inspector.get_foreign_keys(_TABLE) if fk.get("name")}
    for fk_name in existing_fks:
        op.drop_constraint(fk_name, _TABLE, type_="foreignkey")

    # Drop old unique constraint if named differently
    existing_uqs = {uq["name"] for uq in inspector.get_unique_constraints(_TABLE) if uq.get("name")}
    for uq_name in existing_uqs:
        if uq_name != "uq_user_widget":
            op.drop_constraint(uq_name, _TABLE, type_="unique")

    # Drop old columns not in new schema
    for old_col in ("position", "visible", "config_json"):
        if old_col in existing_cols:
            op.drop_column(_TABLE, old_col)

    # Add new columns
    if "position_x" not in existing_cols:
        op.add_column(_TABLE, sa.Column("position_x", sa.Integer(), nullable=False, server_default="0"))
    if "position_y" not in existing_cols:
        op.add_column(_TABLE, sa.Column("position_y", sa.Integer(), nullable=False, server_default="0"))
    if "width" not in existing_cols:
        op.add_column(_TABLE, sa.Column("width", sa.Integer(), nullable=False, server_default="4"))
    if "height" not in existing_cols:
        op.add_column(_TABLE, sa.Column("height", sa.Integer(), nullable=False, server_default="2"))
    if "settings_json" not in existing_cols:
        op.add_column(_TABLE, sa.Column("settings_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if "created_at" not in existing_cols:
        op.add_column(_TABLE, sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    if "updated_at" not in existing_cols:
        op.add_column(_TABLE, sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))

    # Resize widget_id if needed (old was 255, new is 128)
    op.alter_column(_TABLE, "widget_id", type_=sa.String(128))

    # Add new composite index if it doesn't exist
    existing_indexes = {idx["name"] for idx in inspector.get_indexes(_TABLE)}
    if "ix_user_widget_prefs_user" not in existing_indexes:
        op.create_index("ix_user_widget_prefs_user", _TABLE, ["tenant_id", "user_id"])

    # Add new unique constraint name if missing
    if "uq_user_widget" not in existing_uqs:
        op.create_unique_constraint("uq_user_widget", _TABLE, ["user_id", "widget_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_indexes = {idx["name"] for idx in inspector.get_indexes(_TABLE)}
    if "ix_user_widget_prefs_user" in existing_indexes:
        op.drop_index("ix_user_widget_prefs_user", table_name=_TABLE)
    op.drop_table(_TABLE)
