import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { EmptyState } from "~/components/common/EmptyState";
import { LoadingState } from "~/components/common/LoadingState";
import { ErrorState } from "~/components/common/ErrorState";
import { useAgentRuns } from "../hooks/useAutomation";
import { AgentRunDetailPanel } from "./AgentRunDetailPanel";
import type { AgentRunRead } from "../types/automation.types";

const PAGE_SIZE = 20;

const STATUSES = [
  "planning",
  "executing",
  "awaiting_confirmation",
  "completed",
  "failed",
  "cancelled",
] as const;

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "planning":
    case "executing":
      return "bg-blue-100 text-blue-800";
    case "awaiting_confirmation":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    default:
      return "";
  }
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return "-";
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diffMs = endDate.getTime() - startDate.getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSec}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  return `${hours}h ${remainingMin}m`;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AgentRunHistoryPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(0);
  };
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const params = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(statusFilter !== "all" && { status: statusFilter }),
  };

  const { data: response, isLoading, error, refetch } = useAgentRuns(params);

  const runs = response?.data || [];
  const meta = response?.meta;
  const totalPages = meta ? meta.total_pages : 0;

  if (isLoading) {
    return (
      <PageLayout
        title={t("automation.agents.title")}
        description={t("automation.agents.description")}
      >
        <LoadingState />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout
        title={t("automation.agents.title")}
        description={t("automation.agents.description")}
      >
        <ErrorState message={String(error)} onRetry={() => void refetch()} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={t("automation.agents.title")}
      description={t("automation.agents.description")}
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("automation.agents.filter.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("automation.agents.filter.allStatuses")}
              </SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`automation.agents.status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {runs.length === 0 ? (
          <EmptyState
            title={t("automation.agents.empty.title")}
            description={t("automation.agents.empty.description")}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">{t("automation.agents.table.goal")}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">{t("automation.agents.table.status")}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">{t("automation.agents.table.steps")}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">{t("automation.agents.table.started")}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">{t("automation.agents.table.duration")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {runs.map((run: AgentRunRead) => (
                      <tr
                        key={run.id}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedRunId(run.id)}
                      >
                        <td className="px-4 py-3 text-sm max-w-[300px]">
                          <span className="truncate block" title={run.goal}>
                            {run.goal.length > 60 ? `${run.goal.slice(0, 60)}...` : run.goal}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusBadgeClass(run.status)} variant="outline">
                            {t(`automation.agents.status.${run.status}`)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {run.current_step}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatRelativeTime(run.started_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDuration(run.started_at, run.completed_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    {t("common.previous")}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page + 1 >= totalPages}
                  >
                    {t("common.next")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Panel */}
      <AgentRunDetailPanel
        runId={selectedRunId}
        open={!!selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />
    </PageLayout>
  );
}
