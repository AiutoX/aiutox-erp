/**
 * CommentRevisionHistory component (CMT-008)
 * Read-only list of a comment's prior content versions — moderation/
 * accountability visibility only. Rendered exclusively behind a
 * comments.manage gate by the caller; this component does not check
 * permissions itself.
 */

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useCommentRevisions } from "~/features/comments/hooks/useComments";
import { useUser } from "~/features/users/hooks/useUsers";

interface CommentRevisionHistoryProps {
  commentId: string;
}

function RevisionRow({ editedBy, content, createdAt }: {
  editedBy: string | null;
  content: string;
  createdAt: string;
}) {
  const { t } = useTranslation();
  const { user } = useUser(editedBy);
  const editorName = user?.full_name || user?.email || t("comments.unknownAuthor");

  return (
    <li className="border-l-2 border-muted pl-3 py-1">
      <div className="text-xs text-muted-foreground">
        {editorName} — {format(new Date(createdAt), "PPPp", { locale: es })}
      </div>
      <div className="text-sm">{content}</div>
    </li>
  );
}

export function CommentRevisionHistory({ commentId }: CommentRevisionHistoryProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useCommentRevisions(commentId);
  const revisions = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground">
        {t("comments.status.loading")}
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        {t("comments.revisions.empty")}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {revisions.map((revision) => (
        <RevisionRow
          key={revision.id}
          editedBy={revision.edited_by}
          content={revision.content}
          createdAt={revision.created_at}
        />
      ))}
    </ul>
  );
}
