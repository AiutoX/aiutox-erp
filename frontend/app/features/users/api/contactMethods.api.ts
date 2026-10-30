/**
 * API services for contact methods (polymorphic)
 *
 * Handles CRUD operations for contact methods (email, phone, address, etc.)
 * Can be associated with User, Contact, Organization, Employee, or Tenant
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  ContactMethod,
  ContactMethodCreate,
  ContactMethodUpdate,
  EntityType,
} from "../types/user.types";

/**
 * Get contact methods for an entity
 * GET /api/v1/contact-methods?entity_type={type}&entity_id={id}
 */
export async function getContactMethods(
  entityType: EntityType,
  entityId: string
): Promise<StandardListResponse<ContactMethod>> {
  try {
    console.log("[getContactMethods] Requesting contact methods:", {
      entityType,
      entityId,
      url: `/contact-methods?entity_type=${entityType}&entity_id=${entityId}`,
      hasToken: !!localStorage.getItem("auth_token"),
    });

    const response = await apiClient.get<StandardListResponse<ContactMethod>>(
      "/contact-methods",
      {
        params: {
          entity_type: entityType,
          entity_id: entityId,
        },
      }
    );

    console.log("[getContactMethods] Success:", response.data);
    return response.data;
  } catch (error: unknown) {
    console.error("[getContactMethods] Error:", error);
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response: { status: number; statusText: string; data: unknown };
      };
      console.error("[getContactMethods] Response error:", {
        status: axiosError.response.status,
        statusText: axiosError.response.statusText,
        data: axiosError.response.data,
      });
    } else if (error && typeof error === "object" && "request" in error) {
      const message =
        "message" in error
          ? String((error as Record<string, unknown>).message)
          : "";
      const code =
        "code" in error ? String((error as Record<string, unknown>).code) : "";
      console.error("[getContactMethods] Request error:", { message, code });
    }
    throw error;
  }
}

/**
 * Get contact method by ID
 * GET /api/v1/contact-methods/{contact_method_id}
 */
export async function getContactMethod(
  contactMethodId: string
): Promise<StandardResponse<ContactMethod>> {
  const response = await apiClient.get<StandardResponse<ContactMethod>>(
    `/contact-methods/${contactMethodId}`
  );
  return response.data;
}

/**
 * Create contact method
 * POST /api/v1/contact-methods
 */
export async function createContactMethod(
  data: ContactMethodCreate
): Promise<StandardResponse<ContactMethod>> {
  const response = await apiClient.post<StandardResponse<ContactMethod>>(
    "/contact-methods",
    data
  );
  return response.data;
}

/**
 * Update contact method
 * PATCH /api/v1/contact-methods/{contact_method_id}
 */
export async function updateContactMethod(
  contactMethodId: string,
  data: ContactMethodUpdate
): Promise<StandardResponse<ContactMethod>> {
  const response = await apiClient.patch<StandardResponse<ContactMethod>>(
    `/contact-methods/${contactMethodId}`,
    data
  );
  return response.data;
}

/**
 * Delete contact method
 * DELETE /api/v1/contact-methods/{contact_method_id}
 */
export async function deleteContactMethod(
  contactMethodId: string
): Promise<StandardResponse<{ message: string }>> {
  const response = await apiClient.delete<
    StandardResponse<{ message: string }>
  >(`/contact-methods/${contactMethodId}`);
  return response.data;
}
