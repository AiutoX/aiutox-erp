"""grant users_view to manager and staff roles

Revision ID: e0a347ce83be
Revises: drop_templates_tables_001
Create Date: 2026-07-26 02:57:31.125392+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e0a347ce83be'
down_revision: Union[str, None] = 'drop_templates_tables_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Grant the directory-style "users.view" permission to the manager and
    # staff system roles, so GET /api/v1/users (restricted to id/name/email
    # for non-admin callers) stops 403ing on the header's task-assign picker
    # and similar "who can I assign this to" widgets. auth.manage_users
    # (owner/admin only) is untouched.
    op.execute(
        """
        UPDATE roles
        SET permissions = permissions || '["users.view"]'::jsonb
        WHERE is_system = true
          AND name IN ('manager', 'staff')
          AND NOT permissions ? 'users.view'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE roles
        SET permissions = permissions - 'users.view'
        WHERE is_system = true
          AND name IN ('manager', 'staff')
        """
    )

