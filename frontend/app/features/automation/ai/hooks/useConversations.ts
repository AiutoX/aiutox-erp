import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "../api/chat.api";

export function useConversations(search?: string) {
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["ai", "conversations", search ?? ""],
    queryFn: () => chatApi.listConversations(search),
  });

  const { mutate: deleteConversation } = useMutation({
    mutationFn: chatApi.deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
    },
  });

  const { mutateAsync: renameConversation } = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      chatApi.updateConversation(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
  };

  return { conversations, isLoading, deleteConversation, renameConversation, invalidate };
}
