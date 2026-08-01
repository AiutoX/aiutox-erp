/**
 * Automation Rule Edit Page
 * Metadata form (compact) + full interactive ReactFlow canvas.
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { AutomationFlowEditor } from "~/features/automation/components/AutomationFlowEditor";
import {
  useAutomationRule,
  useUpdateAutomationRule,
  useTestAutomationRule,
  useValidateAutomationRule,
} from "~/features/automation/hooks/useAutomation";
import type {
  AutomationRuleCreate,
  AutomationRuleUpdate,
} from "~/features/automation/types/automation.types";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Save, FlaskConical, CheckCircle2, ArrowLeft } from "lucide-react";

export default function AutomationEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: ruleResp, isLoading, isError } = useAutomationRule(id ?? "");
  const updateMutation = useUpdateAutomationRule();
  const testMutation = useTestAutomationRule();
  const validateMutation = useValidateAutomationRule();

  const rule = ruleResp?.data;

  // Local metadata overrides
  const [name, setName] = useState<string | undefined>();
  const [description, setDescription] = useState<string | undefined>();
  const [isActive, setIsActive] = useState<boolean | undefined>();
  const [priority, setPriority] = useState<number | undefined>();

  // Dialog state
  const [testOpen, setTestOpen] = useState(false);
  const [testResult, setTestResult] = useState<unknown>(null);
  const [validateErrors, setValidateErrors] = useState<string[]>([]);

  if (isLoading) {
    return (
      <PageLayout title={t("automation.title")}>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-[calc(100vh-320px)] w-full" />
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

  const resolvedName = name ?? rule.name;
  const resolvedDescription = description ?? rule.description;
  const resolvedIsActive = isActive ?? rule.is_active;
  const resolvedPriority = priority ?? rule.priority;

  const handleSave = (rulePartial: Partial<AutomationRuleCreate>) => {
    if (!id) return;
    const payload: AutomationRuleUpdate = {
      name: resolvedName,
      description: resolvedDescription,
      is_active: resolvedIsActive,
      priority: resolvedPriority,
      ...rulePartial,
    };
    updateMutation.mutate(
      { id, payload },
      {
        onSuccess: () => {
          showToast(t("common.saving"), "success");
          void navigate(`/automation/${id}`);
        },
        onError: () => showToast(t("automation.error.loading"), "error"),
      }
    );
  };

  const handleTest = () => {
    if (!id) return;
    testMutation.mutate(
      { id, eventType: "manual" },
      {
        onSuccess: (resp) => {
          setTestResult(resp.data);
          setTestOpen(true);
        },
        onError: () => showToast(t("automation.error.loading"), "error"),
      }
    );
  };

  const handleValidate = () => {
    const payload: AutomationRuleUpdate = {
      trigger: rule.trigger,
      conditions: rule.conditions,
      actions: rule.actions,
    };
    validateMutation.mutate(payload, {
      onSuccess: (resp) => {
        if (resp.data?.errors && resp.data.errors.length > 0) {
          setValidateErrors(resp.data.errors.map((e) => e.message));
        } else {
          setValidateErrors([]);
          showToast(t("automation.flowEditor.validationPassed"), "success");
        }
      },
      onError: () => showToast(t("automation.error.loading"), "error"),
    });
  };

  const headerActions = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleValidate}
        disabled={validateMutation.isPending}
      >
        <CheckCircle2 className="w-4 h-4 mr-2" />
        {t("automation.flowEditor.validate")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleTest}
        disabled={testMutation.isPending}
      >
        <FlaskConical className="w-4 h-4 mr-2" />
        {t("automation.rules.test")}
      </Button>
      <Button
        size="sm"
        onClick={() => handleSave({})}
        disabled={updateMutation.isPending}
      >
        <Save className="w-4 h-4 mr-2" />
        {updateMutation.isPending ? t("common.saving") : t("common.save")}
      </Button>
    </div>
  );

  return (
    <PageLayout
      title={`${t("common.edit")}: ${rule.name}`}
      breadcrumb={[
        { label: t("automation.title"), href: "/automation" },
        { label: rule.name, href: `/automation/${id}` },
        { label: t("common.edit") },
      ]}
      footer={headerActions}
    >
      <div className="space-y-4">
        {/* Validation errors */}
        {validateErrors.length > 0 && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive space-y-1">
            {validateErrors.map((err, i) => (
              <p key={i}>• {err}</p>
            ))}
          </div>
        )}

        {/* Compact metadata form (2 columns) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {t("automation.form.basic")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("automation.form.name")}</Label>
              <Input
                value={resolvedName}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("automation.form.namePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("automation.form.description")}</Label>
              <Input
                value={resolvedDescription}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("automation.form.descriptionPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("automation.form.priority")}</Label>
              <Input
                type="number"
                value={resolvedPriority}
                onChange={(e) => setPriority(Number(e.target.value))}
                min={0}
                max={100}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={resolvedIsActive}
                onCheckedChange={setIsActive}
                id="is-active-toggle"
              />
              <Label htmlFor="is-active-toggle">
                {t("automation.form.active")}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Interactive flow canvas */}
        <Card className="overflow-hidden">
          <CardContent
            className="p-0"
            style={{ height: "calc(100vh - 380px)", minHeight: 400 }}
          >
            <AutomationFlowEditor
              initialRule={rule}
              readonly={false}
              onSave={handleSave}
            />
          </CardContent>
        </Card>
      </div>

      {/* Test result dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("automation.rules.test")}</DialogTitle>
            <DialogDescription>
              {t("automation.flowEditor.testResultDescription")}
            </DialogDescription>
          </DialogHeader>
          <pre className="text-xs bg-muted rounded-md p-4 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
