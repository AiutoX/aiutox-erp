/**
 * ReportList component
 * Lists available reports with actions
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
import { Search, Plus, Edit, Trash2, Play, Download, Eye } from "lucide-react";
import type {
  Report,
  ReportListParams,
} from "~/features/reporting/types/reporting.types";

interface ReportListProps {
  reports: Report[];
  loading?: boolean;
  onEdit?: (report: Report) => void;
  onDelete?: (report: Report) => void;
  onExecute?: (report: Report) => void;
  onView?: (report: Report) => void;
  onExport?: (report: Report) => void;
  onSearch?: (params: ReportListParams) => void;
  onCreate?: () => void;
}

export function ReportList({
  reports,
  loading,
  onEdit,
  onDelete,
  onExecute,
  onView,
  onExport,
  onSearch,
  onCreate,
}: ReportListProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const handleSearch = () => {
    onSearch?.({
      search: searchTerm || undefined,
      module: moduleFilter || undefined,
      is_active:
        statusFilter === "active"
          ? true
          : statusFilter === "inactive"
            ? false
            : undefined,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "default" : "secondary"}>
      {isActive ? t("reporting.status.active") : t("reporting.status.inactive")}
    </Badge>
  );

  const getModuleBadge = (module: string) => (
    <Badge variant="outline" className="capitalize">
      {module}
    </Badge>
  );

  const getVisualizationCount = (visualizations: unknown[]) =>
    visualizations.length;

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

      {/* Search and filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reporting.search.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t("reporting.search.placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("reporting.filters.module")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("reporting.filters.all")}
                </SelectItem>
                <SelectItem value="sales">
                  {t("reporting.modules.sales")}
                </SelectItem>
                <SelectItem value="products">
                  {t("reporting.modules.products")}
                </SelectItem>
                <SelectItem value="customers">
                  {t("reporting.modules.customers")}
                </SelectItem>
                <SelectItem value="inventory">
                  {t("reporting.modules.inventory")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t("reporting.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("reporting.filters.all")}
                </SelectItem>
                <SelectItem value="active">
                  {t("reporting.status.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("reporting.status.inactive")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              {t("common.search")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reporting.list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
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
                  <TableHead>{t("reporting.fields.module")}</TableHead>
                  <TableHead>{t("reporting.fields.dataSource")}</TableHead>
                  <TableHead>{t("reporting.fields.visualizations")}</TableHead>
                  <TableHead>{t("reporting.fields.status")}</TableHead>
                  <TableHead>{t("reporting.fields.updatedAt")}</TableHead>
                  <TableHead className="text-right">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {report.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getModuleBadge(report.module)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {report.data_source}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getVisualizationCount(report.visualizations)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(report.is_active)}</TableCell>
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
                        {onExport && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onExport(report)}
                          >
                            <Download className="h-4 w-4" />
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
