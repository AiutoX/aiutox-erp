/**
 * React hooks for organization management
 *
 * Provides CRUD operations for organizations
 */

import { useCallback, useState, useEffect } from "react";
import {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from "../api/organizations.api";
import type {
  Organization,
  OrganizationCreate,
  OrganizationUpdate,
} from "../types/user.types";

interface OrganizationsListParams {
  page?: number;
  page_size?: number;
  search?: string;
  organization_type?: string;
  is_active?: boolean;
}

/**
 * Hook to list organizations with pagination
 */
export function useOrganizations(params?: OrganizationsListParams) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  } | null>(null);

  const page = params?.page;
  const page_size = params?.page_size;
  const search = params?.search;
  const organization_type = params?.organization_type;
  const is_active = params?.is_active;

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);

    const currentParams = { page, page_size, search, organization_type, is_active };

    try {
      const response = await listOrganizations(currentParams);
      setOrganizations(response.data);
      if (response.meta && "total" in response.meta) {
        setPagination({
          total: response.meta.total,
          page: response.meta.page,
          page_size: response.meta.page_size,
          total_pages: response.meta.total_pages,
        });
      }
    } catch (err: unknown) {
      const errObj =
        err && typeof err === "object" ? (err as Record<string, unknown>) : {};
      const responseStatus =
        errObj.response && typeof errObj.response === "object"
          ? (errObj.response as Record<string, unknown>).status
          : undefined;
      const status = (responseStatus ?? errObj.status) as number | undefined;
      if (status === 404) {
        setOrganizations([]);
        setError(null);
        setPagination({
          total: 0,
          page: 1,
          page_size: page_size || 100,
          total_pages: 0,
        });
      } else {
        setError(
          err instanceof Error ? err : new Error("Failed to load organizations")
        );
        setOrganizations([]);
      }
    } finally {
      setLoading(false);
    }
   
  }, [page, page_size, search, organization_type, is_active]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return {
    organizations,
    loading,
    error,
    pagination,
    refresh: fetchOrganizations,
  };
}

/**
 * Hook to get a single organization by ID
 */
export function useOrganization(organizationId: string | null) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganization = useCallback(async () => {
    if (!organizationId) {
      setOrganization(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getOrganization(organizationId);
      setOrganization(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load organization")
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  return {
    organization,
    loading,
    error,
    refresh: fetchOrganization,
  };
}

/**
 * Hook to create an organization
 */
export function useCreateOrganization() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(
    async (data: OrganizationCreate): Promise<Organization | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await createOrganization(data);
        return response.data;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to create organization")
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    create,
    loading,
    error,
  };
}

/**
 * Hook to update an organization
 */
export function useUpdateOrganization() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (
      organizationId: string,
      data: OrganizationUpdate
    ): Promise<Organization | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await updateOrganization(organizationId, data);
        return response.data;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to update organization")
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    update,
    loading,
    error,
  };
}

/**
 * Hook to delete an organization
 */
export function useDeleteOrganization() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(
    async (organizationId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        await deleteOrganization(organizationId);
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to delete organization")
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    remove,
    loading,
    error,
  };
}
