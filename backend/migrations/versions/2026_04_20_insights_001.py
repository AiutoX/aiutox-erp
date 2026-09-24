"""insights_001 — create insights schema + 3 materialized views

Revision ID: insights_001
Revises: widgets_001
Create Date: 2026-04-20

Creates the `insights` schema and 3 materialized views:
  - insights.billing_monthly_revenue
  - insights.maintenance_backlog_by_tech
  - insights.crm_pipeline_by_stage

Each MV has a UNIQUE index required for REFRESH MATERIALIZED VIEW CONCURRENTLY.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "insights_001"
down_revision = "widgets_001"
branch_labels = ("insights",)
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # Create insights schema
    bind.execute(sa.text("CREATE SCHEMA IF NOT EXISTS insights"))

    # ── billing_monthly_revenue ──────────────────────────────────────────────
    bind.execute(sa.text("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS insights.billing_monthly_revenue AS
        SELECT
            p.tenant_id,
            DATE_TRUNC('month', p.paid_at)::DATE AS month,
            SUM(p.amount)                         AS revenue,
            COUNT(*)::INT                         AS invoice_count
        FROM payments p
        WHERE p.paid_at IS NOT NULL
        GROUP BY p.tenant_id, DATE_TRUNC('month', p.paid_at)
        WITH DATA
    """))
    bind.execute(sa.text("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_insights_billing_revenue_tenant_month
        ON insights.billing_monthly_revenue (tenant_id, month)
    """))

    # ── maintenance_backlog_by_tech ──────────────────────────────────────────
    bind.execute(sa.text("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS insights.maintenance_backlog_by_tech AS
        SELECT
            wo.tenant_id,
            wo.assigned_to                                   AS tech_user_id,
            COUNT(*)::INT                                    AS backlog_count,
            MAX(EXTRACT(DAY FROM NOW() - wo.created_at))::INT AS oldest_days
        FROM maintenance_work_orders wo
        -- NOTE: 'completada'/'cancelada' are pre-existing Spanish enum values in the DB
        WHERE wo.assigned_to_type = 'user'
          AND wo.estado NOT IN ('completada', 'cancelada')
        GROUP BY wo.tenant_id, wo.assigned_to
        WITH DATA
    """))
    bind.execute(sa.text("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_insights_maintenance_backlog_tenant_tech
        ON insights.maintenance_backlog_by_tech (tenant_id, tech_user_id)
    """))

    # ── crm_pipeline_by_stage ────────────────────────────────────────────────
    bind.execute(sa.text("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS insights.crm_pipeline_by_stage AS
        SELECT
            o.tenant_id,
            COALESCE(o.stage, 'unknown')    AS stage,
            COUNT(*)::INT                   AS deal_count,
            SUM(COALESCE(o.amount, 0))      AS total_value
        FROM crm_opportunities o
        WHERE o.status = 'open'
        GROUP BY o.tenant_id, COALESCE(o.stage, 'unknown')
        WITH DATA
    """))
    bind.execute(sa.text("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_insights_crm_pipeline_tenant_stage
        ON insights.crm_pipeline_by_stage (tenant_id, stage)
    """))


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DROP MATERIALIZED VIEW IF EXISTS insights.crm_pipeline_by_stage"))
    bind.execute(sa.text("DROP MATERIALIZED VIEW IF EXISTS insights.maintenance_backlog_by_tech"))
    bind.execute(sa.text("DROP MATERIALIZED VIEW IF EXISTS insights.billing_monthly_revenue"))
    bind.execute(sa.text("DROP SCHEMA IF EXISTS insights"))
