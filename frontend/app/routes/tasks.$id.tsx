import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { PermissionRoute } from "~/components/auth/PermissionRoute";
import { TaskDetail } from "~/features/tasks/components/TaskDetail";

export default function TaskDetailRoute() {
  return (
    <ProtectedRoute>
      <PermissionRoute permission="tasks.view" redirectTo="/unauthorized">
        <TaskDetail />
      </PermissionRoute>
    </ProtectedRoute>
  );
}
