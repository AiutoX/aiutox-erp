/**
 * ReportList component
 * Lists available reports with actions
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Search, Plus, Edit, Trash2, Play, Eye } from "lucide-react";
import type { Report } from "~/features/reporting/types/reporting.types";

interface ReportListProps {
  reports: Report[];
  loading?: boolean;
  onEdit?: (report: Report) => void;
  onDelete?: (report: Report) => void;
  onExecute?: (report: Report) => void;
  onView?: (report: Report) => void;
  onCreate?: () => void;
}

export function ReportList({
  reports,
  loading,
  onEdit,
  onDelete,
  onExecute,
  onView,
  onCreate,
}: ReportListProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredReports = searchTerm
    ? reports.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.description ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : reports;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary" />
            <span>{t("reporting.loading")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t("reporting.title")}</h2>
        {onCreate && (
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t("reporting.create")}
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reporting.search.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t("reporting.search.placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reporting.list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                {t("reporting.list.empty")}
              </div>
              {onCreate && (
                <Button onClick={onCreate} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("reporting.create")}
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reporting.fields.name")}</TableHead>
                  <TableHead>{t("reporting.fields.dataSource")}</TableHead>
                  <TableHead>{t("reporting.builder.visualizations.title")}</TableHead>
                  <TableHead>{t("reporting.fields.updatedAt")}</TableHead>
                  <TableHead className="text-right">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {report.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {report.data_source_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {report.visualization_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(report.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        {onView && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(report)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onExecute && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onExecute(report)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(report)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(report)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
