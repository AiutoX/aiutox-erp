import { useQuery } from "@tanstack/react-query";

import {
  getAllBadges,
  getLeaderboard,
  getMyBadges,
  getMyHistory,
  getMyPoints,
} from "../api/gamification.api";

const STALE_TIME = 1000 * 60 * 5; // 5 min

export function useMyPoints() {
  return useQuery({
    queryKey: ["gamification", "points", "me"],
    queryFn: () => getMyPoints(),
    staleTime: STALE_TIME,
    select: (res) => res.data,
  });
}

export function useMyHistory(limit = 50) {
  return useQuery({
    queryKey: ["gamification", "history", "me", limit],
    queryFn: () => getMyHistory(limit),
    staleTime: STALE_TIME,
    select: (res) => res.data,
  });
}

export function useMyBadges() {
  return useQuery({
    queryKey: ["gamification", "badges", "me"],
    queryFn: () => getMyBadges(),
    staleTime: STALE_TIME,
    select: (res) => res.data,
  });
}

export function useAllBadges(activeOnly = true) {
  return useQuery({
    queryKey: ["gamification", "badges", "all", activeOnly],
    queryFn: () => getAllBadges(activeOnly),
    staleTime: STALE_TIME,
    select: (res) => res.data,
  });
}

export function useLeaderboard(period = "all_time", limit = 10) {
  return useQuery({
    queryKey: ["gamification", "leaderboard", period, limit],
    queryFn: () => getLeaderboard(period, limit),
    staleTime: STALE_TIME,
    select: (res) => res.data,
  });
}
