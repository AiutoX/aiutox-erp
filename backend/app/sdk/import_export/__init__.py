"""Alias of ``aiutox_sdk.import_export``; the canonical module lives in the SDK package."""

import sys

import aiutox_sdk.import_export as _canonical

sys.modules[__name__] = _canonical
