/**
 * Approvals hooks
 * Provides TanStack Query hooks for approvals module
 * Aligned with backend schemas from backend/app/schemas/approval.py
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listApprovalFlows,
  getApprovalFlow,
  createApprovalFlow,
  updateApprovalFlow,
  deleteApprovalFlow,
  updateFlowSteps,
  listApprovalRequests,
  getApprovalRequest,
  createApprovalRequest,
  cancelApprovalRequest,
  approveRequest,
  rejectRequest,
  delegateRequest,
  getApprovalStats,
  getRequestTimeline,
  getRequestWidgetData,
  getEntityApprovalStatus,
  checkUserCanApprove,
} from "~/features/approvals/api/approvals.api";
import type {
  ApprovalFlowUpdate,
  ApproveRequestRequest,
  RejectRequestRequest,
  DelegateRequestRequest,
  ListApprovalFlowsParams,
  ListApprovalRequestsParams,
  ApprovalStepCreate,
} from "~/features/approvals/types/approval.types";

// Approval Flow Query hooks
export function useApprovalFlows(params?: ListApprovalFlowsParams) {
  return useQuery({
    queryKey: ["approval-flows", params],
    queryFn: () => listApprovalFlows(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    networkMode: "online",
  });
}

export function useApprovalFlow(id: string) {
  return useQuery({
    queryKey: ["approval-flows", id],
    queryFn: () => getApprovalFlow(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    enabled: !!id,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    networkMode: "online",
  });
}

// Approval Request Query hooks
export function useApprovalRequests(params?: ListApprovalRequestsParams) {
  return useQuery({
    queryKey: ["approval-requests", params],
    queryFn: () => listApprovalRequests(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    networkMode: "online",
  });
}

export function useApprovalRequest(id: string) {
  return useQuery({
    queryKey: ["approval-requests", id],
    queryFn: () => getApprovalRequest(id),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!id,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    networkMode: "online",
  });
}

export function useApprovalStats() {
  return useQuery({
    queryKey: ["approval-stats"],
    queryFn: getApprovalStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    networkMode: "online",
  });
}

export function useRequestTimeline(requestId: string) {
  return useQuery({
    queryKey: ["approval-timeline", requestId],
    queryFn: () => getRequestTimeline(requestId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!requestId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    networkMode: "online",
  });
}

// Approval Flow Mutation hooks
export function useCreateApprovalFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createApprovalFlow,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["approval-flows"] });
    },
    onError: (error) => {
      console.error("Failed to create approval flow:", error);
    },
  });
}

export function useUpdateApprovalFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApprovalFlowUpdate }) =>
      updateApprovalFlow(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["approval-flows"] });
      void queryClient.invalidateQueries({
        queryKey: ["approval-flows", variables.id],
      });
    },
    onError: (error) => {
      console.error("Failed to update approval flow:", error);
    },
  });
}

export function useDeleteApprovalFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteApprovalFlow,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["approval-flows"] });
    },
    onError: (error) => {
      console.error("Failed to delete approval flow:", error);
    },
  });
}

export function useUpdateFlowSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      flowId,
      steps,
    }: {
      flowId: string;
      steps: ApprovalStepCreate[];
    }) => updateFlowSteps(flowId, steps),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["approval-flows"] });
      void queryClient.invalidateQueries({
        queryKey: ["approval-flows", variables.flowId],
      });
    },
    onError: (error) => {
      console.error("Failed to update flow steps:", error);
    },
  });
}

// Approval Request Mutation hooks
export function useCreateApprovalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createApprovalRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["approval-stats"] });
    },
    onError: (error) => {
      console.error("Failed to create approval request:", error);
    },
  });
}

export function useCancelApprovalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelApprovalRequest,
    onSuccess: (_, requestId) => {
      void queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      void queryClient.invalidateQueries({
        queryKey: ["approval-requests", requestId],
      });
      void queryClient.invalidateQueries({ queryKey: ["approval-stats"] });
    },
    onError: (error) => {
      console.error("Failed to cancel approval request:", error);
    },
  });
}

// Approval Action hooks
export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: string;
      data: ApproveRequestRequest;
    }) => approveRequest(requestId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      void queryClient.invalidateQueries({
        queryKey: ["approval-requests", variables.requestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["approval-timeline", variables.requestId],
      });
      void queryClient.invalidateQueries({ queryKey: ["approval-stats"] });
    },
    onError: (error) => {
      console.error("Failed to approve request:", error);
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: string;
      data: RejectRequestRequest;
    }) => rejectRequest(requestId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      void queryClient.invalidateQueries({
        queryKey: ["approval-requests", variables.requestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["approval-timeline", variables.requestId],
      });
      void queryClient.invalidateQueries({ queryKey: ["approval-stats"] });
    },
    onError: (error) => {
      console.error("Failed to reject request:", error);
    },
  });
}

export function useDelegateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: string;
      data: DelegateRequestRequest;
    }) => delegateRequest(requestId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      void queryClient.invalidateQueries({
        queryKey: ["approval-requests", variables.requestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["approval-timeline", variables.requestId],
      });
      void queryClient.invalidateQueries({ queryKey: ["approval-stats"] });
    },
    onError: (error) => {
      console.error("Failed to delegate request:", error);
    },
  });
}

// Integration hooks for widgets and entity-based operations
export function useApprovalWidget(requestId: string) {
  return useQuery({
    queryKey: ["approval-widget", requestId],
    queryFn: () => getRequestWidgetData(requestId),
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!requestId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    networkMode: "online",
  });
}

export function useEntityApprovalStatus(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ["entity-approval-status", entityType, entityId],
    queryFn: () =>
      getEntityApprovalStatus({
        entity_type: entityType,
        entity_id: entityId,
      }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!entityType && !!entityId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    networkMode: "online",
  });
}

export function useCanApproveRequest(requestId: string) {
  return useQuery({
    queryKey: ["can-approve", requestId],
    queryFn: () => checkUserCanApprove(requestId),
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!requestId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    networkMode: "online",
  });
}
