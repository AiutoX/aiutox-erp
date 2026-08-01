/**
 * CommentForm component
 * Form for creating and editing comments
 */

import { useMemo, useRef, useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent } from "~/components/ui/card";
import { Paperclip, X } from "lucide-react";
import { useUsers } from "~/features/users/hooks/useUsers";
import {
  resolveMentionsForSubmit,
  type SelectedMention,
} from "~/features/comments/utils/mentions";

interface CommentFormProps {
  onSubmit: (content: string, file?: File) => void;
  onCancel?: () => void;
  initialContent?: string;
  placeholder?: string;
  buttonText?: string;
  loading?: boolean;
  // Gated by the consuming module's own comments_attachments_enabled
  // tenant config (e.g. tasks' /tasks/settings) — false by default so no
  // dead affordance is ever shown before a caller explicitly opts in.
  attachmentsEnabled?: boolean;
}

/** Finds an in-progress "@partial" token ending at the cursor, if any. */
function findMentionQuery(
  value: string,
  cursor: number
): { query: string; start: number } | null {
  const uptoCursor = value.slice(0, cursor);
  const match = uptoCursor.match(/(?:^|\s)@(\w*)$/);
  if (!match) return null;
  const query = match[1] ?? "";
  const start = uptoCursor.length - query.length - 1; // position of '@'
  return { query, start };
}

export function CommentForm({
  onSubmit,
  onCancel,
  initialContent = "",
  placeholder = "Escribe un comentario...",
  buttonText = "Comentar",
  loading = false,
  attachmentsEnabled = false,
}: CommentFormProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState(initialContent);
  const [selectedMentions, setSelectedMentions] = useState<SelectedMention[]>(
    []
  );
  const [mentionQuery, setMentionQuery] = useState<{
    query: string;
    start: number;
  } | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { users } = useUsers(
    { search: mentionQuery?.query ?? "", page_size: 5 },
    { enabled: mentionQuery !== null }
  );
  const mentionCandidates = useMemo(
    () => (mentionQuery ? users : []),
    [mentionQuery, users]
  );

  const submitContent = () => {
    if (content.trim()) {
      onSubmit(
        resolveMentionsForSubmit(content.trim(), selectedMentions),
        stagedFile ?? undefined
      );
      setContent("");
      setSelectedMentions([]);
      setMentionQuery(null);
      setStagedFile(null);
    }
  };

  const handleCancel = () => {
    setContent("");
    setSelectedMentions([]);
    setMentionQuery(null);
    setStagedFile(null);
    if (onCancel) {
      onCancel();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setStagedFile(file ?? null);
  };

  const clearStagedFile = () => {
    setStagedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    setMentionQuery(findMentionQuery(value, e.target.selectionStart ?? value.length));
  };

  const applyMention = (userId: string, name: string) => {
    if (!mentionQuery || !textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart ?? content.length;
    const before = content.slice(0, mentionQuery.start);
    const after = content.slice(cursor);
    // Only "@Name" ever appears in the textarea — the real user id lives
    // only in selectedMentions, resolved into a real token at submit time
    // (see resolveMentionsForSubmit), never shown on screen.
    const next = `${before}@${name} ${after}`;
    setContent(next);
    setSelectedMentions((prev) => [...prev, { name, userId }]);
    setMentionQuery(null);
    // Restore focus so the user can keep typing after picking a mention.
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* No <form> here: this component is embedded inside host screens
            (e.g. TaskEdit.tsx) that already render their own <form>, and
            nested <form> elements are invalid HTML. */}
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder={placeholder}
              rows={3}
              className="resize-none"
              disabled={loading}
            />
            {mentionQuery && mentionCandidates.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-w-xs rounded-md border bg-popover shadow-md">
                {mentionCandidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() =>
                      applyMention(
                        candidate.id,
                        candidate.full_name || candidate.email
                      )
                    }
                  >
                    <span className="font-medium">
                      {candidate.full_name || candidate.email}
                    </span>
                    {candidate.full_name && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {candidate.email}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {attachmentsEnabled && (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                id="comment-attachment-input"
                aria-label={t("comments.attachment.upload")}
                className="hidden"
                onChange={handleFileSelected}
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Paperclip className="h-3.5 w-3.5 mr-2" />
                {t("comments.attachment.upload")}
              </Button>
              {stagedFile && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {stagedFile.name}
                  <button
                    type="button"
                    onClick={clearStagedFile}
                    aria-label={t("common.cancel")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
              >
                {t("common.cancel")}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={submitContent}
              disabled={!content.trim() || loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  <span>{t("common.saving")}</span>
                </div>
              ) : (
                buttonText
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
