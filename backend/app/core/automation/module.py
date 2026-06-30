"""AutomationModule — ModuleInterface implementation for the Automation core module."""

from fastapi import APIRouter

from app.core.module_interface import ModuleInterface, ModuleNavigationItem


class AutomationModule(ModuleInterface):
    """Core Automation module: rules engine + AI embedded assistant."""

    @property
    def module_id(self) -> str:
        return "automation"

    @property
    def module_type(self) -> str:
        return "core"

    @property
    def module_name(self) -> str:
        return "Automatización"

    @property
    def description(self) -> str:
        return "Motor de reglas y asistente IA embebido."

    @property
    def enabled(self) -> bool:
        return True

    def get_dependencies(self) -> list[str]:
        return ["auth", "users", "pubsub"]

    def get_router(self) -> APIRouter | None:
        from app.core.automation.router import router

        return router

    def get_models(self) -> list:
        from app.core.automation.ai.models import (
            AICapabilityRegistration,
            AIConfig,
            AIConversation,
            AIConversationMemory,
            AIConversationMessage,
            AILLMProviderConfig,
        )
        from app.core.automation.models import (
            AutomationExecution,
            Rule,
            RuleVersion,
        )

        return [
            Rule,
            RuleVersion,
            AutomationExecution,
            AILLMProviderConfig,
            AIConversation,
            AIConversationMessage,
            AIConversationMemory,
            AICapabilityRegistration,
            AIConfig,
        ]

    def get_navigation_items(self) -> list[ModuleNavigationItem]:
        return [
            ModuleNavigationItem(
                id="automation.main",
                label="Automatización",
                path="/automation",
                permission="automation.read",
                icon="flash",
                order=0,
            ),
        ]

    def get_settings_navigation(self) -> list[ModuleNavigationItem]:
        return [
            ModuleNavigationItem(
                id="automation.config",
                label="Configuración IA",
                path="/config/automation",
                permission="ai.config",
                icon="settings",
                order=0,
            ),
            ModuleNavigationItem(
                id="automation.ai-provider",
                label="Proveedor IA",
                path="/settings/ai-provider",
                permission="ai.config",
                icon="plug",
                order=10,
            ),
        ]
