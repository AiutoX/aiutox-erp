/**
 * Client preview of the code the server generates for a new tenant item
 * (ISSUE-037, RULE-012, AC-UI-24). Mirrors
 * `backend/app/core/catalogs/codes.py` `generate_tenant_code` step for step:
 *
 * 1. source = `labels.en || labels.es || ""` -- no trim, like the server's
 *    `labels.get("en") or labels.get("es") or ""`;
 * 2. NFKD-normalize and drop combining marks;
 * 3. lowercase;
 * 4. replace every run of non-`[a-z0-9]` characters with `_`;
 * 5. strip leading/trailing `_`;
 * 6. truncate to 59 characters (after the strip, so a trailing `_` can
 *    survive -- as on the server);
 * 7. empty slug -> `item`;
 * 8. prefix `x_`;
 * 9. on collision try `_2` .. `_99`.
 *
 * The server code is authoritative (AC-API-15); this is only a preview:
 * - `existingCodes` is what the client has loaded (the items in the table),
 *   while the server's collision set is every system code plus all of the
 *   tenant's own codes, deprecated included -- so the two can differ;
 * - the server raises `CATALOG_CODE_EXHAUSTED` when `_2` .. `_99` all
 *   collide; the preview has no error state and returns the last attempt
 *   (`_99`) instead;
 * - step 2 uses `\p{M}` (every Unicode mark); Python drops characters with a
 *   non-zero canonical combining class. They agree on accents and on every
 *   mark that follows a Latin letter in practice; a mark with combining
 *   class 0 (e.g. an enclosing mark) between two ASCII letters is dropped
 *   here but becomes `_` on the server.
 *
 * AiutoX ERP Core -- Frankpach
 */

const MAX_SLUG_LENGTH = 59;
const MAX_SUFFIX = 99;
const FALLBACK_SLUG = "item";
const COMBINING_MARKS = /\p{M}/gu;
const NON_ALNUM_RUN = /[^a-z0-9]+/g;
const EDGE_UNDERSCORES = /^_+|_+$/g;

export interface TenantCodeLabels {
  es: string;
  en: string;
}

function slugify(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_ALNUM_RUN, "_")
    .replace(EDGE_UNDERSCORES, "")
    .slice(0, MAX_SLUG_LENGTH);
}

export function previewTenantCode(
  labels: TenantCodeLabels,
  existingCodes: ReadonlySet<string>
): string {
  const raw = labels.en || labels.es || "";
  const baseCode = `x_${slugify(raw) || FALLBACK_SLUG}`;
  if (!existingCodes.has(baseCode)) return baseCode;

  let candidate = baseCode;
  for (let suffix = 2; suffix <= MAX_SUFFIX; suffix++) {
    candidate = `${baseCode}_${suffix}`;
    if (!existingCodes.has(candidate)) return candidate;
  }
  return candidate;
}
