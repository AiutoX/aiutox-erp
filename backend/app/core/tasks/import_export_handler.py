"""TasksImportExportHandler — bridges generic import/export to real Task rows."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.import_export.handler import ImportExportHandler, ImportResult
from app.core.tasks.service import TaskService


class TasksImportExportHandler(ImportExportHandler):
    """Implements bulk import/export for the tasks module."""

    def __init__(self, db: Session):
        self.db = db
        self.service = TaskService(db)

    async def import_rows(
        self, rows: list[dict], tenant_id: UUID, user_id: UUID
    ) -> ImportResult:
        successful = 0
        failed = 0
        errors: list[dict] = []

        for idx, row in enumerate(rows, start=1):
            title = (row.get("title") or "").strip()
            if not title:
                failed += 1
                errors.append({"row": idx, "errors": ["title is required"]})
                continue

            await self.service.create_task(
                title=title,
                tenant_id=tenant_id,
                created_by_id=user_id,
                description=row.get("description") or None,
            )
            successful += 1

        return ImportResult(successful=successful, failed=failed, errors=errors)

    async def export_rows(
        self, tenant_id: UUID, filters: dict | None = None
    ) -> list[dict]:
        tasks = self.service.get_tasks(tenant_id=tenant_id, limit=10_000)
        return [
            {
                "id": str(task.id),
                "title": task.title,
                "description": task.description or "",
                "status": task.status,
                "priority": task.priority,
            }
            for task in tasks
        ]
