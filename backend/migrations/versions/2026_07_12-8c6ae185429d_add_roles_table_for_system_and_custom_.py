"""add roles table for system and custom roles

Revision ID: 8c6ae185429d
Revises: 2026_05_06_add_role_permissions
Create Date: 2026-07-12 19:41:22.179208+00:00

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8c6ae185429d'
down_revision: Union[str, None] = '2026_05_06_add_role_permissions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    roles_table = op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("permissions", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("tenant_id", "name", name="uq_roles_tenant_id_name"),
    )

    # Seed the 5 system roles with the exact permission sets currently
    # hardcoded in ROLE_PERMISSIONS (app/core/auth/permissions.py). Values
    # copied verbatim so this migration is self-contained and does not
    # import application code.
    op.bulk_insert(
        roles_table,
        [
            {
                "id": uuid.uuid4(),
                "tenant_id": None,
                "name": "owner",
                "description": "Full system access",
                "is_system": True,
                "permissions": ["*"],
            },
            {
                "id": uuid.uuid4(),
                "tenant_id": None,
                "name": "admin",
                "description": "Administrative access across all modules",
                "is_system": True,
                "permissions": [
                    "auth.manage_users",
                    "auth.manage_roles",
                    "auth.view_audit",
                    "system.configure",
                    "system.view_reports",
                    "*.*.view",
                    "*.*.edit",
                    "*.*.delete",
                    "*.*.manage_users",
                ],
            },
            {
                "id": uuid.uuid4(),
                "tenant_id": None,
                "name": "manager",
                "description": "Manager with reporting access",
                "is_system": True,
                "permissions": ["system.view_reports"],
            },
            {
                "id": uuid.uuid4(),
                "tenant_id": None,
                "name": "staff",
                "description": "Staff with reporting access",
                "is_system": True,
                "permissions": ["system.view_reports"],
            },
            {
                "id": uuid.uuid4(),
                "tenant_id": None,
                "name": "viewer",
                "description": "Read-only access to all modules",
                "is_system": True,
                "permissions": ["system.view_reports", "*.*.view"],
            },
        ],
    )


def downgrade() -> None:
    op.drop_table("roles")

