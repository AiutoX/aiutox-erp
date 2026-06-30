/**
 * API services for organizations
 *
 * Handles CRUD operations for organizations (customers, suppliers, partners)
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  Organization,
  OrganizationCreate,
  OrganizationUpdate,
  OrgContact,
  OrgContactCreate,
  OrgContactUpdate,
} from "../types/user.types";

/**
 * List organizations
 * GET /api/v1/organizations
 *
 * @param params - Query parameters (page, page_size, search, organization_type, etc.)
 */
export async function listOrganizations(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  organization_type?: string;
  is_active?: boolean;
}): Promise<StandardListResponse<Organization>> {
  const response = await apiClient.get<StandardListResponse<Organization>>(
    "/organizations",
    { params }
  );
  return response.data;
}

/**
 * Get organization by ID
 * GET /api/v1/organizations/{organization_id}
 */
export async function getOrganization(
  organizationId: string
): Promise<StandardResponse<Organization>> {
  const response = await apiClient.get<StandardResponse<Organization>>(
    `/organizations/${organizationId}`
  );
  return response.data;
}

/**
 * Create organization
 * POST /api/v1/organizations
 */
export async function createOrganization(
  data: OrganizationCreate
): Promise<StandardResponse<Organization>> {
  const response = await apiClient.post<StandardResponse<Organization>>(
    "/organizations",
    data
  );
  return response.data;
}

/**
 * Update organization
 * PATCH /api/v1/organizations/{organization_id}
 */
export async function updateOrganization(
  organizationId: string,
  data: OrganizationUpdate
): Promise<StandardResponse<Organization>> {
  const response = await apiClient.patch<StandardResponse<Organization>>(
    `/organizations/${organizationId}`,
    data
  );
  return response.data;
}

/**
 * Delete organization (soft delete)
 * DELETE /api/v1/organizations/{organization_id}
 */
export async function deleteOrganization(
  organizationId: string
): Promise<StandardResponse<{ message: string }>> {
  const response = await apiClient.delete<
    StandardResponse<{ message: string }>
  >(`/organizations/${organizationId}`);
  return response.data;
}

// ── Organization Contacts (M:M) ─────────────────────────────────────────────

export async function listOrgContacts(
  orgId: string
): Promise<StandardListResponse<OrgContact>> {
  const response = await apiClient.get<StandardListResponse<OrgContact>>(
    `/organizations/${orgId}/contacts`
  );
  return response.data;
}

export async function addOrgContact(
  orgId: string,
  data: OrgContactCreate
): Promise<StandardResponse<OrgContact>> {
  const response = await apiClient.post<StandardResponse<OrgContact>>(
    `/organizations/${orgId}/contacts`,
    data
  );
  return response.data;
}

export async function updateOrgContact(
  orgId: string,
  contactId: string,
  data: OrgContactUpdate
): Promise<StandardResponse<OrgContact>> {
  const response = await apiClient.patch<StandardResponse<OrgContact>>(
    `/organizations/${orgId}/contacts/${contactId}`,
    data
  );
  return response.data;
}

export async function removeOrgContact(
  orgId: string,
  contactId: string
): Promise<StandardResponse<{ message: string }>> {
  const response = await apiClient.delete<StandardResponse<{ message: string }>>(
    `/organizations/${orgId}/contacts/${contactId}`
  );
  return response.data;
}
