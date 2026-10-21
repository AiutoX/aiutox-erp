/**
 * API service for Tags module
 *
 * Handles CRUD operations for tags
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  category_id: string | null;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TagCreate {
  name: string;
  color?: string | null;
  description?: string | null;
  category_id?: string | null;
}

export interface TagUpdate {
  name?: string;
  color?: string | null;
  description?: string | null;
  category_id?: string | null;
}

/**
 * List tags
 * GET /api/v1/tags
 *
 * Requires: tags.view permission
 */
export async function listTags(params?: {
  category_id?: string | null;
  search?: string | null;
}): Promise<StandardListResponse<Tag>> {
  const response = await apiClient.get<StandardListResponse<Tag>>("/tags", {
    params,
  });
  return response.data;
}

/**
 * Get tag by ID
 * GET /api/v1/tags/{tag_id}
 *
 * Requires: tags.view permission
 */
export async function getTag(tagId: string): Promise<StandardResponse<Tag>> {
  const response = await apiClient.get<StandardResponse<Tag>>(`/tags/${tagId}`);
  return response.data;
}

/**
 * Create tag
 * POST /api/v1/tags
 *
 * Requires: tags.manage permission
 */
export async function createTag(
  tagData: TagCreate
): Promise<StandardResponse<Tag>> {
  const response = await apiClient.post<StandardResponse<Tag>>(
    "/tags",
    tagData
  );
  return response.data;
}

/**
 * Update tag
 * PUT /api/v1/tags/{tag_id}
 *
 * Requires: tags.manage permission
 */
export async function updateTag(
  tagId: string,
  tagData: TagUpdate
): Promise<StandardResponse<Tag>> {
  const response = await apiClient.put<StandardResponse<Tag>>(
    `/tags/${tagId}`,
    tagData
  );
  return response.data;
}

/**
 * Delete tag
 * DELETE /api/v1/tags/{tag_id}
 *
 * Requires: tags.manage permission
 */
export async function deleteTag(tagId: string): Promise<void> {
  await apiClient.delete(`/tags/${tagId}`);
}

// Tag Categories Types and API

export interface TagCategory {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface TagCategoryCreate {
  name: string;
  color?: string | null;
  description?: string | null;
  parent_id?: string | null;
  sort_order?: number;
}

export interface TagCategoryUpdate {
  name?: string;
  color?: string | null;
  description?: string | null;
  parent_id?: string | null;
  sort_order?: number;
}

/**
 * List tag categories
 * GET /api/v1/tags/categories
 *
 * Requires: tags.view permission
 */
export async function listTagCategories(): Promise<
  StandardListResponse<TagCategory>
> {
  const response =
    await apiClient.get<StandardListResponse<TagCategory>>("/tags/categories");
  return response.data;
}

/**
 * Get tag category by ID
 * GET /api/v1/tags/categories/{category_id}
 *
 * Requires: tags.view permission
 */
export async function getTagCategory(
  categoryId: string
): Promise<StandardResponse<TagCategory>> {
  const response = await apiClient.get<StandardResponse<TagCategory>>(
    `/tags/categories/${categoryId}`
  );
  return response.data;
}

/**
 * Create tag category
 * POST /api/v1/tags/categories
 *
 * Requires: tags.manage permission
 */
export async function createTagCategory(
  categoryData: TagCategoryCreate
): Promise<StandardResponse<TagCategory>> {
  const response = await apiClient.post<StandardResponse<TagCategory>>(
    "/tags/categories",
    categoryData
  );
  return response.data;
}

/**
 * Update tag category
 * PUT /api/v1/tags/categories/{category_id}
 *
 * Requires: tags.manage permission
 */
export async function updateTagCategory(
  categoryId: string,
  categoryData: TagCategoryUpdate
): Promise<StandardResponse<TagCategory>> {
  const response = await apiClient.put<StandardResponse<TagCategory>>(
    `/tags/categories/${categoryId}`,
    categoryData
  );
  return response.data;
}

/**
 * Delete tag category
 * DELETE /api/v1/tags/categories/{category_id}
 *
 * Requires: tags.manage permission
 */
export async function deleteTagCategory(categoryId: string): Promise<void> {
  await apiClient.delete(`/tags/categories/${categoryId}`);
}
