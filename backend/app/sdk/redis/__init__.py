"""Alias of ``aiutox_sdk.redis``; the canonical module lives in the SDK package."""

import sys

import aiutox_sdk.redis as _canonical

sys.modules[__name__] = _canonical
