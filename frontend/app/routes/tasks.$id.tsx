import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { TaskDetail } from "~/features/tasks/components/TaskDetail";

export default function TaskDetailRoute() {
  return (
    <ProtectedRoute>
      <TaskDetail />
    </ProtectedRoute>
  );
}
