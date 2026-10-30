"""Alias of ``aiutox_sdk.pubsub``; the canonical module lives in the SDK package."""

import sys
from typing import TYPE_CHECKING

import aiutox_sdk.pubsub as _canonical

if TYPE_CHECKING:
    # mypy cannot follow the sys.modules swap below, so it needs the names.
    from aiutox_sdk.pubsub import *  # noqa: F403

sys.modules[__name__] = _canonical
