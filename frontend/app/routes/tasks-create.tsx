/**
 * Create Task Page
 * Página para crear una nueva tarea
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { PermissionRoute } from "~/components/auth/PermissionRoute";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { showToast } from "~/components/common/Toast";
import { dueDateInputValueToIso } from "~/lib/utils/taskDates";
import { useCreateTask } from "~/features/tasks/hooks/useTasks";
import { useUsers } from "~/features/users/hooks/useUsers";
import type {
  TaskPriority,
  TaskStatus,
} from "~/features/tasks/types/task.types";

export default function CreateTaskPage() {
  const navigate = useNavigate();
  const createTask = useCreateTask();
  const { users } = useUsers({ page_size: 100 });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    status: "todo" as TaskStatus,
    assigned_to_id: "",
    due_date: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTask.mutateAsync({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        assigned_to_id: formData.assigned_to_id || null,
        due_date: dueDateInputValueToIso(formData.due_date, true),
        all_day: Boolean(formData.due_date),
      });
      showToast("Tarea creada exitosamente", "success");
      void navigate("/tasks");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al crear la tarea";
      showToast(message, "error");
    }
  };

  const handleCancel = () => {
    void navigate("/tasks");
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <ProtectedRoute>
      <PermissionRoute permission="tasks.manage" redirectTo="/unauthorized">
      <PageLayout
        title="Crear Tarea"
        description="Crear una nueva tarea en el sistema"
      >
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Crear Nueva Tarea</CardTitle>
              <CardDescription>
                Agrega una nueva tarea al sistema de gestión
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => void handleSubmit(e)}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="title">Título de la Tarea</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="Ej: Revisar documentación del cliente"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                    placeholder="Describe los detalles y requisitos de la tarea"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridad</Label>
                    <Select
                      onValueChange={(value) => handleChange("priority", value)}
                      defaultValue="medium"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select
                      onValueChange={(value) => handleChange("status", value)}
                      defaultValue="todo"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">Pendiente</SelectItem>
                        <SelectItem value="in_progress">En Progreso</SelectItem>
                        <SelectItem value="on_hold">En Espera</SelectItem>
                        <SelectItem value="done">Completada</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assigned_to_id">Asignado a</Label>
                    <Select
                      onValueChange={(value) =>
                        handleChange("assigned_to_id", value)
                      }
                    >
                      <SelectTrigger id="assigned_to_id">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => handleChange("due_date", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createTask.isPending}
                  >
                    {createTask.isPending ? "Creando..." : "Crear Tarea"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={createTask.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
      </PermissionRoute>
    </ProtectedRoute>
  );
}
