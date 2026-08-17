/**
 * ReportExecutionHistory component (REP-005 — Auditoria tab)
 * Lists report execution history, filterable by report and date range.
 * Only rendered for users holding auth.view_audit (see reporting.tsx).
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useReportExecutions } from "~/features/reporting/hooks/useReporting";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { Report } from "~/features/reporting/types/reporting.types";

interface ReportExecutionHistoryProps {
  reports: Report[];
}

export function ReportExecutionHistory({ reports }: ReportExecutionHistoryProps) {
  const { t } = useTranslation();
  const [reportId, setReportId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading } = useReportExecutions({
    report_id: reportId !== "all" ? reportId : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const executions = data?.data || [];
  const reportsById = new Map(reports.map((r) => [r.id, r]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("reporting.auditTab.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={reportId} onValueChange={setReportId}>
            <SelectTrigger>
              <SelectValue placeholder={t("reporting.auditTab.filterReport")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("reporting.filters.all")}</SelectItem>
              {reports.map((report) => (
                <SelectItem key={report.id} value={report.id}>
                  {report.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder={t("reporting.filters.startDate")}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder={t("reporting.filters.endDate")}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("reporting.loading")}
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("reporting.auditTab.empty")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reporting.execution.createdAt")}</TableHead>
                <TableHead>{t("reporting.auditTab.report")}</TableHead>
                <TableHead>{t("reporting.execution.status.__value")}</TableHead>
                <TableHead>{t("reporting.execution.rows")}</TableHead>
                <TableHead>{t("reporting.auditTab.duration")}</TableHead>
                <TableHead>{t("reporting.auditTab.error")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => {
                const report = reportsById.get(execution.report_id);
                return (
                  <TableRow key={execution.id}>
                    <TableCell>
                      {new Date(execution.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {report ? report.name : t("reporting.auditTab.unknownReport")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          execution.status === "success" ? "default" : "destructive"
                        }
                      >
                        {execution.status === "success"
                          ? t("reporting.auditTab.statusSuccess")
                          : t("reporting.auditTab.statusFailed")}
                      </Badge>
                    </TableCell>
                    <TableCell>{execution.row_count ?? "-"}</TableCell>
                    <TableCell>
                      {execution.execution_time_ms != null
                        ? `${execution.execution_time_ms} ms`
                        : "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-destructive">
                      {execution.error_message ?? "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
