/**
 * TanStack Query mutation for `POST /catalogs/{list_key}/items` -- add a
 * tenant item (ISSUE-037, C16, AC-API-15/16, AC-UI-24).
 *
 * Toasts:
 * - success: "Elemento agregado";
 * - 409 `CATALOG_ITEM_LIMIT_REACHED`: the limit toast (the dialog stays
 *   open with the labels kept);
 * - 409 `CATALOG_LIST_NOT_EXTENSIBLE`: the not-extensible toast (governance
 *   narrowed while the dialog was open, E-03; the dialog closes);
 * - 422 `CATALOG_LABELS_INVALID` with a known `details.field`: no toast --
 *   the dialog shows the message under the matching input;
 * - any other error: the generic add error toast.
 *
 * In every outcome both the admin lists (`viewer_capabilities.can_add_items`,
 * `item_count`) and the list's admin items are invalidated, so the new item
 * appears (last, "Personalizado") with its server-generated code and the
 * "Agregar elemento" button follows the server state. `onSettled` returns
 * the invalidation promise, so the mutation stays pending until the refetch
 * has landed (the same pattern as `useUpdateGovernance`).
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
import { addCatalogItem, CATALOG_LISTS_QUERY_KEY } from "../api/catalogsAdmin";
import { getLabelFieldError } from "../lib/labelFieldError";
import type {
  CatalogAdminItem,
  CatalogItemCreateBody,
} from "../types/catalogsAdmin.types";
import {
  catalogListQueryKey,
  getApiErrorCode,
  invalidateCatalogFormQueries,
} from "./useUpdateGovernance";

export const CATALOG_ITEM_LIMIT_REACHED_CODE = "CATALOG_ITEM_LIMIT_REACHED";
export const CATALOG_LIST_NOT_EXTENSIBLE_CODE = "CATALOG_LIST_NOT_EXTENSIBLE";

export function useAddCatalogItem(
  listKey: string
): UseMutationResult<
  StandardResponse<CatalogAdminItem>,
  unknown,
  CatalogItemCreateBody
> {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (body: CatalogItemCreateBody) => addCatalogItem(listKey, body),
    onSuccess: () => {
      showToast(t("catalogs.admin.itemDialog.addSuccessToast"), "success");
    },
    onError: (error) => {
      if (getLabelFieldError(error)) return;
      const code = getApiErrorCode(error);
      if (code === CATALOG_ITEM_LIMIT_REACHED_CODE) {
        showToast(t("catalogs.admin.itemDialog.limitReachedToast"), "error");
        return;
      }
      if (code === CATALOG_LIST_NOT_EXTENSIBLE_CODE) {
        showToast(t("catalogs.admin.itemDialog.notExtensibleToast"), "error");
        return;
      }
      showToast(t("catalogs.admin.itemDialog.addErrorToast"), "error");
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
