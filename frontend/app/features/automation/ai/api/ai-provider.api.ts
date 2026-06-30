import apiClient from "~/lib/api/client";

export type ProviderType = "anthropic" | "openai" | "openai-compatible";

export interface ProviderConfigOut {
  id: string;
  tenant_id: string;
  provider_type: ProviderType;
  base_url: string | null;
  is_active: boolean;
  model_conversation: string | null;
  model_classifier: string | null;
  model_embeddings: string | null;
  updated_at: string | null;
}

export interface ProviderConfigCreate {
  provider_type: ProviderType;
  api_key: string;
  base_url?: string | null;
  model_conversation?: string;
  model_classifier?: string;
  model_embeddings?: string;
}

export const aiProviderApi = {
  getConfig: async (): Promise<ProviderConfigOut | null> => {
    try {
      const response = await apiClient.get<{ data: ProviderConfigOut }>(
        "/ai/provider-config"
      );
      return response.data.data;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 404
      ) {
        return null;
      }
      throw err;
    }
  },

  saveConfig: async (data: ProviderConfigCreate): Promise<ProviderConfigOut> => {
    const response = await apiClient.post<{ data: ProviderConfigOut }>(
      "/ai/provider-config",
      data
    );
    return response.data.data;
  },
};
