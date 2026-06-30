/**
 * React hooks for user management
 *
 * Provides CRUD operations and state management for users
 * using React Query for intelligent caching and state management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  updateOwnProfile,
  deleteUser,
  bulkUsersAction,
  type BulkUsersActionRequest,
  type BulkUsersActionResponse,
} from "../api/users.api";
import { useAuthStore } from "~/stores/authStore";
import type {
  User,
  UserCreate,
  UserUpdate,
  UsersListParams,
} from "../types/user.types";

// Query keys for React Query
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params?: UsersListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

/**
 * Hook to list users with pagination
 * Uses React Query for intelligent caching and automatic refetching
 */
export function useUsers(params?: UsersListParams) {
  const {
    data: response,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: (failureCount, error: unknown) => {
      // Don't retry on 403 (permission denied) or 500 (server error)
      // Only retry on network errors or 5xx errors that are not 500
      const errObj =
        error && typeof error === "object"
          ? (error as Record<string, unknown>)
          : {};
      const responseStatus =
        errObj.response && typeof errObj.response === "object"
          ? (errObj.response as Record<string, unknown>).status
          : undefined;
      const status = (responseStatus ?? errObj.status) as number | undefined;
      if (status === 403 || status === 500) {
        return false;
      }
      return failureCount < 2;
    },
    // Don't throw errors, just return them
    throwOnError: false,
  });

  return {
    users: response?.data || [],
    loading,
    error: error as Error | null,
    pagination: response?.meta
      ? {
          total: response.meta.total,
          page: response.meta.page,
          page_size: response.meta.page_size,
          total_pages: response.meta.total_pages,
        }
      : null,
    refresh: () => refetch(),
  };
}

/**
 * Hook to get a single user by ID
 * Uses React Query for intelligent caching
 */
export function useUser(userId: string | null) {
  const {
    data: response,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: userKeys.detail(userId || ""),
    queryFn: () => {
      if (!userId) throw new Error("User ID is required");
      return getUser(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    user: response?.data || null,
    loading,
    error: error,
    refresh: () => refetch(),
  };
}

/**
 * Hook to create a user
 * Uses React Query mutation with automatic cache invalidation
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: UserCreate) => createUser(data),
    onSuccess: () => {
      // Invalidate users list to refetch with new user
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });

  return {
    create: async (data: UserCreate): Promise<User | null> => {
      try {
        const response = await mutation.mutateAsync(data);
        return response.data;
      } catch {
        return null;
      }
    },
    loading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to update a user
 * Uses React Query mutation with optimistic updates and cache invalidation
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdate }) => {
      console.log("[useUpdateUser] Calling updateUser API:", { userId, data });
      return updateUser(userId, data);
    },
    onMutate: async ({ userId, data }) => {
      console.log("[useUpdateUser] Optimistic update starting:", { userId });
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.detail(userId) });

      // Snapshot previous value for rollback
      const previousUserResponse = queryClient.getQueryData<{ data: User }>(
        userKeys.detail(userId)
      );
      const previousUser = previousUserResponse?.data;

      // Optimistically update cache
      if (previousUser) {
        queryClient.setQueryData(userKeys.detail(userId), {
          data: { ...previousUser, ...data },
        });
        console.log("[useUpdateUser] Cache updated optimistically");
      }

      return { previousUser };
    },
    onError: (err, { userId }, context) => {
      console.error("[useUpdateUser] Error updating user:", err);
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(userId), {
          data: context.previousUser,
        });
        console.log("[useUpdateUser] Cache rolled back due to error");
      }
    },
    onSuccess: (data, { userId }) => {
      console.log("[useUpdateUser] User update successful:", { userId, data });
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      console.log("[useUpdateUser] Cache invalidated for refresh");
    },
  });

  return {
    // Expose mutateAsync directly for flexibility (used in users.$id.edit.tsx)
    mutateAsync: mutation.mutateAsync,
    // Expose isPending for consistency with React Query naming
    isPending: mutation.isPending,
    // Keep update method for backward compatibility
    update: async (userId: string, data: UserUpdate): Promise<User | null> => {
      try {
        const response = await mutation.mutateAsync({ userId, data });
        return response.data;
      } catch {
        return null;
      }
    },
    // Keep loading as alias for isPending for backward compatibility
    loading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to update own profile
 * Uses React Query mutation with optimistic updates and cache invalidation
 * Uses the /me endpoint which doesn't require auth.manage_users permission
 */
export function useUpdateOwnProfile() {
  const queryClient = useQueryClient();
  const { user: authUser, updateUser } = useAuthStore();

  const mutation = useMutation({
    mutationFn: (data: UserUpdate) => {
      console.log("[useUpdateOwnProfile] Calling updateOwnProfile API:", {
        data,
      });
      return updateOwnProfile(data);
    },
    onMutate: async (data) => {
      console.log("[useUpdateOwnProfile] Optimistic update starting");
      // Cancel outgoing refetches
      if (authUser?.id) {
        await queryClient.cancelQueries({
          queryKey: userKeys.detail(authUser.id),
        });

        // Snapshot previous value for rollback
        const previousUserResponse = queryClient.getQueryData<{ data: User }>(
          userKeys.detail(authUser.id)
        );
        const previousUser = previousUserResponse?.data;

        // Optimistically update cache
        if (previousUser) {
          queryClient.setQueryData(userKeys.detail(authUser.id), {
            data: { ...previousUser, ...data },
          });
          console.log("[useUpdateOwnProfile] Cache updated optimistically");
        }

        return { previousUser };
      }
      return undefined; // Explicit return for the else case
    },
    onError: (err, _data, context) => {
      console.error("[useUpdateOwnProfile] Error updating own profile:", err);
      // Rollback on error
      if (authUser?.id && context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(authUser.id), {
          data: context.previousUser,
        });
        console.log("[useUpdateOwnProfile] Cache rolled back due to error");
      }
    },
    onSuccess: (data) => {
      console.log("[useUpdateOwnProfile] Profile update successful:", { data });
      // Update authStore with new user data (including avatar)
      if (data?.data && authUser) {
        updateUser(data.data);
        console.log(
          "[useUpdateOwnProfile] AuthStore updated with new user data"
        );
      }
      // Invalidate to refetch fresh data
      if (authUser?.id) {
        queryClient.invalidateQueries({
          queryKey: userKeys.detail(authUser.id),
        });
        queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        console.log("[useUpdateOwnProfile] Cache invalidated for refresh");
      }
    },
  });

  return {
    // Expose mutateAsync directly for flexibility
    mutateAsync: mutation.mutateAsync,
    // Expose isPending for consistency with React Query naming
    isPending: mutation.isPending,
    loading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to delete a user (soft delete)
 * Uses React Query mutation with automatic cache invalidation
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: (_data, userId) => {
      // Remove user from cache
      queryClient.removeQueries({ queryKey: userKeys.detail(userId) });
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });

  return {
    remove: async (userId: string): Promise<boolean> => {
      try {
        await mutation.mutateAsync(userId);
        return true;
      } catch {
        return false;
      }
    },
    loading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to perform bulk actions on users
 * Uses React Query mutation with automatic cache invalidation
 */
export function useBulkUsersAction() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: BulkUsersActionRequest) => bulkUsersAction(data),
    onSuccess: () => {
      // Invalidate users list to refetch after bulk action
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });

  return {
    execute: async (
      action: "activate" | "deactivate" | "delete",
      userIds: string[]
    ): Promise<BulkUsersActionResponse | null> => {
      try {
        const response = await mutation.mutateAsync({
          action,
          user_ids: userIds,
        });
        return response.data;
      } catch {
        return null;
      }
    },
    loading: mutation.isPending,
    error: mutation.error,
  };
}
