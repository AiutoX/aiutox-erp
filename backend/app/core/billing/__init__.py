"""Core billing facade.

Provides an infrastructure-level entrypoint for business modules that need to
trigger billing operations without importing the billing business module
directly.
"""

from app.core.billing.service import CoreBillingService

__all__ = ["CoreBillingService"]
