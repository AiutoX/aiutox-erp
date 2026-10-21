import { useParams } from "react-router";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { PermissionRoute } from "~/components/auth/PermissionRoute";
import { TaskForm } from "~/features/tasks/components/TaskForm";

export default function TaskEditRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <ProtectedRoute>
      <PermissionRoute permission="tasks.manage" redirectTo="/unauthorized">
        <TaskForm taskId={id} />
      </PermissionRoute>
    </ProtectedRoute>
  );
}
