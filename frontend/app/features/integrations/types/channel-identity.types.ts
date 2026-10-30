/**
 * Types for the channel-identities API (employee self-service channel linking).
 */

export interface ChannelIdentity {
  id: string;
  channel: string;
  channel_user_id: string;
  is_active: boolean;
  created_at: string;
}

export interface TelegramLinkCode {
  code: string;
  expires_in: number;
}
