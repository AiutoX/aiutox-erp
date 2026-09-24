"""SearchProvider for the users module (SRC-006) — people search.

Security-critical design, per explicit user decision (PRD FR-11):
- Name (first_name/last_name/full_name) is fuzzy-searchable free text.
- Email is searchable ONLY via exact/prefix match on the normalized
  exact_match_value column — never folded into the fuzzy full-text
  search_vector. A fragment of an email (e.g. a domain) must not match.
- Job title/department are explicitly OUT of Phase 1 scope (not indexed).
- Base permission is "users.view" — a deliberately weak, directory-style
  permission distinct from "auth.manage_users" (which gates real user
  administration). Any authenticated tenant user can look up a colleague by
  name/email, like a standard internal directory (Slack/Google Workspace).
  "users.view" is not registered anywhere in the role catalog because it
  doesn't need to be — the existing wildcard matcher (has_permission())
  already resolves it via "*.*.view"/"*" for viewer/owner roles with no new
  registration required.
"""

from app.core.search.handler import SearchIndexDefinition, SearchProvider
from app.core.users.models import User


class UsersSearchProvider(SearchProvider):
    """Makes users searchable by name (fuzzy) and email (exact only)."""

    def __init__(self, db):
        self.db = db

    def get_index_definition(self) -> SearchIndexDefinition:
        return SearchIndexDefinition(
            entity_type="user",
            model_class=User,
            search_columns=["full_name", "first_name", "last_name"],
            label_column="full_name",
            permission="users.view",
            url_template="/users/{id}",
            icon="user",
            exact_match_column="email",
        )
