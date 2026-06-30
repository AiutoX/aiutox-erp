"""Template service for business logic."""

from uuid import UUID

from jinja2 import Template as JinjaTemplate
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.core.templates.events import (
    TemplateEventPublisher,
    get_template_event_publisher,
)
from app.core.templates.models import RenderedTemplate, Template, TemplateVersion
from app.core.templates.renderer import TemplateRenderer

logger = get_logger(__name__)


class TemplateService:
    """Service for template management and rendering."""

    def __init__(
        self, db: Session, event_publisher: TemplateEventPublisher | None = None
    ):
        """Initialize template service."""
        self.db = db
        self.event_publisher: TemplateEventPublisher = (
            event_publisher
            if event_publisher is not None
            else get_template_event_publisher()
        )
        self.renderer = TemplateRenderer()

    # -------------------------------------------------------------------------
    # Template CRUD
    # -------------------------------------------------------------------------

    async def create_template(
        self,
        template_data: dict | None = None,
        tenant_id: UUID | None = None,
        user_id: UUID | None = None,
        **kwargs,
    ) -> Template:
        """Create a new template from a dict payload or keyword arguments."""
        if template_data is None:
            template_data = kwargs
        if tenant_id is None:
            raise ValueError("tenant_id is required")
        body = template_data.get("body") or template_data.get("content", "")
        # Store deprecated fields in template_metadata for backward compat
        meta = dict(template_data.get("metadata") or {})
        if template_data.get("template_type"):
            meta["template_type"] = template_data["template_type"]
        if template_data.get("template_format"):
            meta["template_format"] = template_data["template_format"]
        template = Template(
            tenant_id=tenant_id,
            name=template_data["name"],
            body=body,
            description=template_data.get("description"),
            category=template_data.get("category"),
            variables=template_data.get("variables") or [],
            is_active=template_data.get("is_active", True),
            version=1,
            template_metadata=meta or None,
        )
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)

        # Create initial version record
        version = TemplateVersion(
            tenant_id=tenant_id,
            template_id=template.id,
            version_number=1,
            content=body,
            variables=template_data.get("variables"),
            is_current=True,
            created_by=user_id,
        )
        self.db.add(version)
        self.db.commit()
        logger.info(f"Template created: {template.id} ({template.name})")
        return template

    def get_template(self, template_id: UUID, tenant_id: UUID) -> Template | None:
        """Get a template by ID."""
        return (
            self.db.query(Template)
            .filter(
                and_(
                    Template.id == template_id,
                    Template.tenant_id == tenant_id,
                )
            )
            .first()
        )

    def get_templates(
        self,
        tenant_id: UUID,
        template_type: str | None = None,
        category: str | None = None,
        is_active: bool | None = True,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Template]:
        """List templates with optional filters."""
        query = self.db.query(Template).filter(Template.tenant_id == tenant_id)

        if category:
            query = query.filter(Template.category == category)
        if is_active is not None:
            query = query.filter(Template.is_active == is_active)

        return (
            query.order_by(Template.created_at.desc()).offset(skip).limit(limit).all()
        )

    # Keep alias for backward compat
    def list_templates(self, *args, **kwargs) -> list[Template]:
        return self.get_templates(*args, **kwargs)

    def update_template(
        self,
        template_id_or_obj=None,
        tenant_id: UUID | None = None,
        template_data: dict | None = None,
        template: "Template | None" = None,
        **kwargs,
    ) -> Template | None:
        """Update a template. Accepts either (template_id, tenant_id, data) or (template_obj, **kwargs)."""
        # Normalize: accept `template=obj` kwarg, positional Template object, or `template_id=...` keyword
        template_id_kw = kwargs.pop("template_id", None)
        obj = template or template_id_or_obj or template_id_kw
        if isinstance(obj, Template):
            template_obj = obj
            template_data = kwargs if template_data is None else template_data
        else:
            if obj is None or tenant_id is None:
                return None
            template_obj = self.get_template(obj, tenant_id)  # type: ignore[assignment]
            if not template_obj:
                return None
            template_data = template_data or {}
        template = template_obj

        body = template_data.get("body") or template_data.get("content")

        if "name" in template_data and template_data["name"] is not None:
            template.name = template_data["name"]
        if "description" in template_data:
            template.description = template_data["description"]
        if "category" in template_data:
            template.category = template_data["category"]
        if "variables" in template_data:
            template.variables = template_data["variables"]
        if "is_active" in template_data and template_data["is_active"] is not None:
            template.is_active = template_data["is_active"]
        if body is not None:
            # Mark previous versions as not current
            self.db.query(TemplateVersion).filter(
                TemplateVersion.template_id == template.id,
                TemplateVersion.is_current,
            ).update({"is_current": False})

            template.body = body
            template.version = (template.version or 1) + 1

            # Create new version record
            new_version = TemplateVersion(
                tenant_id=template.tenant_id,
                template_id=template.id,
                version_number=template.version,
                content=body,
                variables=template_data.get("variables"),
                is_current=True,
            )
            self.db.add(new_version)

        self.db.commit()
        self.db.refresh(template)
        logger.info(f"Template updated: {template.id}")
        return template

    def delete_template(
        self, template_id_or_obj, tenant_id: UUID | None = None
    ) -> bool:
        """Delete a template. Accepts either a Template object or (template_id, tenant_id)."""
        if isinstance(template_id_or_obj, Template):
            template = template_id_or_obj
        else:
            if tenant_id is None:
                return False
            template = self.get_template(template_id_or_obj, tenant_id)  # type: ignore[assignment]
            if not template:
                return False
        self.db.delete(template)
        self.db.commit()
        logger.info(f"Template deleted: {template.id}")
        return True

    # -------------------------------------------------------------------------
    # Versioning
    # -------------------------------------------------------------------------

    def get_template_versions(
        self,
        template_id: UUID,
        tenant_id: UUID,
    ) -> list[TemplateVersion]:
        """Get all versions of a template."""
        return (
            self.db.query(TemplateVersion)
            .filter(
                TemplateVersion.template_id == template_id,
                TemplateVersion.tenant_id == tenant_id,
            )
            .order_by(TemplateVersion.version_number.asc())
            .all()
        )

    # -------------------------------------------------------------------------
    # Rendering
    # -------------------------------------------------------------------------

    def render_template(
        self,
        template_id: UUID,
        tenant_id: UUID,
        variables: dict | None = None,
        format: str | None = None,
    ) -> dict:
        """Render a template with variables."""
        template = self.get_template(template_id, tenant_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")

        context = variables or {}

        try:
            rendered_content = self.renderer.render(template.body, context)
        except Exception:
            # Fall back to simple jinja rendering
            tpl = JinjaTemplate(template.body)
            rendered_content = tpl.render(**context)

        return {
            "rendered_content": rendered_content,
            "format": format or "text",
            "variables_used": context,
        }

    async def render(
        self,
        template_id: UUID,
        tenant_id: UUID,
        context: dict | None = None,
        entity_type: str | None = None,
        entity_id: UUID | None = None,
    ) -> str:
        """Render a template with the given context (async version)."""
        template = self.get_template(template_id, tenant_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")

        ctx = context or {}
        # Use the strict renderer — raises ValueError for missing variables
        rendered_content = self.renderer.render(template.body, ctx)

        # Persist render record
        rendered = RenderedTemplate(
            template_id=template_id,
            tenant_id=tenant_id,
            rendered_content=rendered_content,
            context=ctx,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        self.db.add(rendered)
        self.db.commit()

        # Publish event
        if self.event_publisher:
            await self.event_publisher.publish_template_event(
                event_type="template.rendered",
                template_id=UUID(str(template_id)),
                tenant_id=UUID(str(tenant_id)),
                data={"rendered_id": str(rendered.id) if rendered.id else None},
            )

        return rendered_content

    def get_render_history(
        self,
        template_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[RenderedTemplate]:
        """Get render history for a template."""
        return (
            self.db.query(RenderedTemplate)
            .filter(
                and_(
                    RenderedTemplate.template_id == template_id,
                    RenderedTemplate.tenant_id == tenant_id,
                )
            )
            .order_by(RenderedTemplate.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
