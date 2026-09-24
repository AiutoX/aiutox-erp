import { useMemo } from "react";
import { Card } from "~/components/ui/card";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useTasks } from "../hooks/useTasks";

interface Task {
  id: string;
  assigned_to_id?: string;
  start_at?: string;
  title: string;
  estimated_duration?: number;
}

export function SchedulerView() {
  const { data: tasksData, isLoading } = useTasks({});

  const currentWeek = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { locale: es });
    const end = endOfWeek(now, { locale: es });
    return eachDayOfInterval({ start, end });
  }, []);

  // Agrupar tareas por usuario y día
  const tasksByUserAndDay = useMemo(() => {
    const tasks = (tasksData?.data || []) as Task[];
    const grouped = new Map();

    tasks.forEach((task: Task) => {
      if (!task.assigned_to_id || !task.start_at) return;

      const userId = task.assigned_to_id;
      const day = format(new Date(task.start_at), "yyyy-MM-dd");

      if (!grouped.has(userId)) {
        grouped.set(userId, new Map());
      }

      if (!grouped.get(userId).has(day)) {
        grouped.get(userId).set(day, []);
      }

      grouped.get(userId).get(day).push(task);
    });

    return grouped;
  }, [tasksData]);

  if (isLoading) {
    return <div className="text-center py-8">Cargando vista scheduler...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Vista Scheduler</h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-muted">Recurso</th>
              {currentWeek.map((day) => (
                <th
                  key={day.toISOString()}
                  className="border p-2 bg-muted min-w-[120px]"
                >
                  {format(day, "EEE dd/MM", { locale: es })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(tasksByUserAndDay.entries()).map(([userId, dayMap]) => (
              <tr key={userId}>
                <td className="border p-2 font-medium">
                  Usuario {userId.slice(0, 8)}
                </td>
                {currentWeek.map((day) => {
                  const dayKey = format(day, "yyyy-MM-dd");
                  const dayTasks = dayMap.get(dayKey) || [];

                  return (
                    <td key={day.toISOString()} className="border p-2">
                      <div className="space-y-1">
                        {dayTasks.map((task: Task) => (
                          <Card
                            key={task.id}
                            className="p-2 text-xs hover:bg-accent cursor-pointer"
                          >
                            <div className="font-medium truncate">
                              {task.title}
                            </div>
                            <div className="text-muted-foreground">
                              {task.estimated_duration
                                ? `${task.estimated_duration}min`
                                : ""}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {tasksByUserAndDay.size === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay tareas asignadas con fechas para esta semana
          </div>
        )}
      </div>
    </div>
  );
}
