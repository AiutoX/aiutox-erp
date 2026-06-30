/**
 * Tasks page
 * Main page for tasks management
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { PageLayout } from "~/components/layout/PageLayout";
import { CardContent } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TaskAdvancedFilter } from "~/features/tasks/components/TaskList";
import { TaskCalendar } from "~/features/tasks/components/TaskCalendar";
import { TaskInbox } from "~/features/tasks/components/TaskInbox";
import { TaskQuickAdd } from "~/features/tasks/components/TaskQuickAdd";
import { TaskEdit } from "~/features/tasks/components/TaskEdit";
import { BoardViewWrapper } from "~/features/tasks/components/BoardViewWrapper";
import { TasksStatisticsView } from "~/features/tasks/components/TasksStatisticsView";
import { showToast } from "~/components/common/Toast";
import {
  useMyTasks,
  useUpdateTask,
  useDeleteTask,
  useTaskModuleSettings,
} from "~/features/tasks/hooks/useTasks";
import type { Task } from "~/features/tasks/types/task.types";

export default function TasksPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("list");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { data: settingsData } = useTaskModuleSettings();
  const settings = settingsData?.data;

  const tabs = useMemo(
    () => [
      {
        value: "inbox",
        label: t("tasks.tabs.inbox") || "Inbox",
        enabled: settings?.inbox_enabled ?? true,
      },
      {
        value: "list",
        label: t("tasks.tabs.list"),
        enabled: settings?.list_enabled ?? true,
      },
      {
        value: "board-pro",
        label: t("tasks.tabs.taskBoard"),
        enabled: settings?.board_enabled ?? true,
      },
      {
        value: "calendar",
        label: t("tasks.tabs.calendar"),
        enabled: settings?.calendar_enabled ?? true,
      },
      {
        value: "stats",
        label: t("tasks.tabs.stats"),
        enabled: settings?.stats_enabled ?? true,
      },
    ],
    [settings, t]
  );

  const enabledTabs = useMemo(() => tabs.filter((tab) => tab.enabled), [tabs]);

  useEffect(() => {
    if (!enabledTabs.length) {
      return;
    }

    const isActiveEnabled = enabledTabs.some((tab) => tab.value === activeTab);
    if (!isActiveEnabled) {
      setActiveTab(enabledTabs[0]?.value ?? "list");
    }
  }, [activeTab, enabledTabs]);

  // Query hooks
  const {
    data: tasksData,
    isLoading: loading,
    error,
    refetch,
  } = useMyTasks({
    page: 1,
    page_size: 20,
  });

  // @ts-expect-error - Will be used when task editing is implemented
  const _updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const handleDeleteTask = (task: Task) => {
    if (window.confirm(t("tasks.deleteConfirm"))) {
      deleteTaskMutation.mutate(task.id, {
        onSuccess: () => {
          showToast(t("tasks.deleteSuccess"), "success");
          void refetch();
        },
      });
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const tasks = tasksData?.data || [];

  return (
    <ProtectedRoute>
      <PageLayout
        title={t("tasks.title")}
        description={t("tasks.description")}
        loading={loading}
        error={error}
      >
        <div className="space-y-6">
          {/* TaskQuickAdd Modal */}
          <TaskQuickAdd
            open={isQuickAddOpen}
            onOpenChange={setIsQuickAddOpen}
            defaultMode="task"
            onTaskCreated={() => {
              setIsQuickAddOpen(false);
              void refetch();
            }}
          />

          <TaskEdit
            task={editingTask}
            open={Boolean(editingTask)}
            onOpenChange={(open) => {
              if (!open) {
                setEditingTask(null);
              }
            }}
            onTaskUpdated={() => {
              // No cerrar el modal automáticamente, solo refrescar los datos
              void refetch();
            }}
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList
              className="grid w-full"
              style={{
                gridTemplateColumns: `repeat(${Math.max(
                  enabledTabs.length,
                  1
                )}, minmax(0, 1fr))`,
              }}
            >
              {enabledTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {settings?.inbox_enabled !== false && (
              <TabsContent value="inbox" className="mt-6">
                {/* Task Inbox */}
                <CardContent className="space-y-4">
                  <TaskInbox onTaskProcessed={() => void refetch()} />
                </CardContent>
              </TabsContent>
            )}

            {settings?.list_enabled !== false && (
              <TabsContent value="list" className="mt-6">
                {/* Task List */}
                <CardContent className="space-y-4">
                  <TaskAdvancedFilter
                    tasks={tasks}
                    loading={loading}
                    onRefresh={() => void refetch()}
                    onTaskDelete={handleDeleteTask}
                    onTaskCreate={() => setIsQuickAddOpen(true)}
                  />
                </CardContent>
              </TabsContent>
            )}

            {settings?.board_enabled !== false && (
              <TabsContent value="board-pro" className="mt-6">
                {/* Board Pro - Advanced Kanban */}
                <CardContent className="space-y-4">
                  <BoardViewWrapper
                    tasks={tasks}
                    loading={loading}
                    onTaskClick={handleEditTask}
                    onRefresh={() => void refetch()}
                  />
                </CardContent>
              </TabsContent>
            )}

            {settings?.calendar_enabled !== false && (
              <TabsContent value="calendar" className="mt-6">
                {/* Task Calendar */}
                <CardContent className="space-y-4">
                  <TaskCalendar
                    tasks={tasks}
                    loading={loading}
                    onRefresh={() => void refetch()}
                    onTaskClick={handleEditTask}
                    onTaskCreate={() => setIsQuickAddOpen(true)}
                  />
                </CardContent>
              </TabsContent>
            )}

            {settings?.stats_enabled !== false && (
              <TabsContent value="stats" className="mt-6">
                <TasksStatisticsView />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </PageLayout>
    </ProtectedRoute>
  );
}
