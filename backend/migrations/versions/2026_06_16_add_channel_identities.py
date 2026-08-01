"""add channel_identities table

Revision ID: 2026_06_16_add_channel_identities
Revises: 2026_06_15_owner_user_id_rules
Create Date: 2026-06-16 00:00:00.000000+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "2026_06_16_add_channel_identities"
down_revision: Union[str, None] = "2026_06_15_owner_user_id_rules"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "channel_identities",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", UUID(as_uuid=True), nullable=False),
        sa.Column("channel", sa.String(length=30), nullable=False),
        sa.Column("channel_user_id", sa.String(length=255), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "tenant_id",
            "channel",
            "channel_user_id",
            name="uq_channel_identities_tenant_channel_user",
        ),
    )
    op.create_index("ix_channel_identities_tenant_id", "channel_identities", ["tenant_id"], unique=False)
    op.create_index("ix_channel_identities_user_id", "channel_identities", ["user_id"], unique=False)
    op.create_index(
        "ix_channel_identities_tenant_channel_user",
        "channel_identities",
        ["tenant_id", "channel", "channel_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_channel_identities_tenant_channel_user", table_name="channel_identities")
    op.drop_index("ix_channel_identities_user_id", table_name="channel_identities")
    op.drop_index("ix_channel_identities_tenant_id", table_name="channel_identities")
    op.drop_table("channel_identities")
