/**
 * CommentThreadCompact Component
 * Thread de comentarios compacto con menciones
 * Sprint 2.4 - Fase 2
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
} from "../hooks/useTaskComments";
import { useUsers } from "~/features/users/hooks/useUsers";
import { useAuthStore } from "~/stores/authStore";
import { showToast } from "~/components/common/Toast";
import { format } from "date-fns";
import type { User } from "~/features/users/types/user.types";

interface CommentThreadCompactProps {
  taskId: string;
  compact?: boolean;
}

export function CommentThreadCompact({
  taskId,
  compact = true,
}: CommentThreadCompactProps) {
  // const { t } = useTranslation(); // Unused for now
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const { user } = useAuthStore();

  const { data: comments, isLoading } = useTaskComments(taskId);
  const addMutation = useAddComment();
  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();
  const { users: usersResponse } = useUsers();

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;

    try {
      await addMutation.mutateAsync({
        taskId,
        content: newComment.trim(),
      });
      setNewComment("");
      showToast("Comentario agregado", "success");
    } catch (error) {
      showToast("Error al agregar comentario", "error");
    }
  };

  const handleEdit = (commentId: string, content: string) => {
    setEditingId(commentId);
    setEditContent(content);
  };

  const handleUpdate = async () => {
    if (!editContent.trim() || !editingId) return;

    try {
      await updateMutation.mutateAsync({
        taskId,
        commentId: editingId,
        content: editContent.trim(),
      });
      setEditingId(null);
      setEditContent("");
      showToast("Comentario actualizado", "success");
    } catch (error) {
      showToast("Error al actualizar comentario", "error");
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteMutation.mutateAsync({
        taskId,
        commentId,
      });
      showToast("Comentario eliminado", "success");
    } catch (error) {
      showToast("Error al eliminar comentario", "error");
    }
  };

  const getUserInfo = (userId: string) => {
    return usersResponse?.find((u: User) => u.id === userId);
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
      <CardHeader className={compact ? "pb-3" : undefined}>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HugeiconsIcon icon={Comment01Icon} size={20} />
          Comentarios ({comments?.data?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : undefined}>
        <div className="space-y-4">
          {/* New Comment */}
          <div className="space-y-2">
            <Textarea
              placeholder="Escribe un comentario..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!newComment.trim() || addMutation.isPending}
                size="sm"
              >
                {addMutation.isPending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3">
            {comments?.data?.map((comment) => {
              const userInfo = getUserInfo(comment.user_id);
              const isEditing = editingId === comment.id;
              const isAuthor = comment.user_id === user?.id;

              return (
                <div
                  key={comment.id}
                  className="flex gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">
                      {(
                        userInfo?.full_name ||
                        userInfo?.first_name ||
                        "Usuario"
                      )?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {userInfo?.full_name ||
                          userInfo?.first_name ||
                          "Usuario"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(
                          new Date(comment.created_at),
                          "dd/MM/yyyy HH:mm"
                        )}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleUpdate}
                            disabled={
                              !editContent.trim() || updateMutation.isPending
                            }
                            size="sm"
                          >
                            {updateMutation.isPending
                              ? "Actualizando..."
                              : "Actualizar"}
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingId(null);
                              setEditContent("");
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">
                        {comment.content}
                      </div>
                    )}

                    {isAuthor && !isEditing && (
                      <div className="flex gap-1">
                        <Button
                          onClick={() =>
                            handleEdit(comment.id, comment.content)
                          }
                          variant="ghost"
                          size="sm"
                        >
                          <HugeiconsIcon icon={Edit01Icon} size={14} />
                        </Button>
                        <Button
                          onClick={() => handleDelete(comment.id)}
                          variant="ghost"
                          size="sm"
                          disabled={deleteMutation.isPending}
                        >
                          <HugeiconsIcon icon={Delete01Icon} size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {(!comments?.data || comments.data.length === 0) && (
              <div className="text-center text-muted-foreground py-8">
                <HugeiconsIcon
                  icon={Comment01Icon}
                  size={48}
                  className="mx-auto mb-2 opacity-50"
                />
                <p>No hay comentarios aún</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
