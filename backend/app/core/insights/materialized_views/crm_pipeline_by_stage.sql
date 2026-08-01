-- insights.crm_pipeline_by_stage
-- Open CRM opportunities grouped by tenant and pipeline stage.
-- Requires UNIQUE INDEX on (tenant_id, stage) for CONCURRENT refresh.

CREATE MATERIALIZED VIEW IF NOT EXISTS insights.crm_pipeline_by_stage AS
SELECT
    o.tenant_id,
    COALESCE(o.stage, 'unknown')    AS stage,
    COUNT(*)                        AS deal_count,
    SUM(COALESCE(o.amount, 0))      AS total_value
FROM crm_opportunities o
WHERE o.status = 'open'
GROUP BY o.tenant_id, COALESCE(o.stage, 'unknown')
WITH DATA;
