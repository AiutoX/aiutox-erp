/**
 * React Query hook for fetching mentions.
 */

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  getUserMentions,
  getUnresolvedMentions,
  getEntityMentions,
} from "../api/mentions.api";
import type {
  MentionsQueryParams,
  EntityReference,
} from "../types/mention.types";

const MENTIONS_QUERY_KEY = ["mentions"];

/**
 * Hook to fetch all mentions for current user.
 */
export function useMentions(params?: MentionsQueryParams) {
  return useQuery({
    queryKey: [...MENTIONS_QUERY_KEY, "user", params],
    queryFn: () => getUserMentions(params),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch unresolved mentions for current user.
 */
export function useUnresolvedMentions(
  params?: Omit<MentionsQueryParams, "resolved">
) {
  return useQuery({
    queryKey: [...MENTIONS_QUERY_KEY, "user", "unresolved", params],
    queryFn: () => getUnresolvedMentions(params),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch unresolved mention count.
 */
export function useUnresolvedMentionCount() {
  const { data } = useUnresolvedMentions({ limit: 1 });
  return data?.total ?? 0;
}

/**
 * Hook to fetch mentions for a specific entity.
 */
export function useEntityMentions(
  entity: EntityReference,
  params?: MentionsQueryParams
) {
  return useQuery({
    queryKey: [...MENTIONS_QUERY_KEY, "entity", entity.type, entity.id, params],
    queryFn: () => getEntityMentions(entity.type, entity.id, params),
    enabled: !!entity.id && !!entity.type,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to infinitely fetch mentions with pagination.
 */
export function useInfiniteMentions(
  params?: Omit<MentionsQueryParams, "offset">
) {
  return useInfiniteQuery({
    queryKey: [...MENTIONS_QUERY_KEY, "user", "infinite", params],
    queryFn: ({ pageParam = 0 }) =>
      getUserMentions({ ...params, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      const fetchedCount = allPages.reduce(
        (total, page) => total + page.mentions.length,
        0
      );
      return fetchedCount < lastPage.total ? fetchedCount : undefined;
    },
    initialPageParam: 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
