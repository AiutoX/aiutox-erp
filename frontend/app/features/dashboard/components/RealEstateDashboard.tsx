/**
 * RealEstateDashboard — Sprint 5 Phase 3
 * Data: ocupación, cartera aging, contratos por vencer, OTs críticas
 */

import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileWarning,
  Home,
  Wrench,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useRealEstateDashboard } from "../hooks/useDashboard";
import { SimpleDonutChart } from "./charts/SimpleDonutChart";

const PRIORITY_BADGE: Record<string, "destructive" | "secondary" | "outline"> =
  {
    critical: "destructive",
    high: "outline",
  };

const PRIORITY_ICON: Record<string, React.ReactNode> = {
  critical: <AlertTriangle className="h-3 w-3" />,
  high: <AlertCircle className="h-3 w-3" />,
};

function fmt(n: number) {
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export function RealEstateDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useRealEstateDashboard();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className={i === 0 ? "lg:col-span-2" : ""}>
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

  const {
    ocupacion,
    cartera_aging,
    contratos_por_vencer,
    mantenimientos_criticos,
  } = data;

  const occupancyRate =
    ocupacion.total > 0
      ? Math.round((ocupacion.ocupados / ocupacion.total) * 100)
      : 0;

  const donutData = [
    {
      name: t("dashboard.realEstate.ocupados"),
      value: ocupacion.ocupados,
      color: "#023E87",
    },
    {
      name: t("dashboard.realEstate.disponibles"),
      value: ocupacion.disponibles,
      color: "#00B6BC",
    },
    {
      name: t("dashboard.realEstate.mantenimiento"),
      value: ocupacion.mantenimiento,
      color: "#f59e0b",
    },
    ...(ocupacion.otros > 0
      ? [
          {
            name: t("dashboard.realEstate.otros"),
            value: ocupacion.otros,
            color: "#94a3b8",
          },
        ]
      : []),
  ].filter((d) => d.value > 0);

  const agingRows = [
    { label: "0–30 días", bucket: cartera_aging["0_30"], color: "#eab308" },
    { label: "31–60 días", bucket: cartera_aging["31_60"], color: "#f97316" },
    { label: "61–90 días", bucket: cartera_aging["61_90"], color: "#ef4444" },
    { label: ">90 días", bucket: cartera_aging["over_90"], color: "#b91c1c" },
  ];

  const totalOverdue = agingRows.reduce(
    (acc, r) => acc + (r.bucket?.total ?? 0),
    0
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* ── Ocupación ── */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 className="h-4 w-4" />
            {t("dashboard.realEstate.ocupacionTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <SimpleDonutChart data={donutData} height={170} />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-4xl font-bold leading-none tabular-nums">
                  {occupancyRate}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("dashboard.realEstate.tasaOcupacion")}
                </p>
              </div>
              <div className="space-y-1.5">
                {[
                  {
                    label: t("dashboard.realEstate.ocupados"),
                    val: ocupacion.ocupados,
                    color: "#023E87",
                  },
                  {
                    label: t("dashboard.realEstate.disponibles"),
                    val: ocupacion.disponibles,
                    color: "#00B6BC",
                  },
                  {
                    label: t("dashboard.realEstate.mantenimiento"),
                    val: ocupacion.mantenimiento,
                    color: "#f59e0b",
                  },
                ].map(({ label, val, color }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {label}
                      </span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums">
                      {val}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {ocupacion.total} {t("dashboard.realEstate.totalInmuebles")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Cartera aging ── */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileWarning className="h-4 w-4" />
            {t("dashboard.realEstate.agingTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-2xl font-bold leading-none tabular-nums text-destructive">
              {fmt(totalOverdue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("dashboard.realEstate.totalVencido")}
            </p>
          </div>
          <div className="space-y-3">
            {agingRows.map(({ label, bucket, color }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">
                    {bucket.count} {t("dashboard.realEstate.cobros")}
                  </span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all"
                    style={{
                      backgroundColor: color,
                      width: `${totalOverdue > 0 ? (bucket.total / totalOverdue) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="text-right text-[11px] font-semibold tabular-nums">
                  {fmt(bucket.total)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Contratos por vencer ── */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            {t("dashboard.realEstate.contratosTitle")}
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal">
              90d
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contratos_por_vencer.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <CheckCircle2 className="h-8 w-8 text-green-500/60" />
              <p className="text-xs text-muted-foreground">
                {t("dashboard.noData")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {contratos_por_vencer.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-2"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs">
                      {c.property_id.slice(0, 8)}…
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {fmt(c.canon_actual)}
                    </span>
                    <Badge
                      variant={
                        c.dias_restantes <= 30 ? "destructive" : "secondary"
                      }
                      className="flex items-center gap-0.5 text-[10px]"
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {c.dias_restantes}d
                    </Badge>
                  </div>
                </div>
              ))}
              {contratos_por_vencer.length > 5 && (
                <p className="text-center text-xs text-muted-foreground">
                  +{contratos_por_vencer.length - 5}{" "}
                  {t("dashboard.realEstate.masContratos")}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── OTs críticas / altas ── */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wrench className="h-4 w-4" />
              {t("dashboard.realEstate.otsCriticasTitle")}
            </CardTitle>
            {mantenimientos_criticos.length > 0 && (
              <Badge variant="destructive">
                {mantenimientos_criticos.length}{" "}
                {t("dashboard.realEstate.abiertas")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {mantenimientos_criticos.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm">{t("dashboard.noData")}</span>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {mantenimientos_criticos.slice(0, 8).map((ot) => (
                <div
                  key={ot.id}
                  className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                >
                  <span className="mt-0.5 shrink-0 text-destructive">
                    {PRIORITY_ICON[ot.prioridad] ?? (
                      <AlertCircle className="h-3 w-3" />
                    )}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-xs font-medium">{ot.titulo}</p>
                    <Badge
                      variant={PRIORITY_BADGE[ot.prioridad] ?? "secondary"}
                      className="text-[10px]"
                    >
                      {ot.prioridad}
                    </Badge>
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
