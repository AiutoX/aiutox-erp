/**
 * Workflows page
 * Main page for workflows management
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { WorkflowList } from "~/features/workflows/components/WorkflowList";
import { WorkflowForm } from "~/features/workflows/components/WorkflowForm";
import { WorkflowExecutions } from "~/features/workflows/components/WorkflowExecutions";
import {
  useWorkflows,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useStartWorkflowExecution,
  useAdvanceWorkflowExecution,
  useWorkflowExecutions,
} from "~/features/workflows/hooks/useWorkflows";
import type {
  Workflow,
  WorkflowExecution,
  WorkflowCreate,
  WorkflowUpdate,
} from "~/features/workflows/types/workflow.types";

export default function WorkflowsPage() {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState("workflows");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );
  const [executionsWorkflowId, setExecutionsWorkflowId] = useState<
    string | null
  >(null);

  // Queries
  const {
    data: workflowsData,
    isLoading: workflowsLoading,
    refetch: refetchWorkflows,
  } = useWorkflows();
  const {
    data: executionsData,
    isLoading: executionsLoading,
    refetch: refetchExecutions,
  } = useWorkflowExecutions(
    executionsWorkflowId ? { workflow_id: executionsWorkflowId } : undefined
  );

  const createWorkflowMutation = useCreateWorkflow();
  const updateWorkflowMutation = useUpdateWorkflow();
  const deleteWorkflowMutation = useDeleteWorkflow();
  const startExecutionMutation = useStartWorkflowExecution();
  const advanceExecutionMutation = useAdvanceWorkflowExecution();

  const handleCreateWorkflow = () => {
    setSelectedWorkflow(null);
    setShowCreateDialog(true);
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setShowEditDialog(true);
  };

  const handleDeleteWorkflow = (workflow: Workflow) => {
    if (!confirm(t("workflows.deleteConfirm"))) return;

    deleteWorkflowMutation.mutate(workflow.id, {
      onSuccess: () => {
        void refetchWorkflows();
      },
    });
  };

  const handleExecuteWorkflow = (workflow: Workflow) => {
    startExecutionMutation.mutate(
      {
        workflowId: workflow.id,
        payload: {
          workflow_id: workflow.id,
          entity_type: null,
          entity_id: null,
          execution_data: null,
        },
      },
      {
        onSuccess: () => {
          setExecutionsWorkflowId(workflow.id);
          setCurrentTab("executions");
          void refetchExecutions();
        },
      }
    );
  };

  const handleViewWorkflow = (workflow: Workflow) => {
    setExecutionsWorkflowId(workflow.id);
    setCurrentTab("executions");
  };

  const handleAdvanceExecution = (execution: WorkflowExecution) => {
    advanceExecutionMutation.mutate(
      {
        executionId: execution.id,
        action: undefined,
      },
      {
        onSuccess: () => {
          void refetchExecutions();
        },
      }
    );
  };

  const handleWorkflowSubmit = (data: WorkflowCreate | WorkflowUpdate) => {
    if (showCreateDialog) {
      createWorkflowMutation.mutate(data as WorkflowCreate, {
        onSuccess: () => {
          setShowCreateDialog(false);
          void refetchWorkflows();
        },
      });
    } else if (showEditDialog && selectedWorkflow) {
      updateWorkflowMutation.mutate(
        { id: selectedWorkflow.id, payload: data },
        {
          onSuccess: () => {
            setShowEditDialog(false);
            setSelectedWorkflow(null);
            void refetchWorkflows();
          },
        }
      );
    }
  };

  const handleWorkflowCancel = () => {
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setSelectedWorkflow(null);
  };

  const handleBackToWorkflows = () => {
    setCurrentTab("workflows");
    setExecutionsWorkflowId(null);
  };

  const workflows = workflowsData?.data || [];
  const executions = executionsData?.data || [];

  return (
    <PageLayout
      title={t("workflows.title")}
      description={t("workflows.description")}
    >
      <div className="space-y-6">
        {/* Main Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workflows">
              {t("workflows.tabs.workflows")}
            </TabsTrigger>
            <TabsTrigger value="executions">
              {t("workflows.tabs.executions")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflows" className="space-y-6">
            <div className="flex justify-between items-center">
              <Button onClick={handleCreateWorkflow}>
                {t("workflows.createWorkflow")}
              </Button>
            </div>
            <WorkflowList
              workflows={workflows}
              loading={workflowsLoading}
              onEdit={handleEditWorkflow}
              onDelete={handleDeleteWorkflow}
              onExecute={handleExecuteWorkflow}
              onView={handleViewWorkflow}
            />
          </TabsContent>

          <TabsContent value="executions" className="space-y-6">
            {executionsWorkflowId ? (
              <>
                <div className="flex justify-between items-center">
                  <Button variant="outline" onClick={handleBackToWorkflows}>
                    {t("common.back")}
                  </Button>
                </div>
                <WorkflowExecutions
                  executions={executions}
                  loading={executionsLoading}
                  onAdvance={handleAdvanceExecution}
                />
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {t("workflows.selectWorkflow")}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Workflow Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("workflows.createWorkflow")}</DialogTitle>
            </DialogHeader>
            <WorkflowForm
              onSubmit={handleWorkflowSubmit}
              onCancel={handleWorkflowCancel}
              loading={createWorkflowMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Workflow Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("workflows.editWorkflow")}</DialogTitle>
            </DialogHeader>
            <WorkflowForm
              workflow={selectedWorkflow || undefined}
              onSubmit={handleWorkflowSubmit}
              onCancel={handleWorkflowCancel}
              loading={updateWorkflowMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
