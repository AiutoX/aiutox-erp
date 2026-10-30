"""Alias of ``aiutox_sdk.module_interface``; the canonical module lives in the SDK package."""

import sys

import aiutox_sdk.module_interface as _canonical

sys.modules[__name__] = _canonical
