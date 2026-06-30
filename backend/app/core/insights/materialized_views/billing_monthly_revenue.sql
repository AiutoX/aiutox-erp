-- insights.billing_monthly_revenue
-- Monthly revenue aggregated from payments, grouped by tenant and calendar month.
-- Requires UNIQUE INDEX on (tenant_id, month) for CONCURRENT refresh.

CREATE MATERIALIZED VIEW IF NOT EXISTS insights.billing_monthly_revenue AS
SELECT
    p.tenant_id,
    DATE_TRUNC('month', p.paid_at)::DATE AS month,
    SUM(p.amount)                         AS revenue,
    COUNT(*)                              AS invoice_count
FROM payments p
WHERE p.paid_at IS NOT NULL
GROUP BY p.tenant_id, DATE_TRUNC('month', p.paid_at)
WITH DATA;
