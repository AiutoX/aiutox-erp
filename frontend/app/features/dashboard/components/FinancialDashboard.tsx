/**
 * FinancialDashboard — Sprint 5 Phase 3
 * P&L current month, cash flow trend (bar chart), top revenue properties, top debtors.
 */

import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useFinancialDashboard } from "../hooks/useDashboard";
import { SimpleBarChart } from "./charts/SimpleBarChart";

function fmt(n: number) {
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function FinancialDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useFinancialDashboard();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className={i === 1 ? "md:col-span-2" : ""}>
            <CardContent className="flex h-40 items-center justify-center">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="text-sm">
          {t("dashboard.errorLoading")}:{" "}
          {error instanceof Error ? error.message : t("dashboard.noData")}
        </span>
      </div>
    );
  }

  const { pl_mensual, flujo_caja, top_rentables, top_morosos } = data;
  const isProfit = pl_mensual.net_result >= 0;

  // Max revenue across top properties for proportional bars
  const maxRevenue = Math.max(...top_rentables.map((p) => p.total_revenue), 1);

  // Max debt across top debtors for proportional bars
  const maxDebt = Math.max(...top_morosos.map((d) => d.total_debt), 1);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* ── P&L Card ── */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            {t("dashboard.financial.plTitle")}
            <Badge
              variant="secondary"
              className="ml-auto text-[10px] font-normal"
            >
              {t("dashboard.financial.mesActual")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Net result — hero number */}
          <div>
            <p
              className={`text-3xl font-bold leading-none tabular-nums ${
                isProfit ? "text-foreground" : "text-destructive"
              }`}
            >
              {isProfit ? (
                <ArrowUpRight className="mr-1 inline h-5 w-5 text-green-500" />
              ) : (
                <ArrowDownRight className="mr-1 inline h-5 w-5 text-destructive" />
              )}
              {fmtShort(Math.abs(pl_mensual.net_result))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("dashboard.financial.neto")}
            </p>
          </div>

          {/* Income / Expenses breakdown */}
          <div className="space-y-2 border-t pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {t("dashboard.financial.ingresos")}
              </span>
              <span className="font-semibold tabular-nums">
                {fmt(pl_mensual.total_income)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                {t("dashboard.financial.egresos")}
              </span>
              <span className="font-semibold tabular-nums text-muted-foreground">
                {fmt(pl_mensual.total_expenses)}
              </span>
            </div>
          </div>

          {/* Margin bar */}
          {pl_mensual.total_income > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{t("dashboard.financial.margen")}</span>
                <span
                  className={isProfit ? "text-green-600" : "text-destructive"}
                >
                  {Math.round(
                    (pl_mensual.net_result / pl_mensual.total_income) * 100
                  )}
                  %
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    backgroundColor: isProfit ? "#22c55e" : "#ef4444",
                    width: `${Math.min(
                      100,
                      Math.abs(
                        Math.round(
                          (pl_mensual.net_result / pl_mensual.total_income) *
                            100
                        )
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Cash Flow Bar Chart ── */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            {t("dashboard.financial.flujoCajaTitle")}
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal">
              {t("dashboard.financial.ultimos12Meses")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flujo_caja.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              {t("dashboard.noData")}
            </div>
          ) : (
            <SimpleBarChart
              data={flujo_caja as unknown as Record<string, unknown>[]}
              xKey="period"
              series={[
                {
                  dataKey: "income",
                  color: "#22c55e",
                  label: t("dashboard.financial.ingresos"),
                },
                {
                  dataKey: "expenses",
                  color: "#ef4444",
                  label: t("dashboard.financial.egresos"),
                },
              ]}
              height={160}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Top Debtors ── */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            {t("dashboard.financial.topMorososTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {top_morosos.length === 0 ? (
            <div className="flex h-20 items-center justify-center">
              <p className="text-xs text-muted-foreground">
                {t("dashboard.noData")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {top_morosos.map((d, i) => (
                <div key={d.entity_id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{
                          backgroundColor:
                            i === 0
                              ? "#b91c1c"
                              : i === 1
                                ? "#ef4444"
                                : "#f97316",
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">
                        {d.entity_id.slice(0, 10)}…
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums text-destructive">
                      {fmt(d.total_debt)}
                    </span>
                  </div>
                  <div className="relative h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-destructive/60"
                      style={{ width: `${(d.total_debt / maxDebt) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Top Properties by Revenue ── */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 className="h-4 w-4" />
            {t("dashboard.financial.topRentablesTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {top_rentables.length === 0 ? (
            <div className="flex h-20 items-center justify-center">
              <p className="text-xs text-muted-foreground">
                {t("dashboard.noData")}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {top_rentables.map((p, i) => (
                <div
                  key={p.property_id}
                  className="rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{
                        backgroundColor:
                          i === 0 ? "#023E87" : i === 1 ? "#00B6BC" : "#6366f1",
                      }}
                    >
                      {i + 1}
                    </span>
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {p.property_id.slice(0, 12)}…
                  </p>
                  <p className="mt-1 text-sm font-bold tabular-nums">
                    {fmt(p.total_revenue)}
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor:
                          i === 0 ? "#023E87" : i === 1 ? "#00B6BC" : "#6366f1",
                        width: `${(p.total_revenue / maxRevenue) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
