/**
 * React hooks for setup status management using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSuperUser,
  getSetupStatus,
  type SetupCompleteResponse,
  type SuperUserCreate,
} from "~/lib/api/admin";

/**
 * Hook to get setup status with automatic polling
 *
 * @param options - Query options
 * @returns Setup status query result
 */
export function useSetupStatus(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useQuery({
    queryKey: ["setup", "status"],
    queryFn: getSetupStatus,
    refetchInterval: options?.refetchInterval ?? 30000, // Poll every 30 seconds
    enabled: options?.enabled ?? true,
    retry: 3,
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

/**
 * Hook to create superuser with mutation
 *
 * @returns Mutation for creating superuser
 */
export function useCreateSuperUser() {
  const queryClient = useQueryClient();

  return useMutation<SetupCompleteResponse, Error, SuperUserCreate>({
    mutationFn: createSuperUser,
    onSuccess: () => {
      // Invalidate setup status to refetch
      queryClient.invalidateQueries({ queryKey: ["setup", "status"] });
    },
  });
}
