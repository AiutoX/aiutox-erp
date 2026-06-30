import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.lazy_router import get_api_router
from app.core import logging as app_logging  # noqa: F401
from app.core.async_tasks import AsyncTaskService
from app.core.auth.rate_limit import limiter
from app.core.config_file import get_settings
from app.core.db.session import SessionLocal
from app.core.exceptions import APIException
from app.core.files import tasks as files_tasks  # noqa: F401
from app.core.licensing.keys import load_license_keys
from app.core.licensing.middleware import LicenseMiddleware
from app.core.middleware.header_encoding import HeaderEncodingMiddleware
from app.core.middleware.module_state import ModuleStateMiddleware
from app.core.middleware.request_body_encoding import RequestBodyEncodingMiddleware
from app.core.middleware.security_headers import (
    SecurityHeadersMiddleware,
    add_security_headers,
)
from app.core.module_registry import ModuleRegistry, set_module_registry
from app.core.tiers.decorators import add_tier_exception_handler

settings = get_settings()
logger = logging.getLogger(__name__)

# Global variables for async services
async_task_service: AsyncTaskService | None = None
task_scheduler = None
notification_event_consumer = None
channel_subscriber = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle events."""
    global async_task_service, notification_event_consumer, channel_subscriber
    task_scheduler = None

    # Startup
    try:
        import os

        if os.getenv("AIUTOX_LICENSE_ENFORCEMENT", "on").lower() == "on":
            load_license_keys()
            logger.info("License public key loaded")
    except Exception as e:
        logger.warning(f"License key not loaded (enforcement=on but key missing): {e}")

    try:
        db = SessionLocal()
        async_task_service = AsyncTaskService(db)
        await async_task_service.start_scheduler()
        logger.info("Async task scheduler started")
    except Exception as e:
        logger.error(f"Failed to start async task scheduler: {e}", exc_info=True)

    # Start TaskScheduler for task reminders and notifications
    try:
        from app.core.tasks.scheduler import get_task_scheduler

        task_scheduler = await get_task_scheduler()
        logger.info("TaskScheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start TaskScheduler: {e}", exc_info=True)

    # Start SLA Escalation Scheduler for work order SLA management
    try:
        from app.modules.real_estate.maintenance.scheduler import start_scheduler

        start_scheduler()
        logger.info("SLA escalation scheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start SLA escalation scheduler: {e}", exc_info=True)

    # Start NotificationEventConsumer for event-driven notifications
    try:
        from app.core.notifications.consumer import NotificationEventConsumer

        notification_db = SessionLocal()
        notification_event_consumer = NotificationEventConsumer(notification_db)
        await notification_event_consumer.start()
        logger.info("NotificationEventConsumer started successfully")
    except Exception as e:
        logger.error(f"Failed to start NotificationEventConsumer: {e}", exc_info=True)

    # Start ChannelSubscriber to route inbound channel messages to ConversationEngine
    try:
        from app.core.automation.channel_subscriber import ChannelSubscriber

        channel_db = SessionLocal()
        channel_subscriber = ChannelSubscriber(channel_db)
        await channel_subscriber.start()
        logger.info("ChannelSubscriber started successfully")
    except Exception as e:
        logger.error(f"Failed to start ChannelSubscriber: {e}", exc_info=True)

    # Initialize global ModuleRegistry for dynamic module management endpoints.
    try:
        registry_db = SessionLocal()
        try:
            module_registry = ModuleRegistry(db=registry_db)
            module_registry.discover_modules(Path(__file__).parent)
            module_registry.discover_plugins()
            module_registry.resolve_dependencies()
            set_module_registry(module_registry)
            logger.info(
                "ModuleRegistry initialized with %s discovered modules",
                len(module_registry.get_all_modules()),
            )
        finally:
            registry_db.close()
    except Exception as e:
        logger.error(f"Failed to initialize ModuleRegistry: {e}", exc_info=True)

    # Scan enabled modules for AI capabilities and register them
    try:
        from app.core.automation.ai.capability_registry import capability_registry
        from app.core.automation.ai.conversation_engine import _build_provider

        ai_scan_db = SessionLocal()
        try:
            scan_provider = None
            try:
                from app.core.automation.ai.models import AILLMProviderConfig

                provider_config = (
                    ai_scan_db.query(AILLMProviderConfig)
                    .filter(AILLMProviderConfig.is_active == True)  # noqa: E712
                    .first()
                )
                if provider_config is not None:
                    scan_provider = _build_provider(provider_config)
            except Exception as prov_exc:
                logger.debug(
                    "No AI provider available for embedding scan: %s", prov_exc
                )
            n = await capability_registry.scan(ai_scan_db, provider=scan_provider)
            logger.info(f"AI capability scan complete: {n} capabilities registered")
        finally:
            ai_scan_db.close()
    except Exception as e:
        logger.error(f"Failed to initialize AI capability registry: {e}", exc_info=True)

    # Seed Ley 820 automation rules for all active tenants (idempotent)
    try:
        from app.core.tenants.models import Tenant
        from app.modules.real_estate.leases.installer import LeaseModuleInstaller

        seed_db = SessionLocal()
        try:
            tenants = seed_db.query(Tenant).filter(Tenant.is_active.is_(True)).all()
            for tenant in tenants:
                result = LeaseModuleInstaller.seed_automation_rules(seed_db, tenant.id)
                logger.info(
                    f"Lease automation rules seeded: tenant={tenant.id} "
                    f"created={result['created']} skipped={result['skipped']}"
                )
        finally:
            seed_db.close()
    except Exception as e:
        logger.error(f"Failed to seed lease automation rules: {e}", exc_info=True)

    # Discover and register webhook events from active modules
    try:
        from app.core.integrations.autodiscovery import discover_and_register_events

        discover_and_register_events()
        logger.info("Webhook events autodiscovery completed")
    except Exception as e:
        logger.error(f"Failed to discover webhook events: {e}", exc_info=True)

    # Start grace period reminder scheduler (DoD#10)
    try:
        from app.core.tenant_modules.grace_period_scheduler import (
            start_grace_period_scheduler,
        )

        start_grace_period_scheduler()
        logger.info("Grace period scheduler started")
    except Exception as e:
        logger.error(f"Failed to start grace period scheduler: {e}", exc_info=True)

    # Start insights MV refresh scheduler (every 5 min)
    try:
        from app.core.insights.refresh_scheduler import start_insights_scheduler

        start_insights_scheduler()
        logger.info("Insights refresh scheduler started")
    except Exception as e:
        logger.error(f"Failed to start insights scheduler: {e}", exc_info=True)

    # Start digest subscription scheduler (every 15 min)
    try:
        from app.core.automation.ai.digest_job import start_digest_scheduler

        start_digest_scheduler()
        logger.info("Digest scheduler started")
    except Exception as e:
        logger.error(f"Failed to start digest scheduler: {e}", exc_info=True)

    # Start agent timeout scheduler (every hour — cancel stale agent runs)
    try:
        from app.core.automation.ai.agent_timeout_job import (
            start_agent_timeout_scheduler,
        )

        start_agent_timeout_scheduler()
        logger.info("Agent timeout scheduler started")
    except Exception as e:
        logger.error(f"Failed to start agent timeout scheduler: {e}", exc_info=True)

    # Start conversation cleanup scheduler (every 6h — auto-archive and purge)
    try:
        from app.core.automation.ai.conversation_cleanup_job import (
            start_conversation_cleanup_scheduler,
        )

        start_conversation_cleanup_scheduler()
        logger.info("Conversation cleanup scheduler started")
    except Exception as e:
        logger.error(
            f"Failed to start conversation cleanup scheduler: {e}", exc_info=True
        )

    yield

    # Shutdown
    # Stop insights refresh scheduler
    try:
        from app.core.insights.refresh_scheduler import stop_insights_scheduler

        stop_insights_scheduler()
        logger.info("Insights scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping insights scheduler: {e}", exc_info=True)

    # Stop grace period scheduler
    try:
        from app.core.tenant_modules.grace_period_scheduler import (
            stop_grace_period_scheduler,
        )

        stop_grace_period_scheduler()
        logger.info("Grace period scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping grace period scheduler: {e}", exc_info=True)

    # Stop TaskScheduler
    if task_scheduler:
        try:
            from app.core.tasks.scheduler import stop_task_scheduler

            await stop_task_scheduler()
            logger.info("TaskScheduler stopped successfully")
        except Exception as e:
            logger.error(f"Error stopping TaskScheduler: {e}", exc_info=True)

    # Stop digest scheduler
    try:
        from app.core.automation.ai.digest_job import stop_digest_scheduler

        stop_digest_scheduler()
        logger.info("Digest scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping digest scheduler: {e}", exc_info=True)

    # Stop agent timeout scheduler
    try:
        from app.core.automation.ai.agent_timeout_job import (
            stop_agent_timeout_scheduler,
        )

        stop_agent_timeout_scheduler()
        logger.info("Agent timeout scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping agent timeout scheduler: {e}", exc_info=True)

    # Stop conversation cleanup scheduler
    try:
        from app.core.automation.ai.conversation_cleanup_job import (
            stop_conversation_cleanup_scheduler,
        )

        stop_conversation_cleanup_scheduler()
        logger.info("Conversation cleanup scheduler stopped")
    except Exception as e:
        logger.error(
            f"Error stopping conversation cleanup scheduler: {e}", exc_info=True
        )

    # Stop SLA Escalation Scheduler
    try:
        from app.modules.real_estate.maintenance.scheduler import stop_scheduler

        stop_scheduler()
        logger.info("SLA escalation scheduler stopped successfully")
    except Exception as e:
        logger.error(f"Error stopping SLA escalation scheduler: {e}", exc_info=True)

    # Stop NotificationEventConsumer
    if notification_event_consumer:
        try:
            await notification_event_consumer.stop()
            if hasattr(notification_event_consumer, "db"):
                notification_event_consumer.db.close()
            logger.info("NotificationEventConsumer stopped successfully")
        except Exception as e:
            logger.error(
                f"Error stopping NotificationEventConsumer: {e}", exc_info=True
            )

    # Stop ChannelSubscriber
    if channel_subscriber:
        try:
            await channel_subscriber.stop()
            logger.info("ChannelSubscriber stopped successfully")
        except Exception as e:
            logger.error(f"Error stopping ChannelSubscriber: {e}", exc_info=True)

    if async_task_service:
        try:
            await async_task_service.stop_scheduler()
            if hasattr(async_task_service, "db"):
                async_task_service.db.close()
            logger.info("Async task scheduler stopped")
        except Exception as e:
            logger.error(f"Error stopping async task scheduler: {e}", exc_info=True)


# Disable API documentation in production for security
# In production (ENV=prod, DEBUG=false), Swagger/OpenAPI endpoints are disabled
app = FastAPI(
    title="AiutoX ERP API",
    version="0.1.0",
    description="Backend API para AiutoX ERP",
    docs_url="/docs" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Configure rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]


# CORS configuration
if settings.CORS_ORIGINS:
    origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
else:
    origins = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pure ASGI middlewares (no BaseHTTPMiddleware -- fixes SSE/StreamingResponse bug)
app.add_middleware(SecurityHeadersMiddleware, debug=settings.DEBUG)
app.add_middleware(ModuleStateMiddleware)
app.add_middleware(LicenseMiddleware)


add_tier_exception_handler(app)


@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    """Handle APIException and return standard error format."""
    detail = exc.detail if isinstance(exc.detail, dict) else {"error": exc.detail}
    response_content: dict = {**detail, "data": None}
    response = JSONResponse(
        status_code=exc.status_code,
        content=response_content,
    )
    origin = request.headers.get("origin")
    if origin and origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    add_security_headers(response, debug=settings.DEBUG)
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors and format them according to API contract."""
    logger.warning(
        "Validation error on %s %s: %s", request.method, request.url.path, exc.errors()
    )

    for error in exc.errors():
        msg = error.get("msg", "")
        if "Invalid color format" in msg and "#RRGGBB" in msg:
            field_name = None
            if "for '" in msg:
                start = msg.find("for '") + 5
                end = msg.find("':", start)
                if end > start:
                    field_name = msg[start:end]

            response = JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": {
                        "code": "INVALID_COLOR_FORMAT",
                        "message": msg,
                        "details": {
                            "key": field_name,
                            "value": error.get("input", ""),
                            "expected_format": "#RRGGBB",
                        },
                    },
                    "data": None,
                },
            )
            add_security_headers(response, debug=settings.DEBUG)
            return response

    details: dict[str, Any] = {}
    for error in exc.errors():
        field_path = error["loc"]
        field_name = field_path[-1] if len(field_path) > 1 else field_path[0]
        if field_name not in details:
            details[field_name] = []
        details[field_name].append(error["msg"])

    response = JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Validation failed",
                "details": details,
            },
            "data": None,
        },
    )
    origin = request.headers.get("origin")
    if origin and origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    add_security_headers(response, debug=settings.DEBUG)
    return response


@app.get("/healthz", tags=["system"])
def healthz():
    """Health check endpoint."""
    return {
        "status": "ok",
        "env": settings.ENV,
        "debug": settings.DEBUG,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all unhandled exceptions and ensure CORS headers are added."""
    logger.exception("Unhandled exception: %s", exc)

    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred",
                "details": {"error": str(exc)} if settings.DEBUG else None,
            },
            "data": None,
        },
    )

    origin = request.headers.get("origin")
    if origin and origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"

    add_security_headers(response, debug=settings.DEBUG)
    return response


# Include API routers
app.include_router(get_api_router(), prefix="/api/v1")

# Mount static files for file storage
# This allows serving uploaded files from /files/ path
# STATUS: ✅ Configurado y funcionando (2026-01-13)
# NOTA: Los archivos se sirven desde backend/storage/
storage_path = os.getenv("STORAGE_BASE_PATH", "./storage")
if os.path.exists(storage_path):
    app.mount("/files", StaticFiles(directory=storage_path), name="files")
    logger.info(f"Mounted static files from {storage_path} at /files")
else:
    logger.warning(
        f"Storage directory {storage_path} does not exist, static files not mounted"
    )

# Encoding middlewares LAST (execute FIRST in the middleware chain)
app.add_middleware(RequestBodyEncodingMiddleware)
app.add_middleware(HeaderEncodingMiddleware)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # nosec B104
        port=8000,
        reload=True,
    )
