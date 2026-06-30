/**
 * Entity CommentThread Component
 * Componente genérico para comentarios de cualquier entidad (tarea, evento, etc.)
 */

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Comment01Icon,
  Delete01Icon,
  Edit01Icon,
} from "@hugeicons/core-free-icons";
import {
  useTaskComments,
  useAddComment,
  useUpdateComment,
  useDeleteComment,
} from "~/features/tasks/hooks/useTaskComments";
import {
  useEventComments,
  useAddEventComment,
  useUpdateEventComment,
  useDeleteEventComment,
  type EventComment,
} from "~/features/calendar/hooks/useEventComments";
import type { TaskComment } from "~/features/tasks/api/task-comments.api";
import { useUsers } from "~/features/users/hooks/useUsers";
import { useAuthStore } from "~/stores/authStore";
import { showToast } from "~/components/common/Toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EntityCommentThreadProps {
  entityId: string;
  entityType: "task" | "event";
  showTitle?: boolean;
}

export function EntityCommentThread({
  entityId,
  entityType,
  showTitle = true,
}: EntityCommentThreadProps) {
  const currentUser = useAuthStore((state) => state.user);
  const { users } = useUsers();

  // Call all hooks unconditionally
  const taskComments = useTaskComments(entityId);
  const eventComments = useEventComments(entityId);
  const addCommentMutation = useAddComment();
  const addEventCommentMutation = useAddEventComment();
  const updateCommentMutation = useUpdateComment();
  const updateEventCommentMutation = useUpdateEventComment();
  const deleteCommentMutation = useDeleteComment();
  const deleteEventCommentMutation = useDeleteEventComment();

  // Select appropriate hooks based on entity type
  const { data, isLoading } =
    entityType === "task" ? taskComments : eventComments;
  const addMutation =
    entityType === "task" ? addCommentMutation : addEventCommentMutation;

  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const comments = data?.data || [];
  const dateLocale = es; // Por defecto español
  const isSubmitting =
    addMutation.isPending ||
    updateCommentMutation.isPending ||
    updateEventCommentMutation.isPending ||
    deleteCommentMutation.isPending ||
    deleteEventCommentMutation.isPending;

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      if (entityType === "task") {
        await addCommentMutation.mutateAsync({
          taskId: entityId,
          content: newComment.trim(),
        });
      } else {
        await addEventCommentMutation.mutateAsync({
          eventId: entityId,
          comment: { content: newComment.trim() },
        });
      }
      setNewComment("");
    } catch (error) {
      console.error("Error al agregar comentario:", error);
      showToast("Error al agregar comentario", "error");
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      if (entityType === "task") {
        await updateCommentMutation.mutateAsync({
          taskId: entityId,
          commentId,
          content: editContent.trim(),
        });
      } else {
        await updateEventCommentMutation.mutateAsync({
          eventId: entityId,
          commentId,
          update: { content: editContent.trim() },
        });
      }
      setEditingId(null);
      setEditContent("");
    } catch (error) {
      console.error("Error al editar comentario:", error);
      showToast("Error al editar comentario", "error");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      if (entityType === "task") {
        await deleteCommentMutation.mutateAsync({
          taskId: entityId,
          commentId,
        });
      } else {
        await deleteEventCommentMutation.mutateAsync({
          eventId: entityId,
          commentId,
        });
      }
    } catch (error) {
      console.error("Error al eliminar comentario:", error);
      showToast("Error al eliminar comentario", "error");
    }
  };

  const getUserInfo = (userId: string) => {
    return users.find((u) => u.id === userId);
  };

  const getCommentUserId = (comment: TaskComment | EventComment): string => {
    // Task comments use user_id, Event comments use created_by
    return "user_id" in comment ? comment.user_id : comment.created_by;
  };

  const formatUserName = (
    user:
      | {
          first_name?: string | null;
          last_name?: string | null;
          email?: string;
        }
      | undefined
  ) => {
    if (!user) return "Usuario";
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return fullName || user.email || "Usuario";
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP 'a las' HH:mm", {
      locale: dateLocale,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            Cargando comentarios...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Comment01Icon} size={20} />
            Comentarios
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {/* Lista de comentarios */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No hay comentarios aún. Sé el primero en comentar.
            </div>
          ) : (
            comments.map((comment) => {
              const userId = getCommentUserId(comment);
              const userInfo = getUserInfo(userId);
              const isEditing = editingId === comment.id;

              return (
                <div
                  key={comment.id}
                  className="flex gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {userInfo?.first_name?.[0] || userInfo?.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">
                          {formatUserName(userInfo)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>

                      {userId === currentUser?.id && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditContent(comment.content);
                            }}
                          >
                            <HugeiconsIcon icon={Edit01Icon} size={14} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (isSubmitting) return;
                              void handleDeleteComment(comment.id);
                            }}
                          >
                            <HugeiconsIcon icon={Delete01Icon} size={14} />
                          </Button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="Editar comentario..."
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (isSubmitting) return;
                              void handleEditComment(comment.id);
                            }}
                          >
                            Guardar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingId(null);
                              setEditContent("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Formulario para agregar comentario */}
        <div className="space-y-2 pt-4 border-t">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Agregar un comentario..."
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => {
                if (isSubmitting) return;
                void handleAddComment();
              }}
              disabled={!newComment.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? "Enviando..." : "Comentar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
