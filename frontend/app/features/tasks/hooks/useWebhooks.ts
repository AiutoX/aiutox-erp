/**
 * React Query hooks for Webhooks management
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { webhooksApi } from "../api/webhooks";
import type { WebhookCreate, WebhookUpdate } from "../types/webhook.types";

const WEBHOOKS_QUERY_KEY = ["webhooks"];

export function useWebhooks() {
  return useQuery({
    queryKey: WEBHOOKS_QUERY_KEY,
    queryFn: webhooksApi.getWebhooks,
  });
}

export function useWebhook(id: string) {
  return useQuery({
    queryKey: [...WEBHOOKS_QUERY_KEY, id],
    queryFn: () => webhooksApi.getWebhook(id),
    enabled: !!id,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WebhookCreate) => webhooksApi.createWebhook(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WEBHOOKS_QUERY_KEY });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WebhookUpdate }) =>
      webhooksApi.updateWebhook(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WEBHOOKS_QUERY_KEY });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => webhooksApi.deleteWebhook(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WEBHOOKS_QUERY_KEY });
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (id: string) => webhooksApi.testWebhook(id),
  });
}

export function useToggleWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      webhooksApi.toggleWebhook(id, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WEBHOOKS_QUERY_KEY });
    },
  });
}
