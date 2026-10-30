/**
 * Automation hooks
 * TanStack Query hooks for Automation module
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AutomationRuleCreate,
  AutomationRuleUpdate,
  AutomationExecutionCreate,
  AutomationRuleListParams,
} from "../types/automation.types";
import {
  listAutomationRules,
  getAutomationRule,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  executeAutomationRule,
  listAutomationExecutions,
  getAutomationExecution,
  testAutomationRule,
  getAutomationStats,
  enableAutomationRule,
  disableAutomationRule,
  cloneAutomationRule,
  getTriggerTypes,
  getActionTypes,
  getConditionOperators,
  validateAutomationRule,
  agentRunApi,
} from "../api/automation.api";

// Query keys
export const automationKeys = {
  all: ["automation"] as const,
  rules: () => [...automationKeys.all, "rules"] as const,
  ruleList: (params?: AutomationRuleListParams) =>
    [...automationKeys.rules(), "list", params] as const,
  rule: (id: string) => [...automationKeys.rules(), "detail", id] as const,
  executions: (id: string) =>
    [...automationKeys.rule(id), "executions"] as const,
  execution: (id: string) => [...automationKeys.all, "executions", id] as const,
  stats: () => [...automationKeys.all, "stats"] as const,
  triggerTypes: () => [...automationKeys.all, "trigger-types"] as const,
  actionTypes: () => [...automationKeys.all, "action-types"] as const,
  conditionOperators: () =>
    [...automationKeys.all, "condition-operators"] as const,
  agentRuns: () => [...automationKeys.all, "agent-runs"] as const,
  agentRun: (id: string) => [...automationKeys.all, "agent-runs", id] as const,
};

/**
 * Automation Rules hooks
 */

/**
 * Hook for listing automation rules with pagination and filters
 * @param params - Query parameters
 * @returns Query result with automation rules list
 */
export function useAutomationRules(params?: AutomationRuleListParams) {
  return useQuery({
    queryKey: automationKeys.ruleList(params),
    queryFn: () => listAutomationRules(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting a single automation rule by ID
 * @param id - Rule ID
 * @returns Query result with rule details
 */
export function useAutomationRule(id: string) {
  return useQuery({
    queryKey: automationKeys.rule(id),
    queryFn: () => getAutomationRule(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for creating a new automation rule
 * @returns Mutation result for rule creation
 */
export function useCreateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AutomationRuleCreate) =>
      createAutomationRule(payload),
    onSuccess: () => {
      // Invalidate rules list cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.rules() });
      // Invalidate stats cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.stats() });
    },
  });
}

/**
 * Hook for updating an existing automation rule
 * @returns Mutation result for rule update
 */
export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: AutomationRuleUpdate;
    }) => updateAutomationRule(id, payload),
    onSuccess: (_, { id }) => {
      // Invalidate specific rule cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.rule(id) });
      // Invalidate rules list cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.rules() });
      // Invalidate stats cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.stats() });
    },
  });
}

/**
 * Hook for deleting an automation rule
 * @returns Mutation result for rule deletion
 */
export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAutomationRule(id),
    onSuccess: () => {
      // Invalidate rules list cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.rules() });
      // Invalidate stats cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.stats() });
    },
  });
}

/**
 * Hook for executing an automation rule
 * @returns Mutation result for rule execution
 */
export function useExecuteAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: AutomationExecutionCreate;
    }) => executeAutomationRule(id, payload),
    onSuccess: (_, { id }) => {
      // Invalidate executions cache for this rule
      void queryClient.invalidateQueries({
        queryKey: automationKeys.executions(id),
      });
      // Invalidate stats cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.stats() });
    },
  });
}

/**
 * Hook for listing executions for a rule
 * @param id - Rule ID
 * @param params - Query parameters for pagination
 * @returns Query result with executions list
 */
export function useAutomationExecutions(
  id: string,
  params?: { page?: number; page_size?: number }
) {
  return useQuery({
    queryKey: automationKeys.executions(id),
    queryFn: () => listAutomationExecutions(id, params),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for getting a single execution by ID
 * @param id - Execution ID
 * @returns Query result with execution details
 */
export function useAutomationExecution(id: string) {
  return useQuery({
    queryKey: automationKeys.execution(id),
    queryFn: () => getAutomationExecution(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for testing an automation rule
 * @returns Mutation result for rule testing
 */
export function useTestAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      eventType,
      payload,
    }: {
      id: string;
      eventType: string;
      payload?: Record<string, unknown>;
    }) => testAutomationRule(id, { event_type: eventType, payload }),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: automationKeys.rule(id) });
    },
  });
}

/**
 * Hook for getting automation statistics
 * @returns Query result with automation stats
 */
export function useAutomationStats() {
  return useQuery({
    queryKey: automationKeys.stats(),
    queryFn: () => getAutomationStats(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook for enabling an automation rule
 * @returns Mutation result for enabling rule
 */
export function useEnableAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => enableAutomationRule(id),
    onSuccess: (_, variables) => {
      // Invalidate specific rule cache
      void queryClient.invalidateQueries({
        queryKey: automationKeys.rule(variables),
      });
      // Invalidate rules list cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.rules() });
      // Invalidate stats cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.stats() });
    },
  });
}

/**
 * Hook for disabling an automation rule
 * @returns Mutation result for disabling rule
 */
export function useDisableAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => disableAutomationRule(id),
    onSuccess: (_, variables) => {
      // Invalidate specific rule cache
      void queryClient.invalidateQueries({
        queryKey: automationKeys.rule(variables),
      });
      // Invalidate rules list cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.rules() });
      // Invalidate stats cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.stats() });
    },
  });
}

/**
 * Hook for cloning an automation rule
 * @returns Mutation result for cloning rule
 */
export function useCloneAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { name: string; description?: string };
    }) => cloneAutomationRule(id, payload),
    onSuccess: () => {
      // Invalidate rules list cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.rules() });
      // Invalidate stats cache
      void queryClient.invalidateQueries({ queryKey: automationKeys.stats() });
    },
  });
}

/**
 * Hook for getting available trigger types
 * @returns Query result with trigger types
 */
export function useTriggerTypes() {
  return useQuery({
    queryKey: automationKeys.triggerTypes(),
    queryFn: () => getTriggerTypes(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for getting available action types
 * @returns Query result with action types
 */
export function useActionTypes() {
  return useQuery({
    queryKey: automationKeys.actionTypes(),
    queryFn: () => getActionTypes(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for getting available condition operators
 * @returns Query result with condition operators
 */
export function useConditionOperators() {
  return useQuery({
    queryKey: automationKeys.conditionOperators(),
    queryFn: () => getConditionOperators(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for validating automation rule configuration
 * @returns Mutation result for validation
 */
export function useValidateAutomationRule() {
  return useMutation({
    mutationFn: (payload: AutomationRuleCreate | AutomationRuleUpdate) =>
      validateAutomationRule(payload),
  });
}

// ---------------------------------------------------------------------------
// Agent Run hooks (P5-F02)
// ---------------------------------------------------------------------------

export function useAgentRuns(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: [...automationKeys.agentRuns(), "list", params] as const,
    queryFn: () => agentRunApi.list(params),
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
  });
}

export function useAgentRunDetail(runId: string | null) {
  return useQuery({
    queryKey: automationKeys.agentRun(runId!),
    queryFn: () => agentRunApi.getDetail(runId!),
    enabled: !!runId,
    staleTime: 10 * 1000,
  });
}

export function useStartAgentRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { goal: string; context?: Record<string, unknown> }) =>
      agentRunApi.start(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: automationKeys.agentRuns(),
      });
    },
  });
}

export function useCancelAgentRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => agentRunApi.cancel(runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: automationKeys.agentRuns(),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Agent Run mutations (P5-F01)
// ---------------------------------------------------------------------------

export function useConfirmAgentRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => agentRunApi.confirm(runId),
    onSuccess: (_, runId) => {
      void queryClient.invalidateQueries({
        queryKey: automationKeys.agentRun(runId),
      });
      void queryClient.invalidateQueries({
        queryKey: automationKeys.agentRuns(),
      });
    },
  });
}

export function useRejectAgentRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, feedback }: { runId: string; feedback: string }) =>
      agentRunApi.reject(runId, feedback),
    onSuccess: (_, { runId }) => {
      void queryClient.invalidateQueries({
        queryKey: automationKeys.agentRun(runId),
      });
      void queryClient.invalidateQueries({
        queryKey: automationKeys.agentRuns(),
      });
    },
  });
}
