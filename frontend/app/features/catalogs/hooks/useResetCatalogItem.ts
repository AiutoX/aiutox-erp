/**
 * TanStack Query mutation for `POST /catalogs/{list_key}/items/{code}/reset`
 * -- the row menu's "Restaurar predeterminado" (ISSUE-035, C17, AC-API-17,
 * AC-UI-22).
 *
 * - success: toast "Elemento restaurado a sus valores predeterminados";
 * - any error (`CATALOG_ITEM_NOT_RESETTABLE`, `CATALOG_ITEM_NOT_MODIFIED`,
 *   ...): the restore error toast.
 *
 * In every outcome the list's admin queries are invalidated, so the row
 * re-renders with its default labels / visibility and without the
 * "Modificado" badge once the refetch lands (same pattern as
 * `useUpdateGovernance` / `useUpdateCatalogItem`).
 *
 * AiutoX ERP Core -- Frankpach
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { showToast } from "~/components/common/Toast";
import type { StandardResponse } from "~/lib/api/types/common.types";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { resetCatalogItem } from "../api/catalogsAdmin";
import type {
  CatalogAdminItem,
  CatalogItemResetBody,
} from "../types/catalogsAdmin.types";
import {
  CATALOG_MUTATION_RETRY,
  catalogListQueryKey,
  invalidateCatalogFormQueries,
} from "./useUpdateGovernance";

export interface ResetCatalogItemInput extends CatalogItemResetBody {
  code: string;
}

export function useResetCatalogItem(
  listKey: string
): UseMutationResult<
  StandardResponse<CatalogAdminItem>,
  unknown,
  ResetCatalogItemInput
> {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ code, ...body }: ResetCatalogItemInput) =>
      resetCatalogItem(listKey, code, body),
    retry: CATALOG_MUTATION_RETRY,
    onSuccess: () => {
      showToast(t("catalogs.admin.items.restoreSuccessToast"), "success");
    },
    onError: () => {
      showToast(t("catalogs.admin.items.restoreErrorToast"), "error");
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: catalogListQueryKey(listKey),
        }),
        invalidateCatalogFormQueries(queryClient, listKey),
      ]),
  });
}
