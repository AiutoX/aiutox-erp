/**
 * TanStack Query mutation for `PATCH /catalogs/{list_key}/items/{code}`
 * (ISSUE-035, C14, AC-API-12, AC-UI-19).
 *
 * This issue drives `is_hidden` (the Estado switch); ISSUE-037's edit
 * dialog reuses the hook with `labels`. Toasts follow that split -- a
 * visibility change (`is_hidden` given) is toasted here:
 * - success: "Elemento ocultado" (hide) / "Elemento restaurado" (unhide);
 * - 409 `CATALOG_LAST_VISIBLE_ITEM`: "No puedes ocultar el último elemento
 *   visible.";
 * - any other error: the generic item-update error toast.
 * A labels-only update is not toasted; its caller owns the feedback.
 *
 * The visibility switch is controlled by server data and never flipped
 * optimistically, so on failure there is nothing to roll back: in every
 * outcome the list's admin queries are invalidated and the rows re-render
 * from the server state (the same pattern as `useUpdateGovernance`).
 * `onSettled` returns the invalidation promise, so the mutation stays
 * pending until the refetch has landed.
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
import { updateCatalogItem } from "../api/catalogsAdmin";
import type {
  CatalogAdminItem,
  CatalogItemUpdateBody,
} from "../types/catalogsAdmin.types";
import {
  catalogListQueryKey,
  getApiErrorCode,
  invalidateCatalogFormQueries,
} from "./useUpdateGovernance";

export const CATALOG_LAST_VISIBLE_ITEM_CODE = "CATALOG_LAST_VISIBLE_ITEM";

export interface UpdateCatalogItemInput extends CatalogItemUpdateBody {
  code: string;
}

export function useUpdateCatalogItem(
  listKey: string
): UseMutationResult<
  StandardResponse<CatalogAdminItem>,
  unknown,
  UpdateCatalogItemInput
> {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ code, ...body }: UpdateCatalogItemInput) =>
      updateCatalogItem(listKey, code, body),
    onSuccess: (_response, input) => {
      if (input.is_hidden === undefined) return;
      showToast(
        input.is_hidden
          ? t("catalogs.admin.items.hideSuccessToast")
          : t("catalogs.admin.items.restoreVisibilityToast"),
        "success"
      );
    },
    onError: (error, input) => {
      if (input.is_hidden === undefined) return;
      if (getApiErrorCode(error) === CATALOG_LAST_VISIBLE_ITEM_CODE) {
        showToast(t("catalogs.admin.items.lastVisibleErrorToast"), "error");
        return;
      }
      showToast(t("catalogs.admin.items.updateErrorToast"), "error");
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
