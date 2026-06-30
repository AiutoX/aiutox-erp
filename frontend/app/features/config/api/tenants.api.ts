import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface TenantCreate {
  name: string;
  slug: string;
}

export interface TenantUpdate {
  name?: string;
  is_active?: boolean;
}

export interface TenantListParams {
  page?: number;
  page_size?: number;
  active_only?: boolean;
}

export async function listTenants(
  params: TenantListParams = {}
): Promise<StandardListResponse<Tenant>> {
  const response = await apiClient.get<StandardListResponse<Tenant>>(
    "/tenants",
    { params }
  );
  return response.data;
}

export async function getTenant(id: string): Promise<Tenant> {
  const response = await apiClient.get<StandardResponse<Tenant>>(
    `/tenants/${id}`
  );
  return response.data.data;
}

export async function createTenant(data: TenantCreate): Promise<Tenant> {
  const response = await apiClient.post<StandardResponse<Tenant>>(
    "/tenants",
    data
  );
  return response.data.data;
}

export async function updateTenant(
  id: string,
  data: TenantUpdate
): Promise<Tenant> {
  const response = await apiClient.put<StandardResponse<Tenant>>(
    `/tenants/${id}`,
    data
  );
  return response.data.data;
}

export async function deleteTenant(id: string): Promise<void> {
  await apiClient.delete(`/tenants/${id}`);
}
