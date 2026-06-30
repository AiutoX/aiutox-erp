/**
 * Task Status Manager Modal
 * Modal component for managing task statuses (CRUD operations)
 */

import { useState, useMemo } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useTaskStatuses } from "../hooks/useTaskStatuses";
import { showToast } from "~/components/common/Toast";
import {
  STATUS_TYPE_CONFIG,
  type TaskStatus,
  type TaskStatusType,
} from "../types/status.types";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface TaskStatusManagerModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TaskStatusManagerModal({
  trigger,
  open,
  onOpenChange,
}: TaskStatusManagerModalProps) {
  const { t } = useTranslation();
  const {
    statuses,
    createStatus,
    updateStatus,
    deleteStatus,
    isCreating,
    isUpdating,
    isDeleting,
    isStatusNameTaken,
    getNextOrder,
  } = useTaskStatuses();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TaskStatus | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#6b7280",
    type: "open" as TaskStatusType,
    order: 0,
  });

  // Optimizar validación para evitar pérdida de foco
  const isNameTaken = useMemo(() => {
    const trimmedName = formData.name.trim();
    return trimmedName
      ? isStatusNameTaken(trimmedName, editingStatus?.id)
      : false;
  }, [formData.name, editingStatus?.id, isStatusNameTaken]);

  const resetForm = () => {
    setFormData({
      name: "",
      color: "#6b7280",
      type: "open",
      order: 0,
    });
    setIsCreatingNew(false);
    setEditingStatus(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      return;
    }

    // Check if name is taken (excluding current status if editing)
    if (isNameTaken) {
      showToast(t("tasks.statusManager.nameTaken"), "error");
      return;
    }

    const submitData = {
      name: trimmedName,
      color: formData.color,
      type: formData.type,
      order: formData.order,
    };

    if (editingStatus) {
      updateStatus(editingStatus.id, submitData);
    } else {
      createStatus(submitData);
    }

    resetForm();
  };

  const handleEdit = (status: TaskStatus) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      color: status.color,
      type: status.type,
      order: status.order,
    });
  };

  const handleDelete = (status: TaskStatus) => {
    if (
      confirm(
        `¿Estás seguro de eliminar el estado "${status.name}"? Esta acción no se puede deshacer.`
      )
    ) {
      deleteStatus(status.id);
    }
  };

  const startCreating = () => {
    setFormData({
      name: "",
      color: "#6b7280",
      type: "open",
      order: getNextOrder(),
    });
    setIsCreatingNew(true);
    setEditingStatus(null);
  };

  const getSystemStatuses = () => {
    return statuses?.filter((status) => status.is_system) || [];
  };

  const getCustomStatuses = () => {
    return statuses?.filter((status) => !status.is_system) || [];
  };

  const StatusForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          {editingStatus
            ? t("tasks.statusManager.edit")
            : t("tasks.statusManager.create")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t("tasks.statusManager.name")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t("tasks.statusManager.namePlaceholder")}
              required
              disabled={isCreating || isUpdating}
            />
            {isNameTaken && (
              <p className="text-sm text-destructive mt-1">
                {t("tasks.statusManager.nameTaken")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="color">{t("tasks.statusManager.color")}</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="w-16 h-10"
                  disabled={isCreating || isUpdating}
                />
                <Input
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  placeholder="#6b7280"
                  disabled={isCreating || isUpdating}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="type">{t("tasks.statusManager.type")}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: TaskStatusType) =>
                  setFormData({ ...formData, type: value })
                }
                disabled={isCreating || isUpdating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_TYPE_CONFIG).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="order">{t("tasks.statusManager.order")}</Label>
            <Input
              id="order"
              type="number"
              value={formData.order}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  order: parseInt(e.target.value) || 0,
                })
              }
              min="0"
              disabled={isCreating || isUpdating}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={
                isCreating ||
                isUpdating ||
                !formData.name.trim() ||
                isStatusNameTaken(formData.name.trim(), editingStatus?.id)
              }
            >
              {isCreating || isUpdating ? t("common.saving") : t("common.save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isCreating || isUpdating}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const StatusList = ({
    statuses,
    title,
    showActions = true,
  }: {
    statuses: TaskStatus[];
    title: string;
    showActions?: boolean;
  }) => (
    <div>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {statuses.map((status) => (
          <Card key={status.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-border"
                    style={{ backgroundColor: status.color }}
                  />
                  <div>
                    <h4 className="font-medium">{status.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {STATUS_TYPE_CONFIG[status.type]?.label || status.type}
                      </Badge>
                      {status.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          {t("tasks.statuses.system")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {showActions && !status.is_system && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(status)}
                      disabled={isUpdating}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(status)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {statuses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t("tasks.statusManager.noStatuses")}
          </div>
        )}
      </div>
    </div>
  );

  const content = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t("tasks.statusManager.title")}</h2>
        <Button onClick={startCreating} disabled={isCreating}>
          <Plus className="w-4 h-4 mr-2" />
          {t("tasks.statusManager.create")}
        </Button>
      </div>

      {(isCreatingNew || editingStatus) && <StatusForm />}

      <div className="space-y-8">
        <StatusList
          statuses={getCustomStatuses()}
          title={t("tasks.statusManager.custom")}
          showActions={true}
        />
        <StatusList
          statuses={getSystemStatuses()}
          title={t("tasks.statusManager.system")}
          showActions={false}
        />
      </div>
    </div>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("tasks.statusManager.title")}</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}
