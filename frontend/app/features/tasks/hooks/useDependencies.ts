import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "~/lib/api/client";

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_id: string;
  dependency_type: string;
  created_at: string;
}

export interface TaskDependenciesData {
  dependencies: TaskDependency[];
  dependents: TaskDependency[];
}

export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: ["task-dependencies", taskId],
    queryFn: async () => {
      const response = await apiClient.get(`/tasks/${taskId}/dependencies`);
      return response.data;
    },
    enabled: !!taskId,
  });
}

export function useAddDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      dependsOnId,
      dependencyType = "finish_to_start",
    }: {
      taskId: string;
      dependsOnId: string;
      dependencyType?: string;
    }) => {
      const response = await apiClient.post(`/tasks/${taskId}/dependencies`, {
        depends_on_id: dependsOnId,
        dependency_type: dependencyType,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["task-dependencies", variables.taskId],
      });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useRemoveDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      dependencyId,
    }: {
      taskId: string;
      dependencyId: string;
    }) => {
      const response = await apiClient.delete(
        `/tasks/${taskId}/dependencies/${dependencyId}`
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["task-dependencies", variables.taskId],
      });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
