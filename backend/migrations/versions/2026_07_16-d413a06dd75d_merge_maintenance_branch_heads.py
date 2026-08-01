"""merge maintenance branch heads

Revision ID: d413a06dd75d
Revises: 2026_06_17_add_ai_agent_runs_and_steps, 2026_07_11_msg_006_add_crm_contact_message_log
Create Date: 2026-07-16 18:12:04.900920+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd413a06dd75d'
down_revision: Union[str, None] = ('2026_06_17_add_ai_agent_runs_and_steps', '2026_07_11_msg_006_add_crm_contact_message_log')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

