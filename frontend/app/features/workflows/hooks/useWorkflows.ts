/**
 * Workflows hooks
 * Provides TanStack Query hooks for workflows module
 * Following frontend-api.md rules
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  listWorkflowSteps,
  createWorkflowStep,
  startWorkflowExecution,
  listWorkflowExecutions,
  getWorkflowExecution,
  advanceWorkflowExecution,
} from "../api/workflows.api";
import type {
  WorkflowUpdate,
  WorkflowListParams,
  WorkflowStepCreate,
  WorkflowExecutionCreate,
  WorkflowExecutionListParams,
} from "../types/workflow.types";

// Query hooks
export function useWorkflows(params?: WorkflowListParams) {
  return useQuery({
    queryKey: ["workflows", params],
    queryFn: () => listWorkflows(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ["workflows", id],
    queryFn: () => getWorkflow(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!id,
  });
}

export function useWorkflowSteps(workflowId: string) {
  return useQuery({
    queryKey: ["workflows", workflowId, "steps"],
    queryFn: () => listWorkflowSteps(workflowId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!workflowId,
  });
}

export function useWorkflowExecutions(params?: WorkflowExecutionListParams) {
  return useQuery({
    queryKey: ["workflow-executions", params],
    queryFn: () => listWorkflowExecutions(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
  });
}

export function useWorkflowExecution(executionId: string) {
  return useQuery({
    queryKey: ["workflow-executions", executionId],
    queryFn: () => getWorkflowExecution(executionId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
    enabled: !!executionId,
  });
}

// Mutation hooks
export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (error) => {
      console.error("Failed to create workflow:", error);
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WorkflowUpdate }) =>
      updateWorkflow(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflows", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (error) => {
      console.error("Failed to update workflow:", error);
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (error) => {
      console.error("Failed to delete workflow:", error);
    },
  });
}

export function useCreateWorkflowStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workflowId,
      payload,
    }: {
      workflowId: string;
      payload: WorkflowStepCreate;
    }) => createWorkflowStep(workflowId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflows", variables.workflowId, "steps"],
      });
    },
    onError: (error) => {
      console.error("Failed to create workflow step:", error);
    },
  });
}

export function useStartWorkflowExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workflowId,
      payload,
    }: {
      workflowId: string;
      payload: WorkflowExecutionCreate;
    }) => startWorkflowExecution(workflowId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-executions"] });
    },
    onError: (error) => {
      console.error("Failed to start workflow execution:", error);
    },
  });
}

export function useAdvanceWorkflowExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      executionId,
      action,
    }: {
      executionId: string;
      action?: string;
    }) => advanceWorkflowExecution(executionId, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflow-executions", variables.executionId],
      });
      queryClient.invalidateQueries({ queryKey: ["workflow-executions"] });
    },
    onError: (error) => {
      console.error("Failed to advance workflow execution:", error);
    },
  });
}
