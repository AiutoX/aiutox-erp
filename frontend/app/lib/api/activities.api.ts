/**
 * API services for activity endpoints
 */

import apiClient from "./client";
import type {
  StandardResponse,
  StandardListResponse,
} from "./types/common.types";

export interface Activity {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityCreate {
  entity_type: string;
  entity_id: string;
  activity_type: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ActivityUpdate {
  title?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Create an activity
 * POST /api/v1/activities
 */
export async function createActivity(
  data: ActivityCreate
): Promise<StandardResponse<Activity>> {
  const response = await apiClient.post<StandardResponse<Activity>>(
    "/activities",
    data
  );
  return response.data;
}

/**
 * List activities
 * GET /api/v1/activities
 */
export async function listActivities(params?: {
  page?: number;
  page_size?: number;
  entity_type?: string;
  entity_id?: string;
}): Promise<StandardListResponse<Activity>> {
  const response = await apiClient.get<StandardListResponse<Activity>>(
    "/activities",
    { params }
  );
  return response.data;
}

/**
 * Get activity by ID
 * GET /api/v1/activities/{id}
 */
export async function getActivity(
  id: string
): Promise<StandardResponse<Activity>> {
  const response = await apiClient.get<StandardResponse<Activity>>(
    `/activities/${id}`
  );
  return response.data;
}

/**
 * Update activity
 * PUT /api/v1/activities/{id}
 */
export async function updateActivity(
  id: string,
  data: ActivityUpdate
): Promise<StandardResponse<Activity>> {
  const response = await apiClient.put<StandardResponse<Activity>>(
    `/activities/${id}`,
    data
  );
  return response.data;
}

/**
 * Delete activity
 * DELETE /api/v1/activities/{id}
 */
export async function deleteActivity(
  id: string
): Promise<StandardResponse<null>> {
  const response = await apiClient.delete<StandardResponse<null>>(
    `/activities/${id}`
  );
  return response.data;
}

/**
 * Get entity timeline
 * GET /api/v1/activities/entity/{entity_type}/{entity_id}
 */
export async function getEntityTimeline(
  entityType: string,
  entityId: string,
  params?: {
    page?: number;
    page_size?: number;
    activity_type?: string;
  }
): Promise<StandardListResponse<Activity>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());
  if (params?.activity_type)
    queryParams.append("activity_type", params.activity_type);

  const response = await apiClient.get<StandardListResponse<Activity>>(
    `/activities/entity/${entityType}/${entityId}?${queryParams.toString()}`
  );
  return response.data;
}
