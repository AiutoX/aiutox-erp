/**
 * Task Detail Component
 * Displays detailed information about a single task
 */

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  ArrowLeftIcon,
  DownloadIcon,
  UploadIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MessageCircle } from "lucide-react";
import { ContextualAssistant } from "~/features/automation/ai/components/ContextualAssistant";
import { useTask, useUpdateTask } from "~/features/tasks/hooks/useTasks";
import { SubtaskTree } from "~/features/tasks/components/SubtaskTree";
import { TimeTracker } from "~/features/tasks/components/TimeTracker";
import type {
  TaskStatus,
  TaskPriority,
} from "~/features/tasks/types/task.types";

export function TaskDetail() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const navigate = useNavigate();
  const { data: taskResponse, isLoading, error } = useTask(id);
  const updateTaskMutation = useUpdateTask();
  const [assistantOpen, setAssistantOpen] = useState(false);

  const task = taskResponse?.data;

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case "todo":
        return DownloadIcon;
      case "in_progress":
        return UploadIcon;
      case "done":
        return DownloadIcon;
      case "cancelled":
        return UploadIcon;
      case "on_hold":
        return UploadIcon;
      default:
        return DownloadIcon;
    }
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case "todo":
        return "bg-gray-100 text-gray-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "done":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "on_hold":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case "low":
        return "bg-gray-100 text-gray-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "urgent":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Tasks" loading>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-6" />
          <div className="h-20 bg-gray-200 rounded mb-4" />
        </div>
      </PageLayout>
    );
  }

  if (error || !task) {
    return (
      <PageLayout title="Tasks" error={error || "Task not found"}>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Task not found</p>
          <Button onClick={() => navigate("/tasks")}>Back</Button>
        </div>
      </PageLayout>
    );
  }

  const StatusIcon = getStatusIcon(task.status);
  const UserIcon = UploadIcon;
  const CalendarIcon = UploadIcon;
  const ClockIcon = DownloadIcon;
  const CheckIcon = DownloadIcon;

  return (
    <PageLayout
      title={task.title}
      // subtitle="Task Details" // Property not supported by PageLayout
      breadcrumb={[{ label: "Tasks", href: "/tasks" }, { label: task.title }]}
    >
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/tasks")}>
            <HugeiconsIcon icon={ArrowLeftIcon} size={16} className="mr-2" />
            Back
          </Button>
          <Button asChild>
            <Link to={`/tasks/${task.id}/edit`}>
              <HugeiconsIcon icon={DownloadIcon} size={16} className="mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setAssistantOpen((v) => !v)}>
            <MessageCircle size={16} className="mr-2" />
            {t("ai.contextual.ask_ai")}
          </Button>
        </div>

        {/* Contextual AI Assistant */}
        <ContextualAssistant
          context={{ module: "tasks", record_id: task.id, record_type: "task" }}
          autoQuery={`Summarize this task: ${task.title}`}
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
        />

        {/* Main Info */}
        <Card>
          <CardHeader>
            <CardTitle>Main Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusColor(task.status)}>
                    <HugeiconsIcon
                      icon={StatusIcon}
                      size={16}
                      className="mr-1"
                    />
                    {task.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Priority
                </label>
                <div className="mt-1">
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Assigned To
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <HugeiconsIcon
                    icon={UserIcon}
                    size={16}
                    className="text-gray-500"
                  />
                  <span>{task.assigned_to_id || "-"}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <HugeiconsIcon
                    icon={CalendarIcon}
                    size={16}
                    className="text-gray-500"
                  />
                  <span>
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString()
                      : "No due date"}
                  </span>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-gray-700">
                Description
              </label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="whitespace-pre-wrap">{task.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist */}
        {task.checklist && task.checklist.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {task.checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2 border rounded"
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        item.completed
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300"
                      }`}
                    >
                      {item.completed && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <span
                      className={`flex-1 ${item.completed ? "line-through text-gray-500" : ""}`}
                    >
                      {item.title}
                    </span>
                    {item.completed_at && (
                      <span className="text-xs text-gray-500">
                        {new Date(item.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subtasks */}
        <Card>
          <CardHeader>
            <CardTitle>{t("tasks.subtasks.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SubtaskTree
              task={task}
              level={0}
              onToggleComplete={(taskId, completed) => {
                updateTaskMutation.mutate({
                  id: taskId,
                  payload: { status: completed ? "done" : "todo" },
                });
              }}
              onTaskClick={(sub) => navigate(`/tasks/${sub.id}`)}
            />
          </CardContent>
        </Card>

        {/* Time Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>{t("tasks.timeTracking.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeTracker taskId={task.id} />
          </CardContent>
        </Card>

        {/* Metadata */}
        {task.metadata && Object.keys(task.metadata).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(task.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b">
                    <span className="font-medium">{key}:</span>
                    <span className="text-gray-600">
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <Card>
          <CardHeader>
            <CardTitle>Timestamps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Created At
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <HugeiconsIcon
                    icon={ClockIcon}
                    size={16}
                    className="text-gray-500"
                  />
                  <span>{new Date(task.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Updated At
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <HugeiconsIcon
                    icon={ClockIcon}
                    size={16}
                    className="text-gray-500"
                  />
                  <span>{new Date(task.updated_at).toLocaleString()}</span>
                </div>
              </div>
              {task.completed_at && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Completed At
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <HugeiconsIcon
                      icon={CheckIcon}
                      size={16}
                      className="text-green-500"
                    />
                    <span>{new Date(task.completed_at).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
