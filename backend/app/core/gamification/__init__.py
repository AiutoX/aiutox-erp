"""Gamification module for AiutoX ERP.

Provides points, badges, leaderboards, and event-driven gamification.
"""

from __future__ import annotations

from aiutox_sdk.config import ConfigService
from aiutox_sdk.module_interface import ModuleInterface, ModuleNavigationItem
from fastapi import APIRouter
from sqlalchemy.orm import Session

from app.core.gamification.models import (
    Badge,
    GamificationEvent,
    LeaderboardEntry,
    UserBadge,
    UserPoints,
)


class GamificationModule(ModuleInterface):
    """Gamification module for points, badges, and leaderboards."""

    def __init__(self, db: Session | None = None):
        self._db = db
        self._config_service = ConfigService(db) if db else None

    @property
    def module_id(self) -> str:
        return "gamification"

    @property
    def module_type(self) -> str:
        return "core"

    @property
    def enabled(self) -> bool:
        return True

    def get_router(self) -> APIRouter | None:
        from app.core.gamification.api import router

        return router

    def get_models(self) -> list:
        return [GamificationEvent, UserPoints, Badge, UserBadge, LeaderboardEntry]

    def get_dependencies(self) -> list[str]:
        return ["auth", "users", "pubsub", "tasks"]

    def get_navigation_items(self) -> list[ModuleNavigationItem]:
        return [
            ModuleNavigationItem(
                id="gamification.main",
                label="Mis Logros",
                label_key="gamification.nav.main",
                path="/gamification",
                permission="gamification.view",
                icon="medal",
                order=0,
            ),
        ]

    def get_settings_navigation(self) -> list[ModuleNavigationItem]:
        return [
            ModuleNavigationItem(
                id="gamification.manager",
                label="Gamificación",
                label_key="gamification.nav.manager",
                path="/gamification/manager",
                permission="gamification.manage",
                icon="award",
                category="Configuración",
                order=130,
            ),
        ]

    def get_settings_schema(self) -> list[dict]:
        return [
            {
                "key": "points.enabled",
                "label": "Sistema de puntos",
                "type": "boolean",
                "default": True,
                "description": "Habilita la acumulación de puntos por actividad",
            },
            {
                "key": "badges.enabled",
                "label": "Insignias (badges)",
                "type": "boolean",
                "default": True,
                "description": "Habilita la obtención de insignias por logros",
            },
            {
                "key": "leaderboard.enabled",
                "label": "Tabla de líderes",
                "type": "boolean",
                "default": True,
                "description": "Muestra la clasificación global de usuarios por puntos",
            },
            {
                "key": "streaks.enabled",
                "label": "Rachas de actividad (streaks)",
                "type": "boolean",
                "default": True,
                "description": "Activa el seguimiento de rachas de actividad continua",
            },
            {
                "key": "points_per_task",
                "label": "Puntos por tarea completada",
                "type": "number",
                "default": 10,
                "description": "Puntos que se otorgan al completar una tarea",
                "min_value": 0,
                "max_value": 1000,
            },
            {
                "key": "priority_bonus_urgent",
                "label": "Bono por prioridad urgente",
                "type": "number",
                "default": 20,
                "description": "Puntos extra al completar una tarea de prioridad urgente",
                "min_value": 0,
                "max_value": 1000,
            },
            {
                "key": "priority_bonus_high",
                "label": "Bono por prioridad alta",
                "type": "number",
                "default": 10,
                "description": "Puntos extra al completar una tarea de prioridad alta",
                "min_value": 0,
                "max_value": 1000,
            },
            {
                "key": "on_time_bonus",
                "label": "Bono por completar a tiempo",
                "type": "number",
                "default": 15,
                "description": "Puntos extra al completar una tarea antes de su fecha límite",
                "min_value": 0,
                "max_value": 1000,
            },
            {
                "key": "streak_bonus_threshold",
                "label": "Racha mínima para bono",
                "type": "number",
                "default": 7,
                "description": "Días consecutivos de actividad necesarios para activar el bono de racha",
                "min_value": 1,
                "max_value": 365,
            },
            {
                "key": "streak_bonus_points",
                "label": "Puntos por bono de racha",
                "type": "number",
                "default": 10,
                "description": "Puntos extra otorgados al alcanzar la racha mínima configurada",
                "min_value": 0,
                "max_value": 1000,
            },
        ]

    @property
    def module_name(self) -> str:
        return "Gamificación"

    @property
    def description(self) -> str:
        return (
            "Sistema de gamificación: puntos, niveles, badges, streaks y leaderboards."
        )


def create_module(db: Session | None = None) -> GamificationModule:
    return GamificationModule(db)
