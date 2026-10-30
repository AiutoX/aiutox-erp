"""Exceptions for the catalogs module.

CatalogDeclarationError aborts application startup when a module's
catalogs.yaml declares something shape-valid (per descriptors.py) but
business-invalid (per CatalogSyncService.validate_all). It is never turned
into an HTTP response, so it deliberately does not inherit from
HTTPException/APIException.
"""


class CatalogDeclarationError(Exception):
    """Raised by CatalogSyncService.validate_all on a catalog declaration rule violation.

    Attributes:
        module: The module_id of the offending declaration (see validate_all
            docstring for the deterministic choice on cross-module rules).
        key: The catalog list key that violated a rule.
        rule: The short rule name that was violated (e.g. "namespace",
            "code_format", "duplicate_code", "labels", "zero_items",
            "size_limit", "lock_extensible_conflict",
            "duplicate_key_across_modules").
    """

    def __init__(self, module: str, key: str, rule: str):
        self.module = module
        self.key = key
        self.rule = rule
        super().__init__(
            f"Catalog declaration error in module '{module}', list '{key}': {rule}"
        )
