"""Alias of ``aiutox_sdk.async_tasks``; the canonical module lives in the SDK package."""

import sys

import aiutox_sdk.async_tasks as _canonical

sys.modules[__name__] = _canonical
