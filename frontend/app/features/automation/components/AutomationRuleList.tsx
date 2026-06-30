/**
 * Automation Rule List component
 * Displays a list of automation rules with actions
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { DataTable } from "~/components/common/DataTable";
import type { DataTableColumn } from "~/components/common";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { EmptyState } from "~/components/common/EmptyState";
import { LoadingState } from "~/components/common/LoadingState";
import { ErrorState } from "~/components/common/ErrorState";
import { toast } from "sonner";
import {
  useAutomationRules,
  useDeleteAutomationRule,
  useExecuteAutomationRule,
  useEnableAutomationRule,
  useDisableAutomationRule,
  useCloneAutomationRule,
  useTestAutomationRule,
} from "../hooks/useAutomation";
import type { AutomationRule } from "../types/automation.types";

interface AutomationRuleListProps {
  onCreate?: () => void;
  onEdit?: (rule: AutomationRule) => void;
  onView?: (rule: AutomationRule) => void;
  onExecutions?: (rule: AutomationRule) => void;
}

export function AutomationRuleList({
  onCreate,
  onEdit,
  onView,
  onExecutions,
}: AutomationRuleListProps) {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);

  // Queries
  const { data: rulesData, isLoading, error, refetch } = useAutomationRules();
  const deleteRuleMutation = useDeleteAutomationRule();
  const executeRuleMutation = useExecuteAutomationRule();
  const enableRuleMutation = useEnableAutomationRule();
  const disableRuleMutation = useDisableAutomationRule();
  const cloneRuleMutation = useCloneAutomationRule();
  const testRuleMutation = useTestAutomationRule();

  const rules = rulesData?.data || [];
  const meta = rulesData?.meta;

  const handleDelete = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedRule) return;

    try {
      await deleteRuleMutation.mutateAsync(selectedRule.id);
      setShowDeleteDialog(false);
      setSelectedRule(null);
      refetch();
    } catch (error) {
      toast.error(t("automation.rules.delete_error"));
    }
  };

  const handleExecute = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setShowExecuteDialog(true);
  };

  const confirmExecute = async () => {
    if (!selectedRule) return;

    try {
      await executeRuleMutation.mutateAsync({
        id: selectedRule.id,
        payload: { rule_id: selectedRule.id, trigger_data: {} },
      });
      setShowExecuteDialog(false);
      setSelectedRule(null);
      refetch();
    } catch (error) {
      toast.error(t("automation.rules.execute_error"));
    }
  };

  const handleToggleActive = async (rule: AutomationRule) => {
    try {
      if (rule.is_active) {
        await disableRuleMutation.mutateAsync(rule.id);
      } else {
        await enableRuleMutation.mutateAsync(rule.id);
      }
      refetch();
    } catch (error) {
      toast.error(t("automation.rules.toggle_error"));
    }
  };

  const handleClone = async (rule: AutomationRule) => {
    try {
      await cloneRuleMutation.mutateAsync({
        id: rule.id,
        payload: {
          name: `${rule.name} (Copy)`,
          description: rule.description,
        },
      });
      refetch();
    } catch (error) {
      toast.error(t("automation.rules.clone_error"));
    }
  };

  const handleTest = async (rule: AutomationRule) => {
    try {
      await testRuleMutation.mutateAsync({
        id: rule.id,
        eventType: rule.trigger?.event_type ?? "manual",
        payload: {},
      });
    } catch (error) {
      toast.error(t("automation.rules.test_error"));
    }
  };

  // Table columns
  const columns: DataTableColumn<AutomationRule>[] = [
    {
      key: "name",
      header: t("automation.rules.table.name"),
      cell: (rule: AutomationRule) => (
        <div>
          <div className="font-medium">{rule.name}</div>
          <div className="text-sm text-gray-500">{rule.description}</div>
        </div>
      ),
    },
    {
      key: "trigger",
      header: t("automation.rules.table.trigger"),
      cell: (rule: AutomationRule) => (
        <div>
          <Badge variant="outline">{rule.trigger.type}</Badge>
          {rule.trigger.event_type && (
            <div className="text-sm text-gray-500 mt-1">
              {rule.trigger.event_type}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "conditions",
      header: t("automation.rules.table.conditions"),
      cell: (rule: AutomationRule) => (
        <Badge variant="secondary">{rule.conditions.length}</Badge>
      ),
    },
    {
      key: "actions_count",
      header: t("automation.rules.table.actions"),
      cell: (rule: AutomationRule) => (
        <Badge variant="secondary">{rule.actions.length}</Badge>
      ),
    },
    {
      key: "priority",
      header: t("automation.rules.table.priority"),
      cell: (rule: AutomationRule) => (
        <Badge variant="outline">{rule.priority}</Badge>
      ),
    },
    {
      key: "status",
      header: t("automation.rules.table.status"),
      cell: (rule: AutomationRule) => (
        <Badge variant={rule.is_active ? "default" : "secondary"}>
          {rule.is_active
            ? t("automation.status.active")
            : t("automation.status.inactive")}
        </Badge>
      ),
    },
    {
      key: "row_actions",
      header: t("automation.rules.table.actions"),
      cell: (rule: AutomationRule) => (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => onView?.(rule)}>
            {t("common.view")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit?.(rule)}>
            {t("common.edit")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExecutions?.(rule)}
          >
            {t("automation.rules.executions")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTest(rule)}
            disabled={testRuleMutation.isPending}
          >
            {t("automation.rules.test")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleExecute(rule)}
            disabled={executeRuleMutation.isPending}
          >
            {t("automation.rules.execute")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleClone(rule)}
            disabled={cloneRuleMutation.isPending}
          >
            {t("automation.rules.clone")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(rule)}
            disabled={
              enableRuleMutation.isPending || disableRuleMutation.isPending
            }
          >
            {rule.is_active
              ? t("automation.rules.disable")
              : t("automation.rules.enable")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(rule)}
            disabled={deleteRuleMutation.isPending}
            className="text-red-600 hover:text-red-700"
          >
            {t("common.delete")}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : t("automation.error.loading")
        }
      />
    );
  }

  if (rules.length === 0) {
    return (
      <EmptyState
        title={t("automation.rules.empty.title")}
        description={t("automation.rules.empty.description")}
        action={
          onCreate && (
            <Button onClick={onCreate}>{t("automation.rules.create")}</Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("automation.rules.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rules}
            columns={columns}
            pagination={{
              page: meta?.page || 1,
              pageSize: meta?.page_size || 20,
              total: meta?.total || 0,
              onPageChange: () => {
                refetch();
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("automation.rules.delete.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{t("automation.rules.delete.confirm")}</p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteRuleMutation.isPending}
              >
                {deleteRuleMutation.isPending
                  ? t("common.deleting")
                  : t("common.delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Execute Confirmation Dialog */}
      <Dialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("automation.rules.execute.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{t("automation.rules.execute.confirm")}</p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowExecuteDialog(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={confirmExecute}
                disabled={executeRuleMutation.isPending}
              >
                {executeRuleMutation.isPending
                  ? t("automation.rules.executing")
                  : t("automation.rules.execute")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
