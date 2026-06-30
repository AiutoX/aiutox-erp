/**
 * Import/Export Jobs
 * Component for displaying import/export jobs list
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { DataTable, type DataTableColumn } from "~/components/common/DataTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DownloadIcon,
  UploadIcon,
  DownloadIcon as EyeIcon,
  DownloadIcon as RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ImportJob, ExportJob } from "../types/import-export.types";

export interface ImportExportJobsProps {
  type: "import" | "export";
  jobs: (ImportJob | ExportJob)[];
  loading?: boolean;
  onJobClick?: (job: ImportJob | ExportJob) => void;
  onJobDelete?: (jobId: string) => void;
  onJobCancel?: (jobId: string) => void;
  onJobRetry?: (jobId: string) => void;
  onJobDownload?: (jobId: string) => void;
}

export function ImportExportJobs({
  type,
  jobs,
  loading = false,
  onJobClick,
  onJobDelete,
  onJobCancel,
  onJobRetry,
  onJobDownload,
}: ImportExportJobsProps) {
  const { t } = useTranslation();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "processing":
        return "secondary";
      case "failed":
        return "destructive";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return t("importExport.status.completed");
      case "processing":
        return t("importExport.status.processing");
      case "failed":
        return t("importExport.status.failed");
      case "pending":
        return t("importExport.status.pending");
      default:
        return status;
    }
  };

  const handleDeleteJob = (jobId: string) => {
    if (confirm(t("importExport.confirmDelete"))) {
      onJobDelete?.(jobId);
    }
  };

  const handleCancelJob = (jobId: string) => {
    if (confirm(t("importExport.confirmCancel"))) {
      onJobCancel?.(jobId);
    }
  };

  const handleRetryJob = (jobId: string) => {
    onJobRetry?.(jobId);
  };

  const handleDownloadFile = (jobId: string) => {
    onJobDownload?.(jobId);
  };

  const columns: DataTableColumn<ImportJob | ExportJob>[] = [
    {
      key: "type",
      header: t("importExport.table.type"),
      cell: () => (
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={type === "import" ? UploadIcon : DownloadIcon}
            size={16}
          />
          <span className="capitalize">
            {type === "import"
              ? t("importExport.type.import")
              : t("importExport.type.export")}
          </span>
        </div>
      ),
    },
    {
      key: "module",
      header: t("importExport.table.module"),
      cell: (job) => <Badge variant="outline">{job.module}</Badge>,
    },
    {
      key: "status",
      header: t("importExport.table.status"),
      cell: (job) => (
        <Badge variant={getStatusVariant(job.status)}>
          {getStatusLabel(job.status)}
        </Badge>
      ),
    },
    {
      key: "progress",
      header: t("importExport.table.progress"),
      cell: (job) => {
        const progress = "progress" in job ? job.progress : 0;
        return (
          <div className="w-full max-w-[100px]">
            {job.status === "processing" ? (
              <Progress value={progress} className="h-2" />
            ) : (
              <span className="text-sm text-muted-foreground">{progress}%</span>
            )}
          </div>
        );
      },
    },
    {
      key: "file_name",
      header: t("importExport.table.fileName"),
      cell: (job) => (
        <span className="text-sm truncate max-w-[150px]">
          {job.file_name || "-"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: t("importExport.table.createdAt"),
      cell: (job) => (
        <span className="text-sm text-muted-foreground">
          {new Date(job.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("importExport.table.actions"),
      cell: (job) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onJobClick?.(job)}>
            <HugeiconsIcon icon={EyeIcon} size={12} />
          </Button>

          {job.status === "completed" && type === "export" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownloadFile(job.id)}
            >
              <HugeiconsIcon icon={DownloadIcon} size={12} />
            </Button>
          )}

          {job.status === "processing" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCancelJob(job.id)}
            >
              <HugeiconsIcon icon={DownloadIcon} size={12} />
            </Button>
          )}

          {job.status === "failed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRetryJob(job.id)}
            >
              <HugeiconsIcon icon={RefreshIcon} size={12} />
            </Button>
          )}

          {(job.status === "completed" || job.status === "failed") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeleteJob(job.id)}
            >
              <HugeiconsIcon icon={UploadIcon} size={12} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("importExport.jobs.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("importExport.jobs.title")}</CardTitle>
          <CardDescription>
            {t("importExport.jobs.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <HugeiconsIcon
              icon={type === "import" ? UploadIcon : DownloadIcon}
              size={48}
              className="mx-auto mb-4 text-muted-foreground"
            />
            <h3 className="text-lg font-medium mb-2">
              {t("importExport.jobs.empty.title")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("importExport.jobs.empty.description")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("importExport.jobs.title")}</CardTitle>
        <CardDescription>
          {t("importExport.jobs.description")} ({jobs.length}{" "}
          {t("importExport.jobs.total")})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={jobs} />
      </CardContent>
    </Card>
  );
}
