import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getImportJob,
  getExportJob,
  type ImportJobResponse,
  type ExportJobResponse,
} from "~/lib/api/import-export.api";

interface UseJobStatusOptions {
  jobId: string | null;
  jobType: "import" | "export";
  enabled?: boolean;
  pollingInterval?: number;
  onComplete?: (job: ImportJobResponse | ExportJobResponse) => void;
}

/**
 * Hook to poll job status and automatically refresh when job is processing
 *
 * @param options Configuration options
 * @returns Job data and loading state
 */
export function useJobStatus(options: UseJobStatusOptions) {
  const {
    jobId,
    jobType,
    enabled = true,
    pollingInterval = 2000,
    onComplete,
  } = options;
  const queryClient = useQueryClient();
  const onCompleteRef = useRef(onComplete);
  const hasNotifiedRef = useRef(false);
  const previousJobIdRef = useRef<string | null>(null);

  // Update ref when callback changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Reset notification flag when jobId changes
  useEffect(() => {
    if (previousJobIdRef.current !== jobId) {
      hasNotifiedRef.current = false;
      previousJobIdRef.current = jobId;
    }
  }, [jobId]);

  const queryKey = [
    jobType === "import" ? "import-export" : "import-export",
    `${jobType}-job`,
    jobId,
  ];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!jobId) return null;
      if (jobType === "import") {
        const response = await getImportJob(jobId);
        return response.data;
      } else {
        const response = await getExportJob(jobId);
        return response.data;
      }
    },
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data as
        | ImportJobResponse
        | ExportJobResponse
        | null;
      // Poll every pollingInterval seconds if job is processing, otherwise stop polling
      if (job && (job.status === "pending" || job.status === "processing")) {
        return pollingInterval;
      }
      // If job completed, call onComplete callback once
      if (
        job &&
        (job.status === "completed" || job.status === "failed") &&
        !hasNotifiedRef.current
      ) {
        hasNotifiedRef.current = true;
        // Use setTimeout to avoid calling callback during render
        setTimeout(() => {
          if (onCompleteRef.current) {
            onCompleteRef.current(job);
          }
          // Invalidate the jobs list to refresh it
          queryClient.invalidateQueries({
            queryKey: ["import-export", `${jobType}-jobs`],
          });
        }, 0);
      }
      return false; // Stop polling
    },
    refetchIntervalInBackground: true,
  });

  return {
    job: data,
    isLoading,
    error,
    isProcessing: data?.status === "processing" || data?.status === "pending",
    isCompleted: data?.status === "completed",
    isFailed: data?.status === "failed",
  };
}
