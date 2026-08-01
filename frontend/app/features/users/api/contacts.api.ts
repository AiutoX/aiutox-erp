/**
 * API services for contacts
 *
 * Handles CRUD operations for contacts (people associated with organizations)
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  Contact,
  ContactCreate,
  ContactUpdate,
} from "../types/user.types";

/**
 * List contacts
 * GET /api/v1/contacts
 *
 * @param params - Query parameters (page, page_size, search, organization_id, etc.)
 */
export async function listContacts(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  organization_id?: string;
  is_active?: boolean;
}): Promise<StandardListResponse<Contact>> {
  const response = await apiClient.get<StandardListResponse<Contact>>(
    "/contacts",
    { params }
  );
  return response.data;
}

/**
 * Get contact by ID
 * GET /api/v1/contacts/{contact_id}
 */
export async function getContact(
  contactId: string
): Promise<StandardResponse<Contact>> {
  const response = await apiClient.get<StandardResponse<Contact>>(
    `/contacts/${contactId}`
  );
  return response.data;
}

/**
 * Create contact
 * POST /api/v1/contacts
 */
export async function createContact(
  data: ContactCreate
): Promise<StandardResponse<Contact>> {
  const response = await apiClient.post<StandardResponse<Contact>>(
    "/contacts",
    data
  );
  return response.data;
}

/**
 * Update contact
 * PATCH /api/v1/contacts/{contact_id}
 */
export async function updateContact(
  contactId: string,
  data: ContactUpdate
): Promise<StandardResponse<Contact>> {
  const response = await apiClient.patch<StandardResponse<Contact>>(
    `/contacts/${contactId}`,
    data
  );
  return response.data;
}

/**
 * Delete contact (soft delete)
 * DELETE /api/v1/contacts/{contact_id}
 */
export async function deleteContact(
  contactId: string
): Promise<StandardResponse<{ message: string }>> {
  const response = await apiClient.delete<
    StandardResponse<{ message: string }>
  >(`/contacts/${contactId}`);
  return response.data;
}

/**
 * Search contacts by name or email
 * GET /api/v1/contacts/search
 */
export async function searchContacts(params: {
  q?: string;
  is_active?: boolean;
  limit?: number;
}): Promise<StandardListResponse<Contact>> {
  const response = await apiClient.get<StandardListResponse<Contact>>(
    "/contacts/search",
    { params }
  );
  return response.data;
}
