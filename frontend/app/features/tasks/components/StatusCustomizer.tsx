/**
 * StatusCustomizer Component
 * UI para personalizar estados de tareas
 * Sprint 2 - Fase 2
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Delete01Icon,
  Edit01Icon,
  DragDropIcon,
} from "@hugeicons/core-free-icons";
import {
  useTaskStatusDefinitions,
  useCreateStatusDefinition,
  useUpdateStatusDefinition,
  useDeleteStatusDefinition,
} from "../hooks/useTaskStatusDefinitions";
import type {
  TaskStatusDefinition,
  TaskStatusDefinitionCreate,
} from "../api/status-definitions.api";
import { showToast } from "~/components/common/Toast";

const STATUS_TYPES = [
  { value: "open", label: "Abierto" },
  { value: "in_progress", label: "En Progreso" },
  { value: "closed", label: "Cerrado" },
];

const PRESET_COLORS = [
  "#9E9E9E", // Gray
  "#F44336", // Red
  "#E91E63", // Pink
  "#9C27B0", // Purple
  "#673AB7", // Deep Purple
  "#3F51B5", // Indigo
  "#2196F3", // Blue
  "#03A9F4", // Light Blue
  "#00BCD4", // Cyan
  "#009688", // Teal
  "#4CAF50", // Green
  "#8BC34A", // Light Green
  "#CDDC39", // Lime
  "#FFEB3B", // Yellow
  "#FFC107", // Amber
  "#FF9800", // Orange
  "#FF5722", // Deep Orange
  "#795548", // Brown
  "#607D8B", // Blue Gray
];

export function StatusCustomizer() {
  const { t } = useTranslation();
  const { data, isLoading } = useTaskStatusDefinitions();
  const createMutation = useCreateStatusDefinition();
  const updateMutation = useUpdateStatusDefinition();
  const deleteMutation = useDeleteStatusDefinition();

  const [showDialog, setShowDialog] = useState(false);
  const [editingStatus, setEditingStatus] =
    useState<TaskStatusDefinition | null>(null);
  const [formData, setFormData] = useState<TaskStatusDefinitionCreate>({
    name: "",
    type: "open",
    color: "#2196F3",
    order: 0,
  });

  const statuses = data?.data || [];

  const handleCreate = () => {
    setEditingStatus(null);
    setFormData({
      name: "",
      type: "open",
      color: "#2196F3",
      order: statuses.length,
    });
    setShowDialog(true);
  };

  const handleEdit = (status: TaskStatusDefinition) => {
    if (status.is_system) {
      showToast("No se pueden editar estados del sistema", "error");
      return;
    }
    setEditingStatus(status);
    setFormData({
      name: status.name,
      type: status.type,
      color: status.color,
      order: status.order,
    });
    setShowDialog(true);
  };

  const handleDelete = async (status: TaskStatusDefinition) => {
    if (status.is_system) {
      showToast("No se pueden eliminar estados del sistema", "error");
      return;
    }

    if (
      !window.confirm(
        `¿Estás seguro de eliminar el estado "${status.name}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(status.id);
      showToast("Estado eliminado correctamente", "success");
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "response" in error
          ? String(
              (
                (error as Record<string, unknown>).response as Record<
                  string,
                  Record<string, unknown>
                >
              )?.data?.message ?? ""
            )
          : "";
      showToast(
        msg || "Error al eliminar estado. Puede estar en uso por tareas.",
        "error"
      );
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingStatus) {
        await updateMutation.mutateAsync({
          statusId: editingStatus.id,
          data: formData,
        });
        showToast("Estado actualizado correctamente", "success");
      } else {
        await createMutation.mutateAsync(formData);
        showToast("Estado creado correctamente", "success");
      }
      setShowDialog(false);
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "response" in error
          ? String(
              (
                (error as Record<string, unknown>).response as Record<
                  string,
                  Record<string, unknown>
                >
              )?.data?.message ?? ""
            )
          : "";
      showToast(msg || "Error al guardar estado", "error");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary" />
            <span>{t("common.loading")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {t("tasks.statusCustomizer.title") ||
                "Personalizar Estados de Tareas"}
            </CardTitle>
            <Button onClick={handleCreate}>
              <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
              {t("tasks.statusCustomizer.addStatus") || "Agregar Estado"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {statuses.map((status) => (
              <div
                key={status.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <HugeiconsIcon
                    icon={DragDropIcon}
                    size={20}
                    className="text-muted-foreground cursor-move"
                  />
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: status.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {t(`tasks.statuses.${status.name}` as const) ||
                          status.name}
                      </span>
                      {status.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          {t("tasks.statusCustomizer.system") || "Sistema"}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {STATUS_TYPES.find((t) => t.value === status.type)
                        ?.label || status.type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(status)}
                    disabled={status.is_system}
                  >
                    <HugeiconsIcon icon={Edit01Icon} size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(status)}
                    disabled={status.is_system}
                    className="text-destructive hover:text-destructive"
                  >
                    <HugeiconsIcon icon={Delete01Icon} size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStatus
                ? t("tasks.statusCustomizer.editStatus") || "Editar Estado"
                : t("tasks.statusCustomizer.createStatus") || "Crear Estado"}
            </DialogTitle>
            <DialogDescription>
              {t("tasks.statusCustomizer.dialogDescription") ||
                "Define el nombre, tipo y color del estado."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("tasks.statusCustomizer.name") || "Nombre"}</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: En Revisión"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("tasks.statusCustomizer.type") || "Tipo"}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "open" | "in_progress" | "closed") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("tasks.statusCustomizer.color") || "Color"}</Label>
              <div className="grid grid-cols-9 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded border-2 transition-all ${
                      formData.color === color
                        ? "border-primary scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-full h-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={
                !formData.name ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {createMutation.isPending || updateMutation.isPending
                ? t("common.loading")
                : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
