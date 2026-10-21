/**
 * Widgets API — widget registry + user widget preferences
 * Backend: GET /api/v1/widgets/available, GET/PUT /api/v1/users/me/widgets
 */

import apiClient from "~/lib/api/client";
import type { StandardListResponse } from "~/lib/api/types/common.types";
import type {
  WidgetManifestOut,
  WidgetPreferenceBatchItem,
  WidgetPreferenceOut,
} from "../types/widgets-api.types";

export async function getAvailableWidgets(): Promise<
  StandardListResponse<WidgetManifestOut>
> {
  const response =
    await apiClient.get<StandardListResponse<WidgetManifestOut>>(
      "/widgets/available"
    );
  return response.data;
}

export async function getMyWidgets(): Promise<
  StandardListResponse<WidgetPreferenceOut>
> {
  const response =
    await apiClient.get<StandardListResponse<WidgetPreferenceOut>>(
      "/users/me/widgets"
    );
  return response.data;
}

export async function putMyWidgets(
  items: WidgetPreferenceBatchItem[]
): Promise<StandardListResponse<WidgetPreferenceOut>> {
  const response =
    await apiClient.put<StandardListResponse<WidgetPreferenceOut>>(
      "/users/me/widgets",
      items
    );
  return response.data;
}
