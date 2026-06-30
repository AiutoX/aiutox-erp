/**
 * React hooks for contact methods management
 *
 * Provides CRUD operations for contact methods (polymorphic)
 * Uses React Query for intelligent caching and automatic cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getContactMethods,
  getContactMethod,
  createContactMethod,
  updateContactMethod,
  deleteContactMethod,
} from "../api/contactMethods.api";
import type {
  ContactMethod,
  ContactMethodCreate,
  ContactMethodUpdate,
  EntityType,
} from "../types/user.types";

// Query keys for React Query
export const contactMethodKeys = {
  all: ["contactMethods"] as const,
  lists: () => [...contactMethodKeys.all, "list"] as const,
  list: (entityType: EntityType, entityId: string) =>
    [...contactMethodKeys.lists(), entityType, entityId] as const,
  details: () => [...contactMethodKeys.all, "detail"] as const,
  detail: (id: string) => [...contactMethodKeys.details(), id] as const,
};

/**
 * Hook to get contact methods for an entity
 * Uses React Query for intelligent caching and automatic refetching
 */
export function useContactMethods(
  entityType: EntityType | null,
  entityId: string | null
) {
  const {
    data: response,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: contactMethodKeys.list(entityType || "user", entityId || ""),
    queryFn: async () => {
      if (!entityType || !entityId) {
        return Promise.resolve({ data: [] });
      }
      try {
        const result = await getContactMethods(entityType, entityId);
        console.log(
          "[useContactMethods] Successfully fetched contact methods:",
          result
        );
        return result;
      } catch (err) {
        console.error(
          "[useContactMethods] Error fetching contact methods:",
          err
        );
        // Re-throw to let React Query handle it
        throw err;
      }
    },
    enabled: !!entityType && !!entityId,
    staleTime: 0, // Always refetch to ensure fresh data after mutations
    retry: 1, // Only retry once on failure
  });

  return {
    contactMethods: response?.data || [],
    loading,
    error: error,
    refresh: refetch,
  };
}

/**
 * Hook to get a single contact method by ID
 * Uses React Query for intelligent caching
 */
export function useContactMethod(contactMethodId: string | null) {
  const {
    data: response,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: contactMethodKeys.detail(contactMethodId || ""),
    queryFn: () => {
      if (!contactMethodId) {
        return Promise.resolve({
          data: null,
          meta: null,
          error: null,
        } as unknown as Awaited<ReturnType<typeof getContactMethod>>);
      }
      return getContactMethod(contactMethodId);
    },
    enabled: !!contactMethodId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    contactMethod: response?.data || null,
    loading,
    error: error,
    refresh: refetch,
  };
}

/**
 * Hook to create a contact method
 * Uses React Query mutation with automatic cache invalidation
 */
export function useCreateContactMethod() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: ContactMethodCreate) => createContactMethod(data),
    onSuccess: (_data, variables) => {
      // Invalidate contact methods list for the entity
      queryClient.invalidateQueries({
        queryKey: contactMethodKeys.list(
          variables.entity_type,
          variables.entity_id
        ),
      });
      // Also invalidate all lists to ensure consistency
      queryClient.invalidateQueries({
        queryKey: contactMethodKeys.lists(),
      });
    },
  });

  return {
    create: async (
      data: ContactMethodCreate
    ): Promise<ContactMethod | null> => {
      try {
        const response = await mutation.mutateAsync(data);
        return response.data;
      } catch (error) {
        console.error(
          "[useCreateContactMethod] Error creating contact method:",
          error
        );
        // Re-throw the error so the component can handle it
        throw error;
      }
    },
    loading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to update a contact method
 * Uses React Query mutation with automatic cache invalidation
 */
export function useUpdateContactMethod() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      contactMethodId,
      data,
    }: {
      contactMethodId: string;
      data: ContactMethodUpdate;
    }) => updateContactMethod(contactMethodId, data),
    onSuccess: (response, variables) => {
      // Update the specific contact method in cache
      queryClient.setQueryData(
        contactMethodKeys.detail(variables.contactMethodId),
        response
      );
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({
        queryKey: contactMethodKeys.lists(),
      });
    },
  });

  return {
    update: async (
      contactMethodId: string,
      data: ContactMethodUpdate
    ): Promise<ContactMethod | null> => {
      try {
        const response = await mutation.mutateAsync({
          contactMethodId,
          data,
        });
        return response.data;
      } catch (err) {
        console.error(
          "[useUpdateContactMethod] Error updating contact method:",
          err
        );
        return null;
      }
    },
    loading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to delete a contact method
 * Uses React Query mutation with automatic cache invalidation
 */
export function useDeleteContactMethod() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (contactMethodId: string) =>
      deleteContactMethod(contactMethodId),
    onSuccess: (_data, contactMethodId) => {
      // Remove the contact method from cache
      queryClient.removeQueries({
        queryKey: contactMethodKeys.detail(contactMethodId),
      });
      // Invalidate all lists to ensure consistency
      queryClient.invalidateQueries({
        queryKey: contactMethodKeys.lists(),
      });
    },
  });

  return {
    remove: async (contactMethodId: string): Promise<boolean> => {
      try {
        await mutation.mutateAsync(contactMethodId);
        return true;
      } catch {
        return false;
      }
    },
    loading: mutation.isPending,
    error: mutation.error,
  };
}
