"""Drop templates, template_versions, template_categories tables

Revision ID: drop_templates_tables_001
Revises: notif_template_versions_001
Create Date: 2026-07-21

Final step of unifying core/templates into notifications (see
docs/superpowers/specs/2026-07-21-templates-notifications-unification-design.md).
The generic Template/TemplateVersion/TemplateCategory/RenderedTemplate tables
had no real business consumer wired to read them back (the one real seeder
that wrote to them, MaintenanceTemplatesSeeder, was migrated to
NotificationTemplate in this same change) and are superseded by
NotificationTemplate + NotificationTemplateVersion. rendered_templates has an
FK to templates and must be dropped first.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "drop_templates_tables_001"
down_revision: str | None = "notif_template_versions_001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_table("rendered_templates")
    op.drop_table("template_versions")
    op.drop_table("template_categories")
    op.drop_table("templates")


def downgrade() -> None:
    raise NotImplementedError(
        "This migration deletes data (templates/template_versions/"
        "template_categories/rendered_templates). Restore from a "
        "pre-migration backup instead of downgrading — see the original "
        "creation migrations (2025_12_12-add_templates_tables.py, "
        "2026_03_16_update_templates_table.py) for the schema if a clean "
        "re-create is ever needed."
    )
