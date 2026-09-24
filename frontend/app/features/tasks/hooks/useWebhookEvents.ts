/**
 * Hook for loading available webhook events from all active modules
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { webhooksApi } from "../api/webhooks";

export const WEBHOOK_EVENTS_QUERY_KEY = ["webhooks", "events"] as const;

/**
 * Hook to fetch all available webhook events from active modules
 */
export function useWebhookEvents() {
  return useQuery({
    queryKey: WEBHOOK_EVENTS_QUERY_KEY,
    queryFn: async () => {
      const response = await webhooksApi.getAvailableEvents();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - events don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes in cache
  });
}

/**
 * Helper to get all event types as a flat array
 */
export function useWebhookEventTypes() {
  const { data, ...rest } = useWebhookEvents();

  const eventTypes = useMemo(() => {
    if (!data?.modules) return [];

    const types: Array<{ value: string; label: string; module: string }> = [];

    Object.entries(data.modules).forEach(([_moduleKey, module]) => {
      module.events.forEach((event) => {
        types.push({
          value: event.type,
          label: event.description,
          module: module.name,
        });
      });
    });

    return types;
  }, [data]);

  return {
    ...rest,
    data: eventTypes,
  };
}

/**
 * Helper to get events grouped by module
 */
export function useWebhookEventsByModule() {
  const { data, ...rest } = useWebhookEvents();

  const eventsByModule = useMemo(() => {
    if (!data?.modules) return {};

    const grouped: Record<
      string,
      Array<{ value: string; label: string; category: string }>
    > = {};

    Object.entries(data.modules).forEach(([moduleKey, module]) => {
      grouped[moduleKey] = module.events.map((event) => ({
        value: event.type,
        label: event.description,
        category: event.category,
      }));
    });

    return grouped;
  }, [data]);

  return {
    ...rest,
    data: eventsByModule,
    modules: data?.modules,
  };
}
