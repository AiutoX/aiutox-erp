/**
 * CMOSDashboard (CMMS Operations) — Sprint 5 Phase 3
 * Work orders by status, MTTR trend (line), PM compliance %, top failing assets.
 */

import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Timer,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useCMOSDashboard } from "../hooks/useDashboard";
import { SimpleDonutChart } from "./charts/SimpleDonutChart";
import { SimpleLineChart } from "./charts/SimpleLineChart";

// Color palette for work order statuses
const STATUS_COLORS: Record<string, string> = {
  borrador: "#94a3b8",
  asignada: "#3b82f6",
  en_progreso: "#f59e0b",
  en_revision: "#8b5cf6",
  completada: "#22c55e",
  cancelada: "#ef4444",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#6366f1";
}

// PM compliance color thresholds
function pmColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 60) return "#f59e0b";
  return "#ef4444";
}

export function CMOSDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useCMOSDashboard();

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

  const { ots_por_estado, mttr_tendencia, pct_pm, top_activos_fallas } = data;

  const totalOts = ots_por_estado.reduce((acc, s) => acc + s.count, 0);
  const donutData = ots_por_estado
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: s.status,
      value: s.count,
      color: statusColor(s.status),
    }));
  const mttrData = mttr_tendencia as unknown as Record<string, unknown>[];

  // Max failures for proportional bars
  const maxFailures = Math.max(...top_activos_fallas.map((a) => a.failures), 1);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* ── Work Orders by Status — donut + legend ── */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            {t("dashboard.cmms.otsByStatusTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {donutData.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              {t("dashboard.noData")}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <SimpleDonutChart data={donutData} height={140} />
              </div>
              <div className="space-y-1.5">
                {ots_por_estado
                  .filter((s) => s.count > 0)
                  .map((s) => (
                    <div
                      key={s.status}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: statusColor(s.status) }}
                        />
                        <span className="text-muted-foreground">
                          {s.status}
                        </span>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {s.count}
                      </span>
                    </div>
                  ))}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {totalOts} {t("dashboard.cmms.totalOts")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MTTR Trend — line chart ── */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Timer className="h-4 w-4" />
            {t("dashboard.cmms.mttrTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mttrData.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              {t("dashboard.noData")}
            </div>
          ) : (
            <div className="space-y-2">
              {mttrData.length > 0 &&
                typeof mttrData[mttrData.length - 1]?.avg_hours ===
                  "number" && (
                  <div className="flex items-end gap-2">
                    <p className="text-3xl font-bold leading-none tabular-nums">
                      {(
                        mttrData[mttrData.length - 1]!.avg_hours as number
                      ).toFixed(1)}
                    </p>
                    <p className="mb-0.5 text-sm text-muted-foreground">
                      {t("dashboard.cmms.hours")}
                    </p>
                  </div>
                )}
              <SimpleLineChart
                data={mttrData}
                xKey="period"
                series={[
                  {
                    dataKey: "avg_hours",
                    color: "#6366f1",
                    label: t("dashboard.cmms.mttrLabel"),
                  },
                ]}
                height={140}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PM Compliance % ── */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            {t("dashboard.cmms.pmTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pct_pm === null ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              {t("dashboard.noData")}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              {/* Circular progress ring via SVG */}
              <div className="relative flex h-28 w-28 items-center justify-center">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-muted"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={pmColor(pct_pm)}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct_pm / 100)}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <p
                    className="text-2xl font-bold leading-none tabular-nums"
                    style={{ color: pmColor(pct_pm) }}
                  >
                    {pct_pm.toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Status badge */}
              <Badge
                variant={pct_pm >= 80 ? "secondary" : "destructive"}
                className="text-[10px]"
              >
                {pct_pm >= 80
                  ? t("dashboard.cmms.pmOnTarget")
                  : pct_pm >= 60
                    ? t("dashboard.cmms.pmImprove")
                    : t("dashboard.cmms.pmCritical")}
              </Badge>

              <p className="text-center text-xs text-muted-foreground">
                {t("dashboard.cmms.pmDescription")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Top Assets by Failures ── */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wrench className="h-4 w-4" />
              {t("dashboard.cmms.topAssetsTitle")}
            </CardTitle>
            {top_activos_fallas.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                top {top_activos_fallas.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {top_activos_fallas.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm">{t("dashboard.noData")}</span>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {top_activos_fallas.map((a, i) => {
                const barWidth = Math.round((a.failures / maxFailures) * 100);
                const intensity =
                  i === 0
                    ? "#b91c1c"
                    : i === 1
                      ? "#ef4444"
                      : i === 2
                        ? "#f97316"
                        : "#f59e0b";
                return (
                  <div
                    key={a.asset_id}
                    className="rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: intensity }}
                      >
                        {i + 1}
                      </span>
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {a.asset_id.slice(0, 12)}…
                    </p>
                    <p
                      className="mt-1 text-lg font-bold tabular-nums"
                      style={{ color: intensity }}
                    >
                      {a.failures}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {t("dashboard.cmms.failures")}
                      </span>
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          backgroundColor: intensity,
                          width: `${barWidth}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
