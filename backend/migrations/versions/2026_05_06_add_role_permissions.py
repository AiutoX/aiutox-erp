"""add_role_permissions_table

Revision ID: 2026_05_06-add_role_permissions
Revises: 2026_05_06-b941d6820f58_add_wo_phase_fields_photos_rejection_eval
Create Date: 2026-05-06 21:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2026_05_06_add_role_permissions'
down_revision: Union[str, None] = 'crm_002_drop_contacts_org_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'role_permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('permission', sa.String(255), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.UniqueConstraint('tenant_id', 'role', 'permission', name='uq_role_permissions_tenant_role_permission'),
    )
    op.create_index('idx_role_permissions_tenant_role', 'role_permissions', ['tenant_id', 'role'])


def downgrade() -> None:
    op.drop_index('idx_role_permissions_tenant_role', table_name='role_permissions')
    op.drop_table('role_permissions')
