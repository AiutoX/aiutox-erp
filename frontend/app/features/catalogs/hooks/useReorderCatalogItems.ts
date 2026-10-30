/**
 * TanStack Query mutation for `PUT /catalogs/{list_key}/order` (ISSUE-036,
 * C15/C31, AC-API-14, AC-UI-20/21/22).
 *
 * Optimistic, following TanStack Query's recipe: `onMutate` cancels the
 * list's in-flight admin queries, snapshots the admin-items query the screen
 * is showing (the exact key for `params`, see `catalogAdminItemsQueryKey`)
 * and writes the new order into it, so the table re-renders before the
 * request resolves. Outcomes:
 * - success: toast "Orden guardado";
 * - 422 `CATALOG_ORDER_MISMATCH` (the list's codes changed under the user):
 *   restore the snapshot and toast `reorderMismatchToast`;
 * - any other error: restore the snapshot and toast "No se pudo guardar el
 *   orden. Se recargó la lista.".
 * In every outcome `onSettled` invalidates `catalogListQueryKey(listKey)`,
 * which refetches the active admin-items query from the server; it returns
 * the invalidation promise, so the mutation stays pending until it lands.
 *
 * Callers send only real changes: the `lib/reorderItems` move helpers return
 * null for an unchanged order, and no request is made then.
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
import { reorderCatalogItems } from "../api/catalogsAdmin";
import { applyCodeOrder } from "../lib/reorderItems";
import type {
  CatalogAdminItemsResponse,
  CatalogOrderBody,
  CatalogOrderResponse,
  FetchCatalogAdminItemsParams,
} from "../types/catalogsAdmin.types";
import { catalogAdminItemsQueryKey } from "./useCatalogAdminItems";
import {
  catalogListQueryKey,
  getApiErrorCode,
  invalidateCatalogFormQueries,
} from "./useUpdateGovernance";

export const CATALOG_ORDER_MISMATCH_CODE = "CATALOG_ORDER_MISMATCH";

export type ReorderCatalogItemsInput = CatalogOrderBody;

type AdminItemsData = StandardResponse<CatalogAdminItemsResponse>;

interface ReorderContext {
  queryKey: ReturnType<typeof catalogAdminItemsQueryKey>;
  previous: AdminItemsData | undefined;
}

/**
 * @param params the admin-items query parameters the screen is showing, so
 *   the optimistic write and the rollback target that exact query.
 */
export function useReorderCatalogItems(
  listKey: string,
  params: FetchCatalogAdminItemsParams = {}
): UseMutationResult<
  StandardResponse<CatalogOrderResponse>,
  unknown,
  ReorderCatalogItemsInput,
  ReorderContext
> {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const includeDeprecated = params.includeDeprecated ?? false;
  const q = params.q ?? "";

  return useMutation({
    mutationFn: (input: ReorderCatalogItemsInput) =>
      reorderCatalogItems(listKey, input),
    onMutate: async ({ codes }) => {
      await queryClient.cancelQueries({
        queryKey: catalogListQueryKey(listKey),
      });
      const queryKey = catalogAdminItemsQueryKey(listKey, {
        includeDeprecated,
        q,
      });
      const previous = queryClient.getQueryData<AdminItemsData>(queryKey);
      if (previous?.data) {
        queryClient.setQueryData<AdminItemsData>(queryKey, {
          ...previous,
          data: {
            ...previous.data,
            items: applyCodeOrder(previous.data.items, codes),
          },
        });
      }
      return { queryKey, previous };
    },
    onSuccess: () => {
      showToast(t("catalogs.admin.items.reorderSuccessToast"), "success");
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      if (getApiErrorCode(error) === CATALOG_ORDER_MISMATCH_CODE) {
        showToast(t("catalogs.admin.items.reorderMismatchToast"), "warning");
        return;
      }
      showToast(t("catalogs.admin.items.reorderErrorToast"), "error");
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
