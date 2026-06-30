import { useParams } from "react-router";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { TaskForm } from "~/features/tasks/components/TaskForm";

export default function TaskEditRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <ProtectedRoute>
      <TaskForm taskId={id} />
    </ProtectedRoute>
  );
}
