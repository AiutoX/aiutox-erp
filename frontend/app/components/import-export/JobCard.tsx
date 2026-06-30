import { useState, useEffect } from "react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { useJobStatus } from "~/hooks/useJobStatus";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type {
  ImportJobResponse,
  ExportJobResponse,
} from "~/lib/api/import-export.api";

interface JobCardProps {
  job: ImportJobResponse | ExportJobResponse;
  jobType: "import" | "export";
  onStatusChange?: (job: ImportJobResponse | ExportJobResponse) => void;
}

export function JobCard({ job, jobType, onStatusChange }: JobCardProps) {
  const { t } = useTranslation();
  const [localJob, setLocalJob] = useState(job);

  // Poll job status if it's processing
  const { job: updatedJob } = useJobStatus({
    jobId: job.id,
    jobType,
    enabled: job.status === "processing" || job.status === "pending",
    pollingInterval: 2000,
    onComplete: (completedJob) => {
      setLocalJob(completedJob);
      if (onStatusChange) {
        onStatusChange(completedJob);
      }
    },
  });

  // Update local job when updatedJob changes
  useEffect(() => {
    if (updatedJob && updatedJob.id === localJob.id) {
      setLocalJob(updatedJob);
    }
  }, [updatedJob, localJob.id]);

  const currentJob = updatedJob || localJob;

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      processing: "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      failed: "bg-red-100 text-red-800 border-red-200",
    };
    const statusText: Record<string, string> = {
      pending: t("config.importExport.statusPending"),
      processing: t("config.importExport.statusProcessing"),
      completed: t("config.importExport.statusCompleted"),
      failed: t("config.importExport.statusFailed"),
    };
    return (
      <Badge
        variant="outline"
        className={
          statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-800"
        }
      >
        {statusText[status.toLowerCase()] || status}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("es-ES");
  };

  const getElapsedTime = () => {
    if (!currentJob.started_at) return null;
    const start = new Date(currentJob.started_at).getTime();
    const end = currentJob.completed_at
      ? new Date(currentJob.completed_at).getTime()
      : Date.now();
    const elapsed = Math.floor((end - start) / 1000); // seconds
    if (elapsed < 60) return `${elapsed}s`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
    return `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m`;
  };

  const isImportJob = jobType === "import";
  const importJob = isImportJob ? (currentJob as ImportJobResponse) : null;
  const exportJob = !isImportJob ? (currentJob as ExportJobResponse) : null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium">
              {isImportJob
                ? `${t("config.importExport.importJob")}: ${currentJob.module} - ${importJob?.file_name || ""}`
                : `${t("config.importExport.exportJob")}: ${currentJob.module} - ${exportJob?.export_format.toUpperCase() || ""}`}
            </p>
            <div className="mt-2 space-y-1">
              {isImportJob && importJob && (
                <p className="text-sm text-gray-600">
                  {importJob.processed_rows}{" "}
                  {t("config.importExport.processedRows")}{" "}
                  {importJob.total_rows || "?"}{" "}
                  {t("config.importExport.rowsProcessed")}
                  {importJob.successful_rows > 0 && (
                    <span className="text-green-600 ml-2">
                      ✓ {importJob.successful_rows}{" "}
                      {t("config.importExport.successfulRows")}
                    </span>
                  )}
                  {importJob.failed_rows > 0 && (
                    <span className="text-red-600 ml-2">
                      ✗ {importJob.failed_rows}{" "}
                      {t("config.importExport.failedRows")}
                    </span>
                  )}
                </p>
              )}
              {exportJob && (
                <p className="text-sm text-gray-600">
                  {exportJob.exported_rows}{" "}
                  {t("config.importExport.rowsExported")}
                </p>
              )}
              <p className="text-xs text-gray-500">
                {t("config.importExport.createdAt")}:{" "}
                {formatDate(currentJob.created_at)}
                {currentJob.started_at && (
                  <span className="ml-2">
                    • {t("config.importExport.startedAt")}:{" "}
                    {formatDate(currentJob.started_at)}
                  </span>
                )}
                {getElapsedTime() && (
                  <span className="ml-2">
                    • {t("config.importExport.elapsedTime")}: {getElapsedTime()}
                  </span>
                )}
              </p>
            </div>

            {/* Progress bar */}
            {(importJob?.progress !== undefined && importJob.progress > 0) ||
            currentJob.status === "processing" ||
            currentJob.status === "pending" ? (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">
                    {t("config.importExport.progress")}
                  </span>
                  <span className="text-xs text-gray-600">
                    {importJob?.progress || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      currentJob.status === "processing"
                        ? "bg-blue-600 animate-pulse"
                        : currentJob.status === "completed"
                          ? "bg-green-600"
                          : currentJob.status === "failed"
                            ? "bg-red-600"
                            : "bg-yellow-600"
                    }`}
                    style={{
                      width: `${importJob?.progress || 0}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}

            {/* Errors display */}
            {importJob?.errors && importJob.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                <p className="font-medium text-red-800 mb-1">
                  {t("config.importExport.errors")} ({importJob.errors.length})
                </p>
                <ul className="text-red-700 space-y-1 max-h-32 overflow-y-auto">
                  {importJob.errors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>• {JSON.stringify(error)}</li>
                  ))}
                  {importJob.errors.length > 5 && (
                    <li className="text-red-600">
                      ... {importJob.errors.length - 5}{" "}
                      {t("config.importExport.moreErrors")}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <div className="ml-4">{getStatusBadge(currentJob.status)}</div>
        </div>
      </CardContent>
    </Card>
  );
}
