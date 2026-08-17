"""Add maintenance (CMMS) module: work_orders, assets, contractors, plans, inspections

Revision ID: 2026_03_15_maintenance
Revises: 2026_03_15_monthly_snapshots
Create Date: 2026-03-15 20:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "2026_03_15_maintenance"
down_revision = "2026_03_15_monthly_snapshots"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── maintenance_assets ─────────────────────────────────────────────────────
    op.create_table(
        "maintenance_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("marca", sa.String(100), nullable=True),
        sa.Column("modelo", sa.String(100), nullable=True),
        sa.Column("serial", sa.String(100), nullable=True),
        sa.Column("categoria", sa.String(30), nullable=False, server_default="otro"),
        sa.Column("estado", sa.String(30), nullable=False, server_default="disponible"),
        sa.Column("garantia_hasta", sa.Date, nullable=True),
        sa.Column("vida_util_anos", sa.Integer, nullable=True),
        sa.Column(
            "ultimo_mantenimiento_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column("costo_adquisicion", sa.Numeric(14, 2), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_maintenance_asset_tenant", "maintenance_assets", ["tenant_id"])
    op.create_index(
        "ix_maintenance_asset_property", "maintenance_assets", ["property_id"]
    )
    op.create_index(
        "ix_maintenance_asset_tenant_active",
        "maintenance_assets",
        ["tenant_id", "is_active"],
    )

    # ── maintenance_contractors ────────────────────────────────────────────────
    op.create_table(
        "maintenance_contractors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("tipo_doc", sa.String(10), nullable=True),
        sa.Column("num_doc", sa.String(50), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("telefono", sa.String(50), nullable=True),
        sa.Column(
            "especialidades", postgresql.JSONB, nullable=False, server_default="[]"
        ),
        sa.Column("documentos", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_maintenance_contractor_tenant", "maintenance_contractors", ["tenant_id"]
    )
    op.create_index(
        "ix_maintenance_contractor_tenant_active",
        "maintenance_contractors",
        ["tenant_id", "is_active"],
    )

    # ── maintenance_work_orders ────────────────────────────────────────────────
    op.create_table(
        "maintenance_work_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("prioridad", sa.String(10), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="borrador"),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("descripcion", sa.Text, nullable=True),
        sa.Column("notas", sa.Text, nullable=True),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("assigned_to_type", sa.String(20), nullable=True),
        sa.Column(
            "estimated_cost",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "material_cost", sa.Numeric(14, 2), nullable=False, server_default="0"
        ),
        sa.Column("labor_cost", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column(
            "contractor_cost", sa.Numeric(14, 2), nullable=False, server_default="0"
        ),
        sa.Column("total_cost", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("billable", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("billed_to", sa.String(10), nullable=True),
        sa.Column("sla_due_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("fotos_antes", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column(
            "fotos_despues", postgresql.JSONB, nullable=False, server_default="[]"
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("started_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("completed_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("cancelled_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_maintenance_wo_tenant", "maintenance_work_orders", ["tenant_id"]
    )
    op.create_index(
        "ix_maintenance_wo_property", "maintenance_work_orders", ["property_id"]
    )
    op.create_index("ix_maintenance_wo_estado", "maintenance_work_orders", ["estado"])
    op.create_index(
        "ix_maintenance_wo_tenant_estado",
        "maintenance_work_orders",
        ["tenant_id", "estado"],
    )
    op.create_index("ix_maintenance_wo_sla", "maintenance_work_orders", ["sla_due_at"])

    # ── maintenance_plans ──────────────────────────────────────────────────────
    op.create_table(
        "maintenance_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("frecuencia", sa.String(20), nullable=False),
        sa.Column(
            "proxima_ejecucion_at", postgresql.TIMESTAMP(timezone=True), nullable=False
        ),
        sa.Column(
            "checklist_template_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_maintenance_plan_tenant", "maintenance_plans", ["tenant_id"])
    op.create_index(
        "ix_maintenance_plan_next_exec", "maintenance_plans", ["proxima_ejecucion_at"]
    )
    op.create_index(
        "ix_maintenance_plan_tenant_active",
        "maintenance_plans",
        ["tenant_id", "is_active"],
    )

    # ── maintenance_inspections ────────────────────────────────────────────────
    op.create_table(
        "maintenance_inspections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("fecha", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column(
            "checklist_template_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column("inspector_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
        sa.Column("hallazgos", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_maintenance_inspection_tenant", "maintenance_inspections", ["tenant_id"]
    )
    op.create_index(
        "ix_maintenance_inspection_property",
        "maintenance_inspections",
        ["property_id"],
    )
    op.create_index(
        "ix_maintenance_inspection_tenant_estado",
        "maintenance_inspections",
        ["tenant_id", "estado"],
    )


def downgrade() -> None:
    op.drop_table("maintenance_inspections")
    op.drop_table("maintenance_plans")
    op.drop_table("maintenance_work_orders")
    op.drop_table("maintenance_contractors")
    op.drop_table("maintenance_assets")
