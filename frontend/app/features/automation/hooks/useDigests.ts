import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { digestApi } from "../api/automation.api";
import type { DigestSubscribePayload } from "../types/automation.types";

export const digestKeys = {
  all: ["digests"] as const,
  available: () => [...digestKeys.all, "available"] as const,
  subscriptions: () => [...digestKeys.all, "subscriptions"] as const,
};

export function useAvailableDigests() {
  return useQuery({
    queryKey: digestKeys.available(),
    queryFn: digestApi.listAvailable,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDigestSubscriptions() {
  return useQuery({
    queryKey: digestKeys.subscriptions(),
    queryFn: digestApi.listSubscriptions,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSubscribeDigest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DigestSubscribePayload) =>
      digestApi.subscribe(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: digestKeys.subscriptions(),
      });
    },
  });
}

export function useUnsubscribeDigest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => digestApi.unsubscribe(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: digestKeys.subscriptions(),
      });
    },
  });
}
