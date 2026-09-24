/**
 * WorkflowExecutions component
 * Displays a list of workflow executions with actions
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { WorkflowExecution } from "../types/workflow.types";
import { Play, Eye } from "lucide-react";

interface WorkflowExecutionsProps {
  executions: WorkflowExecution[];
  loading?: boolean;
  onAdvance?: (execution: WorkflowExecution) => void;
  onView?: (execution: WorkflowExecution) => void;
}

export function WorkflowExecutions({
  executions,
  loading = false,
  onAdvance,
  onView,
}: WorkflowExecutionsProps) {
  const { t } = useTranslation();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "running":
        return "secondary";
      case "failed":
        return "destructive";
      case "cancelled":
        return "outline";
      case "paused":
        return "secondary";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            {t("common.loading")}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (executions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            {t("workflows.noExecutions")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {executions.map((execution) => (
        <Card key={execution.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">
                    {t("workflows.execution")} #{execution.id.slice(0, 8)}
                  </CardTitle>
                  <Badge variant={getStatusColor(execution.status)}>
                    {t(`workflows.executionStatus.${execution.status}`)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>
                    {t("workflows.startedAt")}:{" "}
                    {new Date(execution.started_at).toLocaleString()}
                  </span>
                  {execution.completed_at && (
                    <span>
                      {t("workflows.completedAt")}:{" "}
                      {new Date(execution.completed_at).toLocaleString()}
                    </span>
                  )}
                  {execution.entity_type && (
                    <span>
                      {t("workflows.entity")}: {execution.entity_type}
                    </span>
                  )}
                </div>
                {execution.error_message && (
                  <p className="text-sm text-destructive mt-2">
                    {execution.error_message}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(execution)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {onAdvance &&
                  (execution.status === "running" ||
                    execution.status === "paused") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAdvance(execution)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
