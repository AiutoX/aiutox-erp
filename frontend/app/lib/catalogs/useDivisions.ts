/**
 * Administrative divisions (contract C26, ISSUE-030): the fetch function,
 * types and TanStack Query hook behind `DivisionSelect`, served by
 * `GET /reference/divisions` (ISSUE-026, AC-REF-07).
 *
 * Types mirror `RefAdminDivisionOut` in
 * backend/app/core/reference_data/schemas.py verbatim. Division codes are
 * strings with leading zeros ("05", "05001") and are never parsed to numbers
 * (AC-REF-05, RULE-019). All HTTP goes through `apiClient` (baseURL already
 * includes `/api/v1`), per CLAUDE.frontend.md.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import apiClient from "~/lib/api/client";
import type {
  PaginationMeta,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import { REFERENCE_STALE_TIME_MS } from "./reference-hooks";

/** One administrative division (`RefAdminDivisionOut`). */
export interface RefAdminDivision {
  /** ISO 3166-1 alpha-2 code of the country, uppercase. */
  country_code: string;
  /** Division code as text, leading zeros kept (DIVIPOLA "05", "05001"). */
  code: string;
  /** Code of the level-1 parent for level-2 rows; null for level 1. */
  parent_code: string | null;
  /** 1 = department, 2 = municipality. */
  level: number;
  name: string;
  /** Country-specific attributes (for CO: `CoDivisionAttributes`). */
  attributes: Record<string, unknown>;
  is_active: boolean;
}

/** Levels the divisions endpoint accepts (DIVIPOLA level 3 is out of scope). */
export type DivisionLevel = 1 | 2;

/** One page of divisions: the rows plus the backend's pagination meta. */
export interface RefDivisionsPage {
  items: RefAdminDivision[];
  meta: PaginationMeta;
}

export interface FetchDivisionsParams {
  /** ISO 3166-1 alpha-2 code (the backend upper-cases it). */
  country: string;
  level: DivisionLevel;
  /** Level-1 code whose children to list; omit for level 1. */
  parentCode?: string | null;
}

export interface UseDivisionsOptions extends FetchDivisionsParams {
  /** Set to false to hold the request (e.g. level 2 without a parent). */
  enabled?: boolean;
}

/**
 * Requested page size: the backend's maximum, so one request returns every
 * child of a parent (the largest CO department, Antioquia, has 125) and the
 * component never has to paginate (PERF-07).
 */
export const DIVISIONS_PAGE_SIZE = 500;

/**
 * `GET /reference/divisions` — one page of divisions for a country and
 * level, optionally under a parent, ordered by name then code.
 */
export async function fetchDivisions({
  country,
  level,
  parentCode,
}: FetchDivisionsParams): Promise<RefDivisionsPage> {
  const response = await apiClient.get<StandardListResponse<RefAdminDivision>>(
    "/reference/divisions",
    {
      params: {
        country,
        level,
        parent_code: parentCode ?? undefined,
        page_size: DIVISIONS_PAGE_SIZE,
      },
    }
  );
  return { items: response.data.data, meta: response.data.meta };
}

/**
 * Divisions of `country` at `level` (under `parentCode` for level 2).
 * Query key: `["reference", "divisions", country, level, parentCode ?? null]`;
 * `staleTime` 60 minutes (PERF-06).
 */
export function useDivisions({
  country,
  level,
  parentCode,
  enabled = true,
}: UseDivisionsOptions): UseQueryResult<RefDivisionsPage> {
  return useQuery({
    queryKey: ["reference", "divisions", country, level, parentCode ?? null],
    queryFn: () => fetchDivisions({ country, level, parentCode }),
    staleTime: REFERENCE_STALE_TIME_MS,
    enabled,
  });
}
