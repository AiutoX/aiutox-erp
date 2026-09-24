import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { showToast } from "~/components/common/Toast";
import {
  useTaskDependencies,
  useRemoveDependency,
  type TaskDependency,
} from "../hooks/useDependencies";
import { Trash2 } from "lucide-react";

interface TaskDependenciesProps {
  taskId: string;
}

export function TaskDependencies({ taskId }: TaskDependenciesProps) {
  const { data: depsData, isLoading } = useTaskDependencies(taskId);
  const removeDependency = useRemoveDependency();

  const dependencies = depsData?.data?.dependencies || [];
  const dependents = depsData?.data?.dependents || [];

  const handleRemove = (dependencyId: string) => {
    removeDependency.mutate(
      { taskId, dependencyId },
      {
        onSuccess: () => {
          showToast("Dependencia eliminada", "success");
        },
        onError: () => {
          showToast("Error al eliminar dependencia", "error");
        },
      }
    );
  };

  const getDependencyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      finish_to_start: "Finalizar para Iniciar",
      start_to_start: "Iniciar para Iniciar",
      finish_to_finish: "Finalizar para Finalizar",
      start_to_finish: "Iniciar para Finalizar",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Cargando dependencias...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Dependencias</h4>
      </div>

      {/* Tareas de las que depende esta */}
      {dependencies.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Esta tarea depende de:</p>
          <div className="space-y-2">
            {dependencies.map((dep: TaskDependency) => (
              <Card key={dep.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Tarea {dep.depends_on_id.slice(0, 8)}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {getDependencyTypeLabel(dep.dependency_type)}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(dep.id)}
                    disabled={removeDependency.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tareas que dependen de esta */}
      {dependents.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
            Tareas que dependen de esta:
          </p>
          <div className="space-y-2">
            {dependents.map((dep: TaskDependency) => (
              <Card key={dep.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Tarea {dep.task_id.slice(0, 8)}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {getDependencyTypeLabel(dep.dependency_type)}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {dependencies.length === 0 && dependents.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay dependencias configuradas
        </p>
      )}
    </div>
  );
}
