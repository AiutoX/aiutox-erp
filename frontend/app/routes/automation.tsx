/**
 * Automation page
 * Main page for automation rules management
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AutomationRuleList } from "~/features/automation/components/AutomationRuleList";
import { AutomationRuleForm } from "~/features/automation/components/AutomationRuleForm";
import { AutomationExecutionList } from "~/features/automation/components/AutomationExecutionList";
import {
  useCreateAutomationRule,
  useUpdateAutomationRule,
} from "~/features/automation/hooks/useAutomation";
import type { AutomationRule } from "~/features/automation/types/automation.types";

export default function AutomationPage() {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState("rules");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [_editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [executionsRuleId, setExecutionsRuleId] = useState<string | null>(null);

  // Queries
  const createRuleMutation = useCreateAutomationRule();
  const updateRuleMutation = useUpdateAutomationRule();

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowCreateDialog(true);
  };

  const handleEditRule = (rule: AutomationRule) => {
    setEditingRule(rule);
    setShowEditDialog(true);
  };

  const handleViewRule = (rule: AutomationRule) => {
    setEditingRule(rule);
    // Could open a detail view in the future
  };

  const handleExecutions = (rule: AutomationRule) => {
    setExecutionsRuleId(rule.id);
    setCurrentTab("executions");
  };

  const handleRuleSubmit = (_rule: AutomationRule) => {
    if (showCreateDialog) {
      setShowCreateDialog(false);
    } else if (showEditDialog) {
      setShowEditDialog(false);
      setEditingRule(null);
    }
    setCurrentTab("rules");
  };

  const handleRuleCancel = () => {
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setEditingRule(null);
  };

  const handleBackToRules = () => {
    setCurrentTab("rules");
    setExecutionsRuleId(null);
  };

  return (
    <PageLayout
      title={t("automation.title")}
      description={t("automation.description")}
    >
      <div className="space-y-6">
        {/* Main Tabs */}
        <Tabs
          value={currentTab}
          onValueChange={setCurrentTab}
          className="w-full"
        >
          <div className="flex items-center justify-between pb-4 border-b">
            <TabsList className="grid w-full max-w-sm grid-cols-2">
              <TabsTrigger value="rules">
                {t("automation.tabs.rules")}
              </TabsTrigger>
              <TabsTrigger value="executions">
                {t("automation.tabs.executions")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="rules" className="space-y-6 mt-6">
            <AutomationRuleList
              onCreate={handleCreateRule}
              onEdit={handleEditRule}
              onView={handleViewRule}
              onExecutions={handleExecutions}
            />
          </TabsContent>

          <TabsContent value="executions" className="space-y-6 mt-6">
            {executionsRuleId ? (
              <AutomationExecutionList
                ruleId={executionsRuleId}
                onBack={handleBackToRules}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">
                  {t("automation.executions.empty.description")}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Rule Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {t("automation.rules.create")}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <AutomationRuleForm
                onSubmit={handleRuleSubmit}
                onCancel={handleRuleCancel}
                loading={createRuleMutation.isPending}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Rule Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {t("automation.rules.edit")}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <AutomationRuleForm
                rule={_editingRule || undefined}
                onSubmit={handleRuleSubmit}
                onCancel={handleRuleCancel}
                loading={updateRuleMutation.isPending}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
