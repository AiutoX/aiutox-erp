/**
 * WorkflowList component
 * Displays a list of workflows with actions
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { Workflow } from "../types/workflow.types";
import { Pencil, Play, Trash2, Eye } from "lucide-react";

interface WorkflowListProps {
  workflows: Workflow[];
  loading?: boolean;
  onEdit?: (workflow: Workflow) => void;
  onDelete?: (workflow: Workflow) => void;
  onExecute?: (workflow: Workflow) => void;
  onView?: (workflow: Workflow) => void;
}

export function WorkflowList({
  workflows,
  loading = false,
  onEdit,
  onDelete,
  onExecute,
  onView,
}: WorkflowListProps) {
  const { t } = useTranslation();

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

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            {t("workflows.noWorkflows")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {workflows.map((workflow) => (
        <Card key={workflow.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <Badge variant={workflow.enabled ? "default" : "secondary"}>
                    {workflow.enabled
                      ? t("workflows.status.enabled")
                      : t("workflows.status.disabled")}
                  </Badge>
                </div>
                {workflow.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {workflow.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>
                    {workflow.definition.steps.length} {t("workflows.steps")}
                  </span>
                  <span>
                    {t("workflows.createdAt")}:{" "}
                    {new Date(workflow.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(workflow)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {onExecute && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onExecute(workflow)}
                    disabled={!workflow.enabled}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(workflow)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(workflow)}
                  >
                    <Trash2 className="h-4 w-4" />
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
