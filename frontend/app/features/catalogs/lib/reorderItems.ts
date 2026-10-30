/**
 * Pure order computations for reordering a catalog list's items
 * (ISSUE-036, AC-UI-20/21/22, C15).
 *
 * `PUT /catalogs/{list_key}/order` takes every non-deprecated effective code
 * of the list -- hidden items included, deprecated items excluded -- so the
 * reorderable codes are the loaded non-deprecated items in display order.
 * The move helpers return `null` when the order would not change, which is
 * the caller's signal not to send a request (the client-side twin of the
 * backend's `batch_id=null` no-write case, AC-API-14).
 *
 * AiutoX ERP Core -- Frankpach
 */

import type { CatalogAdminItem } from "../types/catalogsAdmin.types";

/**
 * Whether the items can be reordered right now: the viewer manages the list
 * and the item search is empty. While searching, the shown rows are a subset
 * of the list, so a reorder could not send the full code list
 * (DEC-20261017-I036-1): drag handles stay inert and the mobile moves are
 * disabled.
 */
export function isReorderAvailable(
  canManage: boolean,
  searchQuery: string
): boolean {
  return canManage && searchQuery.trim() === "";
}

/** The codes a reorder sends: non-deprecated items (hidden ones included), in display order. */
export function reorderableCodes(items: CatalogAdminItem[]): string[] {
  return items.filter((item) => !item.is_deprecated).map((item) => item.code);
}

function moveIndex(codes: string[], from: number, to: number): string[] {
  const next = [...codes];
  next.splice(from, 1);
  next.splice(to, 0, codes[from] as string);
  return next;
}

/**
 * The drag-end order: `activeCode` moved to the position of `overCode` (the
 * row it was dropped on). Null when dropped on itself, outside the list, or
 * when either code is not reorderable.
 */
export function moveCode(
  codes: string[],
  activeCode: string,
  overCode: string | null | undefined
): string[] | null {
  if (!overCode || overCode === activeCode) return null;
  const from = codes.indexOf(activeCode);
  const to = codes.indexOf(overCode);
  if (from === -1 || to === -1) return null;
  return moveIndex(codes, from, to);
}

/**
 * The "Mover arriba" (`offset=-1`) / "Mover abajo" (`offset=1`) order. Null
 * past either end of the list or for a code that is not reorderable.
 */
export function moveCodeBy(
  codes: string[],
  code: string,
  offset: number
): string[] | null {
  const from = codes.indexOf(code);
  const to = from + offset;
  if (from === -1 || to < 0 || to >= codes.length || to === from) return null;
  return moveIndex(codes, from, to);
}

/**
 * The items in the new order: the reorderable items follow `codes`, and
 * deprecated items (shown with "Mostrar inactivos", never reordered) keep
 * their slots. Returns `items` itself when `codes` is not a permutation of
 * the reorderable codes.
 */
export function applyCodeOrder(
  items: CatalogAdminItem[],
  codes: string[]
): CatalogAdminItem[] {
  const byCode = new Map(
    items.filter((item) => !item.is_deprecated).map((item) => [item.code, item])
  );
  if (codes.length !== byCode.size) return items;
  const ordered: CatalogAdminItem[] = [];
  for (const code of codes) {
    const item = byCode.get(code);
    if (!item) return items;
    ordered.push(item);
  }
  // `ordered` has exactly one entry per non-deprecated item, checked above.
  let next = 0;
  return items.map((item) =>
    item.is_deprecated ? item : (ordered[next++] as CatalogAdminItem)
  );
}
