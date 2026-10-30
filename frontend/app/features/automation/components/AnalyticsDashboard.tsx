import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useHasPermission } from "~/hooks/usePermissions";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { SimpleBarChart } from "~/features/dashboard/components/charts/SimpleBarChart";
import { aiAnalyticsApi, type CostByCapabilityEntry } from "../api/automation.api";
import { aiProviderApi, type ProviderConfigOut } from "../ai/api/ai-provider.api";

type Period = 7 | 30 | 90;
type SortDir = "asc" | "desc";

type CapabilityRow = CostByCapabilityEntry & {
  error_rate_pct: number;
};

function PanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-8">{message}</p>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: string;
  currentKey: string;
  direction: SortDir;
  onSort: (key: string) => void;
}) {
  const active = sortKey === currentKey;
  return (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          direction === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

export function AnalyticsDashboard() {
  const { t } = useTranslation();
  const hasAuditPermission = useHasPermission("ai.audit");

  const [period, setPeriod] = useState<Period>(30);
  const [sortKey, setSortKey] = useState<keyof CapabilityRow>("total_cost_usd");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: analytics, isLoading: loadingCost } = useQuery({
    queryKey: ["ai-analytics", "cost", period],
    queryFn: () => aiAnalyticsApi.getCostAnalytics(period),
  });

  // capabilities endpoint requires ai.audit — skip the call for ai.config-only users
  const { data: capabilityMetrics, isLoading: loadingCapabilities } = useQuery({
    queryKey: ["ai-analytics", "capabilities"],
    queryFn: aiAnalyticsApi.getCapabilityMetrics,
    enabled: hasAuditPermission,
  });

  const { data: providerConfig, isLoading: loadingProvider } = useQuery<ProviderConfigOut | null>({
    queryKey: ["ai-provider-config"],
    queryFn: aiProviderApi.getConfig,
  });

  const PERIOD_OPTIONS: { value: Period; labelKey: string }[] = [
    { value: 7, labelKey: "automation.analytics.period.7d" },
    { value: 30, labelKey: "automation.analytics.period.30d" },
    { value: 90, labelKey: "automation.analytics.period.90d" },
  ];

  // Merge cost analytics by_capability with capability metrics for error_rate
  const capabilityRows: CapabilityRow[] = (analytics?.by_capability ?? []).map((cap) => {
    const metric = capabilityMetrics?.find((m) => m.capability === cap.capability);
    return {
      ...cap,
      avg_latency_ms: metric?.avg_latency_ms ?? cap.avg_latency_ms,
      error_rate_pct: metric?.error_rate_pct ?? 0,
    };
  });

  const sortedRows = [...capabilityRows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortDir === "asc"
      ? (av as number) - (bv as number)
      : (bv as number) - (av as number);
  });

  function handleSort(key: string) {
    const k = key as keyof CapabilityRow;
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  return (
    <div className="space-y-6">
      {/* Panel 1 — Spend Over Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            {t("automation.analytics.spendOverTime.title")}
          </CardTitle>
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map(({ value, labelKey }) => (
              <Button
                key={value}
                size="sm"
                variant={period === value ? "default" : "outline"}
                onClick={() => setPeriod(value)}
              >
                {t(labelKey)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loadingCost ? (
            <Skeleton className="h-[240px] w-full" />
          ) : !analytics?.by_day?.length ? (
            <EmptyState message={t("automation.analytics.spendOverTime.empty")} />
          ) : (
            <SimpleBarChart
              data={analytics.by_day as unknown as Record<string, unknown>[]}
              xKey="date"
              series={[
                {
                  dataKey: "cost_usd",
                  color: "#6366f1",
                  label: t("automation.analytics.spendOverTime.yAxis"),
                },
              ]}
              height={240}
            />
          )}
        </CardContent>
      </Card>

      {/* Panel 2 — By Capability */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t("automation.analytics.byCapability.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCost || loadingCapabilities ? (
            <PanelSkeleton />
          ) : !sortedRows.length ? (
            <EmptyState message={t("automation.analytics.byCapability.empty")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <SortableHeader
                      label={t("automation.analytics.byCapability.capability")}
                      sortKey="capability"
                      currentKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label={t("automation.analytics.byCapability.invocations")}
                      sortKey="invocation_count"
                      currentKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label={t("automation.analytics.byCapability.avgLatency")}
                      sortKey="avg_latency_ms"
                      currentKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label={t("automation.analytics.byCapability.errorRate")}
                      sortKey="error_rate_pct"
                      currentKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label={t("automation.analytics.byCapability.totalCost")}
                      sortKey="total_cost_usd"
                      currentKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                    />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedRows.map((row) => (
                    <tr key={row.capability} className="hover:bg-muted/50">
                      <td className="px-3 py-2 font-mono text-xs">{row.capability}</td>
                      <td className="px-3 py-2 text-right">{row.invocation_count}</td>
                      <td className="px-3 py-2 text-right">
                        {row.avg_latency_ms.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.error_rate_pct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right">
                        ${row.total_cost_usd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Panel 3 — By User (ai.audit only) */}
      {hasAuditPermission && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("automation.analytics.byUser.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCost ? (
              <PanelSkeleton />
            ) : !analytics?.by_user?.length ? (
              <EmptyState message={t("automation.analytics.byUser.empty")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      {(["user", "conversations", "tokens", "cost"] as const).map(
                        (col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase"
                          >
                            {t(`automation.analytics.byUser.${col}`)}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analytics.by_user.map((row) => (
                      <tr key={row.user_id} className="hover:bg-muted/50">
                        <td className="px-3 py-2 font-mono text-xs">{row.user_id}</td>
                        <td className="px-3 py-2 text-right">{row.conversations}</td>
                        <td className="px-3 py-2 text-right">
                          {row.token_count.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right">
                          ${row.cost_usd.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Panel 4 — Provider Config */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t("automation.analytics.providerConfig.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProvider ? (
            <PanelSkeleton rows={3} />
          ) : !providerConfig ? (
            <EmptyState message={t("automation.analytics.providerConfig.empty")} />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">
                  {t("automation.analytics.providerConfig.provider")}
                </span>
                <span className="font-medium capitalize">
                  {providerConfig.provider_type}
                </span>
                <span className="text-muted-foreground">
                  {t("automation.analytics.providerConfig.modelConversation")}
                </span>
                <span className="font-mono text-xs">
                  {providerConfig.model_conversation ?? "—"}
                </span>
                <span className="text-muted-foreground">
                  {t("automation.analytics.providerConfig.modelClassifier")}
                </span>
                <span className="font-mono text-xs">
                  {providerConfig.model_classifier ?? "—"}
                </span>
                <span className="text-muted-foreground">
                  {t("automation.analytics.providerConfig.modelEmbeddings")}
                </span>
                <span className="font-mono text-xs">
                  {providerConfig.model_embeddings ?? "—"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("automation.analytics.providerConfig.costNote")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
