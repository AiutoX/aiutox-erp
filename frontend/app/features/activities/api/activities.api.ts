/**
 * Activities API functions
 * Provides API integration for activities module
 * Following frontend-api.md rules
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  Activity,
  ActivityCreate,
  ActivityUpdate,
  ActivityListParams,
  EntityActivitiesParams,
} from "~/features/activities/types/activity.types";

/**
 * List activities with pagination and filters
 * GET /api/v1/activities
 *
 * Requires: activities.view permission
 */
export async function listActivities(
  params?: ActivityListParams
): Promise<StandardListResponse<Activity>> {
  const response = await apiClient.get<StandardListResponse<Activity>>(
    "/activities",
    {
      params: {
        page: params?.page || 1,
        page_size: params?.page_size || 20,
        activity_type: params?.activity_type,
        entity_type: params?.entity_type,
        entity_id: params?.entity_id,
        search: params?.search,
      },
    }
  );
  return response.data;
}

/**
 * Get activity by ID
 * GET /api/v1/activities/{id}
 *
 * Requires: activities.view permission
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
 * Create new activity
 * POST /api/v1/activities
 *
 * Requires: activities.manage permission
 */
export async function createActivity(
  payload: ActivityCreate
): Promise<StandardResponse<Activity>> {
  const response = await apiClient.post<StandardResponse<Activity>>(
    "/activities",
    payload
  );
  return response.data;
}

/**
 * Update existing activity
 * PUT /api/v1/activities/{id}
 *
 * Requires: activities.manage permission
 */
export async function updateActivity(
  id: string,
  payload: ActivityUpdate
): Promise<StandardResponse<Activity>> {
  const response = await apiClient.put<StandardResponse<Activity>>(
    `/activities/${id}`,
    payload
  );
  return response.data;
}

/**
 * Delete activity
 * DELETE /api/v1/activities/{id}
 *
 * Requires: activities.manage permission
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
 * Get activities for specific entity (timeline)
 * GET /api/v1/activities/entity/{entity_type}/{entity_id}
 *
 * Requires: activities.view permission
 */
export async function listEntityActivities(
  entityType: string,
  entityId: string,
  params?: Omit<EntityActivitiesParams, "entity_type" | "entity_id">
): Promise<StandardListResponse<Activity>> {
  const response = await apiClient.get<StandardListResponse<Activity>>(
    `/activities/entity/${entityType}/${entityId}`,
    {
      params: {
        page: params?.page || 1,
        page_size: params?.page_size || 20,
        activity_type: params?.activity_type,
      },
    }
  );
  return response.data;
}
