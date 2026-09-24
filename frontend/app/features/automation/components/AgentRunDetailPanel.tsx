import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { LoadingState } from "~/components/common/LoadingState";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useAgentRunDetail, useCancelAgentRun } from "../hooks/useAutomation";
import type { AgentPlanStep } from "../types/automation.types";

interface AgentRunDetailPanelProps {
  runId: string | null;
  open: boolean;
  onClose: () => void;
}

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

function StepItem({ step, t }: { step: AgentPlanStep; t: (key: string, vars?: Record<string, unknown>) => string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            #{step.step_index + 1}
          </span>
          <span className="text-sm font-medium">{step.capability}</span>
        </div>
        <Badge className={getStatusBadgeClass(step.status)} variant="outline">
          {step.status}
        </Badge>
      </div>

      {step.reason && (
        <p className="text-xs text-muted-foreground">{step.reason}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{t("automation.agents.detail.step.params", { count: Object.keys(step.params).length })}</span>
        {step.result && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="underline hover:no-underline"
          >
            {t("automation.agents.detail.step.result")}
          </button>
        )}
      </div>

      {expanded && step.result && (
        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
          {JSON.stringify(step.result, null, 2)}
        </pre>
      )}

      {step.status === "awaiting_confirmation" && step.requires_confirmation && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-3">
            <p className="text-xs text-yellow-800">
              {t("automation.agents.detail.step.awaitingConfirmation")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function AgentRunDetailPanel({ runId, open, onClose }: AgentRunDetailPanelProps) {
  const { t } = useTranslation();
  const { data: detailResponse, isLoading } = useAgentRunDetail(runId);
  const cancelMutation = useCancelAgentRun();

  const run = detailResponse?.data;
  const isActive = run && ["planning", "executing", "awaiting_confirmation"].includes(run.status);

  const handleCancel = () => {
    if (runId) {
      cancelMutation.mutate(runId, { onSuccess: onClose });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[480px] sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("automation.agents.detail.title")}</SheetTitle>
        </SheetHeader>

        {isLoading && <LoadingState />}

        {run && (
          <div className="space-y-6 mt-4">
            {/* Header */}
            <div className="space-y-3">
              <p className="text-sm">{run.goal}</p>
              <div className="flex items-center gap-2">
                <Badge className={getStatusBadgeClass(run.status)} variant="outline">
                  {t(`automation.agents.status.${run.status}`)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">{t("automation.agents.detail.startedAt")}:</span>{" "}
                  {run.started_at ? new Date(run.started_at).toLocaleString() : "-"}
                </div>
                <div>
                  <span className="font-medium">{t("automation.agents.detail.completedAt")}:</span>{" "}
                  {run.completed_at ? new Date(run.completed_at).toLocaleString() : "-"}
                </div>
                <div>
                  <span className="font-medium">{t("automation.agents.detail.duration")}:</span>{" "}
                  {formatDuration(run.started_at, run.completed_at)}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t("automation.agents.detail.steps")}</h4>
              {run.plan_steps
                .sort((a, b) => a.step_index - b.step_index)
                .map((step) => (
                  <StepItem key={step.step_index} step={step} t={t} />
                ))}
              {run.plan_steps.length === 0 && (
                <p className="text-xs text-muted-foreground">-</p>
              )}
            </div>

            {/* Result summary */}
            {run.result_summary && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium">{t("automation.agents.detail.resultSummary")}</h4>
                <p className="text-sm text-muted-foreground">{run.result_summary}</p>
              </div>
            )}

            {/* Cancel button */}
            {isActive && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={cancelMutation.isPending}>
                    {cancelMutation.isPending
                      ? t("automation.agents.detail.cancelling")
                      : t("automation.agents.detail.cancel")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("automation.agents.detail.cancel")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("automation.agents.detail.cancelConfirm")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel}>
                      {t("automation.agents.detail.cancel")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
