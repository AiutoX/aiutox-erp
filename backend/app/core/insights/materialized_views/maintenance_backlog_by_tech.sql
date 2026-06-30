-- insights.maintenance_backlog_by_tech
-- Open/pending work orders grouped by tenant and assigned technician.
-- "Backlog" = work orders not yet completed or cancelled.
-- Requires UNIQUE INDEX on (tenant_id, tech_user_id) for CONCURRENT refresh.
--
-- NOTE: The `estado` column stores Spanish values ('completada', 'cancelada') because
-- the maintenance_work_orders model was originally written with Spanish enums.
-- This is a pre-existing data contract — the string literals must match the DB values.

CREATE MATERIALIZED VIEW IF NOT EXISTS insights.maintenance_backlog_by_tech AS
SELECT
    wo.tenant_id,
    wo.assigned_to                                   AS tech_user_id,
    COUNT(*)::INT                                    AS backlog_count,
    MAX(EXTRACT(DAY FROM NOW() - wo.created_at))::INT AS oldest_days
FROM maintenance_work_orders wo
WHERE wo.assigned_to_type = 'user'
  AND wo.estado NOT IN ('completada', 'cancelada')
GROUP BY wo.tenant_id, wo.assigned_to
WITH DATA;
