/**
 * API function for the superadmin governance change (ISSUE-033, C18).
 *
 * `PATCH /catalogs/{list_key}/governance` (backend ISSUE-021). Kept in its
 * own file so the frozen ISSUE-031 contract in `catalogsAdmin.ts` stays
 * untouched. Errors are not handled here -- `useUpdateGovernance` maps them
 * to toasts (CLAUDE.frontend.md Section 7).
 *
 * AiutoX ERP Core -- Frankpach
 */

import apiClient from "~/lib/api/client";
import type { StandardResponse } from "~/lib/api/types/common.types";
import type { CatalogListAdmin } from "../types/catalogsAdmin.types";

/** The governance flags the endpoint accepts; at least one must be sent. */
export interface GovernanceFlagsInput {
  tenant_can_manage?: boolean;
  is_extensible?: boolean;
}

/** Request body -- mirrors backend `CatalogGovernanceIn` (`extra="forbid"`). */
export interface UpdateGovernanceInput extends GovernanceFlagsInput {
  /** 10..500 characters, recorded in the list's history. */
  change_reason: string;
  /** The `updated_at` of the list as last read (optimistic concurrency). */
  expected_updated_at: string;
}

/** `meta` of the governance response. */
export interface UpdateGovernanceMeta {
  /** RULE-006 auto-normalization messages; empty when nothing was adjusted. */
  adjusted: string[];
  version_number: number;
}

export type UpdateGovernanceResponse = StandardResponse<CatalogListAdmin> & {
  meta: UpdateGovernanceMeta;
};

export async function updateCatalogGovernance(
  listKey: string,
  input: UpdateGovernanceInput
): Promise<UpdateGovernanceResponse> {
  const response = await apiClient.patch<UpdateGovernanceResponse>(
    `/catalogs/${encodeURIComponent(listKey)}/governance`,
    input
  );
  return response.data;
}
