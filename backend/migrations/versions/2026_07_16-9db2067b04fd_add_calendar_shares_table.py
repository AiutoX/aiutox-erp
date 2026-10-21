"""add calendar shares table

Revision ID: 9db2067b04fd
Revises: d413a06dd75d
Create Date: 2026-07-16 18:18:09.260993+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '9db2067b04fd'
down_revision: Union[str, None] = 'd413a06dd75d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'calendar_shares',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('calendar_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('permission_level', sa.String(length=20), nullable=False),
        sa.Column('shared_by', sa.UUID(), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['calendar_id'], ['calendars.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shared_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('calendar_id', 'user_id', name='uq_calendar_share'),
    )
    op.create_index(
        'idx_calendar_shares_calendar', 'calendar_shares', ['tenant_id', 'calendar_id']
    )
    op.create_index(
        'idx_calendar_shares_user', 'calendar_shares', ['tenant_id', 'user_id']
    )
    op.create_index(
        op.f('ix_calendar_shares_calendar_id'), 'calendar_shares', ['calendar_id']
    )
    op.create_index(
        op.f('ix_calendar_shares_tenant_id'), 'calendar_shares', ['tenant_id']
    )
    op.create_index(op.f('ix_calendar_shares_user_id'), 'calendar_shares', ['user_id'])


def downgrade() -> None:
    op.drop_index(op.f('ix_calendar_shares_user_id'), table_name='calendar_shares')
    op.drop_index(op.f('ix_calendar_shares_tenant_id'), table_name='calendar_shares')
    op.drop_index(op.f('ix_calendar_shares_calendar_id'), table_name='calendar_shares')
    op.drop_index('idx_calendar_shares_user', table_name='calendar_shares')
    op.drop_index('idx_calendar_shares_calendar', table_name='calendar_shares')
    op.drop_table('calendar_shares')

