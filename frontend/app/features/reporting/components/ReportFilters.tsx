/**
 * ReportFilters component
 * Pagination controls for the reports list
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Filter } from "lucide-react";
import type { ReportListParams } from "~/features/reporting/types/reporting.types";

interface ReportFiltersProps {
  filters: ReportListParams;
  onFiltersChange: (filters: ReportListParams) => void;
}

export function ReportFilters({ filters, onFiltersChange }: ReportFiltersProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>{t("reporting.filters.title")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="page_size">{t("reporting.filters.pageSize")}</Label>
          <Select
            value={filters.page_size?.toString() || "20"}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, page_size: parseInt(value, 10) })
            }
          >
            <SelectTrigger id="page_size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
