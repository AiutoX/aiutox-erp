import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { MessageCircle, Edit2, Trash2, Send, User, Clock } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "~/lib/api/client";
import { useAuthStore } from "~/stores/authStore";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  created_at: string;
  updated_at?: string;
  is_edited: boolean;
  edited_at?: string;
  mentions: string[];
}

interface CommentThreadProps {
  entityId: string;
  entityType: "task" | "event";
  onCommentAdded?: () => void;
  className?: string;
}

// API functions
const commentsApi = {
  getComments: async (entityId: string, entityType: string) => {
    const { data } = await apiClient.get(`/${entityType}s/${entityId}/comments`);
    return data.data || [];
  },

  addComment: async (
    entityId: string,
    entityType: string,
    content: string,
    mentions?: string[]
  ) => {
    const { data } = await apiClient.post(`/${entityType}s/${entityId}/comments`, {
      content,
      mentions,
    });
    return data.data;
  },

  updateComment: async (
    entityId: string,
    entityType: string,
    commentId: string,
    content: string
  ) => {
    const { data } = await apiClient.put(
      `/${entityType}s/${entityId}/comments/${commentId}`,
      { content }
    );
    return data.data;
  },

  deleteComment: async (
    entityId: string,
    entityType: string,
    commentId: string
  ) => {
    await apiClient.delete(`/${entityType}s/${entityId}/comments/${commentId}`);
    return true;
  },
};

export function CommentThread({
  entityId,
  entityType,
  onCommentAdded,
  className = "",
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const queryClient = useQueryClient();

  // Fetch comments
  const {
    data: comments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["comments", entityType, entityId],
    queryFn: () => commentsApi.getComments(entityId, entityType),
    enabled: !!entityId,
  });

  // Add comment mutation
  const addMutation = useMutation({
    mutationFn: (content: string) =>
      commentsApi.addComment(entityId, entityType, content),
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({
        queryKey: ["comments", entityType, entityId],
      });
      onCommentAdded?.();
      toast.success("Comentario agregado");
    },
    onError: (error: Error) => {
      console.error("Failed to add comment:", error);
      toast.error(error.message || "No se pudo agregar el comentario");
    },
  });

  // Update comment mutation
  const updateMutation = useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => commentsApi.updateComment(entityId, entityType, commentId, content),
    onSuccess: () => {
      setEditingComment(null);
      setEditContent("");
      queryClient.invalidateQueries({
        queryKey: ["comments", entityType, entityId],
      });
      toast.success("Comentario actualizado");
    },
    onError: (error: Error) => {
      console.error("Failed to update comment:", error);
      toast.error(error.message || "No se pudo actualizar el comentario");
    },
  });

  // Delete comment mutation
  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      commentsApi.deleteComment(entityId, entityType, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["comments", entityType, entityId],
      });
      toast.success("Comentario eliminado");
    },
    onError: (error: Error) => {
      console.error("Failed to delete comment:", error);
      toast.error(error.message || "No se pudo eliminar el comentario");
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addMutation.mutate(newComment);
  };

  const handleUpdateComment = (commentId: string) => {
    if (!editContent.trim()) return;
    updateMutation.mutate({ commentId, content: editContent });
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm("¿Estás seguro de eliminar este comentario?")) {
      deleteMutation.mutate(commentId);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditContent("");
  };

  const currentUserId = useAuthStore((s) => s.user?.id);

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <MessageCircle className="h-4 w-4" />
            <span>Error al cargar comentarios</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Comentarios</h3>
          <Badge variant="secondary">{comments.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new comment */}
        <div className="space-y-2">
          <Textarea
            placeholder="Escribe un comentario..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || addMutation.isPending}
              size="sm"
            >
              {addMutation.isPending ? (
                <span>Enviando...</span>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Comments list */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">
              Cargando comentarios...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Sin comentarios aún</p>
              <p className="text-sm">Sé el primero en comentar</p>
            </div>
          ) : (
            comments.map((comment: Comment) => (
              <div
                key={comment.id}
                className="flex gap-3 p-3 rounded-lg bg-muted/30"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={comment.user_email} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.user_name || comment.user_email || "Usuario"}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                    {comment.is_edited && (
                      <Badge variant="outline" className="text-xs">
                        Editado
                      </Badge>
                    )}
                  </div>

                  {editingComment === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateComment(comment.id)}
                          disabled={
                            !editContent.trim() || updateMutation.isPending
                          }
                        >
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
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

                  {/* Actions */}
                  {currentUserId === comment.user_id &&
                    editingComment !== comment.id && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(comment)}
                          disabled={
                            updateMutation.isPending || deleteMutation.isPending
                          }
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={
                            updateMutation.isPending || deleteMutation.isPending
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
