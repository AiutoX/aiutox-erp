/**
 * Automation Rule Detail Page
 * Shows rule metadata, stats and a readonly flow canvas.
 */

import { useParams, useNavigate } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
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
import { AutomationFlowEditor } from "~/features/automation/components/AutomationFlowEditor";
import {
  useAutomationRule,
  useAutomationStats,
  useExecuteAutomationRule,
  useCloneAutomationRule,
} from "~/features/automation/hooks/useAutomation";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Edit, Play, Copy, ArrowLeft } from "lucide-react";

export default function AutomationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: ruleResp, isLoading, isError } = useAutomationRule(id ?? "");
  const { data: statsResp } = useAutomationStats();
  const executeMutation = useExecuteAutomationRule();
  const cloneMutation = useCloneAutomationRule();

  const rule = ruleResp?.data;
  const stats = statsResp?.data;

  const topRule = stats?.top_rules?.find((r) => r.rule_id === id);

  if (isLoading) {
    return (
      <PageLayout title={t("automation.title")}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageLayout>
    );
  }

  if (isError || !rule) {
    return (
      <PageLayout title={t("automation.title")}>
        <div className="text-center py-16 text-muted-foreground">
          <p>{t("automation.error.loading")}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void navigate("/automation")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>
        </div>
      </PageLayout>
    );
  }

  const handleExecute = () => {
    if (!id) return;
    executeMutation.mutate(
      { id, payload: { rule_id: id } },
      {
        onSuccess: () =>
          showToast(t("automation.rules.execute.confirm"), "success"),
        onError: () => showToast(t("automation.error.loading"), "error"),
      }
    );
  };

  const handleClone = () => {
    if (!id) return;
    cloneMutation.mutate(
      {
        id,
        payload: { name: `${rule.name} (${t("automation.rules.clone")})` },
      },
      {
        onSuccess: () => showToast(t("automation.rules.clone"), "success"),
        onError: () => showToast(t("automation.error.loading"), "error"),
      }
    );
  };

  const triggerLabel =
    rule.trigger.type === "event"
      ? `${t("automation.trigger.event")}: ${rule.trigger.event_type ?? ""}`
      : rule.trigger.type === "schedule"
        ? `${t("automation.trigger.schedule")}: ${rule.trigger.schedule?.expression ?? ""}`
        : t("automation.trigger.manual");

  const actions = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => void navigate(`/automation/${id}/edit`)}
      >
        <Edit className="w-4 h-4 mr-2" />
        {t("common.edit")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClone}
        disabled={cloneMutation.isPending}
      >
        <Copy className="w-4 h-4 mr-2" />
        {t("automation.rules.clone")}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" disabled={executeMutation.isPending}>
            <Play className="w-4 h-4 mr-2" />
            {t("automation.rules.execute.__value")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("automation.rules.execute.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("automation.rules.execute.confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute}>
              {t("automation.rules.execute.__value")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <PageLayout
      title={rule.name}
      breadcrumb={[
        { label: t("automation.title"), href: "/automation" },
        { label: rule.name },
      ]}
      footer={actions}
    >
      <div className="space-y-6">
        {/* Meta card */}
        <Card>
          <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">
                {t("automation.status.__value") ?? "Estado"}
              </p>
              <Badge variant={rule.is_active ? "default" : "secondary"}>
                {rule.is_active
                  ? t("automation.status.active")
                  : t("automation.status.inactive")}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">
                {t("automation.form.priority")}
              </p>
              <span className="font-medium">{rule.priority}</span>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">
                {t("automation.form.trigger")}
              </p>
              <span className="font-medium">{triggerLabel}</span>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">
                {t("automation.form.description")}
              </p>
              <span className="text-muted-foreground">
                {rule.description || "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stats row */}
        {topRule && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {t("automation.executions.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{topRule.execution_count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {t("automation.flowEditor.successRate")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(topRule.success_rate * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {t("automation.form.conditions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{rule.conditions.length}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Readonly flow canvas */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("automation.flowEditor.canvasTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[500px]">
            <AutomationFlowEditor initialRule={rule} readonly={true} />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
