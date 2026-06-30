"""Service for mention management."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.mentions.models import Mention


class MentionService:
    """Service for managing mentions."""

    def __init__(self, session: Session):
        """Initialize the mention service."""
        self.session = session

    def create_mention(
        self,
        tenant_id: UUID,
        user_id: UUID,
        mencionable_type: str,
        mencionable_id: UUID,
    ) -> Mention:
        """Create a new mention.

        Args:
            tenant_id: ID of the tenant
            user_id: ID of the mentioned user
            mencionable_type: Type of entity being mentioned in
            mencionable_id: ID of the entity being mentioned in

        Returns:
            Created Mention object
        """
        mention = Mention(
            tenant_id=tenant_id,
            user_id=user_id,
            mencionable_type=mencionable_type,
            mencionable_id=mencionable_id,
        )
        self.session.add(mention)
        self.session.flush()
        self.session.refresh(mention)
        return mention

    def resolve_mention(self, mention_id: UUID) -> Mention | None:
        """Resolve a mention (mark as read/handled).

        Args:
            mention_id: ID of the mention to resolve

        Returns:
            Updated Mention object or None if not found
        """
        mention = self.session.query(Mention).filter(Mention.id == mention_id).first()
        if mention:
            mention.resolved = True
            self.session.flush()
            self.session.refresh(mention)
        return mention

    def get_mentions_for_user(
        self, tenant_id: UUID, user_id: UUID, resolved: bool = False
    ) -> list[Mention]:
        """Get all mentions for a user.

        Args:
            tenant_id: ID of the tenant
            user_id: ID of the user
            resolved: Filter by resolved status

        Returns:
            List of Mention objects
        """
        return (
            self.session.query(Mention)
            .filter(
                Mention.tenant_id == tenant_id,
                Mention.user_id == user_id,
                Mention.resolved == resolved,
            )
            .all()
        )

    def get_mentions_for_entity(
        self, tenant_id: UUID, mencionable_type: str, mencionable_id: UUID
    ) -> list[Mention]:
        """Get all mentions for an entity.

        Args:
            tenant_id: ID of the tenant
            mencionable_type: Type of entity
            mencionable_id: ID of entity

        Returns:
            List of Mention objects
        """
        return (
            self.session.query(Mention)
            .filter(
                Mention.tenant_id == tenant_id,
                Mention.mencionable_type == mencionable_type,
                Mention.mencionable_id == mencionable_id,
            )
            .all()
        )
