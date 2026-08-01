export interface ERPContext {
  module: string | null;
  record_id: string | null;
  record_type: string | null;
}

export interface Conversation {
  id: string;
  title: string | null;
  status: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  metadata: Record<string, unknown>;
  status: string;
  created_at: string;
}

export interface CapabilityResultItem {
  label: string;
  meta?: string | null;
  status?: string;
  href?: string;
}

export interface CapabilityResultMetric {
  label: string;
  value: string;
}

export interface CapabilityResultSection {
  heading: string;
  items: CapabilityResultItem[];
  viewAllHref?: string;
}

export type CapabilityResultVariant = "list" | "summary" | "briefing";

export interface CapabilityResult {
  title: string;
  variant: CapabilityResultVariant;
  items?: CapabilityResultItem[];
  metrics?: CapabilityResultMetric[];
  sections?: CapabilityResultSection[];
}

export type SSEChatEvent =
  | { type: "text_delta"; delta: string; message_id: string }
  | { type: "tool_call"; capability: string; args: Record<string, unknown> }
  | { type: "tool_result"; capability: string; result: unknown }
  | { type: "message_end"; message_id: string; usage: { tokens: number; cost_usd: number } }
  | { type: "hitl_required"; run_id: string; step_index: number; capability: string; params: Record<string, unknown> }
  | { type: "error"; code: string; message: string };

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status: "pending" | "streaming" | "done" | "error";
  capabilityResult?: CapabilityResult | null;
  error?: string | null;
  timestamp?: string | null;
}
