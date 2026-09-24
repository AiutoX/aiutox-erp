/**
 * Comment author resolution helpers
 */

interface UserLike {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
}

/**
 * Resolves a display name for a comment's author from an already-loaded user
 * list. Falls back through first/last name, then full_name, then a provided
 * fallback (never renders "null null" for users seeded without first/last
 * name, e.g. seed users that only set full_name).
 */
export function resolveCommentAuthorName(
  users: UserLike[],
  createdBy: string | null | undefined,
  fallback: string
): string {
  const author = users.find((u) => u.id === createdBy);
  if (!author) return fallback;

  const composedName = [author.first_name, author.last_name]
    .filter(Boolean)
    .join(" ");

  return composedName || author.full_name || fallback;
}
