/**
 * TemplateList component
 * Displays a list of templates with filters and actions
 */

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { DataTable } from "~/components/common/DataTable";
import { SearchBar } from "~/components/common/SearchBar";
import type {
  Template,
  TemplateType,
  TemplateRenderContext,
  RenderFormat,
} from "~/features/templates/types/template.types";

type SafeTemplateType = Exclude<TemplateType, undefined>;

interface TemplateListProps {
  templates: Template[];
  loading?: boolean;
  onRefresh?: () => void;
  onEdit?: (template: Template) => void;
  onDelete?: (template: Template) => void;
  onPreview?: (template: Template) => void;
  onRender?: (
    request: { templateId: string; data: TemplateRenderContext },
    format: RenderFormat
  ) => void;
  onCreate?: () => void;
}

const typeColors: Record<SafeTemplateType, string> = {
  document: "bg-blue-100 text-blue-800 border-blue-200",
  email: "bg-green-100 text-green-800 border-green-200",
  sms: "bg-purple-100 text-purple-800 border-purple-200",
};

const statusColors = {
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-gray-100 text-gray-800 border-gray-200",
};

export function TemplateList({
  templates,
  loading,
  onRefresh,
  onEdit,
  onDelete,
  onPreview,
  onRender,
  onCreate,
}: TemplateListProps) {
  const { t } = useTranslation();
  const dateLocale = es;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP", { locale: dateLocale });
  };

  const getTypeBadge = (type: TemplateType | undefined) => {
    if (!type) return null;
    return (
      <Badge variant="outline" className={typeColors[type]}>
        {t(`templates.type.${type}`)}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge
        variant="outline"
        className={isActive ? statusColors.active : statusColors.inactive}
      >
        {isActive
          ? t("templates.status.active")
          : t("templates.status.inactive")}
      </Badge>
    );
  };

  const columns = [
    {
      key: "name",
      header: t("templates.name"),
      cell: (template: Template) => (
        <div className="font-medium">{template.name}</div>
      ),
    },
    {
      key: "type",
      header: t("templates.type.title"),
      cell: (template: Template) => getTypeBadge(template.type ?? undefined),
    },
    {
      key: "category",
      header: t("templates.category"),
      cell: (template: Template) => (
        <span className="text-sm">
          {template.category_id ?? template.category}
        </span>
      ),
    },
    {
      key: "status",
      header: t("templates.status.title"),
      cell: (template: Template) => getStatusBadge(template.is_active),
    },
    {
      key: "variables",
      header: t("templates.variables"),
      cell: (template: Template) => (
        <div className="flex flex-wrap gap-1">
          {(template.variables ?? []).slice(0, 3).map((variable) => (
            <span
              key={variable}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
            >
              {variable}
            </span>
          ))}
          {(template.variables ?? []).length > 3 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
              +{(template.variables ?? []).length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "version",
      header: t("templates.version"),
      cell: (template: Template) => (
        <span className="text-sm">v{template.version}</span>
      ),
    },
    {
      key: "updated_at",
      header: t("templates.updatedAt"),
      cell: (template: Template) => (
        <span className="text-sm">{formatDate(template.updated_at)}</span>
      ),
    },
    {
      key: "actions",
      header: t("common.actions"),
      cell: (template: Template) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview?.(template)}
          >
            {t("common.view")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onRender?.({ templateId: template.id, data: {} }, "html");
            }}
            className="text-blue-600 hover:text-blue-700"
          >
            {t("templates.render")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(template)}
          >
            {t("common.edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete?.(template)}
            className="text-red-600 hover:text-red-700"
          >
            {t("common.delete")}
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary" />
            <span>{t("templates.loading")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!templates.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            {t("templates.noTemplates")}
          </div>
          <Button onClick={onCreate}>{t("templates.create")}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t("templates.title")}</h2>
        <div className="flex space-x-2">
          <Button onClick={onRefresh} disabled={loading}>
            {t("common.refresh")}
          </Button>
          <Button onClick={onCreate}>{t("templates.create")}</Button>
        </div>
      </div>

      {/* Search bar */}
      <SearchBar
        placeholder={t("templates.search.placeholder")}
        onChange={(_value) => {
          // Handle search
        }}
      />

      {/* Templates table */}
      <DataTable
        columns={columns}
        data={templates}
        pagination={{
          page: 1,
          pageSize: 20,
          total: templates.length,
          onPageChange: () => {
            // Handle pagination
          },
        }}
      />
    </div>
  );
}
