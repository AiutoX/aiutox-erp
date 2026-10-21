"""Tenant item code generation (ISSUE-019, RULE-012, MS Section 8).

``generate_tenant_code`` is a pure function -- no DB access, no imports from
``service.py``/``models.py`` -- so it is unit-testable with a plain
``existing_codes`` set. The service layer (``CatalogService.add_item``) is
responsible for loading that set from the database and catching
``CatalogCodeExhaustedError``.

Algorithm (frozen, verbatim from the issue's HOW section):

1. Take ``labels.get("en") or labels.get("es") or ""``.
2. NFKD-normalize and drop combining marks (accent stripping).
3. Lowercase.
4. Replace every run of non-``[a-z0-9]`` characters with a single ``_``.
5. Strip leading/trailing ``_``.
6. Truncate to 59 characters.
7. If the resulting slug is empty (symbols/emoji-only label), use ``item``.
8. Prefix with ``x_`` -> ``base_code``.
9. If ``base_code`` collides with ``existing_codes``, try ``_2``.. ``_99``;
   if all of those also collide, raise ``CatalogCodeExhaustedError``.

The 59-character cap keeps ``"x_" + slug`` at 61 characters, and
``"x_" + slug + "_99"`` at 64 characters -- fitting the ``VARCHAR(64)``
column and the ``^x_[a-z0-9_]{1,62}$`` CHECK constraint declared on
``catalog_items.code`` for tenant rows (ISSUE-005 migration).
"""

import re
import unicodedata

_MAX_SLUG_LENGTH = 59
_MAX_SUFFIX = 99
_NON_ALNUM_RUN = re.compile(r"[^a-z0-9]+")
_FALLBACK_SLUG = "item"


class CatalogCodeExhaustedError(Exception):
    """Raised when every suffix from ``_2`` to ``_99`` collides with an existing code."""


def _slugify(raw: str) -> str:
    """Apply steps 2-6 of the algorithm to ``raw``."""
    normalized = unicodedata.normalize("NFKD", raw)
    without_accents = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    lowered = without_accents.lower()
    collapsed = _NON_ALNUM_RUN.sub("_", lowered)
    stripped = collapsed.strip("_")
    return stripped[:_MAX_SLUG_LENGTH]


def generate_tenant_code(labels: dict[str, str], existing_codes: set[str]) -> str:
    """Generate a stable, collision-free ``x_`` code from ``labels`` (RULE-012).

    Args:
        labels: The item's labels (e.g. ``{"en": "Customer", "es": "Cliente"}``).
        existing_codes: The collision set for one (list, tenant): every
            system code in the list plus the requesting tenant's own codes,
            deprecated ones included (MODULE-SPEC RULE-012). Other tenants'
            codes are never part of it. The caller loads this set from the
            database via ``CatalogService._existing_codes_for_list``; this
            function does no DB I/O itself.

    Returns:
        A code matching ``^x_[a-z0-9_]{1,62}$`` and not present in
        ``existing_codes``.

    Raises:
        CatalogCodeExhaustedError: If the base code and every suffixed
            variant from ``_2`` through ``_99`` all collide with
            ``existing_codes``.
    """
    raw = labels.get("en") or labels.get("es") or ""
    slug = _slugify(raw)
    if not slug:
        slug = _FALLBACK_SLUG

    base_code = f"x_{slug}"
    if base_code not in existing_codes:
        return base_code

    for suffix in range(2, _MAX_SUFFIX + 1):
        candidate = f"{base_code}_{suffix}"
        if candidate not in existing_codes:
            return candidate

    raise CatalogCodeExhaustedError(
        f"All suffixes _2.._{_MAX_SUFFIX} of '{base_code}' are already in use."
    )
