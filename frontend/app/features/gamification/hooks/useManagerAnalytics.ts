import { useQuery } from "@tanstack/react-query";

import { getAlerts, getTeamAnalytics } from "../api/gamification.api";

const STALE_TIME = 1000 * 60 * 5; // 5 min

export function useTeamAnalytics(teamId: string) {
  return useQuery({
    queryKey: ["gamification", "analytics", "team", teamId],
    queryFn: () => getTeamAnalytics(teamId),
    staleTime: STALE_TIME,
    enabled: !!teamId,
    select: (res) => res.data,
  });
}

export function useAlerts(teamId: string) {
  return useQuery({
    queryKey: ["gamification", "alerts", teamId],
    queryFn: () => getAlerts(teamId),
    staleTime: STALE_TIME,
    refetchInterval: 1000 * 60 * 5, // Poll every 5 min
    enabled: !!teamId,
    select: (res) => res.data,
  });
}
