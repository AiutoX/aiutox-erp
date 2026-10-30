"""Alias of ``aiutox_sdk.logging``; the canonical module lives in the SDK package."""

import sys

import aiutox_sdk.logging as _canonical

sys.modules[__name__] = _canonical
