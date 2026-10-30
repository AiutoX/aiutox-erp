/**
 * TanStack Query mutation for the superadmin governance change
 * (ISSUE-033, AC-UI-11/12).
 *
 * - success: toast "Permisos actualizados para todas las organizaciones";
 * - 409 `CATALOG_LIST_STALE`: toast "Otro administrador cambió este
 *   catálogo. Se recargaron los datos.";
 * - 403 `CATALOG_GOVERNANCE_FORBIDDEN`, any other 409, or any other error:
 *   the generic error toast.
 *
 * In every outcome the admin lists and the per-list query are invalidated,
 * so the governance switches (which are controlled by the server data, never
 * optimistically flipped) return to -- or move to -- the server state.
 * `onSettled` returns the invalidation promise, so the mutation stays
 * pending until the refetch has landed.
 *
 * AiutoX ERP Core -- Frankpach
 */

import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { CATALOG_LISTS_QUERY_KEY } from "../api/catalogsAdmin";
import {
  updateCatalogGovernance,
  type UpdateGovernanceInput,
  type UpdateGovernanceResponse,
} from "../api/catalogGovernance";

export const CATALOG_LIST_STALE_CODE = "CATALOG_LIST_STALE";

/** TanStack Query key of one catalog list's admin data. */
export function catalogListQueryKey(listKey: string) {
  return ["catalogs-admin", listKey] as const;
}

/**
 * Invalidates the form-side catalog queries a write makes stale: every
 * `["catalogs", listKey, ...]` entry of the list (plain and `include_codes`)
 * and the `["catalogs", "resolve", ...]` maps. Without it, a relabel or hide
 * stays invisible in the user / organization forms for the 5 minute stale
 * time and saving a just-hidden value is rejected (PRD section 3).
 */
export function invalidateCatalogFormQueries(
  queryClient: QueryClient,
  listKey: string
): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["catalogs", listKey] }),
    queryClient.invalidateQueries({ queryKey: ["catalogs", "resolve"] }),
  ]);
}

interface ApiErrorShape {
  response?: { data?: { error?: { code?: unknown } | null } | null };
}

/** The backend `error.code` of a failed apiClient call, or null. Shared by the catalog item mutations. */
export function getApiErrorCode(error: unknown): string | null {
  const code = (error as ApiErrorShape | null)?.response?.data?.error?.code;
  return typeof code === "string" ? code : null;
}

export function useUpdateGovernance(
  listKey: string
): UseMutationResult<UpdateGovernanceResponse, unknown, UpdateGovernanceInput> {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (input: UpdateGovernanceInput) =>
      updateCatalogGovernance(listKey, input),
    onSuccess: () => {
      showToast(t("catalogs.admin.governance.successToast"), "success");
    },
    onError: (error) => {
      if (getApiErrorCode(error) === CATALOG_LIST_STALE_CODE) {
        showToast(t("catalogs.admin.governance.staleToast"), "warning");
        return;
      }
      showToast(t("catalogs.admin.governance.errorToast"), "error");
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: CATALOG_LISTS_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: catalogListQueryKey(listKey),
        }),
        invalidateCatalogFormQueries(queryClient, listKey),
      ]),
  });
}
