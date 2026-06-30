import apiClient from "~/lib/api/client";
import type { Conversation, Message } from "../types/chat.types";

export interface ChatRequest {
  message: string;
  conversation_id: string | null;
  erp_context: {
    module: string | null;
    record_id: string | null;
    record_type: string | null;
  };
}

export const chatApi = {
  listConversations: async (search?: string): Promise<Conversation[]> => {
    const params = search ? { search } : undefined;
    const response = await apiClient.get<{ data: Conversation[] }>(
      "/ai/conversations",
      { params }
    );
    return response.data.data;
  },

  listMessages: async (conversationId: string): Promise<Message[]> => {
    const response = await apiClient.get<{ data: Message[] }>(
      `/ai/conversations/${conversationId}/messages`
    );
    return response.data.data;
  },

  deleteConversation: async (conversationId: string): Promise<void> => {
    await apiClient.delete(`/ai/conversations/${conversationId}`);
  },

  updateConversation: async (
    conversationId: string,
    data: { title?: string; status?: string }
  ): Promise<Conversation> => {
    const response = await apiClient.patch<{ data: Conversation }>(
      `/ai/conversations/${conversationId}`,
      data
    );
    return response.data.data;
  },
};
