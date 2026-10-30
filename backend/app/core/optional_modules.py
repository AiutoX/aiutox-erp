"""Tell an absent business module apart from a broken one in core import guards.

Core code imports business modules only inside a function-scoped ``try`` with an
``except ImportError`` handler, and returns a defined empty result when the
module is not installed. A bare ``except ImportError`` also swallows a module
that is installed but fails to import (a missing dependency, a renamed name),
which would show up as zeroed KPIs or a silent automation failure. The handler
calls ``module_absent`` and re-raises when it returns False.
"""

import logging

logger = logging.getLogger(__name__)

_reported: set[str] = set()


def module_absent(exc: ImportError, target: str) -> bool:
    """Return True when ``exc`` means the module ``target`` is not installed.

    Only a ``ModuleNotFoundError`` naming ``target`` itself or one of its parent
    packages counts. Any other ``ImportError`` comes from inside an installed
    module and must propagate. The first absence of each target is logged.
    """
    if not isinstance(exc, ModuleNotFoundError):
        return False
    missing = exc.name or ""
    if not missing or not (missing == target or target.startswith(f"{missing}.")):
        return False
    if target not in _reported:
        _reported.add(target)
        logger.warning(
            "Optional module %s is not installed (missing %s); "
            "returning its empty result",
            target,
            missing,
        )
    return True
