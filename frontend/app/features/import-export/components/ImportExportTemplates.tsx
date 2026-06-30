/**
 * Import/Export Templates
 * Component for displaying import/export templates
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { DataTable, type DataTableColumn } from "~/components/common/DataTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  PlugIcon,
  DownloadIcon as EyeIcon,
  UploadIcon as EditIcon,
  UploadIcon,
  DownloadIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useImportTemplates } from "../hooks/useImportExport";
import type { ImportTemplate } from "../types/import-export.types";

export interface ImportExportTemplatesProps {
  onTemplateClick?: (templateId: string) => void;
  onTemplateEdit?: (templateId: string) => void;
  onTemplateDelete?: (templateId: string) => void;
  onTemplateCreate?: () => void;
}

export function ImportExportTemplates({
  onTemplateClick,
  onTemplateEdit,
  onTemplateDelete,
  onTemplateCreate,
}: ImportExportTemplatesProps) {
  const { t } = useTranslation();
  const [selectedModule] = useState<string>("");

  // Queries
  const { data: templates, isLoading } = useImportTemplates({
    module: selectedModule || undefined,
  });

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm(t("importExport.templates.confirmDelete"))) {
      onTemplateDelete?.(templateId);
    }
  };

  const columns: DataTableColumn<ImportTemplate>[] = [
    {
      key: "name",
      header: t("importExport.templates.table.name"),
      cell: (template) => (
        <div>
          <div className="font-medium">{template.name}</div>
          {template.description && (
            <div className="text-sm text-muted-foreground">
              {template.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "module",
      header: t("importExport.templates.table.module"),
      cell: (template) => <Badge variant="outline">{template.module}</Badge>,
    },
    {
      key: "field_mapping",
      header: t("importExport.templates.table.fields"),
      cell: (template) => (
        <span className="text-sm text-muted-foreground">
          {Object.keys(template.field_mapping).length}{" "}
          {t("importExport.templates.table.fieldsMapped")}
        </span>
      ),
    },
    {
      key: "delimiter",
      header: t("importExport.templates.table.delimiter"),
      cell: (template) => (
        <Badge variant="secondary">{template.delimiter}</Badge>
      ),
    },
    {
      key: "skip_header",
      header: t("importExport.templates.table.skipHeader"),
      cell: (template) => (
        <Badge variant={template.skip_header ? "default" : "outline"}>
          {template.skip_header ? t("common.yes") : t("common.no")}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: t("importExport.templates.table.createdAt"),
      cell: (template) => (
        <span className="text-sm text-muted-foreground">
          {new Date(template.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("importExport.templates.table.actions"),
      cell: (template) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTemplateClick?.(template.id)}
          >
            <HugeiconsIcon icon={EyeIcon} size={12} />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onTemplateEdit?.(template.id)}
          >
            <HugeiconsIcon icon={EditIcon} size={12} />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeleteTemplate(template.id)}
          >
            <HugeiconsIcon icon={UploadIcon} size={12} />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("importExport.templates.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            {t("importExport.templates.title")}
          </h3>
          <p className="text-muted-foreground">
            {t("importExport.templates.description")}
          </p>
        </div>
        <Button onClick={onTemplateCreate}>
          <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
          {t("importExport.templates.create")}
        </Button>
      </div>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("importExport.templates.list")}</CardTitle>
          <CardDescription>
            {templates?.data?.length || 0} {t("importExport.templates.total")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates?.data && templates.data.length > 0 ? (
            <DataTable columns={columns} data={templates.data} />
          ) : (
            <div className="text-center py-8">
              <HugeiconsIcon
                icon={DownloadIcon}
                size={48}
                className="mx-auto mb-4 text-muted-foreground"
              />
              <h3 className="text-lg font-medium mb-2">
                {t("importExport.templates.empty.title")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("importExport.templates.empty.description")}
              </p>
              <Button onClick={onTemplateCreate}>
                <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
                {t("importExport.templates.create")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
