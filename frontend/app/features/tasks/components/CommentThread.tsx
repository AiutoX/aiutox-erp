/**
 * CommentThread Component
 * Thread de comentarios con menciones
 * Sprint 2.4 - Fase 2
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Comment01Icon,
  Delete01Icon,
  Edit01Icon,
  Pen01Icon,
} from "@hugeicons/core-free-icons";
import {
  useTaskComments,
  useAddComment,
  useUpdateComment,
  useDeleteComment,
} from "../hooks/useTaskComments";
import { useUsers } from "~/features/users/hooks/useUsers";
import { useAuthStore } from "~/stores/authStore";
import { showToast } from "~/components/common/Toast";
import { format } from "date-fns";

interface CommentThreadProps {
  taskId: string;
  showTitle?: boolean;
}

export function CommentThread({
  taskId,
  showTitle = true,
}: CommentThreadProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const { data, isLoading } = useTaskComments(taskId);
  const { users } = useUsers();
  const addMutation = useAddComment();
  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();

  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const comments = data?.data || [];

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      return `${user.first_name} ${user.last_name}`.trim() || user.email;
    }
    return "Usuario";
  };

  const getUserInitials = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      const first = user.first_name?.[0] || "";
      const last = user.last_name?.[0] || "";
      return (
        (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U"
      );
    }
    return "U";
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match[2]) {
        mentions.push(match[2]); // El ID está en el segundo grupo
      }
    }

    return mentions;
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const mentions = extractMentions(newComment);
      await addMutation.mutateAsync({
        taskId,
        content: newComment,
        mentions: mentions.length > 0 ? mentions : undefined,
      });

      setNewComment("");
      showToast(t("tasks.comments.commentAdded"), "success");
    } catch (error) {
      console.error("Error adding comment:", error);
      showToast(t("tasks.comments.errorAdding"), "error");
    }
  };

  const handleStartEdit = (commentId: string, content: string) => {
    setEditingId(commentId);
    setEditContent(content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await updateMutation.mutateAsync({
        taskId,
        commentId,
        content: editContent,
      });

      setEditingId(null);
      setEditContent("");
      showToast(t("tasks.comments.commentUpdated"), "success");
    } catch (error) {
      console.error("Error updating comment:", error);
      showToast(t("tasks.comments.errorUpdating"), "error");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm(t("tasks.comments.delete") + "?")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ taskId, commentId });
      showToast(t("tasks.comments.commentDeleted"), "success");
    } catch (error) {
      console.error("Error deleting comment:", error);
      showToast(t("tasks.comments.errorDeleting"), "error");
    }
  };

  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle>{t("tasks.comments.title") || "Comentarios"}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("tasks.comments.title") || "Comentarios"} ({comments.length})
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-3 pt-0">
        {/* Lista de comentarios */}
        <div className="space-y-2">
          {comments.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <HugeiconsIcon
                icon={Comment01Icon}
                size={32}
                className="mx-auto mb-1 opacity-50"
              />
              <p className="text-xs">
                {t("tasks.comments.noComments") || "No hay comentarios"}
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getUserInitials(comment.user_id)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-medium">
                        {getUserName(comment.user_id)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "dd/MM HH:mm")}
                      </span>
                    </div>

                    {currentUser?.id === comment.user_id && (
                      <div className="flex items-center space-x-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() =>
                            handleStartEdit(comment.id, comment.content)
                          }
                          disabled={editingId !== null}
                        >
                          <HugeiconsIcon icon={Edit01Icon} size={10} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                          onClick={() => void handleDeleteComment(comment.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <HugeiconsIcon icon={Delete01Icon} size={10} />
                        </Button>
                      </div>
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <div className="space-y-1.5">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[40px] text-xs"
                      />
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={handleCancelEdit}
                        >
                          {t("tasks.comments.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => void handleUpdateComment(comment.id)}
                          disabled={updateMutation.isPending}
                        >
                          {t("tasks.comments.save")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Formulario nuevo comentario */}
        <div className="pt-3 border-t space-y-1.5">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              t("tasks.comments.placeholder") || "Escribe un comentario..."
            }
            className="min-h-[60px] text-xs"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => void handleAddComment()}
              disabled={!newComment.trim() || addMutation.isPending}
              size="sm"
              className="h-7 text-xs"
            >
              <HugeiconsIcon icon={Pen01Icon} size={12} className="mr-1" />
              {addMutation.isPending
                ? t("tasks.comments.sending")
                : t("tasks.comments.send")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
