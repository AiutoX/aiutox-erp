"""Reporting base — re-export shim for BaseDataSource.

Canonical implementation lives in data_source.py.
This module provides the expected core/reporting/base.py import path.
"""

from app.core.reporting.data_source import BaseDataSource  # noqa: F401

__all__ = ["BaseDataSource"]
